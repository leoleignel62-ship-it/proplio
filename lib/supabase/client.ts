import { createBrowserClient } from "@supabase/ssr";
import { supabaseAuthOptions } from "@/lib/supabase/auth-options";
import { getSupabaseSsrCookieOptions } from "@/lib/supabase/cookie-options";
import { getSupabasePublicConfig } from "@/lib/supabase/env-public";

export function createSupabaseBrowserClient() {
  const { url, anonKey } = getSupabasePublicConfig();
  return createBrowserClient(url, anonKey, {
    auth: supabaseAuthOptions,
    cookieOptions: getSupabaseSsrCookieOptions(),
  });
}
