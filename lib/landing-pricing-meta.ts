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
    monthly: "4,90€/mois",
    yearly: "49€/an",
    yearlySave: "Économisez 9,80€/an",
    highlight: false,
    popular: false,
    cta: "Choisir Starter",
    ctaHref: "/register",
    ctaVariant: "primary",
  },
  pro: {
    subtitle: "Pour les investisseurs actifs",
    monthly: "9,90€/mois",
    yearly: "99€/an",
    yearlySave: "Économisez 19,80€/an",
    highlight: true,
    popular: true,
    cta: "Choisir Pro",
    ctaHref: "/register",
    ctaVariant: "primary",
  },
  expert: {
    subtitle: "Pour les grands patrimoines",
    monthly: "19,90€/mois",
    yearly: "199€/an",
    yearlySave: "Économisez 39,80€/an",
    highlight: false,
    popular: false,
    cta: "Choisir Expert",
    ctaHref: "/register",
    ctaVariant: "primary",
  },
};

export const PLAN_ORDER: PlanDisplayId[] = ["free", "starter", "pro", "expert"];
