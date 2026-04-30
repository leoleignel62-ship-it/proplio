"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  IconChart,
  IconCalendar,
  IconClipboard,
  IconContract,
  IconDocument,
  IconTrendingUp,
  IconUsers,
} from "@/components/locavio-icons";
import { PLAN_DISPLAY_LABELS, type PlanDisplayId, planDisplayRows } from "@/lib/plan-display-copy";
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

const faqItems = [
  {
    q: "Est-ce que Locavio est conforme à la loi ALUR ?",
    a: "Oui, tous les documents générés (baux, quittances, états des lieux) respectent les obligations légales en vigueur.",
  },
  {
    q: "Puis-je résilier à tout moment ?",
    a: "Oui, sans engagement et sans frais de résiliation. Votre abonnement reste actif jusqu'à la fin de la période payée.",
  },
  {
    q: "Mes données sont-elles sécurisées ?",
    a: "Absolument. Vos données sont hébergées sur des serveurs européens, chiffrées et ne sont jamais partagées avec des tiers.",
  },
  {
    q: "Puis-je gérer de la colocation ?",
    a: "Oui, Locavio supporte nativement la colocation avec assignation par chambre.",
  },
  {
    q: "Comment fonctionne l'état des lieux depuis le smartphone ?",
    a: "Lors de la création d'un état des lieux, vous pouvez photographier chaque pièce directement depuis votre téléphone. Les photos sont intégrées automatiquement au rapport PDF.",
  },
  {
    q: "Comment fonctionne la révision automatique des loyers ?",
    a: "Locavio détecte automatiquement chaque année les baux éligibles à la révision et calcule le nouveau loyer selon l'IRL publié par l'INSEE. Vous validez la révision en un clic et une lettre officielle est générée et envoyée à votre locataire.",
  },
  {
    q: "Quels types de documents puis-je stocker par logement ?",
    a: "La gestion des documents logement n'est plus proposée. Les pièces d'identité voyageurs, signatures et photos d'états des lieux restent disponibles.",
  },
];

const LANDING_PRICING_META: Record<
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

const PLAN_ORDER: PlanDisplayId[] = ["free", "starter", "pro", "expert"];

export default function LandingBelowFold() {
  const [billing, setBilling] = useState<BillingMode>("annuel");
  const [pricingVisible, setPricingVisible] = useState<Record<number, boolean>>({});
  const [statsAnimatedValues, setStatsAnimatedValues] = useState<number[]>([]);
  const pricingRefs = useRef<Array<HTMLElement | null>>([]);
  const statsRef = useRef<HTMLElement | null>(null);
  const statsAnimatedOnceRef = useRef(false);
  const reduceMotionRef = useRef(false);

  const statsData = useMemo(
    () => [
      {
        n: "2-3h",
        d: "passées chaque année par logement à générer, imprimer et envoyer les quittances manuellement — pour chaque locataire",
      },
      {
        n: "3 ans",
        d: "durée moyenne entre deux locataires — bail + double état des lieux à refaire à chaque fois",
      },
      {
        n: "2-4h",
        d: "pour réaliser et rédiger un état des lieux d'entrée complet sans outil adapté",
      },
      {
        n: "7-10%",
        d: "de vos loyers annuels facturés par une agence traditionnelle, soit 1 mois de loyer perdu chaque année",
      },
    ],
    [],
  );

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

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(".reveal-on-scroll"));
    if (!elements.length) return;
    if (reduceMotionRef.current) {
      elements.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const statsTargets = statsData.map((item) => Number((item.n.match(/^(\d+)/) ?? ["0", "0"])[1]));
    const finalValues = [...statsTargets];
    setStatsAnimatedValues(reduceMotionRef.current ? finalValues : statsTargets.map(() => 0));
    if (!statsRef.current || reduceMotionRef.current) return;

    const animateStats = () => {
      if (statsAnimatedOnceRef.current) return;
      statsAnimatedOnceRef.current = true;
      const duration = 1500;
      const start = performance.now();
      const easeOut = (t: number) => 1 - (1 - t) * (1 - t) * (1 - t);
      const tick = (now: number) => {
        const elapsed = Math.min(1, (now - start) / duration);
        const eased = easeOut(elapsed);
        setStatsAnimatedValues(statsTargets.map((value) => Math.round(value * eased)));
        if (elapsed < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateStats();
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 },
    );
    observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, [statsData]);

  return (
    <>
      <section ref={statsRef} className="landing-section reveal-on-scroll mt-20 will-change-transform">
        <div
          className="grid gap-8 rounded-2xl px-4 py-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-white/[0.08]"
          style={{ ...solidCard, border: `1px solid ${PC.border}` }}
        >
          {statsData.map((s, i) => (
            <div key={s.n} className="px-4 text-center lg:px-8">
              <p className="text-3xl font-extrabold tracking-[-0.03em]" style={{ color: PC.text }}>
                {(statsAnimatedValues[i] ?? 0).toString()}
                {s.n.replace(/^\d+/, "")}
              </p>
              <p className="mt-3 text-sm font-normal leading-[1.7]" style={{ color: PC.muted }}>
                {s.d}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-base font-semibold" style={{ color: PC.primaryLight }}>
          Avec Locavio, toutes ces tâches prennent moins de 5 minutes.
        </p>
      </section>

      <section className="landing-section reveal-on-scroll mt-28 will-change-transform">
        <h2 className="text-center text-3xl font-extrabold tracking-[-0.03em]" style={{ color: PC.text }}>
          Locavio vs agence traditionnelle
        </h2>
        <div className="mt-10 overflow-x-auto rounded-2xl" style={solidCard}>
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${PC.borderRow}`, backgroundColor: PC.sidebar }}>
                <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: PC.tertiary }}>
                  Critère
                </th>
                <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: PC.muted }}>
                  Agence trad.
                </th>
                <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: PC.primaryLight }}>
                  Locavio Pro
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Coût annuel", "~1 mois loyer", "99€/an"],
                ["Quittances", "Inclus", "✓ PDF + envoi en 1 clic"],
                ["Baux", "~150-200€", "✓ Inclus"],
                ["États des lieux", "~150-300€", "✓ Inclus + photos"],
                ["Révision IRL", "Manuel", "✓ Automatique"],
                ["Disponibilité", "Horaires agence", "✓ 24h/24"],
                ["Contrôle total", "✗", "✓ Vous décidez"],
              ].map(([a, b, c]) => (
                <tr key={String(a)} style={{ borderBottom: `1px solid ${PC.borderRow}` }}>
                  <td className="px-4 py-3.5 font-medium" style={{ color: PC.text }}>
                    {a}
                  </td>
                  <td className="px-4 py-3.5" style={{ color: PC.muted }}>
                    {b}
                  </td>
                  <td className="px-4 py-3.5 font-medium" style={{ color: PC.text }}>
                    {c}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="landing-section reveal-on-scroll mt-28 space-y-16 will-change-transform">
        <h2 className="text-center text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl" style={{ color: PC.text }}>
          Une suite complète pour les bailleurs
        </h2>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: IconDocument,
              title: "Quittances en 1 clic",
              body: "Générez et envoyez les quittances au bon format dès réception du loyer, sans manipulation manuelle.",
              badge: "Disponible sur tous les plans",
              badgeTone: "all" as const,
              visual: (
                <div className="mt-4 rounded-lg bg-white/5 p-3">
                  <div className="flex items-center justify-between text-xs text-white/70">
                    <span>Avril 2026</span>
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-emerald-300">Envoyée ✓</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-white">Quittance loyer</p>
                  <p className="text-sm text-white/80">850 €</p>
                </div>
              ),
            },
            {
              icon: IconContract,
              title: "Baux légaux",
              body: "Créez un bail complet et conforme en quelques minutes, prêt à signer et à envoyer.",
              badge: "Plan Starter et plus",
              badgeTone: "starter" as const,
              visual: (
                <div className="mt-4 rounded-lg bg-white/5 p-3">
                  <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-xs text-violet-300">PDF généré ✓</span>
                  <p className="mt-2 text-sm text-white/80">Bail 3 ans — 75011 Paris</p>
                </div>
              ),
            },
            {
              icon: IconClipboard,
              title: "États des lieux",
              body: "Suivez chaque pièce simplement et générez un rapport propre avec photos intégrées.",
              badge: "Plan Starter et plus",
              badgeTone: "starter" as const,
              visual: (
                <div className="mt-4 space-y-1 rounded-lg bg-white/5 p-3 text-sm text-emerald-300">
                  <p>Salon ✓</p>
                  <p>Cuisine ✓</p>
                  <p>Chambre ✓</p>
                </div>
              ),
            },
            {
              icon: IconCalendar,
              title: "Contrats saisonniers",
              body: "Préparez rapidement des contrats de séjour avec dates, montants et informations clés.",
              badge: "Plan Starter et plus",
              badgeTone: "starter" as const,
              visual: (
                <div className="mt-4 rounded-lg bg-white/5 p-3 text-sm text-white/80">
                  <p>12 juil → 19 juil</p>
                  <p className="mt-1 font-semibold text-white">1 604 €</p>
                  <span className="mt-2 inline-block rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300">
                    Contrat prêt ✓
                  </span>
                </div>
              ),
            },
            {
              icon: IconTrendingUp,
              title: "Révision IRL",
              body: "Identifiez les baux éligibles et appliquez la révision annuelle en un clic.",
              badge: "Plan Starter et plus",
              badgeTone: "starter" as const,
              visual: (
                <div className="mt-4 rounded-lg bg-white/5 p-3 text-sm">
                  <p className="text-white/70">Loyer actuel 850 €</p>
                  <p className="my-1 text-violet-300">→</p>
                  <p className="font-semibold text-white">Nouveau loyer 867 €</p>
                  <span className="mt-2 inline-block rounded-full bg-violet-500/20 px-2 py-0.5 text-xs text-violet-300">
                    +2.0% IRL
                  </span>
                </div>
              ),
            },
            {
              icon: IconUsers,
              title: "Solvabilité candidats",
              body: "Analysez chaque dossier locataire avec un scoring clair pour décider plus vite.",
              badge: "Plan Starter et plus",
              badgeTone: "starter" as const,
              visual: (
                <div
                  className="mt-4 w-full rounded-2xl p-4"
                  style={{
                    backgroundColor: PC.glassBg,
                    border: `1px solid ${PC.primaryBorder40}`,
                    WebkitBackdropFilter: PC.glassBlur,
                    backdropFilter: PC.glassBlur,
                  }}
                >
                  <p className="text-xs font-semibold" style={{ color: PC.success }}>
                    Dossier recu ✅
                  </p>
                  <p className="mt-2 text-sm font-semibold" style={{ color: PC.text }}>
                    Sophie Bernard
                  </p>
                  <p className="text-xs" style={{ color: PC.muted }}>
                    Appartement — 75011 Paris
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-lg font-bold"
                      style={{ backgroundColor: PC.successBg10, color: PC.success }}
                    >
                      A
                    </span>
                    <span className="text-sm font-semibold" style={{ color: PC.text }}>
                      87/100
                    </span>
                  </div>
                  <div className="mt-3 space-y-1.5 text-xs" style={{ color: PC.success }}>
                    <p>✅ Revenus : 3.2x le loyer</p>
                    <p>✅ CDI — 3 ans d&apos;ancienneté</p>
                    <p>✅ Garant Visale</p>
                  </div>
                </div>
              ),
            },
            {
              icon: IconChart,
              title: "Données centralisées",
              body: "Pilotez logements, locataires et revenus depuis une vue unique et lisible.",
              badge: "Plan Starter et plus",
              badgeTone: "starter" as const,
              visual: (
                <div className="mt-4 flex flex-wrap gap-2 rounded-lg bg-white/5 p-3 text-xs">
                  <span className="rounded-full bg-violet-500/20 px-2 py-1 text-violet-300">3 logements</span>
                  <span className="rounded-full bg-violet-500/20 px-2 py-1 text-violet-300">12 locataires</span>
                  <span className="rounded-full bg-violet-500/20 px-2 py-1 text-violet-300">8 450 €/mois</span>
                </div>
              ),
            },
          ].map((f) => (
            <article
              key={f.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all duration-200 hover:border-violet-500/40 hover:bg-white/[0.08]"
            >
              <f.icon className="h-8 w-8 text-violet-400" aria-hidden />
              <span
                className="mt-4 inline-block rounded-full px-3 py-1 text-xs font-semibold"
                style={{
                  backgroundColor: f.badgeTone === "all" ? PC.successBg10 : PC.primaryBg10,
                  color: f.badgeTone === "all" ? PC.success : PC.secondary,
                  border: `1px solid ${f.badgeTone === "all" ? PC.borderSuccess40 : PC.primaryBorder40}`,
                }}
              >
                {f.badge}
              </span>
              <h3 className="mt-4 text-xl font-bold tracking-[-0.02em] text-white">{f.title}</h3>
              <p
                className="mt-2 text-sm leading-relaxed text-white/60"
                style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
              >
                {f.body}
              </p>
              {f.visual}
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section reveal-on-scroll mt-28 will-change-transform">
        <div className="mx-auto max-w-5xl rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm sm:p-10">
          <h2 className="text-center text-3xl font-bold text-white">Vos données sont entre de bonnes mains</h2>
          <p className="mb-12 mt-4 text-center text-base text-white/60">
            Locavio repose sur des infrastructures certifiées utilisées par des millions d&apos;entreprises dans le monde.
          </p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              {
                icon: "🔒",
                title: "SOC 2 Type II",
                text: "Supabase, Vercel et Resend sont certifiés SOC 2 Type II — le standard de sécurité cloud le plus exigeant.",
              },
              {
                icon: "💳",
                title: "PCI-DSS Level 1",
                text: "Les paiements sont gérés par Stripe, certifié PCI-DSS Level 1 — la certification maximale pour les données bancaires.",
              },
              {
                icon: "🇪🇺",
                title: "RGPD & Données en Europe",
                text: "Vos données sont hébergées en Europe et traitées conformément au Règlement Général sur la Protection des Données.",
              },
              {
                icon: "🔐",
                title: "Chiffrement TLS/HTTPS",
                text: "Toutes les communications sont chiffrées en TLS. Aucune donnée ne transite en clair sur le réseau.",
              },
            ].map((item) => (
              <article key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                <p className="text-2xl text-violet-400" aria-hidden>
                  {item.icon}
                </p>
                <h3 className="mt-4 text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{item.text}</p>
              </article>
            ))}
          </div>

          <ul className="mt-8 flex flex-col items-start gap-2 text-white/70 sm:items-center">
            <li>
              <span className="mr-2 text-violet-400">✓</span>
              Sauvegardes automatiques quotidiennes
            </li>
            <li>
              <span className="mr-2 text-violet-400">✓</span>
              Accès aux données strictement limité par rôle
            </li>
          </ul>
        </div>
      </section>

      <section id="tarifs" className="landing-section reveal-on-scroll mt-28 scroll-mt-24 will-change-transform">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl" style={{ color: PC.text }}>
            Des tarifs pensés pour les propriétaires
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base font-medium leading-[1.7]" style={{ color: PC.muted }}>
            Commencez gratuitement, évoluez selon vos besoins.
          </p>
        </div>

        <div className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3">
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

        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
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
                <p className={`font-extrabold tracking-[-0.03em] ${plan.id === "pro" ? "mt-2 text-4xl" : "mt-4 text-3xl"}`} style={{ color: PC.text }}>
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

      <section id="faq" className="landing-section reveal-on-scroll mt-28 scroll-mt-24 will-change-transform">
        <h2 className="text-center text-3xl font-extrabold tracking-[-0.03em]" style={{ color: PC.text }}>
          Questions fréquentes
        </h2>
        <div className="mx-auto mt-10 max-w-3xl space-y-3">
          {faqItems.map((item) => (
            <details key={item.q} className="group rounded-xl px-5 py-4 transition" style={{ ...solidCard, cursor: "pointer" }}>
              <summary className="list-none font-semibold leading-snug [&::-webkit-details-marker]:hidden" style={{ color: PC.text }}>
                <span className="flex items-center justify-between gap-3">
                  {item.q}
                  <span className="text-lg transition group-open:rotate-45" style={{ color: PC.secondary }}>
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-3 text-sm font-normal leading-[1.7]" style={{ color: PC.muted }}>
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      <footer
        id="footer"
        className="border-t px-4 py-12 sm:px-6"
        style={{
          background: "rgba(124, 58, 237, 0.08)",
          WebkitBackdropFilter: "blur(12px)",
          backdropFilter: "blur(12px)",
          borderTop: "1px solid rgba(124, 58, 237, 0.25)",
        }}
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="text-sm font-semibold text-white">
            Locavio
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-white/60">
            <Link href="#tarifs" className="transition text-white/60 hover:text-white" style={{ transition: ease }}>
              Tarifs
            </Link>
            <Link href="/login" className="transition text-white/60 hover:text-white" style={{ transition: ease }}>
              Connexion
            </Link>
            <Link href="/register" className="transition text-white/60 hover:text-white" style={{ transition: ease }}>
              Créer un compte
            </Link>
            <Link href="/mentions-legales" className="transition text-white/60 hover:text-white" style={{ transition: ease }}>
              Mentions légales
            </Link>
            <Link href="/cgu" className="transition text-white/60 hover:text-white" style={{ transition: ease }}>
              CGU
            </Link>
            <Link href="/politique-de-confidentialite" className="transition text-white/60 hover:text-white" style={{ transition: ease }}>
              Politique de confidentialité
            </Link>
            <Link href="/qui-sommes-nous" className="transition text-white/60 hover:text-white" style={{ transition: ease }}>
              Qui sommes-nous
            </Link>
          </nav>
        </div>
        <p className="mx-auto mt-8 max-w-6xl text-center text-sm text-white/40 sm:text-left">
          © {new Date().getFullYear()} Locavio. Tous droits réservés.
        </p>
        <p className="mx-auto mt-2 max-w-6xl text-center text-xs text-white/40 sm:text-left">
          Gestion locative simplifiée pour les propriétaires français.
        </p>
      </footer>
    </>
  );
}
