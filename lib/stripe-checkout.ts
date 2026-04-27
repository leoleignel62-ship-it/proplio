import type { LocavioPlan } from "@/lib/plan-limits";

export const STRIPE_PRICE_IDS: Record<
  Exclude<LocavioPlan, "free">,
  { monthly: string; yearly: string }
> = {
  starter: {
    monthly: "price_1TP1G8RrlH0LxLdsFPBJq4m2",
    yearly: "price_1TP1IrRrlH0LxLdsg5KTrDGW",
  },
  pro: {
    monthly: "price_1TP1JcRrlH0LxLdsh1G51cEt",
    yearly: "price_1TP1JpRrlH0LxLdsVtuG9ArW",
  },
  expert: {
    monthly: "price_1TP1KJRrlH0LxLdsxI7AQzFx",
    yearly: "price_1TP1KcRrlH0LxLdslGa3Cy34",
  },
};

/**
 * Crée une session Checkout Stripe et redirige le navigateur vers l’URL de paiement.
 * @throws Error si la réponse API est en erreur ou sans URL.
 */
export async function startStripeCheckout(
  targetPlan: Exclude<LocavioPlan, "free">,
  interval: "monthly" | "yearly" = "monthly",
): Promise<void> {
  const response = await fetch("/api/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      priceId: STRIPE_PRICE_IDS[targetPlan][interval],
      plan: targetPlan,
    }),
  });
  const payload = (await response.json()) as { url?: string; error?: string };
  if (!response.ok || !payload.url) {
    throw new Error(payload.error || "Impossible de démarrer le paiement.");
  }
  window.location.assign(payload.url);
}
