import { assertAdminUser } from "@/lib/admin/assert-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ProprietaireSession = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
};

export async function getAuthenticatedProprietaire(): Promise<
  | { ok: true; proprietaire: ProprietaireSession }
  | { ok: false; status: 401 | 400; error: string }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, status: 401, error: "Utilisateur non authentifié." };
  }

  const { data, error } = await supabase
    .from("proprietaires")
    .select("id, nom, prenom, email")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data?.id) {
    return { ok: false, status: 400, error: "Profil propriétaire introuvable." };
  }

  return {
    ok: true,
    proprietaire: {
      id: String(data.id),
      nom: String(data.nom ?? ""),
      prenom: String(data.prenom ?? ""),
      email: String(data.email ?? "").trim(),
    },
  };
}

export async function isAdminSession(): Promise<boolean> {
  const auth = await assertAdminUser();
  return auth.ok;
}
