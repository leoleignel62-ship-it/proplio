import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildEdlPdfBufferFromDb } from "@/lib/etat-des-lieux/pdf-server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Utilisateur non authentifié." }, { status: 401 });
    }

    const { data: proprietaire, error: proprietaireError } = await supabase
      .from("proprietaires")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (proprietaireError || !proprietaire) {
      return NextResponse.json({ error: "Profil propriétaire introuvable." }, { status: 400 });
    }

    const { data: edl, error: edlError } = await supabase
      .from("etats_des_lieux")
      .select("*")
      .eq("id", id)
      .eq("proprietaire_id", proprietaire.id)
      .maybeSingle();

    if (edlError || !edl) {
      return NextResponse.json({ error: "État des lieux introuvable." }, { status: 404 });
    }

    if (edl.statut !== "termine") {
      return NextResponse.json(
        {
          error:
            "L'état des lieux doit être finalisé avant la génération du PDF (document à valeur légale).",
        },
        { status: 403 },
      );
    }

    let signatureImage: { bytes: Uint8Array; isPng: boolean } | null = null;
    const sigPath = proprietaire.signature_path as string | undefined;
    if (sigPath) {
      const { data: signatureBlob } = await supabaseAdmin.storage.from("signatures").download(sigPath);
      if (signatureBlob) {
        const bytes = new Uint8Array(await signatureBlob.arrayBuffer());
        const isPng =
          signatureBlob.type === "image/png" || sigPath.toLowerCase().endsWith(".png");
        signatureImage = { bytes, isPng };
      }
    }

    /** Mise en page PDF (dont signatures en bas de dernière page) : `lib/pdf/generate-edl-pdf.ts`. */
    const pdfBytes = await buildEdlPdfBufferFromDb(
      supabase,
      supabaseAdmin,
      edl as Record<string, unknown>,
      proprietaire as Record<string, unknown>,
      signatureImage,
    );

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="etat-des-lieux-${id.slice(0, 8)}.pdf"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}
