import type { SupabaseClientOptions } from "@supabase/supabase-js";

/**
 * Auth partagée navigateur / serveur / middleware : même clé de stockage (cookies)
 * pour éviter les sessions désynchronisées. `lock: undefined` désactive le verrou
 * cross-tab qui provoque l’erreur « Lock was released because another request stole it ».
 */
export const supabaseAuthOptions: NonNullable<SupabaseClientOptions<"public">["auth"]> = {
  storageKey: "locavio-auth-token",
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: true,
  lock: undefined,
};
