// Mise en page du PDF : lib/pdf/generate-bail-pdf.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getLocataireIdsOrderedForBailPdf } from "@/lib/bail-pdf-locataires";
import { generateBailPdfBuffer, type BailPdfLocataire } from "@/lib/pdf/generate-bail-pdf";
import { applyElectronicSignatureToPdfBytes } from "@/lib/pdf/pdf-utils";

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

    const { data: bail, error: bailError } = await supabase
      .from("baux")
      .select("*")
      .eq("id", id)
      .eq("proprietaire_id", proprietaire.id)
      .maybeSingle();

    if (bailError || !bail) {
      return NextResponse.json({ error: "Bail introuvable." }, { status: 404 });
    }

    const { data: logement } = await supabase
      .from("logements")
      .select("*")
      .eq("id", bail.logement_id)
      .maybeSingle();

    const locataireIdsOrdered = getLocataireIdsOrderedForBailPdf(
      bail as { locataire_id: unknown; colocataires_ids: unknown; colocation_chambre_index?: unknown },
      (logement ?? null) as { est_colocation?: unknown } | null,
    );

    const { data: locatairesList } =
      locataireIdsOrdered.length > 0
        ? await supabase.from("locataires").select("*").in("id", locataireIdsOrdered)
        : { data: null };

    const locatairesById = new Map(
      (locatairesList ?? []).map((row) => [row.id as string, row as Record<string, unknown>]),
    );
    const locatairesOrdered: BailPdfLocataire[] = locataireIdsOrdered
      .map((lid) => locatairesById.get(lid))
      .filter((row): row is Record<string, unknown> => row != null)
      .map((row) => ({
        prenom: row.prenom as string | undefined,
        nom: row.nom as string | undefined,
        email: row.email as string | undefined,
        telephone: row.telephone as string | undefined,
        adresse: row.adresse as string | undefined,
        code_postal: row.code_postal as string | undefined,
        ville: row.ville as string | undefined,
        date_naissance: row.date_naissance as string | undefined,
      }));

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

    let pdfBytes = await generateBailPdfBuffer({
      bail: bail as Record<string, unknown>,
      proprietaire: proprietaire as Record<string, unknown>,
      logement: (logement ?? null) as Record<string, unknown> | null,
      locatairesOrdered,
      signatureImage,
    });

    const { data: sigDoc } = await supabaseAdmin
      .from("document_signatures")
      .select("*")
      .eq("document_type", "bail")
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
        documentTypeLabel: "Bail de location",
        proprietaire: proprietaire as Record<string, unknown>,
        logement: (logement ?? null) as Record<string, unknown> | null,
        proprietaireSignatureImage: signatureImage,
        marginX: 48,
      });
    }

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="bail-${id.slice(0, 8)}.pdf"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}
