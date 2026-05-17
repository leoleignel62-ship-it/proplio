import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getLocataireIdsOrderedForBailPdf } from "@/lib/bail-pdf-locataires";
import { generateBailPdfBuffer, type BailPdfLocataire } from "@/lib/pdf/generate-bail-pdf";
import { generateContratSejourPdfBuffer } from "@/lib/pdf/generate-contrat-sejour-pdf";
import { buildEdlPdfBufferFromDb } from "@/lib/etat-des-lieux/pdf-server";
import {
  buildSaisonnierEdlPdfBufferFromDb,
  rowUsesSaisonnierPdf,
} from "@/lib/etat-des-lieux/saisonnier-edl-pdf-build";
import {
  emailSignatureOtpInvite,
  emailSignatureOtpInviteSubject,
  humanizeDocumentType,
} from "@/lib/signature-email";
import { assertStarterPlan } from "@/lib/api-plan-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = "Locavio <noreply@locavio.fr>";

type SendBody = {
  document_type?: string;
  document_id?: string;
  signer_name?: string;
  signer_email?: string;
  proprietaire_id?: string;
};

type PdfAttachment = { filename: string; content: Buffer };

function siteBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://locavio.fr").replace(/\/+$/, "");
}

async function loadProprietaireSignatureImage(
  sigPath: string | null | undefined,
): Promise<{ bytes: Uint8Array; isPng: boolean } | null> {
  if (!sigPath) return null;
  const { data: blob } = await supabaseAdmin.storage.from("signatures").download(sigPath);
  if (!blob) return null;
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const isPng = blob.type === "image/png" || sigPath.toLowerCase().endsWith(".png");
  return { bytes, isPng };
}

async function generateSignatureInvitePdfAttachment(
  document_type: string,
  document_id: string,
  proprietaire_id: string,
): Promise<PdfAttachment | null> {
  try {
    const { data: proprio } = await supabaseAdmin
      .from("proprietaires")
      .select("*")
      .eq("id", proprietaire_id)
      .maybeSingle();

    if (!proprio) return null;

    const signatureImage = await loadProprietaireSignatureImage(
      proprio.signature_path as string | undefined,
    );

    if (document_type === "bail") {
      const { data: bail } = await supabaseAdmin
        .from("baux")
        .select("*")
        .eq("id", document_id)
        .eq("proprietaire_id", proprietaire_id)
        .maybeSingle();

      if (!bail) return null;

      const { data: logement } = await supabaseAdmin
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
          ? await supabaseAdmin.from("locataires").select("*").in("id", locataireIdsOrdered)
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

      const pdfBytes = await generateBailPdfBuffer({
        bail: bail as Record<string, unknown>,
        proprietaire: proprio as Record<string, unknown>,
        logement: (logement ?? null) as Record<string, unknown> | null,
        locatairesOrdered,
        signatureImage,
      });

      return {
        filename: "bail-locavio.pdf",
        content: Buffer.from(pdfBytes),
      };
    }

    if (document_type === "contrat_sejour") {
      const { data: reservation } = await supabaseAdmin
        .from("reservations")
        .select("*")
        .eq("id", document_id)
        .eq("proprietaire_id", proprietaire_id)
        .maybeSingle();

      if (!reservation) return null;

      const [{ data: logement }, { data: voyageur }] = await Promise.all([
        supabaseAdmin.from("logements").select("*").eq("id", reservation.logement_id).maybeSingle(),
        reservation.voyageur_id
          ? supabaseAdmin.from("voyageurs").select("*").eq("id", reservation.voyageur_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      if (!logement) return null;

      const nbNuits =
        Number(reservation.nb_nuits ?? 0) ||
        Math.max(
          0,
          Math.round(
            (new Date(reservation.date_depart).getTime() - new Date(reservation.date_arrivee).getTime()) /
              86400000,
          ),
        );

      const pdfBytes = await generateContratSejourPdfBuffer({
        proprietaire: proprio as Record<string, unknown>,
        voyageur: (voyageur ?? {}) as Record<string, unknown>,
        logement: logement as Record<string, unknown>,
        reservation: {
          date_arrivee: String(reservation.date_arrivee),
          date_depart: String(reservation.date_depart),
          heure_arrivee: String((reservation as { heure_arrivee?: string }).heure_arrivee ?? "15:00"),
          heure_depart: String((reservation as { heure_depart?: string }).heure_depart ?? "11:00"),
          nb_voyageurs: Number(reservation.nb_voyageurs ?? 1),
          nb_nuits: nbNuits,
          tarif_nuit: Number(reservation.tarif_nuit ?? 0),
          tarif_total: Number(reservation.tarif_total ?? 0),
          tarif_menage: Number(reservation.tarif_menage ?? 0),
          menage_inclus: (reservation as { menage_inclus?: boolean }).menage_inclus !== false,
          tarif_caution: Number(reservation.tarif_caution ?? 0),
          taxe_sejour_total: Number(reservation.taxe_sejour_total ?? 0),
          montant_acompte: Number((reservation as { montant_acompte?: number }).montant_acompte ?? 0),
        },
        signatureImage,
      });

      return {
        filename: "contrat-sejour-locavio.pdf",
        content: Buffer.from(pdfBytes),
      };
    }

    if (document_type === "edl") {
      const { data: edl } = await supabaseAdmin
        .from("etats_des_lieux")
        .select("*")
        .eq("id", document_id)
        .eq("proprietaire_id", proprietaire_id)
        .maybeSingle();

      if (!edl) return null;

      try {
        const edlRec = edl as Record<string, unknown>;
        const pdfBytes = rowUsesSaisonnierPdf(edlRec)
          ? await buildSaisonnierEdlPdfBufferFromDb(
              supabaseAdmin,
              supabaseAdmin,
              edlRec,
              proprio as Record<string, unknown>,
              signatureImage,
            )
          : await buildEdlPdfBufferFromDb(
              supabaseAdmin,
              supabaseAdmin,
              edlRec,
              proprio as Record<string, unknown>,
              signatureImage,
            );

        return {
          filename: "etat-des-lieux-locavio.pdf",
          content: Buffer.from(pdfBytes),
        };
      } catch {
        return null;
      }
    }

    return null;
  } catch {
    return null;
  }
}

async function loadSignatureEmailContext(
  document_type: string,
  document_id: string,
  proprietaire_id: string,
  proprietaire: { prenom?: string | null; nom?: string | null } | null,
): Promise<{
  proprietaireNomComplet: string;
  documentTypeHuman: string;
  documentContext: string;
}> {
  const proprietaireNomComplet = proprietaire
    ? `${proprietaire.prenom ?? ""} ${proprietaire.nom ?? ""}`.trim() || "Le propriétaire"
    : "Le propriétaire";
  const documentTypeHuman = humanizeDocumentType(document_type);
  let documentContext = "";

  if (document_type === "bail") {
    const { data: bail } = await supabaseAdmin
      .from("baux")
      .select("logement_id")
      .eq("id", document_id)
      .eq("proprietaire_id", proprietaire_id)
      .maybeSingle();

    if (bail?.logement_id) {
      const { data: logement } = await supabaseAdmin
        .from("logements")
        .select("nom, adresse")
        .eq("id", bail.logement_id)
        .maybeSingle();

      if (logement) {
        const parts = [logement.nom, logement.adresse].filter(Boolean).map((v) => String(v).trim());
        documentContext = parts.join(" — ");
      }
    }
  }

  if (document_type === "contrat_sejour") {
    const { data: reservation } = await supabaseAdmin
      .from("reservations")
      .select("date_arrivee, date_depart")
      .eq("id", document_id)
      .eq("proprietaire_id", proprietaire_id)
      .maybeSingle();

    if (reservation) {
      const fmt = (d: string) => new Date(d).toLocaleDateString("fr-FR");
      documentContext = `Du ${fmt(String(reservation.date_arrivee))} au ${fmt(String(reservation.date_depart))}`;
    }
  }

  if (document_type === "edl") {
    const { data: edl } = await supabaseAdmin
      .from("etats_des_lieux")
      .select("type, type_etat, logement_id, date_etat")
      .eq("id", document_id)
      .eq("proprietaire_id", proprietaire_id)
      .maybeSingle();

    const { data: logement } = edl?.logement_id
      ? await supabaseAdmin.from("logements").select("nom, adresse").eq("id", edl.logement_id).maybeSingle()
      : { data: null };

    const typeRaw = String(edl?.type ?? edl?.type_etat ?? "").toLowerCase();
    const typeLabel = typeRaw === "entree" ? "Entrée" : "Sortie";

    documentContext = [
      logement?.nom ? String(logement.nom) : null,
      `État des lieux ${typeLabel}`,
      edl?.date_etat ? new Date(String(edl.date_etat)).toLocaleDateString("fr-FR") : null,
    ]
      .filter(Boolean)
      .join(" — ");
  }

  return { proprietaireNomComplet, documentTypeHuman, documentContext };
}

async function verifyDocumentOwnership(
  document_type: string,
  document_id: string,
  proprietaire_id: string,
): Promise<boolean> {
  switch (document_type) {
    case "bail": {
      const { data } = await supabaseAdmin
        .from("baux")
        .select("id")
        .eq("id", document_id)
        .eq("proprietaire_id", proprietaire_id)
        .maybeSingle();
      return !!data;
    }
    case "edl": {
      const { data } = await supabaseAdmin
        .from("etats_des_lieux")
        .select("id")
        .eq("id", document_id)
        .eq("proprietaire_id", proprietaire_id)
        .maybeSingle();
      return !!data;
    }
    case "contrat_sejour": {
      const { data } = await supabaseAdmin
        .from("reservations")
        .select("id")
        .eq("id", document_id)
        .eq("proprietaire_id", proprietaire_id)
        .maybeSingle();
      return !!data;
    }
    default:
      return false;
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }

    const { data: proprietaireSession } = await supabaseAdmin
      .from("proprietaires")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!proprietaireSession?.id) {
      return NextResponse.json({ error: "Profil propriétaire introuvable." }, { status: 403 });
    }

    const proprietaire_id = proprietaireSession.id;

    const body = (await request.json()) as SendBody;
    const document_type = String(body.document_type ?? "").trim();
    const document_id = String(body.document_id ?? "").trim();
    const signer_name = String(body.signer_name ?? "").trim();
    const signer_email = String(body.signer_email ?? "").trim();

    if (!document_type || !document_id || !signer_name || !signer_email) {
      return NextResponse.json({ error: "Champs requis manquants." }, { status: 400 });
    }

    const isOwner = await verifyDocumentOwnership(document_type, document_id, proprietaire_id);

    if (!isOwner) {
      return NextResponse.json(
        { error: "Document introuvable ou accès refusé." },
        { status: 403 },
      );
    }

    const planError = await assertStarterPlan(proprietaire_id);
    if (planError) return planError;

    if (!resend) {
      return NextResponse.json({ error: "RESEND_API_KEY manquant." }, { status: 500 });
    }

    const { data: proprietaire, error: propError } = await supabaseAdmin
      .from("proprietaires")
      .select("prenom, nom, email")
      .eq("id", proprietaire_id)
      .maybeSingle();

    if (propError) {
      return NextResponse.json({ error: propError.message }, { status: 500 });
    }

    const token = crypto.randomUUID();
    const otp_code = Math.floor(100000 + Math.random() * 900000).toString();
    const otp_expires_at = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

    const { error: insertError } = await supabaseAdmin.from("document_signatures").insert({
      document_type,
      document_id,
      proprietaire_id,
      signer_name,
      signer_email,
      token,
      otp_code,
      otp_expires_at,
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const pdfAttachment = await generateSignatureInvitePdfAttachment(
      document_type,
      document_id,
      proprietaire_id,
    );

    const { proprietaireNomComplet, documentTypeHuman, documentContext } =
      await loadSignatureEmailContext(document_type, document_id, proprietaire_id, proprietaire);

    const signUrl = `${siteBaseUrl()}/signer/${token}`;
    const html = emailSignatureOtpInvite({
      signerName: signer_name,
      otpCode: otp_code,
      signLink: signUrl,
      documentType: documentTypeHuman,
      proprietaireNom: proprietaireNomComplet,
      proprietaireEmail: String(proprietaire?.email ?? "").trim(),
      documentContext: documentContext || undefined,
    });

    const emailResult = await resend.emails.send({
      from: FROM,
      to: [signer_email],
      subject: emailSignatureOtpInviteSubject(documentTypeHuman),
      html,
      attachments: pdfAttachment
        ? [
            {
              filename: pdfAttachment.filename,
              content: pdfAttachment.content.toString("base64"),
            },
          ]
        : undefined,
    });

    if (emailResult.error) {
      return NextResponse.json({ error: emailResult.error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, token });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur serveur.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
