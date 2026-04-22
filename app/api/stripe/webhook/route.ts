import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getStripeServerClient } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";

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

export async function POST(request: Request) {
  console.log("Webhook reçu");
  console.log("STRIPE_WEBHOOK_SECRET présent:", !!process.env.STRIPE_WEBHOOK_SECRET);

  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Signature webhook invalide." }, { status: 400 });
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

      if (plan === "starter" || plan === "pro" || plan === "expert") {
        await applyPlanUpdate(metadata.proprietaireId ?? null, metadata.userId ?? null, plan);
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const metadata = subscription.metadata ?? {};
      await applyPlanUpdate(metadata.proprietaireId ?? null, metadata.userId ?? null, "free");
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur webhook Stripe." },
      { status: 400 },
    );
  }
}
