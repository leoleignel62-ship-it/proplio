"use client";

import Link from "next/link";
import { Check, CreditCard, Globe, Lock, Plus, Shield, X, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useInView } from "@/components/hooks/use-in-view";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingPricingSection } from "@/components/landing/landing-pricing-section";
import { fieldInputStyle } from "@/lib/locavio-field-styles";
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

const securityBadges: Array<{
  Icon: LucideIcon;
  name: string;
  text: string;
}> = [
  {
    Icon: Shield,
    name: "SOC 2 Type II",
    text: "Standard de sécurité cloud exigeant, validé par des audits indépendants.",
  },
  {
    Icon: CreditCard,
    name: "PCI-DSS Level 1",
    text: "Certification maximale pour le traitement sécurisé des paiements.",
  },
  {
    Icon: Globe,
    name: "RGPD & Données en Europe",
    text: "Hébergement et traitement conformes au règlement européen.",
  },
  {
    Icon: Lock,
    name: "Chiffrement TLS/HTTPS",
    text: "Toutes les communications sont chiffrées ; rien ne transite en clair.",
  },
];

export default function LandingBelowFold() {
  const [logements, setLogements] = useState([{ id: 1, loyer: 850 }]);
  const [statsAnimatedValues, setStatsAnimatedValues] = useState<number[]>([]);
  const statsRef = useRef<HTMLDivElement | null>(null);
  const statsAnimatedOnceRef = useRef(false);
  const reduceMotionRef = useRef(false);

  const revealStats = useInView(0.15);
  const revealCompare = useInView(0.15);
  const revealCalc = useInView(0.15);
  const revealSecurity = useInView(0.15);
  const revealPricing = useInView(0.15);
  const revealFaq = useInView(0.15);
  const revealCta = useInView(0.15);

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

  const loyerTotal = logements.reduce((sum, l) => sum + l.loyer, 0);
  const coutAgenceMin = loyerTotal * 12 * 0.06;
  const coutAgenceMax = loyerTotal * 12 * 0.1;
  const coutLocavio = 99;
  const economieMin = coutAgenceMin - coutLocavio;
  const economieMax = coutAgenceMax - coutLocavio;
  const xFoisMin = Math.round(coutAgenceMin / coutLocavio);
  const xFoisMax = Math.round(coutAgenceMax / coutLocavio);

  return (
    <>
      <div
        ref={revealStats.ref}
        className={`will-change-transform transition-all duration-700 ease-out ${revealStats.inView ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"}`}
      >
        <section className="landing-section mt-12 py-8">
        <div
          ref={statsRef}
          className="grid grid-cols-1 gap-8 rounded-2xl border border-gray-100 bg-white px-4 py-16 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-gray-100"
          style={{ boxShadow: PC.cardShadow }}
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
      </div>

      <div
        ref={revealCompare.ref}
        className={`will-change-transform transition-all duration-700 ease-out ${revealCompare.inView ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"}`}
      >
        <section className="landing-section mt-12 py-8">
        <h2 className="text-center text-3xl font-extrabold tracking-[-0.03em]" style={{ color: PC.text }}>
          Locavio vs agence traditionnelle
        </h2>
        <div className="mt-10 overflow-x-auto rounded-2xl" style={solidCard}>
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${PC.borderRow}`, backgroundColor: "#f9fafb" }}>
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
      </div>

      <div
        ref={revealCalc.ref}
        className={`will-change-transform transition-all duration-700 ease-out ${revealCalc.inView ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"}`}
      >
        <section className="landing-section mt-12 py-8">
        <div className="mx-auto max-w-4xl rounded-2xl border border-gray-100 bg-white px-8 py-10">
          <h2 className="text-center text-3xl font-bold text-[#1a0533]">Combien allez-vous économiser ?</h2>
          <p className="mt-3 text-center text-[#6b7280]">
            Renseignez le loyer de chacun de vos logements et découvrez ce que vous coûte vraiment une agence.
          </p>

          <div className="mt-10 space-y-5">
            {logements.map((l, index) => (
              <div key={l.id}>
                <p className="text-sm text-[#6b7280]">Logement {index + 1}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <input
                    type="number"
                    min={100}
                    max={10000}
                    step={50}
                    value={l.loyer}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setLogements(logements.map((row) => (row.id === l.id ? { ...row, loyer: val } : row)));
                    }}
                    className="w-32 shrink-0"
                    style={fieldInputStyle}
                    aria-label={`Loyer logement ${index + 1}`}
                  />
                  <input
                    type="range"
                    min={100}
                    max={5000}
                    step={50}
                    value={Math.min(Math.max(l.loyer, 100), 5000)}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setLogements(logements.map((row) => (row.id === l.id ? { ...row, loyer: val } : row)));
                    }}
                    className="accent-violet-600 min-w-[120px] flex-1"
                    aria-label={`Curseur loyer logement ${index + 1}`}
                  />
                  {logements.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => setLogements(logements.filter((row) => row.id !== l.id))}
                      className="shrink-0 text-sm text-[#9ca3af] transition hover:text-red-500"
                      aria-label={`Supprimer le logement ${index + 1}`}
                    >
                      <X className="size-4" strokeWidth={2} />
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          {logements.length < 10 ? (
            <button
              type="button"
              onClick={() => setLogements([...logements, { id: Date.now(), loyer: 700 }])}
              className="mt-5 inline-flex items-center gap-2 rounded-xl border border-violet-200 px-4 py-2 text-sm text-[#7c3aed] transition hover:bg-violet-50"
            >
              <Plus className="size-4 shrink-0" strokeWidth={2} />
              Ajouter un logement
            </button>
          ) : null}

          <hr className="my-6 border-gray-200" />

          <p className="text-center text-sm text-[#9ca3af]">
            Loyer total mensuel : {loyerTotal.toLocaleString("fr-FR")} €
          </p>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div
              className="rounded-xl border px-5 py-6 text-center"
              style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.2)" }}
            >
              <p className="text-sm font-medium text-red-600">Agence traditionnelle</p>
              <p className="text-xs text-red-600/70">entre 6% et 10% de vos loyers/an</p>
              <div className="mt-2 flex items-baseline justify-center gap-1">
                <span className="text-2xl font-bold text-red-600">{coutAgenceMin.toLocaleString("fr-FR")}</span>
                <span className="text-sm text-red-600/70">à</span>
                <span className="text-3xl font-bold text-red-600">{coutAgenceMax.toLocaleString("fr-FR")} €</span>
              </div>
              <p className="mt-1 text-sm text-[#9ca3af]">par an</p>
            </div>
            <div
              className="rounded-xl border px-5 py-6"
              style={{ background: "rgba(124,58,237,0.08)", borderColor: "rgba(124,58,237,0.2)" }}
            >
              <p className="text-sm font-medium text-[#7c3aed]">Locavio Pro</p>
              <p className="text-xs text-[#7c3aed]/70">Tout inclus, illimité</p>
              <p className="text-3xl font-bold text-[#7c3aed]">99 €</p>
              <p className="text-sm text-[#9ca3af]">par an</p>
            </div>
            <div
              className="rounded-xl border px-5 py-6 text-center"
              style={{ background: "rgba(34,197,94,0.08)", borderColor: "rgba(34,197,94,0.2)" }}
            >
              <p className="text-sm font-medium text-emerald-600">Votre économie</p>
              <p className="text-xs font-medium text-emerald-600/80">
                {xFoisMin}x à {xFoisMax}x moins cher que l&apos;agence
              </p>
              <div className="mt-2 flex items-baseline justify-center gap-1">
                <span className="text-2xl font-bold text-emerald-600">{economieMin.toLocaleString("fr-FR")}</span>
                <span className="text-sm text-emerald-600/70">à</span>
                <span className="text-4xl font-bold text-emerald-600">{economieMax.toLocaleString("fr-FR")} €</span>
              </div>
              <p className="mt-1 text-sm text-[#9ca3af]">par an</p>
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-0.5 text-xs text-emerald-700">
                <Check className="size-3 shrink-0" strokeWidth={2.5} aria-hidden />
                Garanti
              </span>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-[#6b7280]">
            Avec un loyer total de {loyerTotal.toLocaleString("fr-FR")} €/mois, une agence vous coûte entre{" "}
            {coutAgenceMin.toLocaleString("fr-FR")} € et {coutAgenceMax.toLocaleString("fr-FR")} € par an (6 à 10% de vos
            loyers). Locavio vous revient à 99 € — soit jusqu&apos;à {xFoisMax}x moins cher.
          </p>

          <div className="mt-8 text-center">
            <Link
              href="/register"
              className="inline-flex rounded-xl bg-violet-600 px-8 py-3.5 text-lg font-semibold text-white transition hover:bg-violet-500"
            >
              Commencer gratuitement et économiser jusqu&apos;à {economieMax.toLocaleString("fr-FR")} € →
            </Link>
            <p className="mt-3 text-center text-sm text-[#9ca3af]">Gratuit pour commencer · Sans carte bancaire</p>
          </div>
        </div>
        </section>
      </div>

      <div
        ref={revealSecurity.ref}
        className={`will-change-transform transition-all duration-700 ease-out ${revealSecurity.inView ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"}`}
      >
        <section className="landing-section mt-12 py-8">
        <div className="mx-auto max-w-5xl rounded-2xl border border-gray-100 bg-white px-6 py-16 sm:px-10">
          <h2 className="text-center text-2xl font-bold text-[#1a0533] sm:text-3xl">Vos données sont entre de bonnes mains</h2>

          <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4 lg:gap-4">
            {securityBadges.map((item) => {
              const Icon = item.Icon;
              return (
                <div
                  key={item.name}
                  className="flex min-w-0 items-start gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3"
                >
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-violet-50 p-3" aria-hidden>
                    <Icon className="size-6 text-[#7c3aed]" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#1a0533]">{item.name}</p>
                    <p className="mt-0.5 text-xs leading-snug text-[#6b7280]">{item.text}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <ul className="mt-8 flex flex-col items-start gap-2 text-[#6b7280] sm:items-center">
            <li className="flex items-center gap-2">
              <Check className="size-4 shrink-0 text-[#7c3aed]" strokeWidth={2.5} aria-hidden />
              Sauvegardes automatiques quotidiennes
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 shrink-0 text-[#7c3aed]" strokeWidth={2.5} aria-hidden />
              Accès aux données strictement limité par rôle
            </li>
          </ul>

          <p className="mt-6 text-center">
            <Link
              href="/securite"
              className="inline-flex text-sm font-semibold text-[#7c3aed] transition hover:text-[#5b21b6]"
              style={{ transition: ease }}
            >
              En savoir plus sur notre sécurité →
            </Link>
          </p>
        </div>
        </section>
      </div>

      <div
        ref={revealPricing.ref}
        className={`will-change-transform transition-all duration-700 ease-out ${revealPricing.inView ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"}`}
      >
        <LandingPricingSection sectionId="tarifs" />
      </div>

      <div
        ref={revealFaq.ref}
        className={`will-change-transform transition-all duration-700 ease-out ${revealFaq.inView ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"}`}
      >
        <section id="faq" className="landing-section mt-12 scroll-mt-24 py-8">
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
      </div>

      <div
        ref={revealCta.ref}
        className={`mx-auto mb-0 max-w-4xl px-0 will-change-transform transition-all duration-700 ease-out ${revealCta.inView ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"}`}
      >
        <section className="landing-section mx-auto mt-12 py-8">
        <div
          className="relative overflow-hidden rounded-xl border border-white/10 px-8 py-16 text-center"
          style={{
            background: "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)",
            boxShadow: "0 4px 24px rgba(124, 58, 237, 0.25)",
          }}
        >
          <div
            className="pointer-events-none absolute -right-16 -top-16 z-0 size-48 rounded-full bg-white"
            style={{ opacity: 0.1 }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-20 -left-12 z-0 size-56 rounded-full bg-white"
            style={{ opacity: 0.1 }}
            aria-hidden
          />
          <div className="relative z-[1]">
            <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Prêt à reprendre le contrôle de vos locations ?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-base text-white/90">
              Rejoignez les propriétaires qui gagnent du temps chaque mois.
            </p>
            <Link
              href="/register"
              className="mt-8 inline-flex min-h-[48px] items-center justify-center rounded-xl bg-white px-8 py-3 text-sm font-semibold text-[#7c3aed] shadow-lg transition hover:bg-gray-50"
            >
              Commencer gratuitement →
            </Link>
            <p className="mt-4 text-sm text-white/80">Gratuit pour commencer · Sans carte bancaire</p>
          </div>
        </div>
        </section>
      </div>

      <LandingFooter />
    </>
  );
}
