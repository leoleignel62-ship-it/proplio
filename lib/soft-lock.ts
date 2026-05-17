import { PLAN_LIMITS, normalizePlan, type LocavioPlan } from "@/lib/plan-limits";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const PLAN_ORDER: Record<LocavioPlan, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  expert: 3,
};

export function isPlanDowngrade(oldPlan: string | null | undefined, newPlan: LocavioPlan): boolean {
  return PLAN_ORDER[newPlan] < PLAN_ORDER[normalizePlan(oldPlan)];
}

export function isPlanUpgrade(oldPlan: string | null | undefined, newPlan: LocavioPlan): boolean {
  return PLAN_ORDER[newPlan] > PLAN_ORDER[normalizePlan(oldPlan)];
}

export async function softLockExcedentResources(
  proprietaireId: string,
  newPlan: LocavioPlan,
): Promise<void> {
  const limits = PLAN_LIMITS[newPlan];

  if (limits.maxLogements !== null) {
    const { data: logements } = await supabaseAdmin
      .from("logements")
      .select("id")
      .eq("proprietaire_id", proprietaireId)
      .order("created_at", { ascending: true });

    if (logements && logements.length > limits.maxLogements) {
      const toKeep = logements.slice(0, limits.maxLogements).map((l) => l.id);
      const toLock = logements.filter((l) => !toKeep.includes(l.id)).map((l) => l.id);

      if (toLock.length > 0) {
        await supabaseAdmin
          .from("logements")
          .update({ verrouille: true })
          .in("id", toLock)
          .eq("proprietaire_id", proprietaireId);
      }
    }
  }

  if (limits.maxLocataires !== null) {
    const { data: locataires } = await supabaseAdmin
      .from("locataires")
      .select("id")
      .eq("proprietaire_id", proprietaireId)
      .order("created_at", { ascending: true });

    if (locataires && locataires.length > limits.maxLocataires) {
      const toKeep = locataires.slice(0, limits.maxLocataires).map((l) => l.id);
      const toLock = locataires.filter((l) => !toKeep.includes(l.id)).map((l) => l.id);

      if (toLock.length > 0) {
        await supabaseAdmin
          .from("locataires")
          .update({ verrouille: true })
          .in("id", toLock)
          .eq("proprietaire_id", proprietaireId);
      }
    }
  }

  if (!limits.baux) {
    await supabaseAdmin
      .from("baux")
      .update({ verrouille: true })
      .eq("proprietaire_id", proprietaireId);
  }

  if (!limits.etatsDesLieux) {
    await supabaseAdmin
      .from("etats_des_lieux")
      .update({ verrouille: true })
      .eq("proprietaire_id", proprietaireId);
  }
}

export async function softUnlockResources(proprietaireId: string, newPlan: LocavioPlan): Promise<void> {
  const limits = PLAN_LIMITS[newPlan];

  if (limits.maxLogements !== null) {
    const { data: logements } = await supabaseAdmin
      .from("logements")
      .select("id")
      .eq("proprietaire_id", proprietaireId)
      .eq("verrouille", true)
      .order("created_at", { ascending: true });

    if (logements) {
      const { count: activeCount } = await supabaseAdmin
        .from("logements")
        .select("id", { count: "exact", head: true })
        .eq("proprietaire_id", proprietaireId)
        .eq("verrouille", false);

      const slotsDisponibles = limits.maxLogements - (activeCount ?? 0);

      if (slotsDisponibles > 0) {
        const toUnlock = logements.slice(0, slotsDisponibles).map((l) => l.id);

        if (toUnlock.length > 0) {
          await supabaseAdmin
            .from("logements")
            .update({ verrouille: false })
            .in("id", toUnlock)
            .eq("proprietaire_id", proprietaireId);
        }
      }
    }
  } else {
    await supabaseAdmin
      .from("logements")
      .update({ verrouille: false })
      .eq("proprietaire_id", proprietaireId);
  }

  if (limits.maxLocataires !== null) {
    const { data: locataires } = await supabaseAdmin
      .from("locataires")
      .select("id")
      .eq("proprietaire_id", proprietaireId)
      .eq("verrouille", true)
      .order("created_at", { ascending: true });

    if (locataires) {
      const { count: activeCount } = await supabaseAdmin
        .from("locataires")
        .select("id", { count: "exact", head: true })
        .eq("proprietaire_id", proprietaireId)
        .eq("verrouille", false);

      const slotsDisponibles = limits.maxLocataires - (activeCount ?? 0);

      if (slotsDisponibles > 0) {
        const toUnlock = locataires.slice(0, slotsDisponibles).map((l) => l.id);

        if (toUnlock.length > 0) {
          await supabaseAdmin
            .from("locataires")
            .update({ verrouille: false })
            .in("id", toUnlock)
            .eq("proprietaire_id", proprietaireId);
        }
      }
    }
  } else {
    await supabaseAdmin
      .from("locataires")
      .update({ verrouille: false })
      .eq("proprietaire_id", proprietaireId);
  }

  if (limits.baux) {
    await supabaseAdmin
      .from("baux")
      .update({ verrouille: false })
      .eq("proprietaire_id", proprietaireId);
  }

  if (limits.etatsDesLieux) {
    await supabaseAdmin
      .from("etats_des_lieux")
      .update({ verrouille: false })
      .eq("proprietaire_id", proprietaireId);
  }
}

export async function applySoftLockForPlanTransition(
  proprietaireId: string,
  oldPlan: string | null | undefined,
  newPlan: LocavioPlan,
): Promise<void> {
  if (isPlanDowngrade(oldPlan, newPlan)) {
    await softLockExcedentResources(proprietaireId, newPlan);
  } else if (isPlanUpgrade(oldPlan, newPlan)) {
    await softUnlockResources(proprietaireId, newPlan);
  }
}
