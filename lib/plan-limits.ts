import { supabase } from "@/lib/supabase";

export type ProplioPlan = "free" | "starter" | "pro" | "expert";

type PlanLimits = {
  maxLogements: number | null;
  maxLocataires: number | null;
  monthlyQuittances: number | null;
  monthlyBaux: number | null;
  monthlyEtatsDesLieux: number | null;
};

export const PLAN_LIMIT_ERROR_MESSAGE = "Limite atteinte - Passez au plan supérieur";
export const PLAN_UPGRADE_PATH = "/parametres/abonnement";

export const PLAN_LIMITS: Record<ProplioPlan, PlanLimits> = {
  free: {
    maxLogements: 1,
    maxLocataires: 1,
    monthlyQuittances: 1,
    monthlyBaux: 1,
    monthlyEtatsDesLieux: 1,
  },
  starter: {
    maxLogements: 3,
    maxLocataires: 3,
    monthlyQuittances: 3,
    monthlyBaux: 3,
    monthlyEtatsDesLieux: 3,
  },
  pro: {
    maxLogements: 10,
    maxLocataires: 10,
    monthlyQuittances: 10,
    monthlyBaux: 10,
    monthlyEtatsDesLieux: 10,
  },
  expert: {
    maxLogements: null,
    maxLocataires: null,
    monthlyQuittances: null,
    monthlyBaux: null,
    monthlyEtatsDesLieux: null,
  },
};

function normalizePlan(plan: string | null | undefined): ProplioPlan {
  if (plan === "starter" || plan === "pro" || plan === "expert") return plan;
  return "free";
}

export async function getOwnerPlan(proprietaireId: string): Promise<ProplioPlan> {
  const { data } = await supabase
    .from("proprietaires")
    .select("plan")
    .eq("id", proprietaireId)
    .maybeSingle();

  return normalizePlan((data as { plan?: string | null } | null)?.plan);
}

export function canCreateLogement(plan: ProplioPlan, existingCount: number): boolean {
  const max = PLAN_LIMITS[plan].maxLogements;
  return max == null || existingCount < max;
}

export function canCreateLocataire(plan: ProplioPlan, existingCount: number): boolean {
  const max = PLAN_LIMITS[plan].maxLocataires;
  return max == null || existingCount < max;
}

export function canCreateQuittance(plan: ProplioPlan, monthlyCount: number): boolean {
  const max = PLAN_LIMITS[plan].monthlyQuittances;
  return max == null || monthlyCount < max;
}

export function canCreateBail(plan: ProplioPlan, monthlyCount: number): boolean {
  const max = PLAN_LIMITS[plan].monthlyBaux;
  return max == null || monthlyCount < max;
}

export function canCreateEtatDesLieux(plan: ProplioPlan, monthlyCount: number): boolean {
  const max = PLAN_LIMITS[plan].monthlyEtatsDesLieux;
  return max == null || monthlyCount < max;
}

export async function getMonthlyCreatedCount(
  table: "quittances" | "baux" | "etats_des_lieux",
  proprietaireId: string,
): Promise<number> {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from(table)
    .select("id", { head: true, count: "exact" })
    .eq("proprietaire_id", proprietaireId)
    .gte("created_at", start.toISOString());

  return count ?? 0;
}
