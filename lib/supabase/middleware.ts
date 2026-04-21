import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAuthOptions } from "@/lib/supabase/auth-options";

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

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: supabaseAuthOptions,
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
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublicAuthRoute =
    PUBLIC_AUTH_ROUTES.includes(path) || path.startsWith("/auth/");
  const shouldRedirectIfAuthenticated = REDIRECT_IF_AUTHENTICATED.includes(path);

  if (!user && !isPublicAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const redirect = NextResponse.redirect(url);
    mergeSupabaseResponseIntoRedirect(response, redirect);
    return redirect;
  }

  if (user && shouldRedirectIfAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    const redirect = NextResponse.redirect(url);
    mergeSupabaseResponseIntoRedirect(response, redirect);
    return redirect;
  }

  return response;
}
