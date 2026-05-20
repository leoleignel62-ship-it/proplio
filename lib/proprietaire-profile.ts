import { supabase } from "@/lib/supabase";
import { formatSubmitError } from "@/lib/supabase-submit-error";
import { normalizePlan, type LocavioPlan } from "@/lib/plan-limits";
import type { User } from "@supabase/supabase-js";

export type ProprietairePlanSource = {
  plan?: string | null;
  override_plan?: string | null;
};

/** Plan effectif pour accès / limites : override_plan si défini, sinon plan Stripe. */
export function getEffectivePlan(proprietaire: ProprietairePlanSource | null | undefined): LocavioPlan {
  const override = proprietaire?.override_plan;
  if (override != null && String(override).trim() !== "") {
    return normalizePlan(override);
  }
  return normalizePlan(proprietaire?.plan);
}

export type StatutBailleur =
  | "particulier_nu"
  | "particulier_meuble"
  | "lmnp_micro"
  | "lmnp_reel"
  | "lmp"
  | "indivision"
  | "usufruitier"
  | "sci_ir"
  | "sci_is"
  | "sarl_famille"
  | "sas_sasu"
  | "sci_attribution"
  | "mandataire";

export const STATUTS_BAILLEUR_VALIDES: StatutBailleur[] = [
  "particulier_nu",
  "particulier_meuble",
  "lmnp_micro",
  "lmnp_reel",
  "lmp",
  "indivision",
  "usufruitier",
  "sci_ir",
  "sci_is",
  "sarl_famille",
  "sas_sasu",
  "sci_attribution",
  "mandataire",
];

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
  statut_bailleur: StatutBailleur;
  nom_societe: string;
  siren_societe: string;
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
  statut_bailleur: "particulier_nu",
  nom_societe: "",
  siren_societe: "",
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

const REFERRAL_CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const REFERRAL_CODE_LENGTH = 6;
const REFERRAL_CODE_MAX_ATTEMPTS = 25;

function generateReferralCodeCandidate(): string {
  let code = "";
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
    code += REFERRAL_CODE_ALPHABET.charAt(Math.floor(Math.random() * REFERRAL_CODE_ALPHABET.length));
  }
  return code;
}

async function ensureReferralCodeForUser(userId: string) {
  const { data: codeRow, error: codeSelectError } = await supabase
    .from("proprietaires")
    .select("referral_code")
    .eq("user_id", userId)
    .maybeSingle();

  if (codeSelectError) {
    return { data: null as Record<string, unknown> | null, error: codeSelectError };
  }

  const existingCode = String((codeRow as { referral_code?: string | null } | null)?.referral_code ?? "").trim();
  if (existingCode) {
    return { data: null, error: null };
  }

  for (let attempt = 0; attempt < REFERRAL_CODE_MAX_ATTEMPTS; attempt++) {
    const candidate = generateReferralCodeCandidate();
    const { data: taken } = await supabase
      .from("proprietaires")
      .select("id")
      .eq("referral_code", candidate)
      .maybeSingle();

    if (taken) continue;

    const { data: updated, error: updateError } = await supabase
      .from("proprietaires")
      .update({ referral_code: candidate })
      .eq("user_id", userId)
      .select("*")
      .single();

    if (!updateError && updated) {
      return { data: updated as Record<string, unknown>, error: null };
    }
  }

  return {
    data: null,
    error: { message: "Impossible de générer un code de parrainage unique." } as { message: string },
  };
}

export async function ensureProprietaireRow() {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) return { data: null, error: { ...userError, message: formatSubmitError(userError) } };
    if (!user) return { data: null, error: null };

    let { data: existing, error: selectError } = await supabase
      .from("proprietaires")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (selectError) return { data: null, error: { ...selectError, message: formatSubmitError(selectError) } };

    if (!existing) {
      for (let attempt = 0; attempt < 3; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const retry = await supabase
          .from("proprietaires")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        if (retry.error) {
          return { data: null, error: { ...retry.error, message: formatSubmitError(retry.error) } };
        }
        if (retry.data) {
          existing = retry.data;
          break;
        }
      }
    }

    let row: Record<string, unknown> | null = null;

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
        row = (patchError ? existing : patched) as Record<string, unknown>;
      } else {
        row = existing as Record<string, unknown>;
      }
    } else {
      const { data, error } = await supabase
        .from("proprietaires")
        .insert({
          user_id: user.id,
          email: user.email ?? "",
        })
        .select()
        .single();

      if (error) return { data, error: { ...error, message: formatSubmitError(error) } };
      row = data as Record<string, unknown>;
    }

    const referralResult = await ensureReferralCodeForUser(user.id);
    if (referralResult.data) {
      return { data: referralResult.data, error: null };
    }

    return { data: row, error: null };
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
    const nomSocieteVal = profile.nom_societe?.trim() ? profile.nom_societe.trim() : null;
    const sirenSocieteVal = profile.siren_societe?.trim() ? profile.siren_societe.trim() : null;
    const statutBailleur: StatutBailleur = STATUTS_BAILLEUR_VALIDES.includes(
      profile.statut_bailleur as StatutBailleur,
    )
      ? (profile.statut_bailleur as StatutBailleur)
      : "particulier_nu";

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
          statut_bailleur: statutBailleur,
          nom_societe: nomSocieteVal,
          siren_societe: sirenSocieteVal,
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
        statut_bailleur: statutBailleur,
        nom_societe: nomSocieteVal,
        siren_societe: sirenSocieteVal,
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
