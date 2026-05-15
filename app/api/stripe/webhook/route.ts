import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getStripeServerClient } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { STRIPE_PRICE_IDS } from "@/lib/stripe-checkout";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function applyPlanUpdate(ownerId: string | null, userId: string | null, plan: string) {
  if (ownerId) {
    await supabaseAdmin.from("proprietaires").update({ plan }).eq("id", ownerId);
    return;
  }
  if (userId) {
    await supabaseAdmin.from("proprietaires").update({ plan }).eq("user_id", userId);
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
  await supabaseAdmin.from("proprietaires").update({ plan }).eq("email", email);
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
