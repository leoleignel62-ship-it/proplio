import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function assertAdminUser(): Promise<{ ok: true } | { ok: false; status: 401 | 403 }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, status: 401 };
  }

  const { data: proprietaire, error } = await supabaseAdmin
    .from("proprietaires")
    .select("is_admin")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !proprietaire?.is_admin) {
    return { ok: false, status: 403 };
  }

  return { ok: true };
}
