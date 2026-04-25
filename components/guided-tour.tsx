"use client";

import { useEffect, useMemo, useState } from "react";

type GuidedTourProps = {
  plan: "free" | "starter" | "pro" | "expert";
  open: boolean;
  onClose: () => void;
};

type TourStep = {
  key: string;
  targetId: string;
  title: string;
  description: string;
  lockedOnFree?: boolean;
};

const GUIDED_TOUR_DONE_KEY = "guided_tour_done";

const TOUR_STEPS: TourStep[] = [
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
];

function findVisibleTourTarget(targetId: string): HTMLElement | null {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour-id="${targetId}"]`));
  for (const node of nodes) {
    const rect = node.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0) return node;
  }
  return null;
}

export function GuidedTour({ plan, open, onClose }: GuidedTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const step = TOUR_STEPS[stepIndex];
  const isLastStep = stepIndex === TOUR_STEPS.length - 1;
  const showLockBadge = plan === "free" && Boolean(step.lockedOnFree);

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
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const updateTarget = () => {
      const node = findVisibleTourTarget(step.targetId);
      setTargetRect(node?.getBoundingClientRect() ?? null);
    };

    updateTarget();
    window.addEventListener("resize", updateTarget);
    window.addEventListener("scroll", updateTarget, true);
    const raf = window.requestAnimationFrame(updateTarget);

    return () => {
      window.removeEventListener("resize", updateTarget);
      window.removeEventListener("scroll", updateTarget, true);
      window.cancelAnimationFrame(raf);
    };
  }, [open, step.targetId]);

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

  if (!open) return null;

  function finishTour() {
    window.localStorage.setItem(GUIDED_TOUR_DONE_KEY, "true");
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
          Étape {stepIndex + 1} sur {TOUR_STEPS.length}
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
          <button type="button" className="text-sm" style={{ color: "#d1d5db" }} onClick={finishTour}>
            Passer le tour
          </button>
          <button
            type="button"
            className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-[#7c3aed]"
            onClick={() => {
              if (isLastStep) {
                finishTour();
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

