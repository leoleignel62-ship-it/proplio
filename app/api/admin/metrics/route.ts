import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { assertAdminUser } from "@/lib/admin/assert-admin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getStripeServerClient } from "@/lib/stripe";
import { STRIPE_PRICE_IDS } from "@/lib/stripe-checkout";
import { normalizePlan, type LocavioPlan } from "@/lib/plan-limits";

export const dynamic = "force-dynamic";

type MrrBreakdown = {
  mrr: number;
  mrrStarter: number;
  mrrPro: number;
  mrrExpert: number;
};

function priceIdToPaidPlan(priceId: string): Exclude<LocavioPlan, "free"> | null {
  if (
    priceId === STRIPE_PRICE_IDS.starter.monthly ||
    priceId === STRIPE_PRICE_IDS.starter.yearly
  ) {
    return "starter";
  }
  if (priceId === STRIPE_PRICE_IDS.pro.monthly || priceId === STRIPE_PRICE_IDS.pro.yearly) {
    return "pro";
  }
  if (
    priceId === STRIPE_PRICE_IDS.expert.monthly ||
    priceId === STRIPE_PRICE_IDS.expert.yearly
  ) {
    return "expert";
  }
  return null;
}

function computeMrrFromSubscriptions(subscriptions: Stripe.Subscription[]): MrrBreakdown {
  let mrrStarter = 0;
  let mrrPro = 0;
  let mrrExpert = 0;

  for (const sub of subscriptions) {
    for (const item of sub.items.data) {
      const price = item.price;
      if (!price || typeof price === "string") continue;
      const amount = Number(price.unit_amount ?? 0) / 100;
      const interval = price.recurring?.interval;
      let mrrAmount = 0;
      if (interval === "month") {
        mrrAmount = amount;
      } else if (interval === "year") {
        mrrAmount = amount / 12;
      } else {
        continue;
      }
      const plan = priceIdToPaidPlan(price.id);
      if (plan === "starter") mrrStarter += mrrAmount;
      else if (plan === "pro") mrrPro += mrrAmount;
      else if (plan === "expert") mrrExpert += mrrAmount;
    }
  }

  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    mrr: round(mrrStarter + mrrPro + mrrExpert),
    mrrStarter: round(mrrStarter),
    mrrPro: round(mrrPro),
    mrrExpert: round(mrrExpert),
  };
}

async function listAllActiveSubscriptions(stripe: Stripe): Promise<Stripe.Subscription[]> {
  const all: Stripe.Subscription[] = [];
  let startingAfter: string | undefined;

  for (;;) {
    const page = await stripe.subscriptions.list({
      status: "active",
      limit: 100,
      expand: ["data.items.data.price"],
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    all.push(...page.data);
    if (!page.has_more || page.data.length === 0) break;
    startingAfter = page.data[page.data.length - 1]!.id;
  }

  return all;
}

/** Aligne sur date_trunc('week', ...) PostgreSQL (semaine ISO, lundi). */
function pgWeekStart(iso: string): string {
  const d = new Date(iso);
  const daysFromMonday = (d.getUTCDay() + 6) % 7;
  const monday = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - daysFromMonday),
  );
  return monday.toISOString();
}

function buildLast8WeekStarts(): string[] {
  const now = new Date();
  const daysFromMonday = (now.getUTCDay() + 6) % 7;
  const thisMonday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysFromMonday),
  );
  const oldestMonday = new Date(thisMonday);
  oldestMonday.setUTCDate(oldestMonday.getUTCDate() - 7 * 7);

  const weeks: string[] = [];
  for (let i = 0; i < 8; i++) {
    const w = new Date(oldestMonday);
    w.setUTCDate(w.getUTCDate() + i * 7);
    weeks.push(w.toISOString());
  }
  return weeks;
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
    const since8Weeks = new Date(now - 8 * 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { count: totalUsers, error: totalUsersError },
      { data: proprietairesRows, error: proprietairesError },
      { count: parrainagesConvertis, error: parrainagesError },
      { count: quittancesCount, error: quittancesError },
      { count: bauxCount, error: bauxError },
      { count: edlCount, error: edlError },
    ] = await Promise.all([
      supabaseAdmin.from("proprietaires").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("proprietaires")
        .select("plan, created_at, updated_at, stripe_customer_id"),
      supabaseAdmin
        .from("parrainages")
        .select("id", { count: "exact", head: true })
        .eq("statut", "converti"),
      supabaseAdmin.from("quittances").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("baux").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("etats_des_lieux").select("id", { count: "exact", head: true }),
    ]);

    if (
      totalUsersError ||
      proprietairesError ||
      parrainagesError ||
      quittancesError ||
      bauxError ||
      edlError
    ) {
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
    let activeUsers7d = 0;
    let activeUsers30d = 0;
    let churned = 0;

    const weekBuckets = buildLast8WeekStarts();
    const weeklyCounts = new Map(weekBuckets.map((w) => [w, 0]));

    for (const row of proprietairesRows ?? []) {
      const plan = normalizePlan((row as { plan?: string | null }).plan);
      planCounts[plan] += 1;

      const createdAt = String((row as { created_at?: string | null }).created_at ?? "");
      if (createdAt >= since7d) newUsers7d += 1;
      if (createdAt >= since30d) newUsers30d += 1;

      const updatedAt = String((row as { updated_at?: string | null }).updated_at ?? "");
      if (updatedAt >= since7d) activeUsers7d += 1;
      if (updatedAt >= since30d) activeUsers30d += 1;

      const stripeCustomerId = String(
        (row as { stripe_customer_id?: string | null }).stripe_customer_id ?? "",
      ).trim();
      if (plan === "free" && stripeCustomerId) churned += 1;

      if (createdAt >= since8Weeks) {
        const weekKey = pgWeekStart(createdAt);
        if (weeklyCounts.has(weekKey)) {
          weeklyCounts.set(weekKey, (weeklyCounts.get(weekKey) ?? 0) + 1);
        }
      }
    }

    const weeklyGrowth = weekBuckets.map((week) => ({
      week,
      count: weeklyCounts.get(week) ?? 0,
    }));

    const stripe = getStripeServerClient();
    const subscriptions = await listAllActiveSubscriptions(stripe);
    const { mrr, mrrStarter, mrrPro, mrrExpert } = computeMrrFromSubscriptions(subscriptions);

    const documentsQuittances = quittancesCount ?? 0;
    const documentsBaux = bauxCount ?? 0;
    const documentsEdl = edlCount ?? 0;

    return NextResponse.json({
      totalUsers: totalUsers ?? 0,
      planCounts,
      mrr,
      mrrStarter,
      mrrPro,
      mrrExpert,
      newUsers7d,
      newUsers30d,
      parrainagesConvertis: parrainagesConvertis ?? 0,
      activeUsers7d,
      activeUsers30d,
      churned,
      weeklyGrowth,
      documentsTotal: documentsQuittances + documentsBaux + documentsEdl,
      documentsQuittances,
      documentsBaux,
      documentsEdl,
    });
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
