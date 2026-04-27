/**
 * Variables publiques Supabase (build + runtime).
 * Sur Vercel : définir pour Production (et Preview si besoin) :
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY (clé anon ou publishable sb_publishable_…)
 * - NEXT_PUBLIC_SITE_URL (ex. https://ton-app.vercel.app) — recommandé pour redirects cohérents
 */
export function getSupabasePublicConfig(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) {
    throw new Error(
      "[Locavio] NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY sont requis (Vercel → Settings → Environment Variables).",
    );
  }
  return { url, anonKey };
}
