import { NextResponse } from "next/server";
import { calculateScore, type CandidatureScoreInput } from "@/lib/scoring-candidature";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type SoumettreBody = {
  token?: string;
  formulaire_data?: Record<string, unknown>;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as SoumettreBody | null;
    const token = String(body?.token ?? "").trim();
    const formulaire = body?.formulaire_data ?? {};

    if (!token) return NextResponse.json({ error: "Token manquant." }, { status: 400 });

    const { data: tokenRow, error: tokenError } = await supabaseAdmin
      .from("candidature_tokens")
      .select("id, dossier_id, expire_at, soumis_at")
      .eq("token", token)
      .maybeSingle();

    if (tokenError) return NextResponse.json({ error: tokenError.message }, { status: 500 });
    if (!tokenRow) return NextResponse.json({ error: "Token invalide." }, { status: 404 });
    if (tokenRow.soumis_at) return NextResponse.json({ error: "Ce dossier a déjà été soumis." }, { status: 409 });
    if (new Date(String(tokenRow.expire_at)).getTime() < Date.now()) {
      return NextResponse.json({ error: "Ce lien a expiré." }, { status: 410 });
    }

    const { data: dossier, error: dossierError } = await supabaseAdmin
      .from("candidature_dossiers")
      .select("id, loyer_reference")
      .eq("id", tokenRow.dossier_id)
      .maybeSingle();
    if (dossierError || !dossier) {
      return NextResponse.json({ error: dossierError?.message ?? "Dossier introuvable." }, { status: 404 });
    }

    const scoreInput: CandidatureScoreInput = {
      loyer_reference: Number(dossier.loyer_reference ?? 0),
      revenus_nets_mensuels: Number(formulaire.revenus_nets_mensuels ?? 0),
      type_contrat: String(formulaire.type_contrat ?? "") as CandidatureScoreInput["type_contrat"],
      anciennete_mois: Number(formulaire.anciennete_mois ?? 0),
      a_garant: Boolean(formulaire.a_garant),
      type_garant: (formulaire.type_garant as CandidatureScoreInput["type_garant"]) ?? null,
      situation: String(formulaire.situation ?? "seul") as CandidatureScoreInput["situation"],
    };

    const { score, note, details } = calculateScore(scoreInput);

    const { error: formError } = await supabaseAdmin.from("candidature_formulaires").insert({
      token_id: tokenRow.id,
      dossier_id: tokenRow.dossier_id,
      type_contrat: formulaire.type_contrat ?? null,
      employeur: formulaire.employeur ?? null,
      anciennete_mois: formulaire.anciennete_mois ?? null,
      revenus_nets_mensuels: formulaire.revenus_nets_mensuels ?? null,
      a_garant: Boolean(formulaire.a_garant),
      type_garant: formulaire.type_garant ?? null,
      revenus_garant: formulaire.revenus_garant ?? null,
      situation: formulaire.situation ?? null,
      nb_personnes_foyer: formulaire.nb_personnes_foyer ?? null,
      score,
      note,
      details_score: details,
    });
    if (formError) return NextResponse.json({ error: formError.message }, { status: 500 });

    const nowIso = new Date().toISOString();
    await supabaseAdmin.from("candidature_tokens").update({ soumis_at: nowIso }).eq("id", tokenRow.id);
    await supabaseAdmin.from("candidature_dossiers").update({ statut: "recu" }).eq("id", tokenRow.dossier_id);

    return NextResponse.json({ success: true, score, note });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}
