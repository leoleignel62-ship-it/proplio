import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAuthOptions } from "@/lib/supabase/auth-options";

const PUBLIC_PATHS = [
  "/landing",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/mentions-legales",
  "/cgu",
  "/politique-de-confidentialite",
  "/qui-sommes-nous",
] as const;
const PUBLIC_API_PATHS = ["/api/stripe/webhook", "/api/irl"] as const;
const AUTH_PUBLIC_PREFIX = "/auth/";
const AUTH_PAGES = ["/login", "/register"] as const;

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path) || pathname.startsWith(AUTH_PUBLIC_PREFIX);
}

function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.some((path) => pathname === path);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_API_PATHS.some((path) => pathname === path)) {
    return NextResponse.next({ request });
  }

  const response = NextResponse.next({ request });

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

  const isPublic = isPublicPath(pathname);
  const onAuthPage = isAuthPage(pathname);

  if (!user && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/landing";
    const redirectResponse = NextResponse.redirect(url);
    response.cookies.getAll().forEach(({ name, value }) => {
      redirectResponse.cookies.set(name, value);
    });
    return redirectResponse;
  }

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const redirectResponse = NextResponse.redirect(url);
    response.cookies.getAll().forEach(({ name, value }) => {
      redirectResponse.cookies.set(name, value);
    });
    return redirectResponse;
  }

  if (user && onAuthPage) {
    if (pathname === "/login" && request.nextUrl.searchParams.get("verified") === "true") {
      return response;
    }
    const url = request.nextUrl.clone();
    url.pathname = "/";
    const redirectResponse = NextResponse.redirect(url);
    response.cookies.getAll().forEach(({ name, value }) => {
      redirectResponse.cookies.set(name, value);
    });
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
