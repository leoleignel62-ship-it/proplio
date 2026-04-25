"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BtnPrimary } from "@/components/ui";
import { PC } from "@/lib/proplio-colors";
import type { ProplioPlan } from "@/lib/plan-limits";

type OnboardingModalProps = {
  open: boolean;
  plan: ProplioPlan;
  steps: OnboardingStep[];
  onDismiss: () => void;
  onComplete: () => Promise<void> | void;
  onNavigateStep: (step: OnboardingStep) => void;
  enableSuccessSound?: boolean;
};

export type OnboardingStep = {
  key: string;
  emoji: string;
  title: string;
  description: string;
  href: string;
  done: boolean;
};

const CELEBRATION_BURST = ["🎉", "✨", "🎊", "🥳", "💜"];

function getProgressMessage(completedCount: number, totalCount: number, isPaid: boolean): string {
  if (totalCount > 0 && completedCount >= totalCount) return "🎉 Vous avez tout configuré ! Proplio est prêt.";
  if (completedCount <= 0) return "Commençons par compléter votre profil !";
  if (completedCount === 1) return "Parfait ! Ajoutons maintenant votre logement.";
  if (completedCount === 2) return "Très bien ! Ajoutez votre premier locataire.";
  if (completedCount === 3) return "Super ! Générez votre première quittance.";
  if (!isPaid) return "Continuez, vous êtes sur la bonne voie.";
  if (completedCount === 4) return "Excellent ! Créez maintenant votre bail.";
  if (completedCount === 5) return "Presque là ! Faites un état des lieux.";
  if (completedCount === 6) return "Dernière étape ! Activez le mode saisonnier.";
  return "Continuez, vous êtes sur la bonne voie.";
}

function playSuccessBeep() {
  const context = new (window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
  if (!context) return;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = 880;
  gain.gain.value = 0.03;
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.08);
}

function getPaidWelcomeContent(plan: ProplioPlan): { title: string; subtitle: string; bullets: string[] } {
  if (plan === "expert") {
    return {
      title: "🎉 Bienvenue sur le plan Expert !",
      subtitle: "Vous avez débloqué de nouvelles fonctionnalités :",
      bullets: [
        "📋 Baux illimités (PDF conforme loi ALUR)",
        "🔍 États des lieux illimités (photos + PDF)",
        "📈 Révision annuelle des loyers (IRL INSEE)",
        "📁 Gestion des documents par logement",
        "🌴 Mode saisonnier (réservations, contrats, calendrier iCal)",
        "🏠 Logements illimités",
        "👥 Locataires illimités",
      ],
    };
  }
  if (plan === "pro") {
    return {
      title: "🎉 Bienvenue sur le plan Pro !",
      subtitle: "Vous avez débloqué de nouvelles fonctionnalités :",
      bullets: [
        "📋 Baux illimités (PDF conforme loi ALUR)",
        "🔍 États des lieux illimités (photos + PDF)",
        "📈 Révision annuelle des loyers (IRL INSEE)",
        "📁 Gestion des documents par logement",
        "🌴 Mode saisonnier (réservations, contrats, calendrier iCal)",
        "🏠 Jusqu'à 5 logements simultanés",
      ],
    };
  }
  return {
    title: "🎉 Bienvenue sur le plan Starter !",
    subtitle: "Vous avez débloqué de nouvelles fonctionnalités :",
    bullets: [
      "📋 Baux illimités (PDF conforme loi ALUR)",
      "🔍 États des lieux illimités (photos + PDF)",
      "📈 Révision annuelle des loyers (IRL INSEE)",
      "📁 Gestion des documents par logement",
      "🌴 Mode saisonnier (réservations, contrats, calendrier iCal)",
    ],
  };
}

export function OnboardingModal({
  open,
  plan,
  steps,
  onDismiss,
  onComplete,
  onNavigateStep,
  enableSuccessSound = false,
}: OnboardingModalProps) {
  const router = useRouter();
  const [closing, setClosing] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [justCompleted, setJustCompleted] = useState<Record<string, boolean>>({});
  const previousDoneRef = useRef<Record<string, boolean>>({});

  const isPaid = plan !== "free";
  const paidWelcome = useMemo(() => getPaidWelcomeContent(plan), [plan]);

  const completedCount = useMemo(() => steps.filter((step) => step.done).length, [steps]);
  const totalCount = steps.length;
  const allDone = totalCount > 0 && completedCount === totalCount;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const nextStepKey = useMemo(() => steps.find((step) => !step.done)?.key ?? null, [steps]);
  const progressMessage = useMemo(() => getProgressMessage(completedCount, totalCount, isPaid), [completedCount, totalCount, isPaid]);

  useEffect(() => {
    if (!open || !allDone) {
      setCelebrate(false);
      return;
    }
    setCelebrate(true);
    const timeout = window.setTimeout(() => setCelebrate(false), 1800);
    return () => window.clearTimeout(timeout);
  }, [open, allDone]);

  useEffect(() => {
    const nextJustCompleted: Record<string, boolean> = {};
    let hasNewlyCompletedStep = false;
    const prev = previousDoneRef.current;

    for (const step of steps) {
      if (!prev[step.key] && step.done) {
        nextJustCompleted[step.key] = true;
        hasNewlyCompletedStep = true;
      }
    }

    previousDoneRef.current = Object.fromEntries(steps.map((step) => [step.key, step.done]));
    setJustCompleted(nextJustCompleted);

    if (hasNewlyCompletedStep && enableSuccessSound) {
      try {
        playSuccessBeep();
      } catch {
        // Ignore browser audio restrictions.
      }
    }

    if (!hasNewlyCompletedStep) return;
    const timeout = window.setTimeout(() => setJustCompleted({}), 700);
    return () => window.clearTimeout(timeout);
  }, [enableSuccessSound, steps]);

  if (!open) return null;

  async function handleCompleteAndClose() {
    setClosing(true);
    try {
      await onComplete();
    } finally {
      setClosing(false);
    }
  }

  function handleGoTo(step: OnboardingStep) {
    onNavigateStep(step);
    router.push(step.href);
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

        {isPaid ? (
          <>
            <header>
              <h2 id="onboarding-title" className="text-2xl font-extrabold tracking-tight" style={{ color: PC.text }}>
                {paidWelcome.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: PC.muted }}>
                {paidWelcome.subtitle}
              </p>
            </header>

            <ul className="mt-5 space-y-2.5 text-sm" style={{ color: "#d8d8e2" }}>
              {paidWelcome.bullets.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>

            <footer className="mt-6">
              <BtnPrimary
                type="button"
                loading={closing}
                onClick={() => void handleCompleteAndClose()}
                className="w-full justify-center"
                style={{ backgroundColor: "#7c3aed", borderColor: "#7c3aed" }}
              >
                Commencer à explorer →
              </BtnPrimary>
            </footer>
          </>
        ) : (
          <>
            <header>
              <h2 id="onboarding-title" className="text-2xl font-extrabold tracking-tight" style={{ color: PC.text }}>
                🎉 Bienvenue sur Proplio !
              </h2>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: PC.muted }}>
                Voici comment bien démarrer avec votre plan Découverte.
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
                <p className="mt-3 text-xs leading-relaxed" style={{ color: "#c4c4cf" }}>
                  {progressMessage}
                </p>
              </div>
            </header>

            <div className="mt-6 space-y-3">
              {steps.map((step) => {
                const isNextStep = !step.done && step.key === nextStepKey;
                const rowBorder = isNextStep ? "#7c3aed" : PC.border;
                const rowBg = step.done ? "rgba(255,255,255,0.02)" : PC.card;
                return (
                  <div
                    key={step.key}
                    className="flex items-start justify-between gap-3 rounded-xl border px-4 py-3 transition"
                    style={{ borderColor: rowBorder, backgroundColor: rowBg }}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl leading-none" style={{ opacity: step.done ? 0.65 : 1 }}>
                        {step.emoji}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p
                            className="text-sm font-bold"
                            style={{ color: step.done ? "#b8b8c3" : PC.text }}
                          >
                            {step.title}
                          </p>
                          {isNextStep ? (
                            <span
                              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                              style={{ backgroundColor: PC.primaryBg20, color: PC.secondary }}
                            >
                              → Étape suivante
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs leading-relaxed" style={{ color: step.done ? "#8c8c98" : "#c4c4cf" }}>
                          {step.description}
                        </p>
                      </div>
                    </div>
                    {step.done ? (
                      <span
                        className="text-lg"
                        style={{
                          color: PC.success,
                          animation: justCompleted[step.key] ? "onboardingCheckIn 260ms ease-out" : undefined,
                          transformOrigin: "center",
                        }}
                        aria-label="Étape complétée"
                      >
                        ✅
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition"
                        style={{ backgroundColor: "#7c3aed", color: PC.white }}
                        onClick={() => handleGoTo(step)}
                      >
                        Y aller →
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <footer className="mt-6 flex justify-end">
              {allDone ? (
                <BtnPrimary type="button" loading={closing} onClick={() => void handleCompleteAndClose()}>
                  Terminer 🎉
                </BtnPrimary>
              ) : (
                <button
                  type="button"
                  disabled={closing}
                  className="text-sm transition disabled:opacity-60"
                  style={{ color: PC.muted }}
                  onClick={onDismiss}
                >
                  Fermer
                </button>
              )}
            </footer>
          </>
        )}
      </div>
      <style jsx>{`
        @keyframes onboardingCheckIn {
          0% {
            opacity: 0;
            transform: scale(0.55);
          }
          70% {
            opacity: 1;
            transform: scale(1.15);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
