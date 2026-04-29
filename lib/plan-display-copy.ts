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
    negatives: [
      "Baux non inclus",
      "États des lieux non inclus",
      "Mode saisonnier non inclus",
      "Révision IRL non incluse",
      "Dossiers de candidature — Non inclus",
    ],
  },
  starter: {
    positives: [
      "3 logements (location classique et saisonnière)",
      "3 locataires",
      "Quittances illimitées (PDF + envoi email en 1 clic)",
      "Baux illimités (PDF conforme loi ALUR + envoi email)",
      "États des lieux illimités (photos + PDF + envoi email)",
      "Révision annuelle des loyers (IRL INSEE)",
      "Mode saisonnier inclus (réservations, contrats, calendrier iCal)",
      "Dossiers de candidature — Illimité",
    ],
  },
  pro: {
    positives: [
      "5 logements (location classique et saisonnière)",
      "5 locataires",
      "Quittances illimitées",
      "Baux illimités",
      "États des lieux illimités",
      "Révision annuelle des loyers (IRL INSEE)",
      "Mode saisonnier inclus",
      "Dossiers de candidature — Illimité",
    ],
  },
  expert: {
    positives: [
      "Logements illimités",
      "Locataires illimités",
      "Quittances illimitées",
      "Baux illimités",
      "États des lieux illimités",
      "Révision annuelle des loyers (IRL INSEE)",
      "Mode saisonnier illimité",
      "Dossiers de candidature — Illimité",
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
