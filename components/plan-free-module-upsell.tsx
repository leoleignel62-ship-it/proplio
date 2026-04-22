"use client";

import Link from "next/link";
import { useState } from "react";
import { PC } from "@/lib/proplio-colors";
import { startStripeCheckout } from "@/lib/stripe-checkout";
import { panelCard } from "@/lib/proplio-field-styles";
import type { CSSProperties } from "react";

const HERO_CARD: CSSProperties = {
  ...panelCard,
  padding: 28,
  background: `linear-gradient(145deg, ${PC.primaryBg10} 0%, ${PC.card} 45%, rgba(91, 33, 182, 0.12) 100%)`,
  border: `1px solid ${PC.primaryBorder40}`,
};

const PRICE_CARD: CSSProperties = {
  ...panelCard,
  padding: 24,
  backgroundColor: PC.bg,
  border: `1px solid ${PC.border}`,
};

const copy = {
  baux: {
    kicker: "Baux",
    benefits:
      "Passez au Starter pour rédiger des baux conformes (loi Alur, loi de 1989), générer des PDF signables et les envoyer par e-mail — vos données propriétaire et locataire sont injectées automatiquement.",
  },
  "etats-des-lieux": {
    kicker: "États des lieux",
    benefits:
      "Débloquez les états des lieux d’entrée et de sortie : pièces détaillées, photos, compteurs et PDF Proplio, pour une traçabilité complète et des comparaisons entrée / sortie.",
  },
} as const;

export type PlanFreeModuleUpsellVariant = keyof typeof copy;

export function PlanFreeModuleUpsell({ variant }: { variant: PlanFreeModuleUpsellVariant }) {
  const { kicker, benefits } = copy[variant];
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  async function onStarterCheckout() {
    setCheckoutError("");
    setCheckoutLoading(true);
    try {
      await startStripeCheckout("starter", "monthly");
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : "Impossible de démarrer le paiement.");
      setCheckoutLoading(false);
    }
  }

  return (
    <section className="proplio-page-wrap space-y-10" style={{ color: PC.text }}>
      <div className="mx-auto max-w-2xl space-y-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: PC.secondary }}>
          {kicker}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl" style={{ color: PC.text }}>
          Fonctionnalité disponible à partir du plan Starter
        </h1>
        <p className="text-sm leading-relaxed sm:text-base" style={{ color: PC.muted }}>
          {benefits}
        </p>
      </div>

      <div className="mx-auto max-w-lg space-y-6" style={HERO_CARD}>
        <h2 className="text-center text-sm font-semibold" style={{ color: PC.text }}>
          Nos formules
        </h2>
        <div className="rounded-xl p-5" style={PRICE_CARD}>
          <p className="text-center text-sm leading-7 sm:text-base" style={{ color: PC.muted }}>
            <span className="font-semibold" style={{ color: PC.primary }}>
              Starter
            </span>{" "}
            4,90&nbsp;€/mois
            <span style={{ color: PC.border }}> · </span>
            <span className="font-semibold" style={{ color: PC.secondary }}>
              Pro
            </span>{" "}
            9,90&nbsp;€/mois
            <span style={{ color: PC.border }}> · </span>
            <span className="font-semibold" style={{ color: PC.text }}>
              Expert
            </span>{" "}
            19,90&nbsp;€/mois
          </p>
          <p className="mt-3 text-center text-xs" style={{ color: PC.muted }}>
            Tarifs mensuels indicatifs — facturation et engagement sur la page abonnement.
          </p>
        </div>

        {checkoutError ? (
          <p className="text-center text-sm" style={{ color: PC.danger }}>
            {checkoutError}
          </p>
        ) : null}

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            disabled={checkoutLoading}
            onClick={() => void onStarterCheckout()}
            className="inline-flex w-full items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold transition disabled:cursor-not-allowed sm:w-auto"
            style={{
              backgroundColor: PC.primary,
              color: PC.white,
              boxShadow: "0 4px 14px -2px rgba(124, 58, 237, 0.45)",
              opacity: checkoutLoading ? 0.75 : 1,
            }}
          >
            {checkoutLoading ? "Redirection vers Stripe…" : "Passer au plan Starter"}
          </button>
          <Link
            href="/parametres/abonnement"
            className="inline-flex w-full items-center justify-center rounded-xl px-5 py-2.5 text-sm font-medium sm:w-auto"
            style={{
              border: `1px solid ${PC.border}`,
              color: PC.muted,
              backgroundColor: PC.card,
            }}
          >
            Voir tous les plans
          </Link>
        </div>
      </div>
    </section>
  );
}
