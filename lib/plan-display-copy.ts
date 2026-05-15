/** Textes d'affichage des plans (landing, abonnement, paramètres) — doit rester aligné partout. */

export type PlanDisplayId = "free" | "starter" | "pro" | "expert";

export type PlanDisplayRowVariant = "limit" | "banner" | "default" | "differentiator" | "muted";

export type PlanDisplayRow = {
  text: string;
  included: boolean;
  variant?: PlanDisplayRowVariant;
};

export const PLAN_DISPLAY_LABELS: Record<PlanDisplayId, string> = {
  free: "Découverte",
  starter: "Starter",
  pro: "Pro",
  expert: "Expert",
};

export const PLAN_DISPLAY_FEATURES: Record<PlanDisplayId, { positives: string[]; negatives?: string[] }> = {
  free: {
    positives: ["1 logement · 1 locataire", "1 quittance à vie", "Dashboard financier"],
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
      "Jusqu'à 3 logements et 3 locataires",
      "Quittances illimitées",
      "Baux conformes loi ALUR",
      "États des lieux avec photos",
      "Révision IRL automatique",
    ],
    negatives: ["Mode saisonnier non inclus", "Dossiers de candidature non inclus"],
  },
  pro: {
    positives: [
      "Jusqu'à 5 logements et 5 locataires",
      "Quittances illimitées",
      "Baux conformes loi ALUR",
      "États des lieux avec photos",
      "Révision IRL automatique",
      "Mode saisonnier complet",
      "Dossiers de candidature",
    ],
  },
  expert: {
    positives: [
      "Logements et locataires illimités",
      "Quittances illimitées",
      "Baux illimités",
      "États des lieux illimités",
      "Révision IRL automatique",
      "Mode saisonnier illimité",
      "Dossiers de candidature illimités",
    ],
  },
};

export function planDisplayRows(id: PlanDisplayId): PlanDisplayRow[] {
  switch (id) {
    case "free":
      return [
        { text: "1 logement · 1 locataire", included: true, variant: "limit" },
        { text: "1 quittance à vie", included: true },
        { text: "Dashboard financier", included: true },
        { text: "Baux non inclus", included: false },
        { text: "États des lieux non inclus", included: false },
        { text: "Révision IRL non incluse", included: false },
        { text: "Mode saisonnier non inclus", included: false },
        { text: "Dossiers de candidature non inclus", included: false },
      ];
    case "starter":
      return [
        { text: "Jusqu'à 3 logements et 3 locataires", included: true, variant: "banner" },
        { text: "Quittances illimitées", included: true },
        { text: "Baux conformes loi ALUR", included: true },
        { text: "États des lieux avec photos", included: true },
        { text: "Révision IRL automatique", included: true },
        { text: "Mode saisonnier non inclus", included: false, variant: "muted" },
        { text: "Dossiers de candidature non inclus", included: false, variant: "muted" },
      ];
    case "pro":
      return [
        { text: "Jusqu'à 5 logements et 5 locataires", included: true, variant: "banner" },
        { text: "Quittances illimitées", included: true },
        { text: "Baux conformes loi ALUR", included: true },
        { text: "États des lieux avec photos", included: true },
        { text: "Révision IRL automatique", included: true },
        { text: "Mode saisonnier complet", included: true, variant: "differentiator" },
        { text: "Dossiers de candidature", included: true, variant: "differentiator" },
      ];
    case "expert":
      return [
        { text: "Logements et locataires illimités", included: true, variant: "banner" },
        { text: "Quittances illimitées", included: true },
        { text: "Baux illimités", included: true },
        { text: "États des lieux illimités", included: true },
        { text: "Révision IRL automatique", included: true },
        { text: "Mode saisonnier illimité", included: true, variant: "differentiator" },
        { text: "Dossiers de candidature illimités", included: true, variant: "differentiator" },
      ];
  }
}
