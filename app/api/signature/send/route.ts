import { NextResponse } from "next/server";
import { emailSignatureOtpInvite } from "@/lib/signature-email";
import { sendSupportEmail } from "@/lib/support/mail";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type SendBody = {
  document_type?: string;
  document_id?: string;
  signer_name?: string;
  signer_email?: string;
  proprietaire_id?: string;
};

function siteBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://locavio.fr").replace(/\/+$/, "");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SendBody;
    const document_type = String(body.document_type ?? "").trim();
    const document_id = String(body.document_id ?? "").trim();
    const signer_name = String(body.signer_name ?? "").trim();
    const signer_email = String(body.signer_email ?? "").trim();
    const proprietaire_id = String(body.proprietaire_id ?? "").trim();

    if (!document_type || !document_id || !signer_name || !signer_email || !proprietaire_id) {
      return NextResponse.json({ error: "Champs requis manquants." }, { status: 400 });
    }

    const { data: proprietaire, error: propError } = await supabaseAdmin
      .from("proprietaires")
      .select("prenom, nom")
      .eq("id", proprietaire_id)
      .maybeSingle();

    if (propError) {
      return NextResponse.json({ error: propError.message }, { status: 500 });
    }

    const proprietaireName = [proprietaire?.prenom, proprietaire?.nom].filter(Boolean).join(" ").trim() || "Un propriétaire";

    const token = crypto.randomUUID();
    const otp_code = Math.floor(100000 + Math.random() * 900000).toString();
    const otp_expires_at = new Date(Date.now() + 30 * 60 * 1000).toISOString();

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

    const signUrl = `${siteBaseUrl()}/signer/${token}`;
    const emailResult = await sendSupportEmail({
      to: signer_email,
      subject: "Vous avez un document à signer — Locavio",
      html: emailSignatureOtpInvite({
        signerName: signer_name,
        proprietaireName,
        otp: otp_code,
        signUrl,
      }),
    });

    if (!emailResult.ok) {
      return NextResponse.json({ error: emailResult.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, token });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur serveur.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
