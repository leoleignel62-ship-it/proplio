import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAuthOptions } from "@/lib/supabase/auth-options";
import { getSupabaseSsrCookieOptions } from "@/lib/supabase/cookie-options";
import { getSupabasePublicConfig } from "@/lib/supabase/env-public";

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

  if (!code) {
    return NextResponse.redirect(new URL("/login", baseUrl));
  }

  const redirectTarget = new URL(safeNext, baseUrl);
  const response = NextResponse.redirect(redirectTarget);

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

  return response;
}
