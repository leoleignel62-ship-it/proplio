"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";
import { IconChart, IconClipboard, IconContract, IconDocument, IconHome, IconUsers } from "@/components/proplio-icons";
import { PC } from "@/lib/proplio-colors";

type BillingMode = "mensuel" | "annuel";

type Plan = {
  nom: string;
  monthlyLabel: string;
  yearlyLabel: string;
  yearlyEquivalent: string;
  oldMonthly?: string;
  cta: string;
  highlighted?: boolean;
  annualDiscountBadge?: string;
  features: string[];
};

const plans: Plan[] = [
  {
    nom: "Decouverte",
    monthlyLabel: "Gratuit",
    yearlyLabel: "Gratuit",
    yearlyEquivalent: "1 logement · 1 locataire",
    cta: "Demarrer",
    features: ["1 logement", "1 locataire", "1 quittance PDF", "1 bail", "1 etat des lieux"],
  },
  {
    nom: "Starter",
    monthlyLabel: "4,90EUR/mois",
    yearlyLabel: "49EUR/an",
    yearlyEquivalent: "soit 4,08EUR/mois",
    oldMonthly: "4,90EUR/mois",
    annualDiscountBadge: "2 mois offerts",
    cta: "Choisir Starter",
    features: ["Jusqu'a 3 logements", "Jusqu'a 3 locataires", "Quittances PDF auto", "Baux conformes loi Alur", "Dashboard financier"],
  },
  {
    nom: "Pro",
    monthlyLabel: "9,90EUR/mois",
    yearlyLabel: "99EUR/an",
    yearlyEquivalent: "soit 8,25EUR/mois",
    oldMonthly: "9,90EUR/mois",
    annualDiscountBadge: "2 mois offerts",
    cta: "Choisir Pro",
    highlighted: true,
    features: ["Jusqu'a 10 logements", "Jusqu'a 10 locataires", "Quittances PDF auto", "Baux conformes loi Alur", "Etats des lieux", "Dashboard financier avance"],
  },
  {
    nom: "Expert",
    monthlyLabel: "19,90EUR/mois",
    yearlyLabel: "199EUR/an",
    yearlyEquivalent: "soit 16,58EUR/mois",
    oldMonthly: "19,90EUR/mois",
    annualDiscountBadge: "2 mois offerts",
    cta: "Choisir Expert",
    features: ["Logements illimites", "Locataires illimites", "Documents illimites", "Support prioritaire", "Tous les modules Proplio"],
  },
];

const featureItems = [
  { title: "Logements", subtitle: "Suivi detaille de tout votre parc", icon: IconHome },
  { title: "Locataires", subtitle: "Profils, contacts et affectations", icon: IconUsers },
  { title: "Quittances PDF auto", subtitle: "Generation automatique mensuelle", icon: IconDocument },
  { title: "Baux conformes loi Alur", subtitle: "Modele clair et securise", icon: IconContract },
  { title: "Etats des lieux", subtitle: "Entree / sortie digitalises", icon: IconClipboard },
  { title: "Dashboard financier", subtitle: "Vue revenus, manque et performance", icon: IconChart },
];

const pageStyle: CSSProperties = {
  background: `radial-gradient(circle at 20% 0%, rgba(124, 58, 237, 0.18), transparent 45%), ${PC.bg}`,
  color: PC.text,
  minHeight: "100vh",
};

const cardBaseStyle: CSSProperties = {
  backgroundColor: PC.card,
  border: `1px solid ${PC.border}`,
  borderRadius: 16,
  boxShadow: PC.cardShadow,
};

export default function LandingPage() {
  const [billing, setBilling] = useState<BillingMode>("annuel");

  const renderedPlans = useMemo(() => plans, []);

  return (
    <div style={pageStyle}>
      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <header className="rounded-2xl p-8 sm:p-12" style={{ ...cardBaseStyle, backgroundColor: PC.cardAlpha90 }}>
          <div className="mx-auto max-w-3xl text-center">
            <p className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: PC.primaryBg25, color: PC.secondary }}>
              Proplio
            </p>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-5xl">
              Gerez vos locations en toute simplicite
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base" style={{ color: PC.muted }}>
              Centralisez logements, locataires, quittances, baux et etats des lieux dans une seule plateforme premium, rapide et fiable.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link href="/register" className="rounded-lg px-5 py-2.5 text-sm font-semibold" style={{ backgroundColor: PC.primary, color: PC.white }}>
                Commencer gratuitement
              </Link>
              <Link href="/login" className="rounded-lg px-5 py-2.5 text-sm font-semibold" style={{ backgroundColor: PC.card, border: `1px solid ${PC.border}`, color: PC.text }}>
                Se connecter
              </Link>
            </div>
          </div>
        </header>

        <section className="mt-14">
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">Tout votre pilotage locatif dans Proplio</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featureItems.map((item) => (
              <article key={item.title} className="rounded-xl p-5" style={cardBaseStyle}>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg" style={{ backgroundColor: PC.primaryBg20 }}>
                  <item.icon className="h-5 w-5" style={{ color: PC.secondary }} />
                </div>
                <h3 className="mt-4 text-base font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm" style={{ color: PC.muted }}>
                  {item.subtitle}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-16">
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">Des offres claires, sans surprise</h2>
            <div className="inline-flex rounded-xl p-1" style={{ backgroundColor: PC.card, border: `1px solid ${PC.border}` }}>
              {(["mensuel", "annuel"] as const).map((mode) => {
                const active = billing === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setBilling(mode)}
                    className="rounded-lg px-4 py-2 text-sm font-semibold transition"
                    style={{
                      backgroundColor: active ? PC.primary : "transparent",
                      color: active ? PC.white : PC.muted,
                    }}
                  >
                    {mode === "mensuel" ? "Mensuel" : "Annuel"}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-8 flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-4 md:overflow-visible">
            {renderedPlans.map((plan) => {
              const isAnnual = billing === "annuel";
              const isHighlighted = Boolean(plan.highlighted);
              return (
                <article
                  key={plan.nom}
                  className={`relative min-w-[280px] rounded-2xl p-5 md:min-w-0 ${isHighlighted ? "md:scale-[1.03]" : ""}`}
                  style={{
                    ...cardBaseStyle,
                    backgroundColor: isHighlighted ? PC.primary : PC.card,
                    border: isHighlighted ? `1px solid ${PC.secondary}` : `1px solid ${PC.border}`,
                  }}
                >
                  {isHighlighted ? (
                    <p className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: PC.secondary, color: "#2B1168" }}>
                      Le plus populaire
                    </p>
                  ) : null}
                  {isAnnual && plan.annualDiscountBadge ? (
                    <p className="mb-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: isHighlighted ? PC.white : PC.primaryBg25, color: isHighlighted ? "#2B1168" : PC.secondary }}>
                      {plan.annualDiscountBadge}
                    </p>
                  ) : (
                    <div className="mb-3 h-6" />
                  )}

                  <h3 className="text-lg font-semibold" style={{ color: isHighlighted ? PC.white : PC.text }}>
                    {plan.nom}
                  </h3>

                  {isAnnual ? (
                    <>
                      <p className="mt-4 text-xs line-through" style={{ color: isHighlighted ? "rgba(255,255,255,0.78)" : PC.muted }}>
                        {plan.oldMonthly ?? ""}
                      </p>
                      <p className="mt-1 text-4xl font-semibold tracking-tight" style={{ color: isHighlighted ? PC.white : PC.text }}>
                        {plan.yearlyLabel}
                      </p>
                      <p className="mt-1 text-xs" style={{ color: isHighlighted ? "rgba(255,255,255,0.86)" : PC.muted }}>
                        {plan.yearlyEquivalent}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="mt-4 text-4xl font-semibold tracking-tight" style={{ color: isHighlighted ? PC.white : PC.text }}>
                        {plan.monthlyLabel}
                      </p>
                      <p className="mt-1 text-xs" style={{ color: isHighlighted ? "rgba(255,255,255,0.86)" : PC.muted }}>
                        {plan.yearlyLabel === "Gratuit" ? "sans engagement" : `ou ${plan.yearlyLabel} en annuel`}
                      </p>
                    </>
                  )}

                  <Link
                    href="/register"
                    className="mt-5 inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold"
                    style={{
                      backgroundColor: isHighlighted ? PC.white : PC.primary,
                      color: isHighlighted ? "#2B1168" : PC.white,
                    }}
                  >
                    {plan.cta}
                  </Link>

                  <ul className="mt-5 space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm" style={{ color: isHighlighted ? "rgba(255,255,255,0.92)" : PC.text }}>
                        <span style={{ color: isHighlighted ? PC.white : PC.success }}>✓</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="border-t px-4 py-6 text-center text-sm sm:px-6" style={{ borderColor: PC.border, color: PC.muted }}>
        Proplio © {new Date().getFullYear()} — Gestion locative premium.
      </footer>
    </div>
  );
}
