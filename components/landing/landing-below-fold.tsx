"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  IconCalendar,
  IconContract,
  IconDeviceCamera,
  IconDocument,
  IconFolder,
  IconTrendingUp,
} from "@/components/locavio-icons";
import { PLAN_DISPLAY_LABELS, type PlanDisplayId, planDisplayRows } from "@/lib/plan-display-copy";
import { PC } from "@/lib/locavio-colors";

type BillingMode = "mensuel" | "annuel";
type LandingExempleType = "quittance" | "bail" | "etat-des-lieux" | "contrat-sejour";
type ExempleRequestState = "idle" | "success" | "error";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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
  const [exampleEmails, setExampleEmails] = useState<Record<LandingExempleType, string>>({
    quittance: "",
    bail: "",
    "etat-des-lieux": "",
    "contrat-sejour": "",
  });
  const [exampleLoading, setExampleLoading] = useState<Record<LandingExempleType, boolean>>({
    quittance: false,
    bail: false,
    "etat-des-lieux": false,
    "contrat-sejour": false,
  });
  const [exampleState, setExampleState] = useState<Record<LandingExempleType, ExempleRequestState>>({
    quittance: "idle",
    bail: "idle",
    "etat-des-lieux": "idle",
    "contrat-sejour": "idle",
  });
  const [exampleErrors, setExampleErrors] = useState<Record<LandingExempleType, string>>({
    quittance: "",
    bail: "",
    "etat-des-lieux": "",
    "contrat-sejour": "",
  });
  const [featureVisible, setFeatureVisible] = useState<Record<number, boolean>>({});
  const [pricingVisible, setPricingVisible] = useState<Record<number, boolean>>({});
  const [statsAnimatedValues, setStatsAnimatedValues] = useState<number[]>([]);
  const featureRefs = useRef<Array<HTMLDivElement | null>>([]);
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
      setFeatureVisible(
        Object.fromEntries(Array.from({ length: 7 }, (_, index) => [index, true])) as Record<number, boolean>,
      );
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = Number((entry.target as HTMLElement).dataset.featureIndex ?? "-1");
          if (index >= 0 && entry.isIntersecting) {
            window.setTimeout(() => {
              setFeatureVisible((prev) => ({ ...prev, [index]: true }));
            }, index * 100);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 },
    );
    featureRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
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

  async function handleExampleSubmit(type: LandingExempleType) {
    const email = exampleEmails[type].trim().toLowerCase();
    if (!EMAIL_REGEX.test(email)) {
      setExampleState((prev) => ({ ...prev, [type]: "error" }));
      setExampleErrors((prev) => ({ ...prev, [type]: "Merci de renseigner un email valide." }));
      return;
    }

    setExampleLoading((prev) => ({ ...prev, [type]: true }));
    setExampleState((prev) => ({ ...prev, [type]: "idle" }));
    setExampleErrors((prev) => ({ ...prev, [type]: "" }));

    try {
      const response = await fetch("/api/landing/send-exemple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, type }),
      });

      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error || "Impossible d'envoyer l'exemple pour le moment.");

      setExampleState((prev) => ({ ...prev, [type]: "success" }));
      setExampleErrors((prev) => ({ ...prev, [type]: "" }));
    } catch (error) {
      setExampleState((prev) => ({ ...prev, [type]: "error" }));
      setExampleErrors((prev) => ({
        ...prev,
        [type]: error instanceof Error ? error.message : "Une erreur est survenue.",
      }));
    } finally {
      setExampleLoading((prev) => ({ ...prev, [type]: false }));
    }
  }

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

        {[
          {
            kind: "default" as const,
            icon: IconDocument,
            title: "Quittances en 1 clic, dès réception du loyer",
            body: "Générez et envoyez vos quittances en 1 clic dès réception du loyer. PDF conforme généré instantanément, envoyé par email à votre locataire en un seul clic.",
            badge: "Disponible sur tous les plans",
            badgeTone: "all" as const,
            exampleType: "quittance" as const,
          },
          {
            kind: "default" as const,
            icon: IconContract,
            title: "Baux légaux générés en quelques minutes",
            body: "Fini les 2-3 heures à rédiger un bail depuis zéro. Renseignez les informations de votre logement et locataire, Locavio génère un bail complet et conforme, prêt à signer et envoyer par email.",
            badge: "Plan Starter et plus",
            badgeTone: "starter" as const,
            exampleType: "bail" as const,
          },
          {
            kind: "default" as const,
            icon: IconDeviceCamera,
            title: "États des lieux complets, directement depuis votre smartphone",
            body: "Réalisez votre état des lieux sur place en prenant des photos pièce par pièce directement depuis l'application. Le rapport PDF complet est généré automatiquement et envoyé aux deux parties.",
            badge: "Plan Starter et plus",
            badgeTone: "starter" as const,
            exampleType: "etat-des-lieux" as const,
          },
          {
            kind: "default" as const,
            icon: IconCalendar,
            title: "Contrats saisonniers prêts à envoyer en quelques minutes",
            body: "Préparez des contrats de séjour complets avec toutes les informations de réservation. Le document PDF est prêt à l'envoi immédiatement, sans ressaisie.",
            badge: "Plan Starter et plus",
            badgeTone: "starter" as const,
            exampleType: "contrat-sejour" as const,
          },
          {
            kind: "default" as const,
            icon: IconTrendingUp,
            title: "Révision annuelle des loyers calculée automatiquement",
            body: "Locavio détecte automatiquement les baux éligibles à la révision annuelle et calcule le nouveau loyer selon l'Indice de Référence des Loyers (IRL) publié par l'INSEE. Validez en un clic et envoyez la lettre de révision officielle à votre locataire par email.",
            badge: "Plan Starter et plus",
            badgeTone: "starter" as const,
          },
          {
            kind: "dossiers" as const,
            icon: IconFolder,
            title: "Analysez la solvabilité de vos candidats",
            body: "Envoyez un questionnaire personnalisé à chaque candidat locataire. Locavio analyse automatiquement le dossier et vous attribue une note de solvabilité claire — pour choisir le bon locataire en toute confiance.",
            badge: "Plan Starter et plus",
            badgeTone: "starter" as const,
          },
          {
            kind: "default" as const,
            icon: IconFolder,
            title: "Données locatives centralisées",
            body: "Concentrez-vous sur la gestion des quittances, baux, états des lieux et suivi financier dans une interface claire et rapide.",
            badge: "Plan Starter et plus",
            badgeTone: "starter" as const,
          },
        ].map((f, i) => (
          <div
            key={f.title}
            ref={(el) => {
              featureRefs.current[i] = el;
            }}
            data-feature-index={i}
            className={`will-change-transform flex flex-col gap-8 lg:flex-row lg:items-center ${i % 2 === 1 ? "lg:flex-row-reverse" : ""}`}
            style={{
              opacity: featureVisible[i] ? 1 : 0,
              transform: featureVisible[i] ? "translate3d(0, 0, 0)" : "translate3d(0, 30px, 0)",
              transition: "opacity 700ms ease-out, transform 700ms ease-out",
            }}
          >
            <div className="flex flex-1 items-center justify-center rounded-2xl p-10" style={{ ...solidCard, minHeight: 200 }}>
              {f.kind === "dossiers" ? (
                <div
                  className="w-full max-w-sm rounded-2xl p-4"
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
              ) : (
                <div className="locavio-glow-card flex h-24 w-24 items-center justify-center rounded-2xl" style={{ color: PC.primaryLight }}>
                  <f.icon className="h-12 w-12" aria-hidden />
                </div>
              )}
            </div>
            <div className="flex-1">
              <span
                className="inline-block rounded-full px-3 py-1 text-xs font-semibold"
                style={{
                  backgroundColor: f.badgeTone === "all" ? PC.successBg10 : PC.primaryBg10,
                  color: f.badgeTone === "all" ? PC.success : PC.secondary,
                  border: `1px solid ${f.badgeTone === "all" ? PC.borderSuccess40 : PC.primaryBorder40}`,
                }}
              >
                {f.badge}
              </span>
              <h3 className="mt-4 text-2xl font-bold tracking-[-0.03em]" style={{ color: PC.text }}>
                {f.title}
              </h3>
              <p className="mt-4 text-base font-normal leading-[1.7]" style={{ color: PC.muted }}>
                {f.body}
              </p>
              {f.exampleType ? (
                <div className="mt-5">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="email"
                      value={exampleEmails[f.exampleType]}
                      onChange={(event) => {
                        const nextEmail = event.target.value;
                        setExampleEmails((prev) => ({ ...prev, [f.exampleType]: nextEmail }));
                        if (exampleState[f.exampleType] !== "idle") {
                          setExampleState((prev) => ({ ...prev, [f.exampleType]: "idle" }));
                        }
                        if (exampleErrors[f.exampleType]) {
                          setExampleErrors((prev) => ({ ...prev, [f.exampleType]: "" }));
                        }
                      }}
                      placeholder="Votre email"
                      className="min-h-[42px] flex-1 rounded-xl px-3 text-sm outline-none"
                      style={{
                        backgroundColor: PC.inputBg,
                        border: `1px solid ${PC.border}`,
                        color: PC.text,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => void handleExampleSubmit(f.exampleType)}
                      disabled={exampleLoading[f.exampleType]}
                      className="inline-flex min-h-[42px] will-change-transform items-center justify-center rounded-xl px-4 text-sm font-semibold"
                      style={{
                        backgroundColor: "#7c3aed",
                        color: PC.white,
                        opacity: exampleLoading[f.exampleType] ? 0.75 : 1,
                        cursor: exampleLoading[f.exampleType] ? "not-allowed" : "pointer",
                      }}
                    >
                      {exampleLoading[f.exampleType] ? "Envoi..." : "Recevoir un exemple →"}
                    </button>
                  </div>
                  <p className="mt-3 text-sm" style={{ color: PC.muted }}>
                    Vous voyez ? Sur Locavio, c&apos;est aussi simple, rapide et fonctionnel que ça.
                  </p>
                  {exampleState[f.exampleType] === "success" ? (
                    <p className="mt-2 text-sm font-semibold" style={{ color: PC.success }}>
                      C&apos;est parti ! Vérifiez votre boîte mail 📬
                    </p>
                  ) : null}
                  {exampleState[f.exampleType] === "error" && exampleErrors[f.exampleType] ? (
                    <p className="mt-2 text-sm font-medium" style={{ color: "#fca5a5" }}>
                      {exampleErrors[f.exampleType]}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ))}
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
