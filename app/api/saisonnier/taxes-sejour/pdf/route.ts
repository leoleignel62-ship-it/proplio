import { NextResponse } from "next/server";
import { generateTaxeSejourPdfBuffer } from "@/lib/pdf/generate-taxe-sejour-pdf";
import { normalizePlan } from "@/lib/plan-limits";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }

    const { data: proprietaire, error: pErr } = await supabase.from("proprietaires").select("*").eq("user_id", user.id).maybeSingle();
    if (pErr || !proprietaire) {
      return NextResponse.json({ error: "Profil introuvable." }, { status: 400 });
    }
    if (normalizePlan((proprietaire as { plan?: string | null }).plan) === "free") {
      return NextResponse.json({ error: "Plan Starter requis." }, { status: 403 });
    }

    const body = (await request.json()) as { periode?: string; mois?: number; annee?: number; row_ids?: string[] };
    const mois = Number(body.mois ?? new Date().getMonth() + 1);
    const annee = Number(body.annee ?? new Date().getFullYear());
    const ids = body.row_ids ?? [];

    let q = supabase.from("taxes_sejour").select("*").eq("proprietaire_id", proprietaire.id);
    if (ids.length) q = q.in("id", ids);
    const { data: taxRows, error: tErr } = await q;
    if (tErr) {
      return NextResponse.json({ error: tErr.message }, { status: 500 });
    }

    const rowsPdf =
      taxRows?.map((r) => ({
        dates: `${r.mois}/${r.annee}`,
        voyageurs: String(r.nb_personnes ?? ""),
        nuits: Number(r.nb_nuits ?? 0),
        tarif_pp_n: Number(r.tarif_par_personne_nuit ?? 0),
        total: Number(r.montant ?? 0),
      })) ?? [];

    const total = rowsPdf.reduce((s, r) => s + r.total, 0);
    const periodeLabel = `${body.periode ?? "mois"} ${mois}/${annee}`;
    const commune = [proprietaire.ville, proprietaire.code_postal].filter(Boolean).join(" ") || null;

    const pdf = await generateTaxeSejourPdfBuffer({
      periodeLabel,
      proprietaire: proprietaire as Record<string, unknown>,
      rows: rowsPdf,
      totalAReverser: total,
      commune,
    });

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="taxe-sejour-${annee}-${mois}.pdf"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur." },
      { status: 500 },
    );
  }
}
