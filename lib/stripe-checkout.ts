import type { LocavioPlan } from "@/lib/plan-limits";

export const STRIPE_PRICE_IDS: Record<
  Exclude<LocavioPlan, "free">,
  { monthly: string; yearly: string }
> = {
  starter: {
    monthly: "price_1TZSOTCMmhzifgoaEeRjQLuM",
    yearly: "price_1TZSQ9CMmhzifgoaNi1WdACf",
  },
  pro: {
    monthly: "price_1TZSQyCMmhzifgoaBeF6VOV4",
    yearly: "price_1TZSRJCMmhzifgoa68dZ2Rte",
  },
  expert: {
    monthly: "price_1TZSS8CMmhzifgoaaoWARTy7",
    yearly: "price_1TZSSOCMmhzifgoanW6kJw19",
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
