/** Textes d'affichage des plans (landing, abonnement, paramètres) — doit rester aligné partout. */

export type PlanDisplayId = "free" | "starter" | "pro" | "expert";

export type PlanDisplayRowVariant = "limit" | "banner" | "default" | "differentiator" | "muted";

export type PlanDisplayRow = {
  text: string;
  included: boolean;
  variant?: PlanDisplayRowVariant;
};

export type PlanDisplayFeatures = {
  positives: string[];
  negatives?: string[];
  baseLabel?: string;
  extras?: string[];
  commonFeatures?: string[];
};

export const PLAN_DISPLAY_LABELS: Record<PlanDisplayId, string> = {
  free: "Découverte",
  starter: "Starter",
  pro: "Pro",
  expert: "Expert",
};

export const PLAN_DISPLAY_FEATURES: Record<PlanDisplayId, PlanDisplayFeatures> = {
  free: {
    positives: ["1 logement · 1 locataire", "1 quittance à vie", "Dashboard financier"],
    negatives: [
      "Baux non inclus",
      "États des lieux non inclus",
      "Révision IRL non incluse",
      "Signature électronique non incluse",
      "Mode saisonnier non inclus",
      "Dossiers de candidature non inclus",
    ],
  },
  starter: {
    positives: [
      "Jusqu'à 3 logements · 3 locataires",
      "Quittances illimitées",
      "Baux conformes loi ALUR",
      "États des lieux avec photos",
      "Révision IRL automatique",
      "Signature électronique incluse",
    ],
    negatives: ["Mode saisonnier non inclus", "Dossiers de candidature non inclus"],
  },
  pro: {
    baseLabel: "Tout Starter, plus :",
    extras: [
      "Mode saisonnier (5 logements max, classique + saisonnier confondus)",
      "Dossiers de candidature illimités",
      "Jusqu'à 5 logements · 5 locataires",
    ],
    commonFeatures: [
      "Quittances illimitées",
      "Baux conformes loi ALUR",
      "États des lieux avec photos",
      "Révision IRL automatique",
      "Signature électronique incluse",
    ],
    positives: [
      "Jusqu'à 5 logements · 5 locataires",
      "Quittances illimitées",
      "Baux conformes loi ALUR",
      "États des lieux avec photos",
      "Révision IRL automatique",
      "Signature électronique incluse",
      "Mode saisonnier inclus (5 logements max, classique + saisonnier confondus)",
      "Dossiers de candidature illimités",
    ],
  },
  expert: {
    baseLabel: "Tout Pro, plus :",
    extras: ["Logements et locataires illimités", "Mode saisonnier illimité", "Support prioritaire"],
    commonFeatures: [
      "Quittances illimitées",
      "Baux illimités",
      "États des lieux illimités",
      "Révision IRL automatique",
      "Signature électronique incluse",
      "Dossiers de candidature illimités",
    ],
    positives: [
      "Logements et locataires illimités",
      "Quittances illimitées",
      "Baux illimités",
      "États des lieux illimités",
      "Révision IRL automatique",
      "Signature électronique incluse",
      "Mode saisonnier illimité",
      "Dossiers de candidature illimités",
      "Support prioritaire",
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
        { text: "Signature électronique non incluse", included: false },
        { text: "Mode saisonnier non inclus", included: false },
        { text: "Dossiers de candidature non inclus", included: false },
      ];
    case "starter":
      return [
        { text: "Jusqu'à 3 logements · 3 locataires", included: true, variant: "banner" },
        { text: "Quittances illimitées", included: true },
        { text: "Baux conformes loi ALUR", included: true },
        { text: "États des lieux avec photos", included: true },
        { text: "Révision IRL automatique", included: true },
        { text: "Signature électronique incluse", included: true },
        { text: "Mode saisonnier non inclus", included: false, variant: "muted" },
        { text: "Dossiers de candidature non inclus", included: false, variant: "muted" },
      ];
    case "pro":
      return [
        { text: "Jusqu'à 5 logements · 5 locataires", included: true, variant: "banner" },
        { text: "Quittances illimitées", included: true },
        { text: "Baux conformes loi ALUR", included: true },
        { text: "États des lieux avec photos", included: true },
        { text: "Révision IRL automatique", included: true },
        { text: "Signature électronique incluse", included: true },
        {
          text: "Mode saisonnier inclus (5 logements max, classique + saisonnier confondus)",
          included: true,
          variant: "differentiator",
        },
        { text: "Dossiers de candidature illimités", included: true, variant: "differentiator" },
      ];
    case "expert":
      return [
        { text: "Logements et locataires illimités", included: true, variant: "differentiator" },
        { text: "Quittances illimitées", included: true },
        { text: "Baux illimités", included: true },
        { text: "États des lieux illimités", included: true },
        { text: "Révision IRL automatique", included: true },
        { text: "Signature électronique incluse", included: true },
        { text: "Mode saisonnier illimité", included: true, variant: "differentiator" },
        { text: "Dossiers de candidature illimités", included: true },
        { text: "Support prioritaire", included: true },
      ];
  }
}
