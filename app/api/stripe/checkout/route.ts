import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripeServerClient } from "@/lib/stripe";
import type { ProplioPlan } from "@/lib/plan-limits";

type CheckoutPayload = {
  priceId?: string;
  userId?: string;
  plan?: ProplioPlan;
};

const ALLOWED_PLANS: ProplioPlan[] = ["starter", "pro", "expert"];

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CheckoutPayload;
    const priceId = String(body.priceId ?? "").trim();
    const requestedPlan = body.plan;
    const requestedUserId = String(body.userId ?? "").trim();

    if (!priceId || !requestedPlan || !ALLOWED_PLANS.includes(requestedPlan)) {
      return NextResponse.json({ error: "Paramètres checkout invalides." }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Utilisateur non authentifié." }, { status: 401 });
    }
    if (requestedUserId && requestedUserId !== user.id) {
      return NextResponse.json({ error: "Utilisateur invalide." }, { status: 403 });
    }

    const { data: proprietaire, error: proprietaireError } = await supabase
      .from("proprietaires")
      .select("id, email")
      .eq("user_id", user.id)
      .maybeSingle();

    if (proprietaireError || !proprietaire) {
      return NextResponse.json({ error: "Profil propriétaire introuvable." }, { status: 400 });
    }

    const stripe = getStripeServerClient();
    const origin = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
    if (!origin) {
      return NextResponse.json({ error: "URL du site indisponible." }, { status: 500 });
    }

    const email = String(proprietaire.email ?? user.email ?? "").trim();
    let previousSubscriptionId: string | null = null;
    if (email) {
      const customers = await stripe.customers.list({ email, limit: 1 });
      const customer = customers.data[0];
      if (customer) {
        const activeSubscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          status: "active",
          limit: 1,
        });
        previousSubscriptionId = activeSubscriptions.data[0]?.id ?? null;
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      success_url: `${origin}/parametres/abonnement?success=true`,
      cancel_url: `${origin}/parametres/abonnement?canceled=true`,
      metadata: {
        userId: user.id,
        proprietaireId: String(proprietaire.id),
        plan: requestedPlan,
        ...(previousSubscriptionId ? { previous_subscription_id: previousSubscriptionId } : {}),
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          proprietaireId: String(proprietaire.id),
          plan: requestedPlan,
          ...(previousSubscriptionId ? { previous_subscription_id: previousSubscriptionId } : {}),
        },
      },
    });

    if (!session.url) {
      return NextResponse.json({ error: "Session Stripe invalide." }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur checkout." },
      { status: 500 },
    );
  }
}
