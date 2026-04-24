import { NextResponse } from "next/server";
import { parseVeventsFromIcs } from "@/lib/ical-saisonnier";
import { calculerMontantReservation } from "@/lib/saisonnier-tarifs";
import { normalizePlan } from "@/lib/plan-limits";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type JobSource = "airbnb" | "booking";

const BLOCAGE_SUMMARY_MARKERS = [
  "blocked",
  "not available",
  "unavailable",
  "airbnb (not available)",
  "owner",
  "propriétaire",
  "perso",
  "personnel",
] as const;

function isBlocagePersonnelFromSummary(summary: string): boolean {
  const s = summary.toLowerCase();
  return BLOCAGE_SUMMARY_MARKERS.some((m) => s.includes(m.toLowerCase()));
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Utilisateur non authentifié." }, { status: 401 });
    }

    const body = (await request.json()) as { logement_id?: string; sync_full_history?: boolean };
    const logementId = String(body.logement_id ?? "").trim();
    const syncFullHistory = Boolean(body.sync_full_history);
    if (!logementId) {
      return NextResponse.json({ error: "logement_id requis." }, { status: 400 });
    }
    const currentYear = new Date().getFullYear();
    const startDate = syncFullHistory ? "2010-01-01" : `${currentYear}-01-01`;
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 18);
    const endDate = maxDate.toISOString().slice(0, 10);

    const { data: proprietaire, error: pErr } = await supabase
      .from("proprietaires")
      .select("id, plan")
      .eq("user_id", user.id)
      .maybeSingle();
    if (pErr || !proprietaire) {
      return NextResponse.json({ error: "Profil propriétaire introuvable." }, { status: 400 });
    }
    if (normalizePlan((proprietaire as { plan?: string | null }).plan) === "free") {
      return NextResponse.json({ error: "Fonction réservée au plan Starter ou supérieur." }, { status: 403 });
    }

    const ownerId = proprietaire.id as string;
    const { data: logement, error: lErr } = await supabase
      .from("logements")
      .select(
        "id, proprietaire_id, tarifs_creneaux, tarif_nuit_defaut, tarif_nuit_moyenne, tarif_menage, tarif_caution, taxe_sejour_nuit, ical_airbnb_url, ical_booking_url",
      )
      .eq("id", logementId)
      .eq("proprietaire_id", ownerId)
      .maybeSingle();
    if (lErr || !logement) {
      return NextResponse.json({ error: "Logement introuvable." }, { status: 404 });
    }

    const logementTarif = {
      tarifs_creneaux: logement.tarifs_creneaux,
      tarif_nuit_defaut: logement.tarif_nuit_defaut as number | null,
      tarif_nuit_moyenne: logement.tarif_nuit_moyenne as number | null,
    };
    const tarifMenage = Number(logement.tarif_menage ?? 0);
    const tarifCautionRow = Number(logement.tarif_caution ?? 0);
    const taxeNuit = Number(logement.taxe_sejour_nuit ?? 0);

    const jobs: Array<{ url: string; source: JobSource }> = [];
    const airbnb = String(logement.ical_airbnb_url ?? "").trim();
    const booking = String(logement.ical_booking_url ?? "").trim();
    if (airbnb) jobs.push({ url: airbnb, source: "airbnb" });
    if (booking) jobs.push({ url: booking, source: "booking" });
    if (jobs.length === 0) {
      return NextResponse.json({ error: "Aucune URL iCal renseignée pour ce logement." }, { status: 400 });
    }

    const { error: delBlocageErr } = await supabase
      .from("reservations")
      .delete()
      .eq("proprietaire_id", ownerId)
      .eq("logement_id", logementId)
      .eq("source", "blocage");
    if (delBlocageErr) {
      return NextResponse.json({ error: delBlocageErr.message }, { status: 500 });
    }

    let imported = 0;
    let updated = 0;
    const infoMessages: string[] = [];

    for (const job of jobs) {
      let text: string;
      try {
        const res = await fetch(job.url, { cache: "no-store" });
        if (!res.ok) continue;
        text = await res.text();
      } catch {
        continue;
      }

      const events = parseVeventsFromIcs(text);
      if (events.length > 0) {
        const sortedByArrivee = [...events].sort((a, b) => a.dateArrivee.localeCompare(b.dateArrivee));
        const minDate = sortedByArrivee[0]!.dateArrivee;
        const maxDate = sortedByArrivee[sortedByArrivee.length - 1]!.dateDepart;
        console.info(
          `[ical-sync] source=${job.source} logement_id=${logementId} events=${events.length} min=${minDate} max=${maxDate}`,
        );
      } else {
        console.info(`[ical-sync] source=${job.source} logement_id=${logementId} events=0`);
      }
      if (job.source === "airbnb" && events.length > 0) {
        const todayIso = new Date().toISOString().slice(0, 10);
        const hasPastEvent = events.some((ev) => ev.dateArrivee < todayIso);
        if (!hasPastEvent) {
          infoMessages.push(
            "Airbnb ne fournit que les réservations futures via iCal. Les réservations passées doivent être saisies manuellement.",
          );
        }
      }
      for (const ev of events) {
        if (ev.dateDepart < startDate || ev.dateArrivee > endDate) {
          continue;
        }
        const nbNuits = Math.max(
          0,
          Math.round(
            (new Date(ev.dateDepart).getTime() - new Date(ev.dateArrivee).getTime()) / 86400000,
          ),
        );
        if (nbNuits <= 0) continue;

        const summary = ev.summary;
        if (isBlocagePersonnelFromSummary(summary)) {
          continue;
        }

        const tarifTotal = calculerMontantReservation(logementTarif, ev.dateArrivee, ev.dateDepart);
        const tarifNuit = nbNuits > 0 ? Math.round((tarifTotal / nbNuits) * 100) / 100 : 0;
        const taxeTotal = taxeNuit * nbNuits * 1;
        const { data: existing } = await supabase
          .from("reservations")
          .select("id, notes")
          .eq("proprietaire_id", ownerId)
          .eq("logement_id", logementId)
          .eq("date_arrivee", ev.dateArrivee)
          .eq("date_depart", ev.dateDepart)
          .maybeSingle();

        const base = {
          proprietaire_id: ownerId,
          logement_id: logementId,
          voyageur_id: null,
          date_arrivee: ev.dateArrivee,
          date_depart: ev.dateDepart,
          nb_voyageurs: 1,
          tarif_nuit: tarifNuit,
          tarif_total: tarifTotal,
          tarif_menage: tarifMenage,
          tarif_caution: tarifCautionRow,
          taxe_sejour_total: taxeTotal,
          statut: "confirmee",
          source: job.source,
          notes: summary,
        };

        if (existing?.id) {
          const { error: uErr } = await supabase
            .from("reservations")
            .update({
              tarif_nuit: tarifNuit,
              tarif_total: tarifTotal,
              tarif_menage: tarifMenage,
              tarif_caution: tarifCautionRow,
              taxe_sejour_total: taxeTotal,
              statut: "confirmee",
              source: job.source,
              notes: summary,
            })
            .eq("id", existing.id)
            .eq("proprietaire_id", ownerId);
          if (!uErr) updated++;
        } else {
          const { error: iErr } = await supabase.from("reservations").insert(base);
          if (!iErr) imported++;
        }
      }
    }

    return NextResponse.json({ imported, updated, infoMessage: infoMessages[0] ?? null });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}
