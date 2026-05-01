"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { DashboardMockupSection } from "@/components/landing/dashboard-mockup-section";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingPricingSection } from "@/components/landing/landing-pricing-section";
import { PC } from "@/lib/locavio-colors";

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

const securityBadges = [
  {
    icon: "🔒",
    name: "SOC 2 Type II",
    text: "Standard de sécurité cloud exigeant, validé par des audits indépendants.",
  },
  {
    icon: "💳",
    name: "PCI-DSS Level 1",
    text: "Certification maximale pour le traitement sécurisé des paiements.",
  },
  {
    icon: "🇪🇺",
    name: "RGPD & Données en Europe",
    text: "Hébergement et traitement conformes au règlement européen.",
  },
  {
    icon: "🔐",
    name: "Chiffrement TLS/HTTPS",
    text: "Toutes les communications sont chiffrées ; rien ne transite en clair.",
  },
];

export default function LandingBelowFold() {
  const [statsAnimatedValues, setStatsAnimatedValues] = useState<number[]>([]);
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    reduceMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

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
      <DashboardMockupSection />

      <section ref={statsRef} className="landing-section reveal-on-scroll mt-24 py-16 will-change-transform">
        <div
          className="grid gap-8 rounded-2xl px-4 py-16 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-white/[0.08]"
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

      <section className="landing-section reveal-on-scroll mt-24 py-16 will-change-transform">
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

      <section className="landing-section reveal-on-scroll mt-24 py-16 will-change-transform">
        <div className="mx-auto max-w-5xl rounded-2xl border border-white/10 bg-white/5 px-6 py-16 backdrop-blur-sm sm:px-10">
          <h2 className="text-center text-2xl font-bold text-white sm:text-3xl">Vos données sont entre de bonnes mains</h2>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4">
            {securityBadges.map((item) => (
              <div
                key={item.name}
                className="flex min-w-0 flex-1 items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm sm:min-w-[200px] sm:flex-1 sm:max-w-[calc(50%-0.5rem)] lg:max-w-[calc(25%-0.75rem)]"
              >
                <span className="text-xl shrink-0" aria-hidden>
                  {item.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{item.name}</p>
                  <p className="mt-0.5 text-xs leading-snug text-white/60">{item.text}</p>
                </div>
              </div>
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

          <p className="mt-6 text-center">
            <Link
              href="/securite"
              className="inline-flex text-sm font-semibold text-violet-300 transition hover:text-white"
              style={{ transition: ease }}
            >
              En savoir plus sur notre sécurité →
            </Link>
          </p>
        </div>
      </section>

      <LandingPricingSection sectionId="tarifs" />

      <section id="faq" className="landing-section reveal-on-scroll mt-24 scroll-mt-24 py-16 will-change-transform">
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

      <section className="landing-section reveal-on-scroll mx-auto mb-0 mt-24 max-w-4xl px-0 py-16 will-change-transform">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-8 py-16 text-center backdrop-blur-sm">
          <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Prêt à reprendre le contrôle de vos locations ?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base text-white/70">
            Rejoignez les propriétaires qui gagnent du temps chaque mois.
          </p>
          <Link
            href="/register"
            className="mt-8 inline-flex min-h-[48px] items-center justify-center rounded-xl bg-violet-600 px-8 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-violet-500"
          >
            Commencer gratuitement →
          </Link>
          <p className="mt-4 text-sm text-white/55">Gratuit pour commencer · Sans carte bancaire</p>
        </div>
      </section>

      <LandingFooter />
    </>
  );
}
