"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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

const STRIPE_PRICE_IDS: Record<
  Exclude<ProplioPlan, "free">,
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

function normalizePlan(plan: string | null | undefined): ProplioPlan {
  if (plan === "starter" || plan === "pro" || plan === "expert") return plan;
  return "free";
}

export default function AbonnementPage() {
  const searchParams = useSearchParams();
  const [plan, setPlan] = useState<ProplioPlan>("free");
  const [proprietaireId, setProprietaireId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSwitchingPlan, setIsSwitchingPlan] = useState(false);
  const [loadingCheckoutKey, setLoadingCheckoutKey] = useState<string | null>(null);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pendingPlan, setPendingPlan] = useState<ProplioPlan | null>(null);
  const [downgradeInfo, setDowngradeInfo] = useState<{ active: number; max: number; toLock: number } | null>(null);
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

  async function performPlanChange(nextPlan: ProplioPlan) {
    if (!proprietaireId) return;

    const newMax = PLAN_LIMITS[nextPlan].maxLogements;
    const { data: activeLogements, error: activeError } = await supabase
      .from("logements")
      .select("id, created_at")
      .eq("proprietaire_id", proprietaireId)
      .eq("verrouille", false)
      .order("created_at", { ascending: true });
    if (activeError) {
      console.error("Erreur lecture logements actifs:", activeError);
      setError("Impossible d'évaluer le changement de plan.");
      return;
    }

    const active = activeLogements ?? [];
    if (newMax != null && active.length > newMax) {
      const overflow = active.length - newMax;
      const toLockIds = active.slice(0, overflow).map((l) => String((l as { id: string }).id));

      const { error: lockLogementsError } = await supabase
        .from("logements")
        .update({ verrouille: true })
        .in("id", toLockIds)
        .eq("proprietaire_id", proprietaireId);
      if (lockLogementsError) {
        console.error("Erreur verrouillage logements:", lockLogementsError);
        setError("Impossible de verrouiller les logements excédentaires.");
        return;
      }

      const { error: lockLocatairesError } = await supabase
        .from("locataires")
        .update({ verrouille: true })
        .eq("proprietaire_id", proprietaireId)
        .in("logement_id", toLockIds);
      if (lockLocatairesError) {
        console.error("Erreur verrouillage locataires:", lockLocatairesError);
        setError("Impossible de verrouiller les locataires associés.");
        return;
      }
    } else {
      const { data: unlockedRows, error: unlockedReadError } = await supabase
        .from("logements")
        .select("id")
        .eq("proprietaire_id", proprietaireId)
        .eq("verrouille", false);
      if (unlockedReadError) {
        console.error("Erreur lecture logements déverrouillés:", unlockedReadError);
        setError("Impossible d'appliquer le changement de plan.");
        return;
      }
      const unlockedCount = (unlockedRows ?? []).length;
      const slots = newMax == null ? Number.MAX_SAFE_INTEGER : Math.max(0, newMax - unlockedCount);
      if (slots > 0) {
        const { data: lockedRows, error: lockedReadError } = await supabase
          .from("logements")
          .select("id")
          .eq("proprietaire_id", proprietaireId)
          .eq("verrouille", true)
          .order("created_at", { ascending: true })
          .limit(slots);
        if (lockedReadError) {
          console.error("Erreur lecture logements verrouillés:", lockedReadError);
          setError("Impossible de déverrouiller les logements.");
          return;
        }
        const idsToUnlock = (lockedRows ?? []).map((r) => String((r as { id: string }).id));
        if (idsToUnlock.length > 0) {
          const { error: unlockLogementsError } = await supabase
            .from("logements")
            .update({ verrouille: false })
            .in("id", idsToUnlock)
            .eq("proprietaire_id", proprietaireId);
          if (unlockLogementsError) {
            console.error("Erreur déverrouillage logements:", unlockLogementsError);
            setError("Impossible de déverrouiller les logements.");
            return;
          }
          const { error: unlockLocatairesError } = await supabase
            .from("locataires")
            .update({ verrouille: false })
            .eq("proprietaire_id", proprietaireId)
            .in("logement_id", idsToUnlock);
          if (unlockLocatairesError) {
            console.error("Erreur déverrouillage locataires:", unlockLocatairesError);
            setError("Impossible de déverrouiller les locataires associés.");
            return;
          }
          setMessage(`🎉 Votre plan a été mis à jour ! ${idsToUnlock.length} logements ont été déverrouillés.`);
        }
      }
    }

    const { error: updatePlanError } = await supabase
      .from("proprietaires")
      .update({ plan: nextPlan })
      .eq("id", proprietaireId);
    if (updatePlanError) {
      console.error("Erreur mise à jour plan:", updatePlanError);
      setError("Impossible de mettre à jour le plan.");
      return;
    }
  }

  async function switchPlanForTest(nextPlan: ProplioPlan) {
    if (isSwitchingPlan || !proprietaireId) return;
    setError("");
    setMessage("");
    const newMax = PLAN_LIMITS[nextPlan].maxLogements;
    if (newMax != null) {
      const { data: activeRows, error: activeError } = await supabase
        .from("logements")
        .select("id")
        .eq("proprietaire_id", proprietaireId)
        .eq("verrouille", false);
      if (activeError) {
        console.error("Erreur lecture logements actifs:", activeError);
        setError("Impossible d'évaluer le downgrade.");
        return;
      }
      const activeCount = (activeRows ?? []).length;
      if (activeCount > newMax) {
        setPendingPlan(nextPlan);
        setDowngradeInfo({ active: activeCount, max: newMax, toLock: activeCount - newMax });
        return;
      }
    }
    setIsSwitchingPlan(true);
    await performPlanChange(nextPlan);
    alert("Plan changé : " + nextPlan);
    window.location.reload();
  }

  async function confirmDowngrade() {
    if (!pendingPlan) return;
    setIsSwitchingPlan(true);
    await performPlanChange(pendingPlan);
    alert("Plan changé : " + pendingPlan);
    window.location.reload();
  }

  function closeDowngradeModal() {
    if (isSwitchingPlan) return;
    setPendingPlan(null);
    setDowngradeInfo(null);
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
              {p.id === "free" ? (
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
                    onClick={() => void startCheckout(p.id, "monthly")}
                  >
                    {loadingCheckoutKey === `${p.id}-monthly` ? "Redirection..." : "Choisir mensuel"}
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
                    style={{ backgroundColor: isCurrent ? PC.card : PC.secondary, color: isCurrent ? PC.muted : PC.white, border: `1px solid ${PC.border}` }}
                    disabled={isCurrent || loadingCheckoutKey !== null}
                    onClick={() => void startCheckout(p.id, "yearly")}
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

      {pendingPlan && downgradeInfo ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl rounded-xl p-6" style={panelCard}>
            <h2 className="text-lg font-semibold">Confirmation de downgrade</h2>
            <p className="mt-3 whitespace-pre-line text-sm" style={{ color: PC.muted }}>
              {`Attention : vous avez ${downgradeInfo.active} logements actifs. Le plan ${pendingPlan} autorise ${downgradeInfo.max} logements maximum. ${downgradeInfo.toLock} logements et leurs locataires associés seront verrouillés et inaccessibles. Vous pourrez y accéder à nouveau en passant à un plan supérieur.`}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="rounded-lg px-4 py-2 text-sm pc-outline-muted" onClick={closeDowngradeModal}>
                Annuler
              </button>
              <button type="button" className="rounded-lg px-4 py-2 text-sm font-medium pc-solid-primary" onClick={() => void confirmDowngrade()}>
                Confirmer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
