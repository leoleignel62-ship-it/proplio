"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getCurrentProprietaireId } from "@/lib/proprietaire-profile";
import {
  PLAN_DISPLAY_FEATURES,
  PLAN_DISPLAY_LABELS,
  type PlanDisplayId,
} from "@/lib/plan-display-copy";
import { startStripeCheckout } from "@/lib/stripe-checkout";
import { PLAN_LIMITS, type ProplioPlan } from "@/lib/plan-limits";
import { supabase } from "@/lib/supabase";
import { PC } from "@/lib/proplio-colors";
import { panelCard } from "@/lib/proplio-field-styles";

type BillingPeriod = "monthly" | "yearly";

type PlanMarketing = {
  id: ProplioPlan;
  title: string;
  subtitle: string;
  monthlyPriceLabel: string;
  yearlyPriceLabel: string;
  annualSaveBadge: string | null;
  popular: boolean;
  features: string[];
  negatives?: string[];
};

const ABONNEMENT_PLAN_SUBTITLE: Record<PlanDisplayId, string> = {
  free: "Gratuit",
  starter: "Pour les petits propriétaires",
  pro: "Pour les investisseurs actifs",
  expert: "Pour les grands patrimoines",
};

const ABONNEMENT_PRICING: Record<
  PlanDisplayId,
  { monthlyPriceLabel: string; yearlyPriceLabel: string; annualSaveBadge: string | null; popular: boolean }
> = {
  free: {
    monthlyPriceLabel: "Gratuit",
    yearlyPriceLabel: "Gratuit",
    annualSaveBadge: null,
    popular: false,
  },
  starter: {
    monthlyPriceLabel: "4,90€/mois",
    yearlyPriceLabel: "49€/an",
    annualSaveBadge: "Économisez 9,80€/an",
    popular: false,
  },
  pro: {
    monthlyPriceLabel: "9,90€/mois",
    yearlyPriceLabel: "99€/an",
    annualSaveBadge: "Économisez 19,80€/an",
    popular: true,
  },
  expert: {
    monthlyPriceLabel: "19,90€/mois",
    yearlyPriceLabel: "199€/an",
    annualSaveBadge: "Économisez 39,80€/an",
    popular: false,
  },
};

const PLAN_ORDER: PlanDisplayId[] = ["free", "starter", "pro", "expert"];

const PLANS_MARKETING: PlanMarketing[] = PLAN_ORDER.map((id) => {
  const copy = PLAN_DISPLAY_FEATURES[id];
  const price = ABONNEMENT_PRICING[id];
  return {
    id,
    title: PLAN_DISPLAY_LABELS[id],
    subtitle: ABONNEMENT_PLAN_SUBTITLE[id],
    monthlyPriceLabel: price.monthlyPriceLabel,
    yearlyPriceLabel: price.yearlyPriceLabel,
    annualSaveBadge: price.annualSaveBadge,
    popular: price.popular,
    features: copy.positives,
    negatives: copy.negatives,
  };
});

function normalizePlan(plan: string | null | undefined): ProplioPlan {
  if (plan === "starter" || plan === "pro" || plan === "expert") return plan;
  return "free";
}

function isPaidPlan(plan: ProplioPlan): plan is Exclude<ProplioPlan, "free"> {
  return plan === "starter" || plan === "pro" || plan === "expert";
}

export default function AbonnementPage() {
  const searchParams = useSearchParams();
  const [plan, setPlan] = useState<ProplioPlan>("free");
  const [proprietaireId, setProprietaireId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingCheckoutKey, setLoadingCheckoutKey] = useState<string | null>(null);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [billing, setBilling] = useState<BillingPeriod>("yearly");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { proprietaireId, error: ownerError } = await getCurrentProprietaireId();
      if (!mounted) return;
      if (ownerError || !proprietaireId) {
        setError("Impossible de charger l'abonnement.");
        setLoading(false);
        return;
      }
      setProprietaireId(proprietaireId);
      const { data } = await supabase.from("proprietaires").select("plan").eq("id", proprietaireId).maybeSingle();
      if (!mounted) return;
      setPlan(normalizePlan((data as { plan?: string | null } | null)?.plan));
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (searchParams.get("canceled") || searchParams.get("success")) {
      window.history.replaceState({}, "", "/parametres/abonnement");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- exécuter une fois avec les params initiaux
  }, []);

  const hasCheckoutSuccess = searchParams.get("success") === "true";
  const hasCheckoutCanceled = searchParams.get("canceled") === "true";

  const currentLimits = useMemo(() => PLAN_LIMITS[plan], [plan]);

  async function startCheckout(targetPlan: Exclude<ProplioPlan, "free">, interval: "monthly" | "yearly") {
    if (!proprietaireId) return;
    const key = `${targetPlan}-${interval}`;
    setLoadingCheckoutKey(key);
    setError("");
    setMessage("");
    try {
      await startStripeCheckout(targetPlan, interval);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la création de session Stripe.");
    } finally {
      setLoadingCheckoutKey(null);
    }
  }

  async function openPortal() {
    setIsOpeningPortal(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Impossible d'ouvrir le portail Stripe.");
      }
      window.location.assign(payload.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'ouverture du portail.");
    } finally {
      setIsOpeningPortal(false);
    }
  }

  if (loading) {
    return (
      <section className="proplio-page-wrap space-y-8" style={{ color: PC.text }}>
        <div className="rounded-xl p-5" style={panelCard}>
          <p style={{ color: PC.muted }}>Chargement du plan...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="proplio-page-wrap space-y-10" style={{ color: PC.text }}>
      <header>
        <h1 className="proplio-page-title">Abonnement</h1>
        <p className="proplio-page-subtitle max-w-2xl">
          Gérez votre plan Proplio, vos limites et votre facturation sécurisée via Stripe.
        </p>
      </header>

      <div
        className="rounded-2xl p-6 sm:p-8"
        style={{
          ...panelCard,
          border:
            plan !== "free"
              ? `1px solid rgba(124, 58, 237, 0.45)`
              : `1px solid ${PC.border}`,
          boxShadow: plan !== "free" ? PC.activeRing : panelCard.boxShadow,
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: PC.tertiary }}>
          Plan actuel
        </p>
        <p className="mt-2 text-2xl font-extrabold capitalize tracking-[-0.03em]" style={{ color: PC.text }}>
          {plan}
        </p>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: PC.muted }}>
          Limites : {currentLimits.maxLogements ?? "illimité"} logements, {currentLimits.maxLocataires ?? "illimité"}{" "}
          locataires.
        </p>
        {plan !== "free" ? (
          <button
            type="button"
            className="proplio-btn-primary mt-6 inline-flex items-center gap-2 px-5 py-2.5"
            disabled={isOpeningPortal}
            onClick={() => void openPortal()}
          >
            {isOpeningPortal ? "Ouverture..." : "Gérer mon abonnement"}
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: PC.dangerBg10, color: PC.danger }}>
          {error}
        </p>
      ) : null}
      {hasCheckoutSuccess ? (
        <p className="rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: PC.successBg10, color: PC.success }}>
          Paiement validé. Votre abonnement va être mis à jour automatiquement.
        </p>
      ) : null}
      {hasCheckoutCanceled ? (
        <p className="rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: PC.warningBg15, color: PC.warning }}>
          Paiement annulé. Aucun changement n&apos;a été appliqué.
        </p>
      ) : null}
      {message ? (
        <p className="rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: PC.successBg10, color: PC.success }}>
          {message}
        </p>
      ) : null}

      <div className="flex flex-col items-center gap-3">
        <p className="text-sm font-semibold" style={{ color: PC.muted }}>
          Fréquence de facturation
        </p>
        <div
          className="inline-flex rounded-full p-1"
          style={{ backgroundColor: PC.inputBg, border: `1px solid ${PC.border}` }}
        >
          <button
            type="button"
            className="rounded-full px-5 py-2.5 text-sm font-semibold transition duration-200 ease-out"
            style={{
              backgroundColor: billing === "monthly" ? PC.primary : "transparent",
              color: billing === "monthly" ? PC.white : PC.muted,
              boxShadow: billing === "monthly" ? PC.activeRing : "none",
            }}
            onClick={() => setBilling("monthly")}
          >
            Mensuel
          </button>
          <button
            type="button"
            className="rounded-full px-5 py-2.5 text-sm font-semibold transition duration-200 ease-out"
            style={{
              backgroundColor: billing === "yearly" ? PC.primary : "transparent",
              color: billing === "yearly" ? PC.white : PC.muted,
              boxShadow: billing === "yearly" ? PC.activeRing : "none",
            }}
            onClick={() => setBilling("yearly")}
          >
            Annuel
          </button>
        </div>
        {billing === "yearly" ? (
          <>
            <span
              className="rounded-full px-3 py-1 text-xs font-bold"
              style={{ backgroundColor: PC.successBg10, color: PC.success, border: `1px solid ${PC.borderSuccess40}` }}
            >
              2 mois offerts 🎉
            </span>
            <p className="text-center text-sm" style={{ color: PC.muted }}>
              Économisez jusqu&apos;à <span style={{ color: PC.primaryLight, fontWeight: 600 }}>39,80€/an</span> avec la
              facturation annuelle.
            </p>
          </>
        ) : null}
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {PLANS_MARKETING.map((p) => {
          const isCurrent = p.id === plan;
          const isPaid = isPaidPlan(p.id);
          const showYearly = billing === "yearly";
          const priceLine = p.id === "free" ? "Gratuit" : showYearly ? p.yearlyPriceLabel : p.monthlyPriceLabel;
          const showStrike = isPaid && showYearly;

          return (
            <article
              key={p.id}
              className="relative flex flex-col rounded-2xl p-5 transition duration-200 ease-out"
              style={{
                ...panelCard,
                border:
                  p.popular || isCurrent
                    ? `1px solid rgba(124, 58, 237, ${p.popular ? 0.5 : 0.35})`
                    : `1px solid ${PC.border}`,
                boxShadow: p.popular ? PC.activeRing : undefined,
              }}
            >
              {p.popular ? (
                <p
                  className="absolute -top-3 left-1/2 w-max -translate-x-1/2 rounded-full px-3 py-1 text-[11px] font-bold"
                  style={{ backgroundColor: PC.primary, color: PC.white }}
                >
                  Le plus populaire ⭐
                </p>
              ) : null}
              {showYearly && p.annualSaveBadge ? (
                <p
                  className="mb-2 inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  style={{ backgroundColor: PC.successBg10, color: PC.success }}
                >
                  {p.annualSaveBadge}
                </p>
              ) : (
                <div className="h-6" />
              )}
              <h2 className="text-lg font-bold" style={{ color: PC.text }}>
                {p.title}
              </h2>
              <p className="mt-1 text-sm font-medium" style={{ color: PC.muted }}>
                {p.subtitle}
              </p>
              {showStrike ? (
                <p className="mt-3 text-sm line-through" style={{ color: PC.tertiary }}>
                  {p.monthlyPriceLabel}
                </p>
              ) : null}
              <p
                className={`font-extrabold tracking-[-0.03em] ${p.id === "pro" ? "mt-1 text-3xl" : "mt-3 text-2xl"}`}
                style={{ color: PC.text }}
              >
                {priceLine}
              </p>
              <ul className="mt-5 flex-1 space-y-2 text-sm leading-snug" style={{ color: PC.muted }}>
                {p.features.map((line) => (
                  <li key={line} className="flex gap-2">
                    <span style={{ color: PC.success }}>✓</span>
                    <span>{line}</span>
                  </li>
                ))}
                {(p.negatives ?? []).map((line) => (
                  <li key={line} className="flex gap-2">
                    <span style={{ color: PC.warning }}>✗</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              {!isPaid ? (
                <button type="button" className="proplio-btn-secondary mt-6 w-full py-2.5" disabled>
                  {isCurrent ? "Plan actuel" : "Plan gratuit"}
                </button>
              ) : (
                <button
                  type="button"
                  className={`proplio-btn-primary mt-6 w-full disabled:opacity-60 ${p.id === "pro" || p.id === "expert" ? "py-3 text-base" : ""}`}
                  disabled={isCurrent || loadingCheckoutKey !== null}
                  onClick={() => {
                    if (isPaidPlan(p.id)) void startCheckout(p.id, billing);
                  }}
                >
                  {loadingCheckoutKey === `${p.id}-${billing}` ? "Redirection..." : "Choisir ce plan"}
                </button>
              )}
            </article>
          );
        })}
      </div>

      <p className="text-center text-sm font-medium" style={{ color: PC.muted }}>
        Paiement sécurisé par Stripe · Résiliation sans engagement · Données hébergées en Europe
      </p>

      <div className="rounded-2xl p-6" style={panelCard}>
        <h2 className="text-lg font-bold">Résiliation</h2>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: PC.muted }}>
          Vous pouvez demander la résiliation à tout moment.
        </p>
        <button
          type="button"
          className="mt-4 rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-200 ease-out"
          style={{ backgroundColor: PC.dangerBg15, color: PC.danger, border: `1px solid ${PC.borderDanger40}` }}
          onClick={() => {
            const ok = window.confirm("Confirmer la résiliation de votre abonnement ?");
            if (!ok) return;
            setMessage("Résiliation demandée. Notre équipe vous contactera rapidement.");
          }}
        >
          Résilier
        </button>
      </div>

      <p className="text-sm" style={{ color: PC.muted }}>
        Retour vers{" "}
        <Link href="/parametres" className="underline" style={{ color: PC.secondary }}>
          Paramètres
        </Link>
        .
      </p>
    </section>
  );
}
