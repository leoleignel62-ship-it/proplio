import { loadStripe } from "@stripe/stripe-js";
import Stripe from "stripe";

let stripeServerClient: Stripe | null = null;
let stripeBrowserPromise: ReturnType<typeof loadStripe> | null = null;

export function getStripeServerClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY est manquante.");
  }

  if (!stripeServerClient) {
    stripeServerClient = new Stripe(secretKey);
  }

  return stripeServerClient;
}

export function getStripeBrowserClient() {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) {
    throw new Error("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY est manquante.");
  }

  if (!stripeBrowserPromise) {
    stripeBrowserPromise = loadStripe(publishableKey);
  }

  return stripeBrowserPromise;
}
