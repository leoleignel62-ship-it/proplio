import type { PlanDisplayId } from "@/lib/plan-display-copy";

export const LANDING_PRICING_META: Record<
  PlanDisplayId,
  {
    subtitle: string;
    monthly: string;
    yearly: string;
    yearlySave: string | null;
    highlight: boolean;
    popular: boolean;
    cta: string;
    ctaHref: string;
    ctaVariant: "outline" | "primary";
  }
> = {
  free: {
    subtitle: "Pour tester Locavio",
    monthly: "Gratuit",
    yearly: "Gratuit",
    yearlySave: null,
    highlight: false,
    popular: false,
    cta: "Commencer gratuitement",
    ctaHref: "/register",
    ctaVariant: "outline",
  },
  starter: {
    subtitle: "Pour les petits propriétaires",
    monthly: "6,90€/mois",
    yearly: "69€/an",
    yearlySave: "Économisez 13,80€/an",
    highlight: false,
    popular: false,
    cta: "Choisir Starter",
    ctaHref: "/register",
    ctaVariant: "primary",
  },
  pro: {
    subtitle: "Pour les investisseurs actifs",
    monthly: "12,90€/mois",
    yearly: "129€/an",
    yearlySave: "Économisez 25,80€/an",
    highlight: true,
    popular: true,
    cta: "Choisir Pro",
    ctaHref: "/register",
    ctaVariant: "primary",
  },
  expert: {
    subtitle: "Pour les grands patrimoines",
    monthly: "24,90€/mois",
    yearly: "249€/an",
    yearlySave: "Économisez 49,80€/an",
    highlight: false,
    popular: false,
    cta: "Choisir Expert",
    ctaHref: "/register",
    ctaVariant: "primary",
  },
};

export const PLAN_ORDER: PlanDisplayId[] = ["free", "starter", "pro", "expert"];
