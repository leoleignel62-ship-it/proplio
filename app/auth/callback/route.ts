import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import {
  emailButton,
  emailGreeting,
  emailMutedNote,
  emailParagraph,
  emailRecapBox,
  wrapLocavioEmail,
} from "@/lib/email-templates";
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

  const welcomeEmailSent = Boolean(user?.user_metadata?.welcome_email_sent);

  if (resend && user?.email && user?.id && !welcomeEmailSent) {
    const prenom = String(user.user_metadata?.prenom ?? "").trim() || "cher propriétaire";
    const emailHtml = wrapLocavioEmail(
      [
        emailGreeting(prenom),
        emailParagraph(
          "Votre compte est confirmé. Bienvenue sur Locavio — votre espace de gestion locative est prêt.",
        ),
        emailRecapBox(
          `<strong style="color:#1a0533;">Pour bien démarrer :</strong><br/>
      1. Ajouter votre premier logement<br/>
      2. Créer votre premier locataire<br/>
      3. Générer votre première quittance`,
        ),
        emailButton("Accéder à mon espace →", "https://locavio.fr"),
        emailMutedNote('Une question ? Contactez-nous à <a href="mailto:contact@locavio.fr" style="color:#7c3aed;text-decoration:none;">contact@locavio.fr</a>'),
      ].join(""),
    );

    try {
      const emailResult = await resend.emails.send({
        from: "Locavio <noreply@locavio.fr>",
        to: [user.email],
        subject: "Bienvenue sur Locavio 🎉",
        html: emailHtml,
      });
      if (emailResult.error) {
        console.error("Welcome email failed:", emailResult.error.message);
      } else {
        const { error: updateUserError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
          user_metadata: {
            ...(user.user_metadata ?? {}),
            welcome_email_sent: true,
          },
        });
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
