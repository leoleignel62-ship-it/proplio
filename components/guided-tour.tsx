"use client";

import confetti from "canvas-confetti";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { canAccessDocuments, canAccessSaisonnier } from "@/lib/plan-limits";
import { supabase } from "@/lib/supabase";

type GuidedTourProps = {
  currentPlan: "free" | "starter" | "pro" | "expert";
  tourType: "free" | "paid";
  open: boolean;
  userId: string | null;
  onClose: () => void;
};

type TourStep = {
  key: string;
  targetId: string;
  title: string;
  description: string;
  lockedOnFree?: boolean;
  lockPlan?: "starter" | "pro";
  requiresSaisonnier?: boolean;
  requiresDocuments?: boolean;
};

const MODE_LOCATION_KEY = "locavio-mode-location";
const STEP_TRANSITION_MS = 150;

const FREE_TOUR_STEPS: TourStep[] = [
  {
    key: "dashboard",
    targetId: "dashboard",
    title: "📊 Tableau de bord",
    description:
      "Votre vue d'ensemble financière. Suivez vos loyers attendus, encaissés et en retard en un coup d'œil.",
  },
  {
    key: "logements",
    targetId: "logements",
    title: "🏠 Vos logements",
    description:
      "Gérez tous vos biens immobiliers. Ajoutez vos logements, définissez le loyer, les charges et le mode d'exploitation.",
  },
  {
    key: "locataires",
    targetId: "locataires",
    title: "👥 Vos locataires",
    description:
      "Centralisez les informations de vos locataires : coordonnées, documents et historique des paiements.",
  },
  {
    key: "quittances",
    targetId: "quittances",
    title: "📄 Quittances de loyer",
    description:
      "Générez et envoyez vos quittances en un seul clic. PDF conforme, envoi par email automatique.",
  },
  {
    key: "baux",
    targetId: "baux",
    title: "📋 Baux de location",
    description:
      "Créez des baux conformes à la loi ALUR, envoyez-les par email et suivez leur statut en temps réel.",
    lockedOnFree: true,
  },
  {
    key: "etats-des-lieux",
    targetId: "etats-des-lieux",
    title: "🔍 États des lieux",
    description:
      "Documentez l'état de votre logement à l'entrée et à la sortie avec photos, commentaires et PDF automatique.",
    lockedOnFree: true,
  },
  {
    key: "revisions-irl",
    targetId: "revisions-irl",
    title: "📈 Révision des loyers",
    description:
      "Calculez automatiquement la révision annuelle de vos loyers selon l'indice IRL de l'INSEE. Ne ratez plus jamais une révision.",
    lockedOnFree: true,
  },
  {
    key: "dossiers-candidature",
    targetId: "dossiers-candidature",
    title: "🗂️ Dossiers de candidature",
    description:
      "Envoyez un questionnaire à vos candidats locataires et recevez une note de solvabilité automatique. Disponible à partir du plan Pro.",
    lockedOnFree: true,
    lockPlan: "pro",
  },
  {
    key: "mode-saisonnier",
    targetId: "mode-saisonnier",
    title: "🌴 Mode saisonnier",
    description:
      "Gérez vos locations courte durée : réservations, voyageurs, contrats de séjour, calendrier iCal et synchronisation Airbnb. Disponible à partir du plan Pro.",
    lockedOnFree: true,
    lockPlan: "pro",
  },
];

const PAID_TOUR_STEPS: TourStep[] = [
  {
    key: "baux",
    targetId: "baux",
    title: "📋 Baux de location — Débloqué ✅",
    description:
      "Vous avez maintenant accès aux baux. Créez des baux conformes loi ALUR, envoyez-les par email et suivez leur statut en temps réel.",
  },
  {
    key: "etats-des-lieux",
    targetId: "etats-des-lieux",
    title: "🔍 États des lieux — Débloqué ✅",
    description:
      "Documentez l'entrée et la sortie de vos locataires avec photos, commentaires et génération PDF automatique.",
  },
  {
    key: "revisions-irl",
    targetId: "revisions-irl",
    title: "📈 Révision des loyers — Débloqué ✅",
    description:
      "Ne ratez plus jamais une révision de loyer. L'indice IRL est récupéré automatiquement depuis l'INSEE.",
  },
  {
    key: "dossiers-candidature",
    targetId: "dossiers-candidature",
    title: "🗂️ Dossiers de candidature",
    description:
      "Créez un dossier, envoyez le lien au candidat par email, et recevez automatiquement une note de solvabilité (A à E) basée sur ses revenus, son contrat de travail et la présence d'un garant.",
    requiresDocuments: true,
  },
  {
    key: "mode-saisonnier",
    targetId: "mode-saisonnier",
    title: "🌴 Mode saisonnier — Débloqué ✅",
    description:
      "Basculez en mode saisonnier pour accéder à la gestion complète de vos locations courte durée.",
    requiresSaisonnier: true,
  },
  {
    key: "saisonnier-reservations",
    targetId: "saisonnier-reservations",
    title: "📅 Réservations",
    description:
      "Gérez toutes vos réservations courte durée. Vue liste ou calendrier planning, statuts, sources (Airbnb, Booking, Direct) et actions rapides.",
    requiresSaisonnier: true,
  },
  {
    key: "saisonnier-voyageurs",
    targetId: "saisonnier-voyageurs",
    title: "👤 Voyageurs",
    description:
      "Centralisez les informations de vos voyageurs : coordonnées, pièce d'identité et historique des séjours.",
    requiresSaisonnier: true,
  },
  {
    key: "saisonnier-contrats",
    targetId: "saisonnier-contrats",
    title: "📋 Contrats de séjour",
    description:
      "Générez et envoyez automatiquement les contrats de séjour à vos voyageurs par email en PDF.",
    requiresSaisonnier: true,
  },
  {
    key: "saisonnier-taxes",
    targetId: "saisonnier-taxes",
    title: "💰 Taxes de séjour",
    description:
      "Calculez et exportez automatiquement les taxes de séjour à déclarer auprès de votre commune.",
    requiresSaisonnier: true,
  },
];

function findVisibleTourTarget(targetId: string): HTMLElement | null {
  const byNavId = document.getElementById(`nav-${targetId}`);
  if (byNavId) {
    const rect = byNavId.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0) return byNavId;
  }
  const nodes = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour-id="${targetId}"]`));
  for (const node of nodes) {
    const rect = node.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0) return node;
  }
  return null;
}

function fireTourConfetti() {
  confetti({
    particleCount: 80,
    spread: 60,
    colors: ["#7c3aed", "#a78bfa", "#ffffff"],
    origin: { y: 0.6 },
  });
}

export function GuidedTour({ currentPlan, tourType, open, userId, onClose }: GuidedTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimerRef = useRef<number | null>(null);

  const steps = useMemo(() => {
    if (tourType === "free") return FREE_TOUR_STEPS;
    return PAID_TOUR_STEPS.filter((s) => {
      if (s.requiresSaisonnier && !canAccessSaisonnier(currentPlan)) return false;
      if (s.requiresDocuments && !canAccessDocuments(currentPlan)) return false;
      return true;
    });
  }, [tourType, currentPlan]);

  const totalSteps = steps.length;
  const safeStepIndex = Math.min(Math.max(stepIndex, 0), Math.max(totalSteps - 1, 0));
  const step = steps[safeStepIndex];
  const isLastStep = safeStepIndex === totalSteps - 1;
  const progressPercent = totalSteps > 0 ? Math.round(((safeStepIndex + 1) / totalSteps) * 100) : 0;
  const showLockBadge = tourType === "free" && currentPlan === "free" && Boolean(step?.lockedOnFree);
  const lockBadgeText =
    step?.lockPlan === "pro" ? "🔒 Disponible dès le plan Pro" : "🔒 Disponible dès le plan Starter";

  const switchMode = useCallback((nextMode: "classique" | "saisonnier") => {
    window.localStorage.setItem(MODE_LOCATION_KEY, nextMode);
    window.dispatchEvent(new Event("storage"));
    const targetButtonId = nextMode === "saisonnier" ? "mode-saisonnier" : "mode-classique";
    const button = findVisibleTourTarget(targetButtonId);
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  }, []);

  const bubblePos = useMemo(() => {
    if (!targetRect) return { top: 120, left: 290 };
    const margin = 16;
    const desiredLeft = targetRect.right + 16;
    const maxLeft = window.innerWidth - 360 - margin;
    const left = Math.max(margin, Math.min(desiredLeft, maxLeft));
    const top = Math.max(margin, Math.min(targetRect.top - 12, window.innerHeight - 260));
    return { top, left };
  }, [targetRect]);

  const goToStep = useCallback((nextIndex: number) => {
    if (transitionTimerRef.current) {
      window.clearTimeout(transitionTimerRef.current);
    }
    setIsTransitioning(true);
    transitionTimerRef.current = window.setTimeout(() => {
      setStepIndex(nextIndex);
      setIsTransitioning(false);
      transitionTimerRef.current = null;
    }, STEP_TRANSITION_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) {
        window.clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setStepIndex(0);
    setIsTransitioning(false);
  }, [open, tourType]);

  useEffect(() => {
    if (!open || !step) return;
    if (tourType !== "paid") return;
    if (step.key !== "mode-saisonnier") return;
    switchMode("saisonnier");
  }, [open, step?.key, tourType, switchMode]);

  useEffect(() => {
    if (!open || !step?.targetId) return;

    const el = document.getElementById(`nav-${step.targetId}`) ?? findVisibleTourTarget(step.targetId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("tour-highlight");
      const highlightTimer = window.setTimeout(() => el.classList.remove("tour-highlight"), 2000);
      return () => {
        window.clearTimeout(highlightTimer);
        el.classList.remove("tour-highlight");
      };
    }
  }, [open, step?.targetId, safeStepIndex]);

  useEffect(() => {
    if (!open || !step) return;

    const updateTarget = () => {
      const node = findVisibleTourTarget(step.targetId);
      setTargetRect(node?.getBoundingClientRect() ?? null);
    };

    const delay = tourType === "paid" && step.key === "mode-saisonnier" ? 300 : 0;
    const delayed = window.setTimeout(updateTarget, delay);
    window.addEventListener("resize", updateTarget);
    window.addEventListener("scroll", updateTarget, true);
    const raf = window.requestAnimationFrame(updateTarget);

    return () => {
      window.clearTimeout(delayed);
      window.removeEventListener("resize", updateTarget);
      window.removeEventListener("scroll", updateTarget, true);
      window.cancelAnimationFrame(raf);
    };
  }, [open, step, tourType]);

  if (!open || totalSteps === 0 || !step) return null;

  async function markTourDone(type: "free" | "paid", ownerUserId: string | null) {
    const column = type === "free" ? "guided_tour_free_done" : "guided_tour_paid_done";
    if (ownerUserId) {
      await supabase
        .from("proprietaires")
        .update({ [column]: true })
        .eq("user_id", ownerUserId);
    }
    window.localStorage.setItem(`guided_tour_${type}_done`, "true");
  }

  async function finishTour(playConfetti: boolean) {
    if (playConfetti) {
      fireTourConfetti();
    }
    switchMode("classique");
    await markTourDone(tourType, userId);
    onClose();
  }

  function handleNext() {
    if (isLastStep) {
      void finishTour(true);
      return;
    }
    goToStep(safeStepIndex + 1);
  }

  return (
    <div className="fixed inset-0 z-[550] bg-black/60" role="dialog" aria-modal="true" aria-labelledby="guided-tour-title">
      {targetRect ? (
        <div
          className="pointer-events-none absolute h-0 w-0 border-y-8 border-r-[12px] border-y-transparent border-r-[#7c3aed]"
          style={{ top: bubblePos.top + 32, left: bubblePos.left - 12 }}
          aria-hidden
        />
      ) : null}

      <div
        className="absolute w-[340px] rounded-xl p-4 shadow-2xl"
        style={{ top: bubblePos.top, left: bubblePos.left, backgroundColor: "#7c3aed" }}
      >
        <div
          className={isTransitioning ? "tour-content-exit" : "tour-content-enter"}
        >
          <div className="mb-3">
            <div className="mb-1.5 flex justify-between text-xs text-white/70">
              <span>
                Étape {safeStepIndex + 1} sur {totalSteps}
              </span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/20">
              <div
                className="h-1.5 rounded-full bg-white transition-all duration-500 ease-out"
                style={{ width: `${((safeStepIndex + 1) / totalSteps) * 100}%` }}
              />
            </div>
          </div>
          <h2 id="guided-tour-title" className="text-lg font-bold text-white">
            {step.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: "#e5e7eb" }}>
            {step.description}
          </p>
          {showLockBadge ? (
            <p
              className="mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{ backgroundColor: "rgba(245, 158, 11, 0.2)", color: "#fbbf24" }}
            >
              {lockBadgeText}
            </p>
          ) : null}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <button type="button" className="text-sm" style={{ color: "#d1d5db" }} onClick={() => void finishTour(false)}>
            Passer le tour
          </button>
          <button
            type="button"
            className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-[#7c3aed]"
            disabled={isTransitioning}
            onClick={handleNext}
          >
            {isLastStep ? "Terminer 🎉" : "Suivant →"}
          </button>
        </div>
      </div>
    </div>
  );
}
