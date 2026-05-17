import Stripe from "stripe";
import { NextResponse } from "next/server";
import { normalizePlan, type LocavioPlan } from "@/lib/plan-limits";
import {
  applySoftLockForPlanTransition,
} from "@/lib/soft-lock";
import { getStripeServerClient } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { STRIPE_PRICE_IDS } from "@/lib/stripe-checkout";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function resolveProprietaireId(
  ownerId: string | null,
  userId: string | null,
): Promise<string | null> {
  if (ownerId) return ownerId;
  if (!userId) return null;
  const { data } = await supabaseAdmin
    .from("proprietaires")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.id ?? null;
}

async function applyPlanUpdate(ownerId: string | null, userId: string | null, plan: string) {
  const proprietaireId = await resolveProprietaireId(ownerId, userId);
  const newPlan = normalizePlan(plan) as LocavioPlan;

  if (proprietaireId) {
    const { data: currentProprio } = await supabaseAdmin
      .from("proprietaires")
      .select("plan")
      .eq("id", proprietaireId)
      .maybeSingle();
    const oldPlan = currentProprio?.plan ?? "free";

    await supabaseAdmin.from("proprietaires").update({ plan: newPlan }).eq("id", proprietaireId);

    try {
      await applySoftLockForPlanTransition(proprietaireId, oldPlan, newPlan);
    } catch (error) {
      console.warn("Soft-lock plan transition:", error);
    }
    return;
  }

  if (ownerId) {
    await supabaseAdmin.from("proprietaires").update({ plan: newPlan }).eq("id", ownerId);
    return;
  }
  if (userId) {
    await supabaseAdmin.from("proprietaires").update({ plan: newPlan }).eq("user_id", userId);
  }
}

function mapPriceIdToPlan(priceId: string | null | undefined): "starter" | "pro" | "expert" | null {
  if (!priceId) return null;
  if (priceId === STRIPE_PRICE_IDS.starter.monthly || priceId === STRIPE_PRICE_IDS.starter.yearly) return "starter";
  if (priceId === STRIPE_PRICE_IDS.pro.monthly || priceId === STRIPE_PRICE_IDS.pro.yearly) return "pro";
  if (priceId === STRIPE_PRICE_IDS.expert.monthly || priceId === STRIPE_PRICE_IDS.expert.yearly) return "expert";
  return null;
}

async function applyPlanUpdateByEmail(email: string, plan: "starter" | "pro" | "expert") {
  const newPlan = normalizePlan(plan) as LocavioPlan;
  const { data: currentProprio } = await supabaseAdmin
    .from("proprietaires")
    .select("id, plan")
    .eq("email", email)
    .maybeSingle();

  if (!currentProprio?.id) {
    await supabaseAdmin.from("proprietaires").update({ plan: newPlan }).eq("email", email);
    return;
  }

  const oldPlan = currentProprio.plan ?? "free";
  await supabaseAdmin.from("proprietaires").update({ plan: newPlan }).eq("id", currentProprio.id);

  try {
    await applySoftLockForPlanTransition(currentProprio.id, oldPlan, newPlan);
  } catch (error) {
    console.warn("Soft-lock plan transition:", error);
  }
}

function resolveStripeCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined,
): string | null {
  if (!customer) return null;
  if (typeof customer === "string") return customer;
  if ("deleted" in customer && customer.deleted) return null;
  return customer.id;
}

async function saveStripeCustomerId(
  customerId: string | null | undefined,
  userId: string | null,
  proprietaireId: string | null,
) {
  const id = String(customerId ?? "").trim();
  if (!id) return;

  if (userId) {
    await supabaseAdmin.from("proprietaires").update({ stripe_customer_id: id }).eq("user_id", userId);
    return;
  }
  if (proprietaireId) {
    await supabaseAdmin.from("proprietaires").update({ stripe_customer_id: id }).eq("id", proprietaireId);
  }
}

const PARRAIN_CREDIT_CENTIMES: Record<
  "starter" | "pro" | "expert",
  { monthly: number; yearly: number }
> = {
  starter: { monthly: 690, yearly: 575 },
  pro: { monthly: 1290, yearly: 1075 },
  expert: { monthly: 2490, yearly: 2075 },
};

function normalizeParrainPlan(plan: string | null | undefined): "starter" | "pro" | "expert" | null {
  const p = String(plan ?? "").trim().toLowerCase();
  if (p === "starter" || p === "pro" || p === "expert") return p;
  return null;
}

function subscriptionIsYearly(subscription: Stripe.Subscription): boolean {
  const interval = subscription.items.data[0]?.price?.recurring?.interval;
  return interval === "year";
}

async function rewardReferrerAfterFilleulConversion(stripe: Stripe, filleulProprietaireId: string | null) {
  if (!filleulProprietaireId) return;

  try {
    const { data: filleul, error: filleulError } = await supabaseAdmin
      .from("proprietaires")
      .select("id, referred_by, plan")
      .eq("id", filleulProprietaireId)
      .maybeSingle();

    if (filleulError) {
      console.warn("Parrainage récompense: filleul:", filleulError.message);
      return;
    }

    const referredBy = String(filleul?.referred_by ?? "").trim();
    if (!referredBy || !filleul?.id) return;

    const { data: parrain, error: parrainError } = await supabaseAdmin
      .from("proprietaires")
      .select("id, stripe_customer_id, plan")
      .eq("referral_code", referredBy)
      .maybeSingle();

    if (parrainError) {
      console.warn("Parrainage récompense: parrain:", parrainError.message);
      return;
    }

    const parrainCustomerId = String(parrain?.stripe_customer_id ?? "").trim();
    const parrainPlan = normalizeParrainPlan(parrain?.plan);
    if (!parrain?.id || !parrainCustomerId || !parrainPlan) {
      console.warn("Parrainage récompense: parrain incomplet ou plan invalide.");
      return;
    }

    const { data: parrainage, error: parrainageError } = await supabaseAdmin
      .from("parrainages")
      .select("id")
      .eq("filleul_id", filleul.id)
      .eq("statut", "en_attente")
      .maybeSingle();

    if (parrainageError) {
      console.warn("Parrainage récompense: parrainage:", parrainageError.message);
      return;
    }
    if (!parrainage?.id) return;

    const subscriptions = await stripe.subscriptions.list({
      customer: parrainCustomerId,
      status: "active",
      limit: 1,
    });
    const activeSubscription = subscriptions.data[0];
    if (!activeSubscription) {
      console.warn("Parrainage récompense: aucun abonnement actif pour le parrain.");
      return;
    }

    const isYearly = subscriptionIsYearly(activeSubscription);
    const creditAmount = PARRAIN_CREDIT_CENTIMES[parrainPlan][isYearly ? "yearly" : "monthly"];

    await stripe.customers.createBalanceTransaction(parrainCustomerId, {
      amount: -creditAmount,
      currency: "eur",
      description: "Récompense parrainage Locavio - 1 mois offert",
    });

    const { error: updateParrainageError } = await supabaseAdmin
      .from("parrainages")
      .update({
        statut: "converti",
        mois_credites: 1,
        converted_at: new Date().toISOString(),
      })
      .eq("id", parrainage.id);

    if (updateParrainageError) {
      console.warn("Parrainage récompense: mise à jour parrainage:", updateParrainageError.message);
    }
  } catch (error) {
    console.warn("Parrainage récompense:", error);
  }
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook error" }, { status: 400 });
  }

  try {
    const payload = await request.text();
    const stripe = getStripeServerClient();
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error) {
      console.error("Erreur vérification signature Stripe:", error);
      throw error;
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata ?? {};
      const plan = metadata.plan;
      const userId = metadata.userId ? String(metadata.userId) : null;
      const proprietaireId = metadata.proprietaireId ? String(metadata.proprietaireId) : null;

      await saveStripeCustomerId(resolveStripeCustomerId(session.customer), userId, proprietaireId);

      if (plan === "starter" || plan === "pro" || plan === "expert") {
        await applyPlanUpdate(proprietaireId, userId, plan);
        await rewardReferrerAfterFilleulConversion(stripe, proprietaireId);
      }
    }

    if (event.type === "customer.subscription.created") {
      const subscription = event.data.object as Stripe.Subscription;
      const metadata = subscription.metadata ?? {};
      const userId = metadata.userId ? String(metadata.userId) : null;
      const proprietaireId = metadata.proprietaireId ? String(metadata.proprietaireId) : null;

      await saveStripeCustomerId(resolveStripeCustomerId(subscription.customer), userId, proprietaireId);
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const metadata = subscription.metadata ?? {};
      await applyPlanUpdate(metadata.proprietaireId ?? null, metadata.userId ?? null, "free");
    }

    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const updatedPriceId = subscription.items.data[0]?.price?.id ?? null;
      const nextPlan = mapPriceIdToPlan(updatedPriceId);
      if (nextPlan) {
        const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
        if (customerId) {
          const customer = await stripe.customers.retrieve(customerId);
          const customerEmail = customer.deleted ? null : customer.email;
          if (customerEmail) {
            await applyPlanUpdateByEmail(customerEmail, nextPlan);
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook Stripe error:", error);
    return NextResponse.json(
      { error: "Webhook error" },
      { status: 400 },
    );
  }
}
