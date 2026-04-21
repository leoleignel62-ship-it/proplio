import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAuthOptions } from "@/lib/supabase/auth-options";
import { getSupabaseSsrCookieOptions } from "@/lib/supabase/cookie-options";
import { getSupabasePublicConfig } from "@/lib/supabase/env-public";

const PUBLIC_AUTH_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password"];
const REDIRECT_IF_AUTHENTICATED = ["/login", "/register"];

/** Copie cookies + en-têtes anti-cache de la réponse Supabase vers une redirection (évite perte de session sur Vercel). */
function mergeSupabaseResponseIntoRedirect(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    const { name, value, ...opts } = cookie;
    to.cookies.set(name, value, opts);
  });
  for (const key of ["cache-control", "expires", "pragma"] as const) {
    const v = from.headers.get(key);
    if (v) to.headers.set(key, v);
  }
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const { url, anonKey } = getSupabasePublicConfig();

  const supabase = createServerClient(url, anonKey, {
    auth: supabaseAuthOptions,
    cookieOptions: getSupabaseSsrCookieOptions(),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        if (headers) {
          Object.entries(headers).forEach(([key, value]) => {
            response.headers.set(key, value);
          });
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isApiRoute = path.startsWith("/api/");
  const isPublicAuthRoute =
    PUBLIC_AUTH_ROUTES.includes(path) || path.startsWith("/auth/");
  const shouldRedirectIfAuthenticated = REDIRECT_IF_AUTHENTICATED.includes(path);

  if (!user && !isPublicAuthRoute && !isApiRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    const redirect = NextResponse.redirect(loginUrl);
    mergeSupabaseResponseIntoRedirect(response, redirect);
    return redirect;
  }

  if (user && shouldRedirectIfAuthenticated) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    const redirect = NextResponse.redirect(homeUrl);
    mergeSupabaseResponseIntoRedirect(response, redirect);
    return redirect;
  }

  return response;
}
