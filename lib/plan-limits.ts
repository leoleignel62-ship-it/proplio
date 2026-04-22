import { supabase } from "@/lib/supabase";

export type ProplioPlan = "free" | "starter" | "pro" | "expert";

type PlanLimits = {
  maxLogements: number | null;
  maxLocataires: number | null;
};

export const PLAN_LIMIT_ERROR_MESSAGE = "Limite atteinte - Passez au plan supérieur";
export const PLAN_UPGRADE_PATH = "/parametres/abonnement";

export const PLAN_LIMITS: Record<ProplioPlan, PlanLimits> = {
  free: {
    maxLogements: 1,
    maxLocataires: 1,
  },
  starter: {
    maxLogements: 3,
    maxLocataires: 3,
  },
  pro: {
    maxLogements: 10,
    maxLocataires: 10,
  },
  expert: {
    maxLogements: null,
    maxLocataires: null,
  },
};

function normalizePlan(plan: string | null | undefined): ProplioPlan {
  if (plan === "starter" || plan === "pro" || plan === "expert") return plan;
  return "free";
}

export async function getOwnerPlan(proprietaireId: string): Promise<ProplioPlan> {
  if (!proprietaireId) return "free";
  const { data } = await supabase
    .from("proprietaires")
    .select("plan")
    .eq("id", proprietaireId)
    .maybeSingle();

  return normalizePlan((data as { plan?: string | null } | null)?.plan);
}

export function canCreateLogement(
  plan: ProplioPlan,
  totalCreeCount: number,
  existingLogementsCount = 0,
): boolean {
  const max = PLAN_LIMITS[plan].maxLogements;
  const referenceCount = Math.max(
    Number.isFinite(totalCreeCount) ? totalCreeCount : 0,
    Number.isFinite(existingLogementsCount) ? existingLogementsCount : 0,
  );
  return max == null || referenceCount < max;
}

export function canCreateLocataire(plan: ProplioPlan, existingCount: number): boolean {
  const max = PLAN_LIMITS[plan].maxLocataires;
  const referenceCount = Number.isFinite(existingCount) ? existingCount : 0;
  return max == null || referenceCount < max;
}

export function canCreateQuittance(_plan: ProplioPlan, _monthlyCount: number): boolean {
  void _plan;
  void _monthlyCount;
  return true;
}

export function canCreateBail(_plan: ProplioPlan, _monthlyCount: number): boolean {
  void _plan;
  void _monthlyCount;
  return true;
}

export function canCreateEtatDesLieux(_plan: ProplioPlan, _monthlyCount: number): boolean {
  void _plan;
  void _monthlyCount;
  return true;
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

export async function getLogementsCumulCount(proprietaireId: string): Promise<number> {
  const { data } = await supabase
    .from("logements_cumul")
    .select("total_cree")
    .eq("proprietaire_id", proprietaireId)
    .maybeSingle();
  return Number((data as { total_cree?: number | null } | null)?.total_cree ?? 0);
}

export async function getOwnedCount(
  table: "logements" | "locataires",
  proprietaireId: string,
): Promise<number> {
  const { count } = await supabase
    .from(table)
    .select("id", { head: true, count: "exact" })
    .eq("proprietaire_id", proprietaireId);
  return count ?? 0;
}

export async function incrementLogementsCumul(proprietaireId: string): Promise<void> {
  const current = await getLogementsCumulCount(proprietaireId);
  await supabase
    .from("logements_cumul")
    .upsert(
      { proprietaire_id: proprietaireId, total_cree: current + 1 },
      { onConflict: "proprietaire_id" },
    );
}
