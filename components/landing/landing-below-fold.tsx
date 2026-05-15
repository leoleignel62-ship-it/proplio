"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Camera,
  Check,
  FileCheck,
  FileText,
  Lock,
  Plus,
  RefreshCw,
  Shield,
  TrendingUp,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { useScrollProgress } from "@/components/hooks/use-scroll-progress";
import { LandingPricingSection } from "@/components/landing/landing-pricing-section";
import { RevealOnView } from "@/components/landing/reveal-on-view";
import { fieldInputStyle } from "@/lib/locavio-field-styles";
import { PC } from "@/lib/locavio-colors";

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
    q: "Comment fonctionne l'état des lieux depuis le smartphone ?",
    a: "Lors de la création d'un état des lieux, vous pouvez photographier chaque pièce directement depuis votre téléphone. Les photos sont intégrées automatiquement au rapport PDF.",
  },
] as const;

const avantItems = [
  "Quittances imprimées et envoyées à la main",
  "Baux rédigés depuis zéro à chaque locataire",
  "États des lieux sur papier, sans photos",
  "Révision de loyer calculée manuellement",
  "Agence à 7-10% de vos loyers chaque année",
] as const;

const avecItems = [
  "Quittance PDF générée et envoyée en 1 clic",
  "Bail conforme ALUR en quelques minutes",
  "État des lieux avec photos depuis votre smartphone",
  "Révision IRL calculée et envoyée automatiquement",
  "Locavio à partir de 6,90€/mois — économisez jusqu'à 891€/an",
] as const;

const featureCards = [
  {
    Icon: FileText,
    title: "Quittances",
    text: "PDF conforme généré et envoyé par email en 1 clic.",
  },
  {
    Icon: FileCheck,
    title: "Baux",
    text: "Contrats conformes loi ALUR, envoyés et signés en ligne.",
  },
  {
    Icon: Camera,
    title: "États des lieux",
    text: "Avec photos depuis votre smartphone, PDF automatique.",
  },
  {
    Icon: TrendingUp,
    title: "Révision IRL",
    text: "Calcul automatique selon l'indice INSEE, lettre officielle incluse.",
  },
  {
    Icon: Users,
    title: "Candidatures",
    text: "Dossiers en ligne avec scoring de solvabilité automatique.",
  },
] as const;

function FeatureCardLeading({ title, Icon }: { title: string; Icon: LucideIcon }) {
  if (title === "Révision IRL") {
    return <TrendingUp size={32} className="text-[#7c3aed] mb-4" aria-hidden />;
  }
  return <Icon className="size-8 text-[#7c3aed]" strokeWidth={1.75} aria-hidden />;
}

const reassurance = [
  { Icon: Shield, text: "Données hébergées en Europe" },
  { Icon: Lock, text: "Chiffrement TLS/HTTPS" },
  { Icon: FileCheck, text: "Conforme RGPD" },
  { Icon: RefreshCw, text: "Sauvegardes quotidiennes" },
] as const;

export default function LandingBelowFold() {
  const [logements, setLogements] = useState([{ id: 1, loyer: 850 }]);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [dashboardScale, setDashboardScale] = useState(0.95);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const scrollProgress = useScrollProgress();

  useLayoutEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setDashboardScale(1);
      return;
    }
    const el = dashboardRef.current;
    if (!el) return;
    const thresholds = [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        const r = Math.min(1, Math.max(0, entry.intersectionRatio * 1.25));
        setDashboardScale(0.95 + 0.05 * r);
      },
      { threshold: thresholds, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reducedMotion]);

  const statParallaxY = reducedMotion ? 0 : -20 * Math.min(1, scrollProgress / 0.3);

  const loyerTotal = logements.reduce((sum, l) => sum + l.loyer, 0);
  const coutAgenceMin = loyerTotal * 12 * 0.06;
  const coutAgenceMax = loyerTotal * 12 * 0.1;
  const coutLocavio = 129;
  const economieMin = coutAgenceMin - coutLocavio;
  const economieMax = coutAgenceMax - coutLocavio;
  const xFoisMin = Math.round(coutAgenceMin / coutLocavio);
  const xFoisMax = Math.round(coutAgenceMax / coutLocavio);

  return (
    <>
      {/* Section 2 — Chiffres choc */}
      <RevealOnView className="mt-12">
        <section className="landing-section py-8">
          <div
            className="grid grid-cols-1 gap-6 md:grid-cols-3"
            style={
              reducedMotion
                ? undefined
                : {
                    transform: `translateY(${statParallaxY}px)`,
                    willChange: "transform",
                  }
            }
          >
            <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
              <p className="landing-stat-pulse text-5xl font-black text-[#7c3aed]">2-3h</p>
              <p className="mt-3 text-sm text-[#4b5563]">économisées chaque mois par logement</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
              <p className="landing-stat-pulse landing-stat-pulse-delay-1s text-5xl font-black text-[#7c3aed]">
                7-10%
              </p>
              <p className="mt-3 text-sm text-[#4b5563]">de vos loyers annuels perdus en agence traditionnelle</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
              <p className="landing-stat-pulse landing-stat-pulse-delay-2s text-5xl font-black text-[#7c3aed]">100%</p>
              <p className="mt-3 text-sm text-[#4b5563]">conforme loi ALUR — baux, quittances et EDL inclus</p>
            </div>
          </div>
        </section>
      </RevealOnView>

      {/* Section 3 — Problème → Solution */}
      <RevealOnView className="mt-12">
        <section className="landing-section py-8">
          <h2 className="landing-gestion-title-gradient text-center text-3xl font-bold">
            La gestion locative, sans la galère
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-[#4b5563]">
            Locavio remplace des heures de paperasse par quelques clics.
          </p>
          <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-[#e9d5ff] bg-[#faf5ff] p-6">
              <p className="mb-4 font-semibold text-[#6b7280]">Avant Locavio</p>
              <ul className="space-y-3 text-sm text-[#4b5563]">
                {avantItems.map((line) => (
                  <li key={line} className="flex items-start gap-2">
                    <X className="mt-0.5 size-4 shrink-0 text-[#9ca3af]" strokeWidth={2.5} aria-hidden />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-[#e9d5ff] border-l-4 border-l-[#7c3aed] bg-white p-6">
              <p className="mb-4 font-semibold text-[#7c3aed]">Avec Locavio</p>
              <ul className="space-y-3 text-sm text-[#4b5563]">
                {avecItems.map((line) => (
                  <li key={line} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-[#7c3aed]" strokeWidth={2.5} aria-hidden />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </RevealOnView>

      {/* Section 4 — 5 fonctionnalités clés */}
      <RevealOnView className="mt-12">
        <section className="landing-section py-8">
          <h2 className="text-center text-3xl font-bold text-[#1a0533]">Tout ce dont vous avez besoin</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-[#4b5563]">
            Des outils pensés pour chaque étape de la gestion locative.
          </p>
          <div className="mx-auto mt-10 grid max-w-5xl grid-cols-2 gap-6 lg:grid-cols-3">
            {featureCards.slice(0, 2).map(({ Icon, title, text }) => (
              <div
                key={title}
                className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:border-violet-100 hover:shadow-md"
              >
                <FeatureCardLeading title={title} Icon={Icon} />
                <p className="mt-4 font-bold text-[#1a0533]">{title}</p>
                <p className="mt-2 text-sm text-[#4b5563]">{text}</p>
              </div>
            ))}
            <div className="col-span-2 flex justify-center lg:col-span-1 lg:block">
              {featureCards.slice(2, 3).map(({ Icon, title, text }) => (
                <div
                  key={title}
                  className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:border-violet-100 hover:shadow-md lg:max-w-none"
                >
                  <FeatureCardLeading title={title} Icon={Icon} />
                  <p className="mt-4 font-bold text-[#1a0533]">{title}</p>
                  <p className="mt-2 text-sm text-[#4b5563]">{text}</p>
                </div>
              ))}
            </div>
            <div className="col-span-2 flex flex-col justify-center gap-6 sm:flex-row lg:col-span-3">
              {featureCards.slice(3, 5).map(({ Icon, title, text }) => (
                <div
                  key={title}
                  className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:border-violet-100 hover:shadow-md"
                >
                  <FeatureCardLeading title={title} Icon={Icon} />
                  <p className="mt-4 font-bold text-[#1a0533]">{title}</p>
                  <p className="mt-2 text-sm text-[#4b5563]">{text}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-10 flex justify-center">
            <Link
              href="/fonctionnalites"
              className="inline-flex items-center justify-center border-2 border-[#7c3aed] text-[#7c3aed] bg-white px-6 py-3 rounded-xl font-semibold transition-all hover:bg-violet-50"
            >
              Voir toutes les fonctionnalités →
            </Link>
          </div>
        </section>
      </RevealOnView>

      {/* Section 5 — Visuel dashboard */}
      <RevealOnView className="mt-12">
        <section className="landing-section py-8">
          <h2 className="text-center text-3xl font-bold text-[#1a0533]">Votre tableau de bord, pensé pour aller vite</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-[#4b5563]">
            Suivez vos loyers, gérez vos documents et pilotez votre patrimoine depuis une interface claire.
          </p>
          <div
            ref={dashboardRef}
            className="relative mx-auto mt-10 max-w-4xl"
            style={{
              transform: `scale(${dashboardScale})`,
              transformOrigin: "center top",
              transition: reducedMotion ? "none" : "transform 0.35s ease-out",
            }}
          >
            <div
              className="pointer-events-none absolute inset-0 -z-10 scale-110 rounded-full bg-[#7c3aed] opacity-[0.06] blur-3xl"
              aria-hidden
            />
            <Image
              src="/images/dashboard-preview.png"
              alt="Aperçu du tableau de bord Locavio"
              width={1200}
              height={720}
              className="relative z-10 mx-auto w-full rounded-2xl border border-gray-100 shadow-2xl"
              sizes="(max-width: 896px) 100vw, 896px"
              priority={false}
            />
          </div>
        </section>
      </RevealOnView>

      {/* Section 6 — Comparatif (inchangé) */}
      <RevealOnView className="mt-12">
        <section className="landing-section py-8">
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
                  ["Coût annuel", "~1 mois loyer", "129€/an"],
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
      </RevealOnView>

      {/* Section 7 — Calculateur (inchangé) */}
      <RevealOnView className="mt-12">
        <section className="landing-section py-8">
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
                <p className="text-3xl font-bold text-[#7c3aed]">129 €</p>
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
              loyers). Locavio vous revient à 129 € — soit jusqu&apos;à {xFoisMax}x moins cher.
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
      </RevealOnView>

      {/* Section 8 — Tarifs */}
      <RevealOnView className="mt-12">
        <LandingPricingSection sectionId="tarifs" />
      </RevealOnView>

      {/* Section 9 — FAQ */}
      <RevealOnView className="mt-12">
        <section id="faq" className="landing-section scroll-mt-24 py-8">
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
      </RevealOnView>

      {/* Section 10 — CTA final (inchangé) */}
      <RevealOnView className="mx-auto mb-0 max-w-4xl px-0">
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
      </RevealOnView>

      {/* Réassurance sécurité — dernière section avant le footer */}
      <RevealOnView className="mt-12 mb-0">
        <section className="landing-section py-6">
          <hr className="mx-auto max-w-3xl border-gray-200" />
          <div className="mx-auto mt-6 grid max-w-3xl grid-cols-2 gap-6 lg:grid-cols-4">
            {reassurance.map(({ Icon, text }) => (
              <div key={text} className="flex min-w-0 items-center gap-2">
                <Icon className="size-4 shrink-0 text-[#7c3aed]" strokeWidth={2} aria-hidden />
                <span className="text-sm text-[#4b5563]">{text}</span>
              </div>
            ))}
          </div>
        </section>
      </RevealOnView>
    </>
  );
}
