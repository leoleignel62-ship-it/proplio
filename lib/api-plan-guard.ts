import { NextResponse } from "next/server";
import { getEffectivePlan } from "@/lib/proprietaire-profile";
import { canAccessStarterFeatures } from "@/lib/plan-limits";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function assertStarterPlan(proprietaireId: string): Promise<NextResponse | null> {
  const { data: proprio } = await supabaseAdmin
    .from("proprietaires")
    .select("plan, override_plan")
    .eq("id", proprietaireId)
    .maybeSingle();

  const plan = getEffectivePlan(proprio);

  if (!canAccessStarterFeatures(plan)) {
    return NextResponse.json(
      { error: "Cette fonctionnalité nécessite le plan Starter ou supérieur." },
      { status: 403 },
    );
  }
  return null;
}
