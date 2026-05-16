import { NextResponse } from "next/server";
import { assertAdminUser } from "@/lib/admin/assert-admin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { normalizePlan, type LocavioPlan } from "@/lib/plan-limits";

export const dynamic = "force-dynamic";

const ALLOWED_PLANS: LocavioPlan[] = ["free", "starter", "pro", "expert"];

export async function GET() {
  try {
    const auth = await assertAdminUser();
    if (!auth.ok) {
      return NextResponse.json({ error: "Accès refusé." }, { status: auth.status });
    }

    const { data, error } = await supabaseAdmin
      .from("proprietaires")
      .select("id, nom, prenom, email, plan, override_plan, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ users: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await assertAdminUser();
    if (!auth.ok) {
      return NextResponse.json({ error: "Accès refusé." }, { status: auth.status });
    }

    const body = (await request.json()) as {
      id?: string;
      plan?: string;
      override_plan?: string | null;
    };
    const id = String(body.id ?? "").trim();
    if (!id) {
      return NextResponse.json({ error: "id requis." }, { status: 400 });
    }

    const patch: Record<string, unknown> = {};
    if (body.plan !== undefined) {
      const plan = normalizePlan(body.plan);
      if (!ALLOWED_PLANS.includes(plan)) {
        return NextResponse.json({ error: "Plan invalide." }, { status: 400 });
      }
      patch.plan = plan;
    }
    if (body.override_plan !== undefined) {
      if (body.override_plan === null || String(body.override_plan).trim() === "") {
        patch.override_plan = null;
      } else {
        const simulated = normalizePlan(body.override_plan);
        if (!ALLOWED_PLANS.includes(simulated)) {
          return NextResponse.json({ error: "Plan simulé invalide." }, { status: 400 });
        }
        patch.override_plan = simulated;
      }
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Aucune modification." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("proprietaires")
      .update(patch)
      .eq("id", id)
      .select("id, nom, prenom, email, plan, override_plan, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ user: data });
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
