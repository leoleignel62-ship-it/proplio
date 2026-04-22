import { NextResponse } from "next/server";
import { fetchLatestIrlFromInsee } from "@/lib/irl-insee";
import {
  detecterBauxEligibles,
  formatDateIsoLocal,
  getDerniereDateAnniversaireBail,
} from "@/lib/irl-revision";
import { normalizePlan } from "@/lib/plan-limits";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { bailId?: string };
    const bailId = String(body.bailId ?? "").trim();
    if (!bailId) {
      return NextResponse.json({ error: "bailId requis." }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }

    const { data: proprio, error: pErr } = await supabase
      .from("proprietaires")
      .select("id, plan")
      .eq("user_id", user.id)
      .maybeSingle();
    if (pErr || !proprio?.id) {
      return NextResponse.json({ error: "Profil introuvable." }, { status: 400 });
    }
    if (normalizePlan((proprio as { plan?: string | null }).plan) === "free") {
      return NextResponse.json({ error: "Fonction réservée au plan Starter ou supérieur." }, { status: 403 });
    }

    const irl = await fetchLatestIrlFromInsee();

    const { data: bail, error: bailErr } = await supabase
      .from("baux")
      .select(
        "id, date_debut, irl_reference, loyer_initial, revision_loyer, loyer, date_derniere_revision, statut, proprietaire_id",
      )
      .eq("id", bailId)
      .eq("proprietaire_id", proprio.id)
      .maybeSingle();

    if (bailErr || !bail) {
      return NextResponse.json({ error: "Bail introuvable." }, { status: 404 });
    }

    const { data: revRows } = await supabase
      .from("revisions_irl")
      .select("bail_id, statut, date_revision")
      .eq("proprietaire_id", proprio.id);

    const proposee = new Set(
      (revRows ?? [])
        .filter((r) => String(r.statut ?? "").toLowerCase() === "proposee")
        .map((r) => String(r.bail_id)),
    );

    const eligibles = detecterBauxEligibles([bail as never], irl.valeur, {
      bailIdsAvecRevisionProposee: proposee,
      revisionsPourRefus: (revRows ?? []) as never,
    });
    if (!eligibles.some((b) => String(b.id) === bailId)) {
      return NextResponse.json({ error: "Ce bail n'est pas éligible à la révision." }, { status: 400 });
    }

    const irlRef = Number((bail as { irl_reference?: unknown }).irl_reference ?? 0);
    const loyer = Number((bail as { loyer?: unknown }).loyer ?? 0);
    const anniv = getDerniereDateAnniversaireBail(String((bail as { date_debut?: unknown }).date_debut ?? ""));
    const dateRevisionStr = anniv
      ? formatDateIsoLocal(anniv)
      : formatDateIsoLocal(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()));

    const { data: inserted, error: insErr } = await supabase
      .from("revisions_irl")
      .insert({
        bail_id: bail.id,
        proprietaire_id: proprio.id,
        loyer_avant: loyer,
        loyer_apres: loyer,
        irl_ancien: irlRef,
        irl_nouveau: irl.valeur,
        date_revision: dateRevisionStr,
        statut: "refusee",
      })
      .select("id")
      .single();

    if (insErr || !inserted) {
      return NextResponse.json({ error: insErr?.message ?? "Insertion impossible." }, { status: 500 });
    }

    return NextResponse.json({ success: true, revisionId: inserted.id as string });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}
