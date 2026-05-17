import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type VerifyBody = {
  token?: string;
  otp?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VerifyBody;
    const token = String(body.token ?? "").trim();
    const otp = String(body.otp ?? "").trim();

    if (!token || !otp) {
      return NextResponse.json({ error: "Token et code OTP requis." }, { status: 400 });
    }

    const { data: row, error: fetchError } = await supabaseAdmin
      .from("document_signatures")
      .select("id, otp_code, otp_expires_at, otp_verified_at")
      .eq("token", token)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!row) {
      return NextResponse.json({ error: "Lien de signature invalide." }, { status: 404 });
    }

    if (row.otp_verified_at) {
      return NextResponse.json({ error: "Ce code a déjà été utilisé." }, { status: 400 });
    }

    if (row.otp_code !== otp) {
      return NextResponse.json({ error: "Code incorrect." }, { status: 400 });
    }

    const expiresAt = new Date(String(row.otp_expires_at)).getTime();
    if (Number.isNaN(expiresAt) || expiresAt <= Date.now()) {
      return NextResponse.json({ error: "Ce code a expiré. Demandez un nouveau lien." }, { status: 400 });
    }

    const { error: updateError } = await supabaseAdmin
      .from("document_signatures")
      .update({ otp_verified_at: new Date().toISOString() })
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
