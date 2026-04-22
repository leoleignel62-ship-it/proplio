"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getCurrentProprietaireId } from "@/lib/proprietaire-profile";
import { startStripeCheckout } from "@/lib/stripe-checkout";
import { PLAN_LIMITS, type ProplioPlan } from "@/lib/plan-limits";
import { supabase } from "@/lib/supabase";
import { PC } from "@/lib/proplio-colors";
import { panelCard } from "@/lib/proplio-field-styles";

type PlanCard = {
  id: ProplioPlan;
  title: string;
  price: string;
  features: string[];
};

const PLANS: PlanCard[] = [
  {
    id: "free",
    title: "Decouverte",
    price: "Gratuit",
    features: ["1 logement", "1 locataire", "1 quittance/mois", "1 bail/mois", "1 etat des lieux/mois"],
  },
  {
    id: "starter",
    title: "Starter",
    price: "4,90EUR/mois ou 49EUR/an",
    features: ["3 logements", "3 locataires", "3 quittances/mois", "3 baux/mois", "3 etats des lieux/mois"],
  },
  {
    id: "pro",
    title: "Pro",
    price: "9,90EUR/mois ou 99EUR/an",
    features: ["10 logements", "10 locataires", "10 quittances/mois", "10 baux/mois", "10 etats des lieux/mois"],
  },
  {
    id: "expert",
    title: "Expert",
    price: "19,90EUR/mois ou 199EUR/an",
    features: ["Illimite logements", "Illimite locataires", "Illimite quittances", "Illimite baux", "Illimite etats des lieux", "Support prioritaire"],
  },
];

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
    <section className="proplio-page-wrap space-y-8" style={{ color: PC.text }}>
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Abonnement</h1>
        <p className="mt-2 text-sm" style={{ color: PC.muted }}>
          Gérez votre plan Proplio et les limites associées.
        </p>
      </header>

      <div className="rounded-xl p-5" style={panelCard}>
        <p className="text-sm" style={{ color: PC.muted }}>
          Plan actuel
        </p>
        <p className="mt-1 text-xl font-semibold capitalize">{plan}</p>
        <p className="mt-3 text-sm" style={{ color: PC.muted }}>
          Limites actuelles : {currentLimits.maxLogements ?? "illimite"} logements, {currentLimits.maxLocataires ?? "illimite"} locataires.
        </p>
        {plan !== "free" ? (
          <button
            type="button"
            className="mt-4 rounded-lg px-4 py-2 text-sm font-medium"
            style={{ backgroundColor: PC.primary, color: PC.white, border: `1px solid ${PC.primary}` }}
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((p) => {
          const isCurrent = p.id === plan;
          return (
            <article key={p.id} className="rounded-xl p-5" style={{ ...panelCard, border: `1px solid ${isCurrent ? PC.primary : PC.border}` }}>
              <h2 className="text-lg font-semibold">{p.title}</h2>
              <p className="mt-1 text-sm" style={{ color: PC.secondary }}>
                {p.price}
              </p>
              <ul className="mt-4 space-y-1.5 text-sm" style={{ color: PC.muted }}>
                {p.features.map((f) => (
                  <li key={f}>✓ {f}</li>
                ))}
              </ul>
              {!isPaidPlan(p.id) ? (
                <button
                  type="button"
                  className="mt-5 w-full rounded-lg px-4 py-2 text-sm font-medium"
                  style={{ backgroundColor: isCurrent ? PC.card : PC.primary, color: isCurrent ? PC.muted : PC.white, border: `1px solid ${PC.border}` }}
                  disabled
                >
                  {isCurrent ? "Plan actuel" : "Plan gratuit"}
                </button>
              ) : (
                <div className="mt-5 grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    className="w-full rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
                    style={{ backgroundColor: isCurrent ? PC.card : PC.primary, color: isCurrent ? PC.muted : PC.white, border: `1px solid ${PC.border}` }}
                    disabled={isCurrent || loadingCheckoutKey !== null}
                    onClick={() => {
                      if (isPaidPlan(p.id)) void startCheckout(p.id, "monthly");
                    }}
                  >
                    {loadingCheckoutKey === `${p.id}-monthly` ? "Redirection..." : "Choisir mensuel"}
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
                    style={{ backgroundColor: isCurrent ? PC.card : PC.secondary, color: isCurrent ? PC.muted : PC.white, border: `1px solid ${PC.border}` }}
                    disabled={isCurrent || loadingCheckoutKey !== null}
                    onClick={() => {
                      if (isPaidPlan(p.id)) void startCheckout(p.id, "yearly");
                    }}
                  >
                    {loadingCheckoutKey === `${p.id}-yearly` ? "Redirection..." : "Choisir annuel"}
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>

      <div className="rounded-xl p-5" style={panelCard}>
        <h2 className="text-lg font-semibold">Résiliation</h2>
        <p className="mt-2 text-sm" style={{ color: PC.muted }}>
          Vous pouvez demander la résiliation à tout moment.
        </p>
        <button
          type="button"
          className="mt-4 rounded-lg px-4 py-2 text-sm font-medium"
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
        Retourner vers{" "}
        <Link href="/parametres" className="underline" style={{ color: PC.secondary }}>
          Paramètres
        </Link>
        .
      </p>
    </section>
  );
}
