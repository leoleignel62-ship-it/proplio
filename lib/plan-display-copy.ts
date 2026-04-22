/** Textes d'affichage des plans (landing, abonnement, paramètres) — doit rester aligné partout. */

export type PlanDisplayId = "free" | "starter" | "pro" | "expert";

export const PLAN_DISPLAY_LABELS: Record<PlanDisplayId, string> = {
  free: "Découverte",
  starter: "Starter",
  pro: "Pro",
  expert: "Expert",
};

export const PLAN_DISPLAY_FEATURES: Record<PlanDisplayId, { positives: string[]; negatives?: string[] }> = {
  free: {
    positives: [
      "1 logement",
      "1 locataire",
      "1 quittance (PDF + envoi email en 1 clic) à vie",
      "Dashboard financier",
    ],
    negatives: ["Baux non inclus", "États des lieux non inclus"],
  },
  starter: {
    positives: [
      "3 logements",
      "3 locataires",
      "3 quittances/mois (PDF + envoi email en 1 clic)",
      "3 baux/mois (PDF conforme loi ALUR + envoi email)",
      "3 états des lieux/mois (photos + PDF + envoi email)",
      "Dashboard financier complet",
    ],
  },
  pro: {
    positives: [
      "10 logements",
      "10 locataires",
      "10 quittances/mois (PDF + envoi email en 1 clic)",
      "10 baux/mois (PDF conforme loi ALUR + envoi email)",
      "10 états des lieux/mois (photos + PDF + envoi email)",
      "Dashboard financier avancé",
    ],
  },
  expert: {
    positives: [
      "Logements illimités",
      "Locataires illimités",
      "Quittances illimitées (PDF + envoi email en 1 clic)",
      "Baux illimités (PDF conforme loi ALUR + envoi email)",
      "États des lieux illimités (photos + PDF + envoi email)",
      "Dashboard complet",
    ],
  },
};

export function planDisplayRows(id: PlanDisplayId): Array<{ text: string; included: boolean }> {
  const f = PLAN_DISPLAY_FEATURES[id];
  return [
    ...f.positives.map((text) => ({ text, included: true })),
    ...(f.negatives ?? []).map((text) => ({ text, included: false })),
  ];
}
