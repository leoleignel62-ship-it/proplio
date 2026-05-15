import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripeServerClient } from "@/lib/stripe";

export async function POST() {
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
      return NextResponse.json({ error: "Profil propriétaire introuvable." }, { status: 400 });
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
      return NextResponse.json({ error: "Aucun abonnement trouvé" }, { status: 400 });
    }

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
    if (!siteUrl) {
      return NextResponse.json({ error: "URL du site indisponible." }, { status: 500 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${siteUrl}/parametres/abonnement`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur portal." },
      { status: 500 },
    );
  }
}
