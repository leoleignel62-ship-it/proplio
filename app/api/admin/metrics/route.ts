import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { assertAdminUser } from "@/lib/admin/assert-admin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getStripeServerClient } from "@/lib/stripe";
import { normalizePlan, type LocavioPlan } from "@/lib/plan-limits";

export const dynamic = "force-dynamic";

function computeMrrFromSubscriptions(subscriptions: Stripe.Subscription[]): number {
  let mrr = 0;
  for (const sub of subscriptions) {
    for (const item of sub.items.data) {
      const price = item.price;
      if (!price || typeof price === "string") continue;
      const amount = Number(price.unit_amount ?? 0) / 100;
      const interval = price.recurring?.interval;
      if (interval === "month") {
        mrr += amount;
      } else if (interval === "year") {
        mrr += amount / 12;
      }
    }
  }
  return Math.round(mrr * 100) / 100;
}

export async function GET() {
  try {
    const auth = await assertAdminUser();
    if (!auth.ok) {
      return NextResponse.json({ error: "Accès refusé." }, { status: auth.status });
    }

    const now = Date.now();
    const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    const since30d = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { count: totalUsers, error: totalUsersError },
      { data: proprietairesRows, error: proprietairesError },
      { count: parrainagesConvertis, error: parrainagesError },
    ] = await Promise.all([
      supabaseAdmin.from("proprietaires").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("proprietaires").select("plan, created_at"),
      supabaseAdmin
        .from("parrainages")
        .select("id", { count: "exact", head: true })
        .eq("statut", "converti"),
    ]);

    if (totalUsersError || proprietairesError || parrainagesError) {
      return NextResponse.json({ error: "Erreur lors du chargement des métriques." }, { status: 500 });
    }

    const planCounts: Record<LocavioPlan, number> = {
      free: 0,
      starter: 0,
      pro: 0,
      expert: 0,
    };
    let newUsers7d = 0;
    let newUsers30d = 0;

    for (const row of proprietairesRows ?? []) {
      const plan = normalizePlan((row as { plan?: string | null }).plan);
      planCounts[plan] += 1;
      const createdAt = String((row as { created_at?: string | null }).created_at ?? "");
      if (createdAt >= since7d) newUsers7d += 1;
      if (createdAt >= since30d) newUsers30d += 1;
    }

    const stripe = getStripeServerClient();
    const subscriptions = await stripe.subscriptions.list({
      status: "active",
      limit: 100,
      expand: ["data.items.data.price"],
    });
    const mrr = computeMrrFromSubscriptions(subscriptions.data);

    return NextResponse.json({
      totalUsers: totalUsers ?? 0,
      planCounts,
      mrr,
      newUsers7d,
      newUsers30d,
      parrainagesConvertis: parrainagesConvertis ?? 0,
    });
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
