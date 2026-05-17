import { NextResponse } from "next/server";
import { assertStarterPlan } from "@/lib/api-plan-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildEdlPdfBufferFromDb } from "@/lib/etat-des-lieux/pdf-server";
import { buildSaisonnierEdlPdfBufferFromDb, rowUsesSaisonnierPdf } from "@/lib/etat-des-lieux/saisonnier-edl-pdf-build";
import { applyElectronicSignatureToPdfBytes } from "@/lib/pdf/pdf-utils";
import { PDF_MARGIN_X } from "@/lib/pdf/locavio-pdf-theme";

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

    const planError = await assertStarterPlan(proprietaire.id);
    if (planError) return planError;

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

    const edlRec = edl as Record<string, unknown>;
    let pdfBytes = rowUsesSaisonnierPdf(edlRec)
      ? await buildSaisonnierEdlPdfBufferFromDb(
          supabase,
          supabaseAdmin,
          edlRec,
          proprietaire as Record<string, unknown>,
          signatureImage,
        )
      : await buildEdlPdfBufferFromDb(
          supabase,
          supabaseAdmin,
          edlRec,
          proprietaire as Record<string, unknown>,
          signatureImage,
        );

    const logementId = edl.logement_id as string | null | undefined;
    const { data: logement } = logementId
      ? await supabase.from("logements").select("*").eq("id", logementId).maybeSingle()
      : { data: null };

    const { data: sigDoc } = await supabaseAdmin
      .from("document_signatures")
      .select("*")
      .eq("document_type", "edl")
      .eq("document_id", id)
      .not("signed_at", "is", null)
      .maybeSingle();

    if (sigDoc?.signed_at && sigDoc.signature_data) {
      pdfBytes = await applyElectronicSignatureToPdfBytes(pdfBytes, {
        sigDoc: {
          signature_data: String(sigDoc.signature_data),
          signer_name: String(sigDoc.signer_name ?? ""),
          signer_email: String(sigDoc.signer_email ?? ""),
          signer_ip: sigDoc.signer_ip as string | null,
          signer_user_agent: sigDoc.signer_user_agent as string | null,
          signed_at: String(sigDoc.signed_at),
          otp_verified_at: sigDoc.otp_verified_at as string | null,
          document_id: String(sigDoc.document_id ?? id),
        },
        documentTypeLabel: "État des lieux",
        proprietaire: proprietaire as Record<string, unknown>,
        logement: (logement ?? null) as Record<string, unknown> | null,
        proprietaireSignatureImage: signatureImage,
        marginX: PDF_MARGIN_X,
      });
    }

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
