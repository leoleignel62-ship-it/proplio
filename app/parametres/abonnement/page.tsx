"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getCurrentProprietaireId, getEffectivePlan } from "@/lib/proprietaire-profile";
import {
  PLAN_DISPLAY_FEATURES,
  PLAN_DISPLAY_LABELS,
  type PlanDisplayId,
} from "@/lib/plan-display-copy";
import { startStripeCheckout } from "@/lib/stripe-checkout";
import { PLAN_LIMITS, type LocavioPlan } from "@/lib/plan-limits";
import { supabase } from "@/lib/supabase";
import { BtnPrimary, BtnSecondary } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { PC } from "@/lib/locavio-colors";
import { panelCard } from "@/lib/locavio-field-styles";

type BillingPeriod = "monthly" | "yearly";

type PlanMarketing = {
  id: LocavioPlan;
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
    monthlyPriceLabel: "6,90€/mois",
    yearlyPriceLabel: "69€/an",
    annualSaveBadge: "Économisez 13,80€/an",
    popular: false,
  },
  pro: {
    monthlyPriceLabel: "12,90€/mois",
    yearlyPriceLabel: "129€/an",
    annualSaveBadge: "Économisez 25,80€/an",
    popular: true,
  },
  expert: {
    monthlyPriceLabel: "24,90€/mois",
    yearlyPriceLabel: "249€/an",
    annualSaveBadge: "Économisez 49,80€/an",
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

function normalizePlan(plan: string | null | undefined): LocavioPlan {
  if (plan === "starter" || plan === "pro" || plan === "expert") return plan;
  return "free";
}

function isPaidPlan(plan: LocavioPlan): plan is Exclude<LocavioPlan, "free"> {
  return plan === "starter" || plan === "pro" || plan === "expert";
}

type SubscriptionStatus = {
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: number | null;
};

export default function AbonnementPage() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const [plan, setPlan] = useState<LocavioPlan>("free");
  const currentPlan = plan;
  const [proprietaireId, setProprietaireId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingCheckoutKey, setLoadingCheckoutKey] = useState<string | null>(null);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [billing, setBilling] = useState<BillingPeriod>("yearly");
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);

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
      const { data } = await supabase
        .from("proprietaires")
        .select("plan, override_plan")
        .eq("id", proprietaireId)
        .maybeSingle();
      if (!mounted) return;
      setPlan(getEffectivePlan(data as { plan?: string | null; override_plan?: string | null } | null));
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    fetch("/api/stripe/subscription-status")
      .then((r) => r.json())
      .then((data: SubscriptionStatus) => setSubscriptionStatus(data))
      .catch(() => setSubscriptionStatus({ cancelAtPeriodEnd: false, currentPeriodEnd: null }));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("from") !== "portal") return;

    const timer = window.setTimeout(() => {
      fetch("/api/stripe/subscription-status")
        .then((r) => r.json())
        .then((data: SubscriptionStatus) => setSubscriptionStatus(data))
        .catch(() => setSubscriptionStatus({ cancelAtPeriodEnd: false, currentPeriodEnd: null }))
        .finally(() => {
          window.history.replaceState({}, "", "/parametres/abonnement");
        });
    }, 2000);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (searchParams.get("canceled") || searchParams.get("success")) {
      window.history.replaceState({}, "", "/parametres/abonnement");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- exécuter une fois avec les params initiaux
  }, []);

  const hasCheckoutSuccess = searchParams.get("success") === "true";
  const checkoutSuccessToastDone = useRef(false);

  useEffect(() => {
    if (hasCheckoutSuccess && !checkoutSuccessToastDone.current) {
      checkoutSuccessToastDone.current = true;
      toast.success("Paiement validé. Votre abonnement va être mis à jour automatiquement.");
    }
  }, [hasCheckoutSuccess, toast]);
  const hasCheckoutCanceled = searchParams.get("canceled") === "true";

  const currentLimits = useMemo(() => PLAN_LIMITS[plan], [plan]);

  async function startCheckout(targetPlan: Exclude<LocavioPlan, "free">, interval: "monthly" | "yearly") {
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
      <section className="locavio-page-wrap space-y-8" style={{ color: PC.text }}>
        <div className="rounded-xl p-5" style={panelCard}>
          <p style={{ color: PC.muted }}>Chargement du plan...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="locavio-page-wrap space-y-10" style={{ color: PC.text }}>
      <header>
        <h1 className="locavio-page-title">Abonnement</h1>
        <p className="locavio-page-subtitle max-w-2xl">
          Gérez votre plan Locavio, vos limites et votre facturation sécurisée via Stripe.
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
        {subscriptionStatus?.cancelAtPeriodEnd === true ? (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-500" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-amber-800">Résiliation programmée</p>
              <p className="mt-0.5 text-sm text-amber-700">
                {subscriptionStatus.currentPeriodEnd ? (
                  <>
                    Votre abonnement sera résilié le{" "}
                    {new Date(subscriptionStatus.currentPeriodEnd * 1000).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                    . Vous conservez l&apos;accès jusqu&apos;à cette date.
                  </>
                ) : (
                  <>Votre abonnement sera résilié à la fin de la période en cours. Vous conservez l&apos;accès jusqu&apos;à cette date.</>
                )}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: PC.dangerBg10, color: PC.danger }}>
          {error}
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
              Économisez jusqu&apos;à <span style={{ color: PC.primaryLight, fontWeight: 600 }}>49,80€/an</span> avec la
              facturation annuelle.
            </p>
          </>
        ) : null}
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {PLANS_MARKETING.map((p) => {
          const isCurrent = p.id === currentPlan;
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
                  isCurrent
                    ? "1px solid #7c3aed"
                    : p.popular
                      ? "1px solid rgba(124, 58, 237, 0.5)"
                    : `1px solid ${PC.border}`,
                boxShadow: p.popular ? PC.activeRing : undefined,
              }}
            >
              {isCurrent ? (
                <p
                  className="absolute -top-3 right-4 w-max rounded-full px-3 py-1 text-[11px] font-bold"
                  style={{ backgroundColor: "#7c3aed", color: PC.white }}
                >
                  Votre plan actuel
                </p>
              ) : null}
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
                <BtnSecondary className="mt-6 w-full" disabled>
                  {isCurrent ? "Plan actuel" : "Plan gratuit"}
                </BtnSecondary>
              ) : (
                <BtnPrimary
                  className={`mt-6 w-full ${p.id === "pro" || p.id === "expert" ? "py-3 text-base" : ""}`}
                  disabled={isCurrent || loadingCheckoutKey !== null || isOpeningPortal}
                  loading={loadingCheckoutKey === `${p.id}-${billing}`}
                  style={isCurrent ? { opacity: 0.55, cursor: "not-allowed", backgroundColor: "#6b7280", borderColor: "#6b7280" } : undefined}
                  onClick={() => {
                    if (!isPaidPlan(p.id)) return;
                    void startCheckout(p.id, billing);
                  }}
                >
                  {isCurrent ? "Plan actuel ✓" : "Choisir ce plan"}
                </BtnPrimary>
              )}
            </article>
          );
        })}
      </div>

      <p className="text-center text-sm font-medium" style={{ color: PC.muted }}>
        Paiement sécurisé par Stripe · Résiliation sans engagement · Données hébergées en Europe
      </p>

      {plan !== "free" ? (
        <div className="rounded-2xl p-6" style={panelCard}>
          <h2 className="text-lg font-bold">Abonnement et facturation</h2>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: PC.muted }}>
            Modifiez votre formule, mettez à jour votre moyen de paiement ou résiliez via le portail client Stripe.
          </p>
          <button
            type="button"
            className="mt-4 rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 transition-all hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isOpeningPortal}
            onClick={() => void openPortal()}
          >
            {isOpeningPortal ? "Redirection..." : "Gérer mon abonnement"}
          </button>
        </div>
      ) : null}

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
