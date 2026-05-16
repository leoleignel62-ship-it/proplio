import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getStripeServerClient } from "@/lib/stripe";
import type { LocavioPlan } from "@/lib/plan-limits";

type CheckoutPayload = {
  priceId?: string;
  userId?: string;
  plan?: LocavioPlan;
  proprietaireId?: string;
};

const ALLOWED_PLANS: LocavioPlan[] = ["starter", "pro", "expert"];

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
    let customerId: string | null = null;
    let existingSubscription: Awaited<ReturnType<typeof stripe.subscriptions.list>>["data"][number] | null = null;
    if (email) {
      const customers = await stripe.customers.list({ email, limit: 1 });
      const customer = customers.data[0];
      if (customer) {
        customerId = customer.id;
        const activeSubscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          status: "active",
          limit: 1,
        });
        existingSubscription = activeSubscriptions.data[0] ?? null;
      }
    }

    if (existingSubscription && customerId) {
      console.log("[parrainage-debug] checkout: abonnement actif existant → portail (pas de coupon)", {
        customerId,
      });
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${origin}/parametres/abonnement`,
      });
      return NextResponse.json({ url: portalSession.url });
    }

    const proprietaireId = String(body.proprietaireId ?? proprietaire.id).trim();

    let checkoutDiscounts: { coupon: string }[] | undefined;
    const { data: referralProfile, error: referralProfileError } = await supabaseAdmin
      .from("proprietaires")
      .select("referred_by, plan")
      .eq("id", proprietaireId)
      .maybeSingle();

    console.log("[parrainage-debug] checkout: lecture filleul", {
      proprietaireId,
      referralProfileError: referralProfileError?.message ?? null,
      referralProfile,
    });

    const referredBy = String(referralProfile?.referred_by ?? "").trim();
    const currentPlan = String(referralProfile?.plan ?? "free").trim() || "free";

    console.log("[parrainage-debug] checkout: referred_by / plan", {
      referredBy: referredBy || "(vide)",
      currentPlan,
    });

    if (referredBy && currentPlan === "free") {
      const couponId = "x12wcXtt";
      checkoutDiscounts = [{ coupon: couponId }];
      console.log("[parrainage-debug] checkout: coupon appliqué", { couponId });
    } else {
      console.log("[parrainage-debug] checkout: coupon NON appliqué", {
        raison: !referredBy ? "referred_by vide" : `plan=${currentPlan} (attendu free)`,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      ...(customerId ? { customer: customerId } : { customer_email: email }),
      ...(checkoutDiscounts ? { discounts: checkoutDiscounts } : {}),
      success_url: `${origin}/parametres/abonnement?success=true`,
      cancel_url: `${origin}/parametres/abonnement?canceled=true`,
      metadata: {
        userId: user.id,
        proprietaireId: String(proprietaire.id),
        plan: requestedPlan,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          proprietaireId: String(proprietaire.id),
          plan: requestedPlan,
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
