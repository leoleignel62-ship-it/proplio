import type { CookieOptionsWithName } from "@supabase/ssr";

/** En HTTPS (Vercel), forcer Secure évite des refus de cookie selon navigateur / politiques. */
export function getSupabaseSsrCookieOptions(): CookieOptionsWithName {
  if (process.env.NODE_ENV === "production") {
    return { secure: true, sameSite: "lax", path: "/" };
  }
  return { sameSite: "lax", path: "/" };
}
