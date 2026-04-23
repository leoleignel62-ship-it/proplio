import { NextResponse } from "next/server";
import { normalizePlan } from "@/lib/plan-limits";
import { cronShouldSendAcompte, cronShouldSendSolde } from "@/lib/saisonnier-rappel-conditions";
import type { SaisonnierRappelReservationRow } from "@/lib/saisonnier-rappel-conditions";
import { executeRappelAcompte, executeRappelSolde } from "@/lib/saisonnier-rappels";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("Authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const todayIso = new Date().toISOString().slice(0, 10);

  const { data: reservations, error: listErr } = await supabaseAdmin
    .from("reservations")
    .select(
      "id, proprietaire_id, source, statut, voyageur_id, date_arrivee, date_depart, heure_arrivee, heure_depart, nb_voyageurs, tarif_total, tarif_menage, taxe_sejour_total, montant_acompte, delai_solde_jours, acompte_recu, solde_recu, rappel_acompte_envoye, rappel_solde_envoye",
    )
    .eq("source", "direct")
    .eq("statut", "confirmee")
    .not("voyageur_id", "is", null)
    .gte("date_arrivee", todayIso);

  if (listErr) {
    return NextResponse.json({ error: listErr.message }, { status: 500 });
  }

  const rows = (reservations ?? []) as SaisonnierRappelReservationRow[];
  const ownerIds = [...new Set(rows.map((r) => r.proprietaire_id))];
  const { data: owners } = await supabaseAdmin.from("proprietaires").select("id, plan").in("id", ownerIds);
  const planByOwner = new Map<string, string | null>();
  for (const o of owners ?? []) {
    planByOwner.set(String((o as { id: string }).id), (o as { plan?: string | null }).plan ?? null);
  }

  const results: { id: string; acompte?: string; solde?: string }[] = [];

  for (const r of rows) {
    if (normalizePlan(planByOwner.get(r.proprietaire_id)) === "free") continue;

    if (cronShouldSendAcompte(r)) {
      const res = await executeRappelAcompte(supabaseAdmin, r.id);
      results.push({ id: r.id, acompte: res.ok ? "sent" : res.error });
    }
    if (cronShouldSendSolde(r)) {
      const res = await executeRappelSolde(supabaseAdmin, r.id);
      results.push({ id: r.id, solde: res.ok ? "sent" : res.error });
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, details: results });
}
