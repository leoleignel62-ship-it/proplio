import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = String(searchParams.get("token") ?? "").trim();
    if (!token) return NextResponse.json({ error: "Token manquant." }, { status: 400 });

    const { data: row, error } = await supabaseAdmin
      .from("candidature_tokens")
      .select(
        "id, prenom_candidat, nom_candidat, expire_at, soumis_at, candidature_dossiers(logement_concerne, loyer_reference)",
      )
      .eq("token", token)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!row) return NextResponse.json({ error: "Lien invalide." }, { status: 404 });

    const expireAt = new Date(String(row.expire_at));
    const isExpired = Number.isFinite(expireAt.getTime()) && expireAt.getTime() < Date.now();
    const isSubmitted = Boolean(row.soumis_at);

    const dossier = (Array.isArray(row.candidature_dossiers)
      ? row.candidature_dossiers[0]
      : row.candidature_dossiers) as { logement_concerne?: string; loyer_reference?: number } | null;

    if (isExpired) {
      return NextResponse.json(
        {
          valide: false,
          expire: true,
          soumis: isSubmitted,
          prenom_candidat: row.prenom_candidat,
          nom_candidat: row.nom_candidat,
        },
        { status: 410 },
      );
    }

    return NextResponse.json({
      valide: true,
      expire: false,
      soumis: isSubmitted,
      prenom_candidat: row.prenom_candidat,
      nom_candidat: row.nom_candidat,
      logement_concerne: dossier?.logement_concerne ?? "",
      loyer_reference: Number(dossier?.loyer_reference ?? 0),
      expire_at: row.expire_at,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}
