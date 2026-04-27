"use client";

import Link from "next/link";
import { useState } from "react";
import { BtnPrimary } from "@/components/ui";
import { PC } from "@/lib/locavio-colors";
import { startStripeCheckout } from "@/lib/stripe-checkout";
import type { LocavioPlan } from "@/lib/plan-limits";
import { panelCard } from "@/lib/locavio-field-styles";
import type { CSSProperties } from "react";

const HERO_CARD: CSSProperties = {
  ...panelCard,
  padding: 28,
  background: `linear-gradient(145deg, ${PC.primaryBg10} 0%, ${PC.card} 45%, rgba(91, 33, 182, 0.12) 100%)`,
  border: `1px solid ${PC.primaryBorder40}`,
};

const PLAN_CARD: CSSProperties = {
  ...panelCard,
  padding: 20,
  backgroundColor: PC.bg,
  border: `1px solid ${PC.border}`,
};

type PaidPlan = Exclude<LocavioPlan, "free">;

const PLAN_ROWS: Array<{
  id: PaidPlan;
  label: string;
  monthlyLine: string;
  yearlyLine: string;
  cta: string;
}> = [
  {
    id: "starter",
    label: "Starter",
    monthlyLine: "4,90 €/mois",
    yearlyLine: "49 €/an",
    cta: "Choisir Starter",
  },
  {
    id: "pro",
    label: "Pro",
    monthlyLine: "9,90 €/mois",
    yearlyLine: "99 €/an",
    cta: "Choisir Pro",
  },
  {
    id: "expert",
    label: "Expert",
    monthlyLine: "19,90 €/mois",
    yearlyLine: "199 €/an",
    cta: "Choisir Expert",
  },
];

const copy = {
  baux: {
    kicker: "Baux",
    benefits:
      "Passez au Starter pour rédiger des baux conformes (loi Alur, loi de 1989), générer des PDF signables et les envoyer par e-mail — vos données propriétaire et locataire sont injectées automatiquement.",
  },
  "etats-des-lieux": {
    kicker: "États des lieux",
    benefits:
      "Débloquez les états des lieux d’entrée et de sortie : pièces détaillées, photos, compteurs et PDF Locavio, pour une traçabilité complète et des comparaisons entrée / sortie.",
  },
  "revisions-irl": {
    kicker: "Révision IRL",
    benefits:
      "Calculez la révision annuelle selon l’indice INSEE, validez le nouveau loyer, conservez l’historique et envoyez la lettre officielle en PDF par e-mail au locataire.",
  },
  saisonnier: {
    kicker: "Location saisonnière",
    benefits:
      "Gérez vos réservations courte durée, voyageurs, calendriers iCal (Airbnb / Booking), taxes de séjour, ménages entre séjours, contrats et reçus PDF — le tout aux côtés de votre activité classique.",
  },
} as const;

export type PlanFreeModuleUpsellVariant = keyof typeof copy;

export function PlanFreeModuleUpsell({ variant }: { variant: PlanFreeModuleUpsellVariant }) {
  const { kicker, benefits } = copy[variant];
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [loadingPlanId, setLoadingPlanId] = useState<PaidPlan | null>(null);
  const [checkoutError, setCheckoutError] = useState("");

  async function onPlanCheckout(plan: PaidPlan) {
    setCheckoutError("");
    setLoadingPlanId(plan);
    try {
      await startStripeCheckout(plan, billing === "monthly" ? "monthly" : "yearly");
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : "Impossible de démarrer le paiement.");
      setLoadingPlanId(null);
    }
  }

  return (
    <section className="locavio-page-wrap space-y-10" style={{ color: PC.text }}>
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

        <div className="flex flex-col items-center gap-3">
          <p className="text-xs font-medium" style={{ color: PC.muted }}>
            Facturation
          </p>
          <div
            className="relative grid w-full max-w-[280px] grid-cols-2 rounded-full p-1"
            style={{
              backgroundColor: PC.card,
              border: `1px solid ${PC.border}`,
              boxShadow: "inset 0 1px 2px rgba(0,0,0,0.2)",
            }}
            role="group"
            aria-label="Mensuel ou annuel"
          >
            <div
              className="pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full transition-[transform,box-shadow] duration-300 ease-out"
              style={{
                backgroundColor: PC.primary,
                boxShadow: "0 2px 8px rgba(124, 58, 237, 0.45)",
                transform:
                  billing === "yearly" ? "translateX(calc(100% + 8px))" : "translateX(0)",
              }}
            />
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              className="relative z-10 rounded-full py-2.5 text-sm font-semibold transition-colors duration-300"
              style={{ color: billing === "monthly" ? PC.white : PC.muted }}
            >
              Mensuel
            </button>
            <button
              type="button"
              onClick={() => setBilling("yearly")}
              className="relative z-10 rounded-full py-2.5 text-sm font-semibold transition-colors duration-300"
              style={{ color: billing === "yearly" ? PC.white : PC.muted }}
            >
              Annuel
            </button>
          </div>

          {billing === "yearly" ? (
            <span
              className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-opacity duration-300"
              style={{
                backgroundColor: PC.primaryBg25,
                color: PC.secondary,
                border: `1px solid ${PC.primaryBorder40}`,
              }}
            >
              Économisez 2 mois 🎉
            </span>
          ) : null}
        </div>

        <div className="space-y-3">
          <p className="text-center text-xs" style={{ color: PC.muted }}>
            {billing === "monthly" ? (
              <>
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
              </>
            ) : (
              <>
                <span className="font-semibold" style={{ color: PC.primary }}>
                  Starter
                </span>{" "}
                49&nbsp;€/an
                <span style={{ color: PC.border }}> · </span>
                <span className="font-semibold" style={{ color: PC.secondary }}>
                  Pro
                </span>{" "}
                99&nbsp;€/an
                <span style={{ color: PC.border }}> · </span>
                <span className="font-semibold" style={{ color: PC.text }}>
                  Expert
                </span>{" "}
                199&nbsp;€/an
              </>
            )}
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            {PLAN_ROWS.map((row) => {
              const isLoading = loadingPlanId === row.id;
              const priceLabel = billing === "monthly" ? row.monthlyLine : row.yearlyLine;
              return (
                <div
                  key={row.id}
                  className="flex flex-col rounded-xl transition-[border-color,box-shadow] duration-300"
                  style={PLAN_CARD}
                >
                  <p className="text-center text-sm font-semibold" style={{ color: PC.text }}>
                    {row.label}
                  </p>
                  <p className="mt-2 text-center text-sm" style={{ color: PC.muted }}>
                    {priceLabel}
                  </p>
                  <BtnPrimary
                    className="mt-4 w-full"
                    size="small"
                    disabled={loadingPlanId !== null}
                    loading={isLoading}
                    style={{
                      opacity: loadingPlanId !== null && !isLoading ? 0.45 : 1,
                    }}
                    onClick={() => void onPlanCheckout(row.id)}
                  >
                    {row.cta}
                  </BtnPrimary>
                </div>
              );
            })}
          </div>
        </div>

        {checkoutError ? (
          <p className="text-center text-sm" style={{ color: PC.danger }}>
            {checkoutError}
          </p>
        ) : null}

        <div className="flex justify-center">
          <Link
            href="/parametres/abonnement"
            className="inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-medium transition hover:opacity-90"
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
