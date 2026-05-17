import { NextResponse } from "next/server";
import {
  documentsUrlForSignatureType,
  emailSignatureOwnerNotification,
  emailSignatureSignerConfirmation,
} from "@/lib/signature-email";
import { sendSupportEmail } from "@/lib/support/mail";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type CompleteBody = {
  token?: string;
  signature_data?: string;
};

function siteBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://locavio.fr").replace(/\/+$/, "");
}

function getClientIp(request: Request): string {
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0]?.trim() || "unknown";
  }
  const xRealIp = request.headers.get("x-real-ip");
  return xRealIp?.trim() || "unknown";
}

function sendPostSignatureEmails(sigDoc: {
  signer_email: string;
  signer_name: string;
  proprietaire_id: string;
  document_type: string;
  signed_at: string;
  signer_ip: string;
}): void {
  void (async () => {
    try {
      await sendSupportEmail({
        to: sigDoc.signer_email,
        subject: "Votre signature a été enregistrée — Locavio",
        html: emailSignatureSignerConfirmation({
          signerName: sigDoc.signer_name,
          signedAt: sigDoc.signed_at,
          documentType: sigDoc.document_type,
          signerIp: sigDoc.signer_ip,
        }),
      });

      const { data: proprio } = await supabaseAdmin
        .from("proprietaires")
        .select("email, prenom, nom")
        .eq("id", sigDoc.proprietaire_id)
        .maybeSingle();

      const ownerEmail = String(proprio?.email ?? "").trim();
      if (ownerEmail) {
        await sendSupportEmail({
          to: ownerEmail,
          subject: `${sigDoc.signer_name} a signé son document — Locavio`,
          html: emailSignatureOwnerNotification({
            proprietairePrenom: String(proprio?.prenom ?? "").trim(),
            signerName: sigDoc.signer_name,
            signerEmail: sigDoc.signer_email,
            signedAt: sigDoc.signed_at,
            documentType: sigDoc.document_type,
            documentsUrl: documentsUrlForSignatureType(sigDoc.document_type, siteBaseUrl()),
          }),
        });
      }
    } catch {
      /* fire-and-forget */
    }
  })();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CompleteBody;
    const token = String(body.token ?? "").trim();
    const signature_data = String(body.signature_data ?? "").trim();

    if (!token || !signature_data) {
      return NextResponse.json({ error: "Token et signature requis." }, { status: 400 });
    }

    const { data: row, error: fetchError } = await supabaseAdmin
      .from("document_signatures")
      .select(
        "id, otp_verified_at, signed_at, signer_email, signer_name, proprietaire_id, document_type",
      )
      .eq("token", token)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!row) {
      return NextResponse.json({ error: "Lien de signature invalide." }, { status: 404 });
    }

    if (!row.otp_verified_at) {
      return NextResponse.json({ error: "Vérification OTP requise avant signature." }, { status: 400 });
    }

    if (row.signed_at) {
      return NextResponse.json({ error: "Ce document a déjà été signé." }, { status: 400 });
    }

    const signer_ip = getClientIp(request);
    const signer_user_agent = request.headers.get("user-agent") ?? "";
    const signed_at = new Date().toISOString();

    const { error: updateError } = await supabaseAdmin
      .from("document_signatures")
      .update({
        signature_data,
        signed_at,
        signer_ip,
        signer_user_agent,
      })
      .eq("id", row.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    sendPostSignatureEmails({
      signer_email: String(row.signer_email ?? "").trim(),
      signer_name: String(row.signer_name ?? "").trim(),
      proprietaire_id: String(row.proprietaire_id ?? ""),
      document_type: String(row.document_type ?? ""),
      signed_at,
      signer_ip,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur serveur.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
