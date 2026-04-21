import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAuthOptions } from "@/lib/supabase/auth-options";
import { getSupabaseSsrCookieOptions } from "@/lib/supabase/cookie-options";
import { getSupabasePublicConfig } from "@/lib/supabase/env-public";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabasePublicConfig();

  return createServerClient(url, anonKey, {
    auth: supabaseAuthOptions,
    cookieOptions: getSupabaseSsrCookieOptions(),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components ne peuvent pas toujours écrire les cookies ; le middleware rafraîchit la session.
        }
      },
    },
  });
}
