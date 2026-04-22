import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripeServerClient } from "@/lib/stripe";

export async function POST(request: Request) {
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
      return NextResponse.json({ error: "Profil propriétaire introuvable." }, { status: 400 });
    }

    const email = String(proprietaire.email ?? user.email ?? "").trim();
    if (!email) {
      return NextResponse.json({ error: "Email client introuvable." }, { status: 400 });
    }

    const stripe = getStripeServerClient();
    const customers = await stripe.customers.list({ email, limit: 1 });
    const customer = customers.data[0];
    if (!customer) {
      return NextResponse.json({ error: "Client Stripe introuvable." }, { status: 404 });
    }

    const origin = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
    if (!origin) {
      return NextResponse.json({ error: "URL du site indisponible." }, { status: 500 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${origin}/parametres/abonnement`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur portal." },
      { status: 500 },
    );
  }
}
