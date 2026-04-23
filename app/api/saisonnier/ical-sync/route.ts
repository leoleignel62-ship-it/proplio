import { NextResponse } from "next/server";
import { parseVeventsFromIcs } from "@/lib/ical-saisonnier";
import { normalizePlan } from "@/lib/plan-limits";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Source = "airbnb" | "booking";

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

    const body = (await request.json()) as { logement_id?: string };
    const logementId = String(body.logement_id ?? "").trim();
    if (!logementId) {
      return NextResponse.json({ error: "logement_id requis." }, { status: 400 });
    }

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
        "id, proprietaire_id, tarif_nuit_moyenne, tarif_menage, tarif_caution, taxe_sejour_nuit, ical_airbnb_url, ical_booking_url",
      )
      .eq("id", logementId)
      .eq("proprietaire_id", ownerId)
      .maybeSingle();
    if (lErr || !logement) {
      return NextResponse.json({ error: "Logement introuvable." }, { status: 404 });
    }

    const tarifNuit = Number(logement.tarif_nuit_moyenne ?? 0);
    const tarifMenage = Number(logement.tarif_menage ?? 0);
    const tarifCautionRow = Number(logement.tarif_caution ?? 0);
    const taxeNuit = Number(logement.taxe_sejour_nuit ?? 0);

    const jobs: Array<{ url: string; source: Source }> = [];
    const airbnb = String(logement.ical_airbnb_url ?? "").trim();
    const booking = String(logement.ical_booking_url ?? "").trim();
    if (airbnb) jobs.push({ url: airbnb, source: "airbnb" });
    if (booking) jobs.push({ url: booking, source: "booking" });
    if (jobs.length === 0) {
      return NextResponse.json({ error: "Aucune URL iCal renseignée pour ce logement." }, { status: 400 });
    }

    let imported = 0;
    let updated = 0;

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
      for (const ev of events) {
        const nbNuits = Math.max(
          0,
          Math.round(
            (new Date(ev.dateDepart).getTime() - new Date(ev.dateArrivee).getTime()) / 86400000,
          ),
        );
        if (nbNuits <= 0) continue;

        const tarifTotal = nbNuits * tarifNuit;
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
          notes: ev.summary,
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
              notes: ev.summary,
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

    return NextResponse.json({ imported, updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}
