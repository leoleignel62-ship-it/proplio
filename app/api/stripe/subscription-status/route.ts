import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripeServerClient } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { data: proprietaire, error: proprietaireError } = await supabase
      .from("proprietaires")
      .select("stripe_customer_id, email")
      .eq("user_id", user.id)
      .maybeSingle();

    if (proprietaireError || !proprietaire) {
      return NextResponse.json({ cancelAtPeriodEnd: false, currentPeriodEnd: null });
    }

    const stripe = getStripeServerClient();
    let customerId = String((proprietaire as { stripe_customer_id?: string | null }).stripe_customer_id ?? "").trim();

    if (!customerId) {
      const email = String((proprietaire as { email?: string | null }).email ?? user.email ?? "").trim();
      if (email) {
        const customers = await stripe.customers.list({ email, limit: 1 });
        customerId = customers.data[0]?.id ?? "";
      }
    }

    if (!customerId) {
      return NextResponse.json({ cancelAtPeriodEnd: false, currentPeriodEnd: null });
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
    });

    if (!subscriptions.data.length) {
      return NextResponse.json({ cancelAtPeriodEnd: false, currentPeriodEnd: null });
    }

    const sub = subscriptions.data[0];

    const cancelAt = sub.cancel_at;
    const cancelAtPeriodEnd = sub.cancel_at_period_end;
    const isCanceling =
      cancelAtPeriodEnd || (cancelAt !== null && cancelAt > Math.floor(Date.now() / 1000));
    const endDate = cancelAt || (sub.items.data[0]?.current_period_end ?? null);

    const payload = {
      cancelAtPeriodEnd: isCanceling,
      currentPeriodEnd: endDate,
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Erreur inattendue lors de la lecture du statut d'abonnement.");
    return NextResponse.json(
      {
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
        error: error instanceof Error ? error.message : "Erreur lecture abonnement.",
      },
      { status: 500 },
    );
  }
}
