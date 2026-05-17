import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Rate limiter en mémoire (simple, sans Redis)
const otpAttempts = new Map<
  string,
  {
    count: number;
    firstAttempt: number;
    blockedUntil?: number;
  }
>();

const OTP_MAX_ATTEMPTS = 5;
const OTP_WINDOW_MS = 15 * 60 * 1000;
const OTP_BLOCK_MS = 30 * 60 * 1000;

function checkOtpRateLimit(token: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = otpAttempts.get(token);

  if (record?.blockedUntil && now < record.blockedUntil) {
    return {
      allowed: false,
      retryAfter: Math.ceil((record.blockedUntil - now) / 1000),
    };
  }

  if (!record || now - record.firstAttempt > OTP_WINDOW_MS) {
    otpAttempts.set(token, { count: 1, firstAttempt: now });
    return { allowed: true };
  }

  record.count++;

  if (record.count > OTP_MAX_ATTEMPTS) {
    record.blockedUntil = now + OTP_BLOCK_MS;
    otpAttempts.set(token, record);
    return {
      allowed: false,
      retryAfter: Math.ceil(OTP_BLOCK_MS / 1000),
    };
  }

  otpAttempts.set(token, record);
  return { allowed: true };
}

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of otpAttempts.entries()) {
    if (now - val.firstAttempt > OTP_WINDOW_MS * 2) {
      otpAttempts.delete(key);
    }
  }
}, 60 * 1000);

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

    const rateLimit = checkOtpRateLimit(token);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Trop de tentatives. Réessayez dans ${Math.ceil((rateLimit.retryAfter ?? 1800) / 60)} minutes.`,
        },
        {
          status: 429,
          headers: rateLimit.retryAfter ? { "Retry-After": String(rateLimit.retryAfter) } : {},
        },
      );
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

    otpAttempts.delete(token);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Erreur inattendue lors de la vérification OTP.");
    const message = e instanceof Error ? e.message : "Erreur serveur.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
