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
      "1 quittance à vie",
      "Dashboard financier",
    ],
    negatives: [
      "Baux non inclus",
      "États des lieux non inclus",
      "Révision IRL non incluse",
      "Mode saisonnier non inclus",
      "Dossiers de candidature non inclus",
    ],
  },
  starter: {
    positives: [
      "3 logements",
      "3 locataires",
      "Quittances illimitées",
      "Baux conformes loi ALUR",
      "États des lieux avec photos",
      "Révision IRL automatique",
    ],
    negatives: [
      "Mode saisonnier non inclus",
      "Dossiers de candidature non inclus",
    ],
  },
  pro: {
    positives: [
      "5 logements",
      "5 locataires",
      "Quittances illimitées",
      "Baux conformes loi ALUR",
      "États des lieux avec photos",
      "Révision IRL automatique",
      "Mode saisonnier complet",
      "Dossiers de candidature illimités",
    ],
  },
  expert: {
    positives: [
      "Logements illimités",
      "Locataires illimités",
      "Quittances illimitées",
      "Baux illimités",
      "États des lieux illimités",
      "Révision IRL automatique",
      "Mode saisonnier illimité",
      "Dossiers de candidature illimités",
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
