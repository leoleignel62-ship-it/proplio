import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAuthOptions } from "@/lib/supabase/auth-options";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: supabaseAuthOptions,
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
    },
  );
}
