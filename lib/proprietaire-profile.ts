import { supabase } from "@/lib/supabase";
import { formatSubmitError } from "@/lib/supabase-submit-error";
import type { User } from "@supabase/supabase-js";

export type ProprietaireProfile = {
  id?: string;
  user_id?: string;
  signature_path?: string | null;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresse: string;
  ville: string;
  code_postal: string;
  siret: string;
};

export const emptyProprietaireProfile: ProprietaireProfile = {
  nom: "",
  prenom: "",
  email: "",
  telephone: "",
  adresse: "",
  ville: "",
  code_postal: "",
  siret: "",
};

/** Profil minimum pour quittances / baux : nom, prénom et adresse (rue). */
export function isProprietaireOnboardingIncomplete(
  profile: Pick<ProprietaireProfile, "nom" | "prenom" | "adresse">,
): boolean {
  return !profile.nom.trim() || !profile.prenom.trim() || !profile.adresse.trim();
}

export async function getCurrentProprietaireId() {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      return { proprietaireId: null as string | null, error: { ...userError, message: formatSubmitError(userError) } };
    }
    if (!user) return { proprietaireId: null as string | null, error: null };

    const { data, error } = await supabase
      .from("proprietaires")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      return { proprietaireId: null as string | null, error: { ...error, message: formatSubmitError(error) } };
    }
    if (!data?.id) {
      const { data: ensuredData, error: ensureError } = await ensureProprietaireRow();
      if (ensureError) {
        return {
          proprietaireId: null as string | null,
          error: { ...ensureError, message: formatSubmitError(ensureError) },
        };
      }
      return { proprietaireId: (ensuredData?.id as string | undefined) ?? null, error: null };
    }

    return { proprietaireId: data.id as string, error: null };
  } catch (e) {
    return {
      proprietaireId: null as string | null,
      error: { message: formatSubmitError(e) } as { message: string },
    };
  }
}

export async function ensureProprietaireRow() {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) return { data: null, error: { ...userError, message: formatSubmitError(userError) } };
    if (!user) return { data: null, error: null };

    const { data: existing, error: selectError } = await supabase
      .from("proprietaires")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (selectError) return { data: null, error: { ...selectError, message: formatSubmitError(selectError) } };
    if (existing) {
      const md = (user.user_metadata ?? {}) as { prenom?: string; nom?: string };
      const prenomMeta = String(md.prenom ?? "").trim();
      const nomMeta = String(md.nom ?? "").trim();
      const prenomExisting = String((existing as { prenom?: string | null }).prenom ?? "").trim();
      const nomExisting = String((existing as { nom?: string | null }).nom ?? "").trim();

      // Si un trigger a créé une ligne incomplète, on la complète avec les valeurs saisies à l'inscription.
      if ((prenomMeta || nomMeta) && (!prenomExisting || !nomExisting)) {
        const { data: patched, error: patchError } = await supabase
          .from("proprietaires")
          .update({
            prenom: prenomMeta || prenomExisting,
            nom: nomMeta || nomExisting,
          })
          .eq("user_id", user.id)
          .select("*")
          .single();
        if (patchError) return { data: existing, error: null };
        return { data: patched, error: null };
      }
      return { data: existing, error: null };
    }

    const { data, error } = await supabase
      .from("proprietaires")
      .insert({
        user_id: user.id,
        email: user.email ?? "",
      })
      .select()
      .single();

    if (error) return { data, error: { ...error, message: formatSubmitError(error) } };
    return { data, error: null };
  } catch (e) {
    return { data: null, error: { message: formatSubmitError(e) } as { message: string } };
  }
}

export async function upsertProprietaireIdentityFromSignup({
  user,
  prenom,
  nom,
}: {
  user: User;
  prenom: string;
  nom: string;
}) {
  try {
    const prenomTrimmed = prenom.trim();
    const nomTrimmed = nom.trim();
    const { data, error } = await supabase
      .from("proprietaires")
      .upsert(
        {
          user_id: user.id,
          email: user.email ?? "",
          prenom: prenomTrimmed,
          nom: nomTrimmed,
        },
        { onConflict: "user_id" },
      )
      .select("*")
      .single();
    if (error) return { data: null, error: { ...error, message: formatSubmitError(error) } };
    return { data, error: null };
  } catch (e) {
    return { data: null, error: { message: formatSubmitError(e) } as { message: string } };
  }
}

export async function fetchProprietaireProfile() {
  try {
    const { data: ensuredData, error: ensureError } = await ensureProprietaireRow();
    if (ensureError) return { profile: null, error: ensureError };
    if (!ensuredData) return { profile: null, error: null };

    return { profile: ensuredData as ProprietaireProfile, error: null };
  } catch (e) {
    return { profile: null, error: { message: formatSubmitError(e) } as { message: string } };
  }
}

export async function saveProprietaireProfile(profile: ProprietaireProfile) {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) return { data: null, error: { ...userError, message: formatSubmitError(userError) } };
    if (!user) return { data: null, error: { message: "Vous devez être connecté pour enregistrer le profil." } };

    const { data: existing, error: selectError } = await supabase
      .from("proprietaires")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (selectError) return { data: null, error: { ...selectError, message: formatSubmitError(selectError) } };

    const siretVal = profile.siret?.trim() ? profile.siret.trim() : null;

    if (!existing) {
      const { data, error } = await supabase
        .from("proprietaires")
        .insert({
          user_id: user.id,
          nom: profile.nom.trim(),
          prenom: profile.prenom.trim(),
          email: profile.email.trim(),
          telephone: profile.telephone.trim(),
          adresse: profile.adresse.trim(),
          ville: profile.ville.trim(),
          code_postal: profile.code_postal.trim(),
          siret: siretVal,
          signature_path: profile.signature_path ?? null,
        })
        .select()
        .single();
      if (error) return { data: null, error: { ...error, message: formatSubmitError(error) } };
      return { data, error: null };
    }

    const { data, error } = await supabase
      .from("proprietaires")
      .update({
        nom: profile.nom.trim(),
        prenom: profile.prenom.trim(),
        email: profile.email.trim(),
        telephone: profile.telephone.trim(),
        adresse: profile.adresse.trim(),
        ville: profile.ville.trim(),
        code_postal: profile.code_postal.trim(),
        siret: siretVal,
        signature_path: profile.signature_path ?? null,
      })
      .eq("user_id", user.id)
      .select()
      .single();
    if (error) return { data: null, error: { ...error, message: formatSubmitError(error) } };
    return { data, error: null };
  } catch (e) {
    return { data: null, error: { message: formatSubmitError(e) } as { message: string } };
  }
}
