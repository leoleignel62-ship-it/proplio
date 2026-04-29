"use client";

import { useMemo, useState } from "react";
import { BtnPrimary } from "@/components/ui";
import { PC } from "@/lib/locavio-colors";
import type { LocavioPlan } from "@/lib/plan-limits";

type OnboardingModalProps = {
  open: boolean;
  plan: LocavioPlan;
  onComplete: () => Promise<void> | void;
};

function getPaidWelcomeContent(plan: LocavioPlan): { title: string; subtitle: string; bullets: string[] } {
  if (plan === "expert") {
    return {
      title: "🎉 Bienvenue sur le plan Expert !",
      subtitle: "Vous avez débloqué de nouvelles fonctionnalités :",
      bullets: [
        "📋 Baux illimités (PDF conforme loi ALUR)",
        "🔍 États des lieux illimités (photos + PDF)",
        "📈 Révision annuelle des loyers (IRL INSEE)",
        "🌴 Mode saisonnier (réservations, contrats, calendrier iCal)",
        "🗂️ Dossiers de candidature — analysez la solvabilité de vos candidats avec une note automatique (A à E)",
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
        "🌴 Mode saisonnier (réservations, contrats, calendrier iCal)",
        "🗂️ Dossiers de candidature — analysez la solvabilité de vos candidats avec une note automatique (A à E)",
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
      "🌴 Mode saisonnier (réservations, contrats, calendrier iCal)",
      "🗂️ Dossiers de candidature — analysez la solvabilité de vos candidats avec une note automatique (A à E)",
    ],
  };
}

export function OnboardingModal({
  open,
  plan,
  onComplete,
}: OnboardingModalProps) {
  const [closing, setClosing] = useState(false);
  const isPaid = plan === "starter" || plan === "pro" || plan === "expert";
  const paidWelcome = useMemo(() => getPaidWelcomeContent(plan), [plan]);

  if (!open || !isPaid) return null;

  async function handleCompleteAndClose() {
    setClosing(true);
    try {
      await onComplete();
    } finally {
      setClosing(false);
    }
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
      </div>
    </div>
  );
}
