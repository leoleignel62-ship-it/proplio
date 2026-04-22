import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripeServerClient } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export type StripeSubscriptionPayload = {
  current_period_end: number;
  cancel_at_period_end: boolean;
  interval: "month" | "year" | null;
  status: Stripe.Subscription.Status;
};

function intervalFromSubscription(sub: Stripe.Subscription): "month" | "year" | null {
  const item = sub.items.data[0];
  const price = item?.price;
  if (!price || typeof price === "string") return null;
  const inv = price.recurring?.interval;
  if (inv === "year") return "year";
  if (inv === "month") return "month";
  return null;
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Utilisateur non authentifié." }, { status: 401 });
    }

    const { data: proprietaire, error: proprietaireError } = await supabase
      .from("proprietaires")
      .select("email")
      .eq("user_id", user.id)
      .maybeSingle();

    if (proprietaireError || !proprietaire) {
      return NextResponse.json({ subscription: null });
    }

    const email = String(proprietaire.email ?? user.email ?? "").trim();
    if (!email) {
      return NextResponse.json({ subscription: null });
    }

    const stripe = getStripeServerClient();
    const customers = await stripe.customers.list({ email, limit: 1 });
    const customer = customers.data[0];
    if (!customer) {
      return NextResponse.json({ subscription: null });
    }

    const list = await stripe.subscriptions.list({
      customer: customer.id,
      status: "active",
      limit: 10,
    });

    const latest = list.data.sort((a, b) => b.created - a.created)[0];
    if (!latest) {
      return NextResponse.json({ subscription: null });
    }

    const sub = await stripe.subscriptions.retrieve(latest.id, {
      expand: ["items.data.price"],
    });

    const lineItem = sub.items.data[0];
    if (!lineItem) {
      return NextResponse.json({ subscription: null });
    }

    const payload: StripeSubscriptionPayload = {
      current_period_end: lineItem.current_period_end,
      cancel_at_period_end: sub.cancel_at_period_end,
      interval: intervalFromSubscription(sub),
      status: sub.status,
    };

    return NextResponse.json({ subscription: payload });
  } catch (error) {
    console.error("stripe/subscription:", error);
    return NextResponse.json(
      {
        subscription: null,
        error: error instanceof Error ? error.message : "Erreur lecture abonnement Stripe.",
      },
      { status: 500 },
    );
  }
}
