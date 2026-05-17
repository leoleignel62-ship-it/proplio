import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type CompleteBody = {
  token?: string;
  signature_data?: string;
};

function getClientIp(request: Request): string {
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0]?.trim() || "unknown";
  }
  const xRealIp = request.headers.get("x-real-ip");
  return xRealIp?.trim() || "unknown";
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
      .select("id, otp_verified_at, signed_at")
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

    const { error: updateError } = await supabaseAdmin
      .from("document_signatures")
      .update({
        signature_data,
        signed_at: new Date().toISOString(),
        signer_ip,
        signer_user_agent,
      })
      .eq("id", row.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur serveur.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
