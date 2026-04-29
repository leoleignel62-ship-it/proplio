import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseAuthOptions } from "@/lib/supabase/auth-options";
import { getSupabaseSsrCookieOptions } from "@/lib/supabase/cookie-options";
import { getSupabasePublicConfig } from "@/lib/supabase/env-public";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function getAppBaseUrl(request: NextRequest): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (siteUrl) return siteUrl;

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedHost) {
    return `${forwardedProto ?? "https"}://${forwardedHost}`;
  }

  return new URL(request.url).origin;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = requestUrl.searchParams.get("next") ?? "/";
  const baseUrl = getAppBaseUrl(request);
  const safeNext = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
  const afterVerify = safeNext === "/" ? "/login?verified=true" : safeNext;

  if (!code) {
    return NextResponse.redirect(new URL("/login", baseUrl));
  }

  const response = NextResponse.redirect(new URL(afterVerify, baseUrl));

  const { url, anonKey } = getSupabasePublicConfig();

  const supabase = createServerClient(url, anonKey, {
    auth: supabaseAuthOptions,
    cookieOptions: getSupabaseSsrCookieOptions(),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        if (headers) {
          Object.entries(headers).forEach(([key, value]) => {
            response.headers.set(key, value);
          });
        }
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/login", baseUrl));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  console.log("WELCOME DEBUG - user:", user?.id, user?.email);
  console.log("WELCOME DEBUG - welcome_email_sent:", user?.user_metadata?.welcome_email_sent);
  console.log("WELCOME DEBUG - resend instance:", !!resend);
  console.log("WELCOME DEBUG - RESEND_API_KEY exists:", !!process.env.RESEND_API_KEY);

  const welcomeEmailSent = Boolean(user?.user_metadata?.welcome_email_sent);

  if (resend && user?.email && user?.id && !welcomeEmailSent) {
    const prenom = String(user.user_metadata?.prenom ?? "").trim() || "cher propriétaire";
    const emailHtml = `
      <div style="background:#0f0f1a;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#f5f3ff;">
        <div style="max-width:600px;margin:0 auto;background:#141428;border:1px solid rgba(124,58,237,0.35);border-radius:14px;padding:28px;">
          <div style="text-align:center;margin-bottom:18px;">
            <img src="https://locavio.fr/logos/logomark-couleur.svg" alt="Locavio" height="40" style="height:40px;width:auto;display:inline-block;" />
          </div>
          <p style="margin:0 0 14px 0;font-size:16px;color:#f5f3ff;">Bonjour ${prenom},</p>
          <p style="margin:0 0 18px 0;color:#c4b5fd;line-height:1.6;">
            Bienvenue sur Locavio. Votre compte est confirme et votre espace est pret pour gerer vos locations avec serenite.
            En quelques minutes, vous pouvez deja mettre en place vos premiers automatismes.
          </p>
          <div style="margin:0 0 20px 0;padding:14px 16px;background:rgba(124,58,237,0.12);border:1px solid rgba(124,58,237,0.35);border-radius:10px;color:#ddd6fe;line-height:1.7;">
            <div>1️⃣ Ajouter votre premier logement</div>
            <div>2️⃣ Inviter votre premier locataire</div>
            <div>3️⃣ Generer votre premiere quittance</div>
          </div>
          <div style="text-align:center;margin:20px 0 18px 0;">
            <a href="https://locavio.fr/dashboard" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;border-radius:8px;padding:12px 24px;font-weight:600;">
              Acceder a mon espace
            </a>
          </div>
          <p style="margin:0;text-align:center;color:rgba(245,243,255,0.55);font-size:12px;">
            © 2026 Locavio · Axio Tech
          </p>
        </div>
      </div>
    `;

    try {
      console.log("WELCOME DEBUG - sending email to:", user.email);
      const emailResult = await resend.emails.send({
        from: "Locavio <noreply@locavio.fr>",
        to: [user.email],
        subject: "Bienvenue sur Locavio 🎉",
        html: emailHtml,
      });
      console.log("WELCOME DEBUG - email result:", JSON.stringify(emailResult));
      if (emailResult.error) {
        console.error("Welcome email failed:", emailResult.error.message);
      } else {
        const { error: updateUserError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
          user_metadata: {
            ...(user.user_metadata ?? {}),
            welcome_email_sent: true,
          },
        });
        console.log("WELCOME DEBUG - metadata updated, error:", updateUserError);
        if (updateUserError) {
          console.error("Welcome email metadata update failed:", updateUserError.message);
        }
      }
    } catch (sendError) {
      console.error("Welcome email exception:", sendError);
    }
  }

  return response;
}
