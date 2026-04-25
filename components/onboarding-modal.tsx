"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BtnPrimary } from "@/components/ui";
import { PC } from "@/lib/proplio-colors";
import type { ProplioPlan } from "@/lib/plan-limits";
import { supabase } from "@/lib/supabase";

type OnboardingModalProps = {
  open: boolean;
  plan: ProplioPlan;
  proprietaireId: string;
  onClose: () => Promise<void> | void;
};

type OnboardingStep = {
  key: string;
  emoji: string;
  title: string;
  description: string;
  href: string;
  done: boolean;
};

const FREE_BASE_STEPS = [
  {
    key: "profile",
    emoji: "👤",
    title: "Complétez votre profil",
    description: "Ajoutez votre nom, adresse et signature pour personnaliser vos documents.",
    href: "/parametres",
  },
  {
    key: "logements",
    emoji: "🏠",
    title: "Créez votre logement",
    description: "Ajoutez votre bien immobilier pour commencer à le gérer.",
    href: "/logements",
  },
  {
    key: "locataires",
    emoji: "👥",
    title: "Ajoutez votre locataire",
    description: "Renseignez les informations de votre locataire.",
    href: "/locataires",
  },
  {
    key: "quittances",
    emoji: "📄",
    title: "Générez votre première quittance",
    description: "Créez et envoyez votre quittance en quelques clics.",
    href: "/quittances",
  },
] as const;

const PAID_EXTRA_STEPS = [
  {
    key: "baux",
    emoji: "📋",
    title: "Créez votre bail",
    description: "Générez un bail conforme loi ALUR en quelques minutes.",
    href: "/baux",
  },
  {
    key: "etats_des_lieux",
    emoji: "🔍",
    title: "Faites un état des lieux",
    description: "Documentez l'état du logement à l'entrée ou à la sortie.",
    href: "/etats-des-lieux",
  },
  {
    key: "reservations",
    emoji: "🌴",
    title: "Activez le mode saisonnier",
    description: "Gérez vos réservations courte durée et synchronisez Airbnb.",
    href: "/saisonnier/reservations",
  },
] as const;

const CELEBRATION_BURST = ["🎉", "✨", "🎊", "🥳", "💜"];

export function OnboardingModal({ open, plan, proprietaireId, onClose }: OnboardingModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [steps, setSteps] = useState<OnboardingStep[]>([]);

  const isPaid = plan !== "free";

  useEffect(() => {
    if (!open || !proprietaireId) return;
    let cancelled = false;

    const loadStepProgress = async () => {
      setLoading(true);

      const [
        ownerResult,
        logementsResult,
        locatairesResult,
        quittancesResult,
        bauxResult,
        edlResult,
        reservationsResult,
      ] = await Promise.all([
        supabase
          .from("proprietaires")
          .select("nom, prenom, adresse")
          .eq("id", proprietaireId)
          .maybeSingle(),
        supabase.from("logements").select("id", { count: "exact", head: true }).eq("proprietaire_id", proprietaireId),
        supabase.from("locataires").select("id", { count: "exact", head: true }).eq("proprietaire_id", proprietaireId),
        supabase.from("quittances").select("id", { count: "exact", head: true }).eq("proprietaire_id", proprietaireId),
        supabase.from("baux").select("id", { count: "exact", head: true }).eq("proprietaire_id", proprietaireId),
        supabase
          .from("etats_des_lieux")
          .select("id", { count: "exact", head: true })
          .eq("proprietaire_id", proprietaireId),
        supabase.from("reservations").select("id", { count: "exact", head: true }).eq("proprietaire_id", proprietaireId),
      ]);

      if (cancelled) return;

      const owner = ownerResult.data as { nom?: string | null; prenom?: string | null; adresse?: string | null } | null;
      const profileDone =
        Boolean(owner?.nom?.trim()) && Boolean(owner?.prenom?.trim()) && Boolean(owner?.adresse?.trim());

      const doneMap: Record<string, boolean> = {
        profile: profileDone,
        logements: Number(logementsResult.count ?? 0) >= 1,
        locataires: Number(locatairesResult.count ?? 0) >= 1,
        quittances: Number(quittancesResult.count ?? 0) >= 1,
        baux: Number(bauxResult.count ?? 0) >= 1,
        etats_des_lieux: Number(edlResult.count ?? 0) >= 1,
        reservations: Number(reservationsResult.count ?? 0) >= 1,
      };

      const base = [...FREE_BASE_STEPS];
      const list = isPaid ? [...base, ...PAID_EXTRA_STEPS] : base;
      setSteps(list.map((step) => ({ ...step, done: doneMap[step.key] ?? false })));
      setLoading(false);
    };

    void loadStepProgress();

    return () => {
      cancelled = true;
    };
  }, [open, proprietaireId, isPaid]);

  const completedCount = useMemo(() => steps.filter((step) => step.done).length, [steps]);
  const totalCount = steps.length;
  const allDone = totalCount > 0 && completedCount === totalCount;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  useEffect(() => {
    if (!open || !allDone) {
      setCelebrate(false);
      return;
    }
    setCelebrate(true);
    const timeout = window.setTimeout(() => setCelebrate(false), 1800);
    return () => window.clearTimeout(timeout);
  }, [open, allDone]);

  if (!open) return null;

  async function handleMarkDoneAndClose() {
    setClosing(true);
    try {
      await onClose();
    } finally {
      setClosing(false);
    }
  }

  function handleGoTo(href: string) {
    void handleMarkDoneAndClose();
    router.push(href);
  }

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div
        className="relative w-full max-w-[560px] overflow-hidden rounded-2xl p-6 shadow-2xl sm:p-7"
        style={{
          backgroundColor: "#0a0a0f",
          border: "1px solid rgba(124,58,237,0.3)",
        }}
      >
        {celebrate ? (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {CELEBRATION_BURST.map((symbol, idx) => (
              <span
                key={`${symbol}-${idx}`}
                className="absolute animate-ping text-xl"
                style={{
                  left: `${12 + idx * 18}%`,
                  top: `${10 + (idx % 2) * 14}%`,
                  animationDuration: `${1000 + idx * 120}ms`,
                }}
              >
                {symbol}
              </span>
            ))}
          </div>
        ) : null}

        <header>
          <h2 id="onboarding-title" className="text-2xl font-extrabold tracking-tight" style={{ color: PC.text }}>
            🎉 Bienvenue sur Proplio !
          </h2>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: PC.muted }}>
            {isPaid
              ? "Voici comment tirer le meilleur parti de votre abonnement."
              : "Voici comment bien démarrer avec votre plan Découverte."}
          </p>

          <div className="mt-4">
            <div className="mb-2 text-xs font-medium" style={{ color: PC.secondary }}>
              {completedCount} étapes complétées sur {totalCount}
            </div>
            <div className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: "#1c1c2e" }}>
              <div
                className="h-full transition-all duration-500 ease-out"
                style={{
                  width: `${progressPct}%`,
                  background: "linear-gradient(90deg, #7c3aed 0%, #a78bfa 100%)",
                }}
              />
            </div>
          </div>
        </header>

        <div className="mt-6 space-y-3">
          {loading ? (
            <div className="rounded-xl border px-4 py-6 text-center text-sm" style={{ borderColor: PC.border, color: PC.muted }}>
              Vérification de vos étapes en cours...
            </div>
          ) : (
            steps.map((step) => (
              <div
                key={step.key}
                className="flex items-start justify-between gap-3 rounded-xl border px-4 py-3"
                style={{ borderColor: PC.border, backgroundColor: PC.card }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl leading-none">{step.emoji}</span>
                  <div>
                    <p className="text-sm font-bold" style={{ color: PC.text }}>
                      {step.title}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed" style={{ color: "#c4c4cf" }}>
                      {step.description}
                    </p>
                  </div>
                </div>
                {step.done ? (
                  <span className="animate-pulse text-lg" style={{ color: PC.success }} aria-label="Étape complétée">
                    ✅
                  </span>
                ) : (
                  <button
                    type="button"
                    className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition"
                    style={{ backgroundColor: "#7c3aed", color: PC.white }}
                    onClick={() => handleGoTo(step.href)}
                  >
                    Y aller →
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        <footer className="mt-6 flex justify-end">
          {allDone ? (
            <BtnPrimary type="button" loading={closing} onClick={() => void handleMarkDoneAndClose()}>
              Terminer 🎉
            </BtnPrimary>
          ) : (
            <button
              type="button"
              disabled={closing}
              className="text-sm transition disabled:opacity-60"
              style={{ color: PC.muted }}
              onClick={() => void handleMarkDoneAndClose()}
            >
              Fermer
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
