"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { LANDING_PRICING_META, PLAN_ORDER } from "@/lib/landing-pricing-meta";
import { PLAN_DISPLAY_LABELS, planDisplayRows } from "@/lib/plan-display-copy";
import { PC } from "@/lib/locavio-colors";

type BillingMode = "mensuel" | "annuel";

const ease = "200ms ease-out";

const solidCard: CSSProperties = {
  background: PC.gradientCard,
  backgroundColor: PC.card,
  border: `1px solid ${PC.borderStrong}`,
  borderRadius: 12,
  boxShadow: PC.cardShadow,
};

export type LandingPricingSectionProps = {
  sectionId?: string;
  showIntro?: boolean;
  title?: string;
  subtitle?: string;
  className?: string;
};

export function LandingPricingSection({
  sectionId = "tarifs",
  showIntro = true,
  title = "Des tarifs pensés pour les propriétaires",
  subtitle = "Commencez gratuitement, évoluez selon vos besoins.",
  className = "",
}: LandingPricingSectionProps) {
  const [billing, setBilling] = useState<BillingMode>("annuel");
  const [pricingVisible, setPricingVisible] = useState<Record<number, boolean>>({});
  const pricingRefs = useRef<Array<HTMLElement | null>>([]);
  const reduceMotionRef = useRef(false);

  const pricingPlans = useMemo(
    () =>
      PLAN_ORDER.map((id) => {
        const meta = LANDING_PRICING_META[id];
        return {
          id,
          name: PLAN_DISPLAY_LABELS[id],
          subtitle: meta.subtitle,
          monthly: meta.monthly,
          yearly: meta.yearly,
          yearlySave: meta.yearlySave,
          highlight: meta.highlight,
          popular: meta.popular,
          cta: meta.cta,
          ctaHref: meta.ctaHref,
          ctaVariant: meta.ctaVariant,
          featureRows: planDisplayRows(id),
        };
      }),
    [],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    reduceMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (reduceMotionRef.current) {
      setPricingVisible(
        Object.fromEntries(Array.from({ length: pricingPlans.length }, (_, index) => [index, true])) as Record<
          number,
          boolean
        >,
      );
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = Number((entry.target as HTMLElement).dataset.pricingIndex ?? "-1");
          if (index >= 0 && entry.isIntersecting) {
            window.setTimeout(() => {
              setPricingVisible((prev) => ({ ...prev, [index]: true }));
            }, index * 80);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 },
    );
    pricingRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [pricingPlans.length]);

  return (
    <section
      id={sectionId}
      className={`landing-section mt-12 scroll-mt-24 py-8 will-change-transform ${className}`.trim()}
    >
      {showIntro ? (
        <div className="text-center">
          <h2 className="text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl" style={{ color: PC.text }}>
            {title}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base font-medium leading-[1.7]" style={{ color: PC.muted }}>
            {subtitle}
          </p>
        </div>
      ) : null}

      <div className={`mx-auto flex max-w-md flex-col items-center gap-3 ${showIntro ? "mt-10" : "mt-0"}`}>
        <div className="relative inline-flex rounded-full p-1" style={{ backgroundColor: PC.inputBg, border: `1px solid ${PC.border}` }}>
          {(["mensuel", "annuel"] as const).map((mode) => {
            const active = billing === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setBilling(mode)}
                className="relative rounded-full px-5 py-2.5 text-sm font-semibold transition"
                style={{
                  backgroundColor: active ? PC.primary : "transparent",
                  color: active ? PC.white : PC.muted,
                  boxShadow: active ? PC.activeRing : "none",
                  transition: ease,
                }}
              >
                {mode === "mensuel" ? "Mensuel" : "Annuel"}
              </button>
            );
          })}
        </div>
        {billing === "annuel" ? (
          <>
            <span
              className="rounded-full px-3 py-1 text-xs font-bold"
              style={{ backgroundColor: PC.successBg10, color: PC.success, border: `1px solid ${PC.borderSuccess40}` }}
            >
              2 mois offerts 🎉
            </span>
            <p className="text-center text-sm font-medium" style={{ color: PC.muted }}>
              Économisez jusqu&apos;à 39,80€/an avec l&apos;abonnement annuel
            </p>
          </>
        ) : null}
      </div>

      <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {pricingPlans.map((plan, index) => {
          const isAnnual = billing === "annuel";
          const price = plan.id === "free" ? plan.monthly : isAnnual ? plan.yearly : plan.monthly;
          const showStrike = plan.id !== "free" && isAnnual;
          return (
            <article
              key={plan.id}
              ref={(el) => {
                pricingRefs.current[index] = el;
              }}
              data-pricing-index={index}
              className="relative flex will-change-transform flex-col rounded-2xl p-6 transition"
              style={{
                ...solidCard,
                border:
                  plan.popular || plan.highlight
                    ? `1px solid rgba(124, 58, 237, 0.45)`
                    : `1px solid ${PC.border}`,
                boxShadow: plan.highlight ? PC.cardShadowHover : "0 1px 3px rgba(0, 0, 0, 0.25)",
                opacity: pricingVisible[index] ? 1 : 0,
                transform: `${plan.highlight ? "scale(1.01) " : ""}${pricingVisible[index] ? "translate3d(0, 0, 0)" : "translate3d(0, 30px, 0)"}`,
                transition: "opacity 700ms ease-out, transform 700ms ease-out",
              }}
            >
              {plan.popular ? (
                <p
                  className="absolute -top-3 left-1/2 w-max -translate-x-1/2 rounded-full px-3 py-1 text-xs font-bold"
                  style={{ backgroundColor: PC.primary, color: PC.white }}
                >
                  Le plus populaire ⭐
                </p>
              ) : null}
              {isAnnual && plan.yearlySave ? (
                <p
                  className="mb-2 inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  style={{ backgroundColor: PC.successBg10, color: PC.success }}
                >
                  {plan.yearlySave}
                </p>
              ) : (
                <div className="h-6" />
              )}
              <h3 className="text-lg font-bold uppercase tracking-wide" style={{ color: PC.text }}>
                {plan.name}
              </h3>
              <p className="mt-1 text-sm font-medium" style={{ color: PC.muted }}>
                {plan.subtitle}
              </p>
              {showStrike ? (
                <p className="mt-4 text-sm line-through" style={{ color: PC.tertiary }}>
                  {plan.monthly}
                </p>
              ) : null}
              <p
                className={`font-extrabold tracking-[-0.03em] ${plan.id === "pro" ? "mt-2 text-4xl" : "mt-4 text-3xl"}`}
                style={{ color: PC.text }}
              >
                {price}
              </p>
              <ul className="mt-6 flex-1 space-y-2.5 text-sm leading-snug" style={{ color: PC.muted }}>
                {plan.featureRows.map((row) => (
                  <li key={row.text} className="flex gap-2">
                    <span style={{ color: row.included ? PC.success : PC.warning }}>{row.included ? "✓" : "✗"}</span>
                    <span>{row.text}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={plan.ctaHref}
                className={`mt-8 inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-center text-sm font-semibold transition ${plan.id === "pro" ? "min-h-[52px] text-base" : "min-h-[48px]"}`}
                style={
                  plan.ctaVariant === "outline"
                    ? {
                        border: `1px solid ${PC.borderStrong}`,
                        color: PC.text,
                        backgroundColor: "transparent",
                        transition: ease,
                      }
                    : {
                        backgroundColor: PC.primary,
                        color: PC.white,
                        boxShadow: PC.activeRing,
                        transition: ease,
                      }
                }
              >
                {plan.cta}
              </Link>
            </article>
          );
        })}
      </div>

      <ul className="mt-12 flex flex-col items-center gap-2 text-center text-sm font-medium sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-6" style={{ color: PC.muted }}>
        <li>✓ Résiliation possible à tout moment</li>
        <li>✓ Paiement sécurisé par Stripe</li>
        <li>✓ Données hébergées en Europe</li>
      </ul>
    </section>
  );
}
