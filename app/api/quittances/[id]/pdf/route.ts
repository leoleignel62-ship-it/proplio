import { NextResponse } from "next/server";
import { generateQuittancePdfBuffer } from "@/lib/pdf/generate-quittance-pdf";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Utilisateur non authentifié." }, { status: 401 });

    const { data: proprietaire } = await supabase
      .from("proprietaires")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!proprietaire?.id) return NextResponse.json({ error: "Profil propriétaire introuvable." }, { status: 400 });

    const { data: quittance } = await supabase
      .from("quittances")
      .select("*")
      .eq("id", id)
      .eq("proprietaire_id", proprietaire.id)
      .maybeSingle();
    if (!quittance) return NextResponse.json({ error: "Quittance introuvable." }, { status: 404 });

    const [{ data: locataire }, { data: logement }] = await Promise.all([
      supabase.from("locataires").select("*").eq("id", quittance.locataire_id).eq("proprietaire_id", proprietaire.id).maybeSingle(),
      supabase.from("logements").select("*").eq("id", quittance.logement_id).eq("proprietaire_id", proprietaire.id).maybeSingle(),
    ]);

    if (!locataire || !logement) {
      return NextResponse.json({ error: "Impossible de charger les données locataire/logement." }, { status: 400 });
    }

    let signatureImage: { bytes: Uint8Array; isPng: boolean } | null = null;
    const sigPath = proprietaire.signature_path as string | undefined;
    if (sigPath) {
      const { data: signatureBlob } = await supabaseAdmin.storage.from("signatures").download(sigPath);
      if (signatureBlob) {
        const bytes = new Uint8Array(await signatureBlob.arrayBuffer());
        const isPng = signatureBlob.type === "image/png" || sigPath.toLowerCase().endsWith(".png");
        signatureImage = { bytes, isPng };
      }
    }

    const pdfBytes = await generateQuittancePdfBuffer({
      proprietaire: proprietaire as Record<string, unknown>,
      locataire: locataire as Record<string, unknown>,
      logement: logement as Record<string, unknown>,
      quittance: {
        id: quittance.id as string,
        mois: Number(quittance.mois),
        annee: Number(quittance.annee),
        loyer: Number(quittance.loyer),
        charges: Number(quittance.charges),
        total: Number(quittance.total),
      },
      signatureImage,
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="quittance-${id.slice(0, 8)}.pdf"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}
