"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getCurrentProprietaireId } from "@/lib/proprietaire-profile";
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

export default function AbonnementPage() {
  const [plan, setPlan] = useState<ProplioPlan>("free");
  const [proprietaireId, setProprietaireId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSwitchingPlan, setIsSwitchingPlan] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const isTestMode = siteUrl.includes("vercel.app") || siteUrl.includes("localhost");

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

  const currentLimits = useMemo(() => PLAN_LIMITS[plan], [plan]);

  async function switchPlanForTest(nextPlan: ProplioPlan) {
    if (!proprietaireId || isSwitchingPlan) return;
    setError("");
    setMessage("");
    setIsSwitchingPlan(true);
    const { error: updateError } = await supabase
      .from("proprietaires")
      .update({ plan: nextPlan })
      .eq("id", proprietaireId);

    if (updateError) {
      setError("Impossible de changer le plan en mode test.");
      setIsSwitchingPlan(false);
      return;
    }

    window.location.reload();
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
        {loading ? (
          <p style={{ color: PC.muted }}>Chargement du plan...</p>
        ) : (
          <>
            <p className="text-sm" style={{ color: PC.muted }}>
              Plan actuel
            </p>
            <p className="mt-1 text-xl font-semibold capitalize">{plan}</p>
            <p className="mt-3 text-sm" style={{ color: PC.muted }}>
              Limites actuelles : {currentLimits.maxLogements ?? "illimite"} logements, {currentLimits.maxLocataires ?? "illimite"} locataires,{" "}
              {currentLimits.monthlyQuittances ?? "illimite"} quittances/mois, {currentLimits.monthlyBaux ?? "illimite"} baux/mois,{" "}
              {currentLimits.monthlyEtatsDesLieux ?? "illimite"} etats des lieux/mois.
            </p>
          </>
        )}
      </div>

      {error ? (
        <p className="rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: PC.dangerBg10, color: PC.danger }}>
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: PC.successBg10, color: PC.success }}>
          {message}
        </p>
      ) : null}

      {isTestMode ? (
        <div className="rounded-xl p-4" style={panelCard}>
          <h2 className="text-sm font-semibold" style={{ color: PC.muted }}>
            🧪 Mode test — changer de plan
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {([
              { id: "free", label: "Gratuit" },
              { id: "starter", label: "Starter" },
              { id: "pro", label: "Pro" },
              { id: "expert", label: "Expert" },
            ] as Array<{ id: ProplioPlan; label: string }>).map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={isSwitchingPlan}
                className="rounded-md px-2.5 py-1 text-xs disabled:opacity-60"
                style={{
                  backgroundColor: plan === p.id ? PC.primaryBg20 : PC.card,
                  color: PC.muted,
                  border: `1px solid ${PC.border}`,
                }}
                onClick={() => void switchPlanForTest(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
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
              <button
                type="button"
                className="mt-5 w-full rounded-lg px-4 py-2 text-sm font-medium"
                style={{ backgroundColor: isCurrent ? PC.card : PC.primary, color: isCurrent ? PC.muted : PC.white, border: `1px solid ${PC.border}` }}
                onClick={() => {
                  window.location.href = `mailto:contact@proplio.fr?subject=Changement%20de%20plan%20Proplio&body=Bonjour%2C%20je%20souhaite%20passer%20au%20plan%20${encodeURIComponent(p.id)}.`;
                  setMessage("Fonctionnalité bientôt disponible");
                }}
              >
                {isCurrent ? "Plan actuel" : "Passer à ce plan"}
              </button>
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
