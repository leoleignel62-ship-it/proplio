"use client";

import { useEffect, useMemo, useState } from "react";
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
};

const MODE_LOCATION_KEY = "locavio-mode-location";

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
    key: "mode-saisonnier",
    targetId: "mode-saisonnier",
    title: "🌴 Mode saisonnier",
    description:
      "Gérez vos locations courte durée : réservations, voyageurs, contrats de séjour, calendrier iCal et synchronisation Airbnb.",
    lockedOnFree: true,
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
    key: "mode-saisonnier",
    targetId: "mode-saisonnier",
    title: "🌴 Mode saisonnier — Débloqué ✅",
    description:
      "Basculez en mode saisonnier pour accéder à la gestion complète de vos locations courte durée.",
  },
  {
    key: "saisonnier-reservations",
    targetId: "saisonnier-reservations",
    title: "📅 Réservations",
    description:
      "Gérez toutes vos réservations courte durée. Vue liste ou calendrier planning, statuts, sources (Airbnb, Booking, Direct) et actions rapides.",
  },
  {
    key: "saisonnier-voyageurs",
    targetId: "saisonnier-voyageurs",
    title: "👤 Voyageurs",
    description:
      "Centralisez les informations de vos voyageurs : coordonnées, pièce d'identité et historique des séjours.",
  },
  {
    key: "saisonnier-contrats",
    targetId: "saisonnier-contrats",
    title: "📋 Contrats de séjour",
    description:
      "Générez et envoyez automatiquement les contrats de séjour à vos voyageurs par email en PDF.",
  },
  {
    key: "saisonnier-taxes",
    targetId: "saisonnier-taxes",
    title: "💰 Taxes de séjour",
    description:
      "Calculez et exportez automatiquement les taxes de séjour à déclarer auprès de votre commune.",
  },
];

function findVisibleTourTarget(targetId: string): HTMLElement | null {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour-id="${targetId}"]`));
  for (const node of nodes) {
    const rect = node.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0) return node;
  }
  return null;
}

export function GuidedTour({ currentPlan, tourType, open, userId, onClose }: GuidedTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const steps = tourType === "free" ? FREE_TOUR_STEPS : PAID_TOUR_STEPS;
  const safeStepIndex = Math.min(Math.max(stepIndex, 0), Math.max(steps.length - 1, 0));
  const step = steps[safeStepIndex];
  const isLastStep = safeStepIndex === steps.length - 1;
  const showLockBadge = tourType === "free" && currentPlan === "free" && Boolean(step.lockedOnFree);

  function switchMode(nextMode: "classique" | "saisonnier") {
    window.localStorage.setItem(MODE_LOCATION_KEY, nextMode);
    window.dispatchEvent(new Event("storage"));
    const targetButtonId = nextMode === "saisonnier" ? "mode-saisonnier" : "mode-classique";
    const button = findVisibleTourTarget(targetButtonId);
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  }

  const bubblePos = useMemo(() => {
    if (!targetRect) return { top: 120, left: 290 };
    const margin = 16;
    const desiredLeft = targetRect.right + 16;
    const maxLeft = window.innerWidth - 360 - margin;
    const left = Math.max(margin, Math.min(desiredLeft, maxLeft));
    const top = Math.max(margin, Math.min(targetRect.top - 12, window.innerHeight - 260));
    return { top, left };
  }, [targetRect]);

  useEffect(() => {
    if (!open) return;
    setStepIndex(0);
  }, [open, tourType]);

  useEffect(() => {
    if (!open) return;
  }, [open, tourType, steps.length]);

  useEffect(() => {
    if (!open) return;
    if (tourType !== "paid") return;
    if (step.key !== "mode-saisonnier") return;
    switchMode("saisonnier");
  }, [open, step.key, tourType]);

  useEffect(() => {
    if (!open) return;

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
  }, [open, step.key, step.targetId, tourType]);

  useEffect(() => {
    if (!open || !targetRect) return;
    const node = findVisibleTourTarget(step.targetId);
    if (!node) return;
    const previousOutline = node.style.outline;
    const previousOutlineOffset = node.style.outlineOffset;
    const previousBorderRadius = node.style.borderRadius;
    const previousBoxShadow = node.style.boxShadow;
    node.style.outline = "2px solid #7c3aed";
    node.style.outlineOffset = "2px";
    node.style.borderRadius = "10px";
    node.style.boxShadow = "0 0 0 4px rgba(124,58,237,0.35)";

    return () => {
      node.style.outline = previousOutline;
      node.style.outlineOffset = previousOutlineOffset;
      node.style.borderRadius = previousBorderRadius;
      node.style.boxShadow = previousBoxShadow;
    };
  }, [open, step.targetId, targetRect]);

  if (!open || steps.length === 0) return null;

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

  async function finishTour() {
    switchMode("classique");
    await markTourDone(tourType, userId);
    onClose();
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
        <p className="text-xs" style={{ color: "#d1d5db" }}>
          Étape {safeStepIndex + 1} sur {steps.length}
        </p>
        <h2 id="guided-tour-title" className="mt-2 text-lg font-bold text-white">
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
            🔒 Disponible dès le plan Starter
          </p>
        ) : null}
        <div className="mt-4 flex items-center justify-between">
          <button type="button" className="text-sm" style={{ color: "#d1d5db" }} onClick={() => void finishTour()}>
            Passer le tour
          </button>
          <button
            type="button"
            className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-[#7c3aed]"
            onClick={() => {
              if (isLastStep) {
                void finishTour();
                return;
              }
              setStepIndex((prev) => prev + 1);
            }}
          >
            {isLastStep ? "Terminer 🎉" : "Suivant →"}
          </button>
        </div>
      </div>
    </div>
  );
}

