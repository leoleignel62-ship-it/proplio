"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { LogoFull } from "@/components/locavio-icons";
import { PC } from "@/lib/locavio-colors";

const LandingBelowFold = dynamic(() => import("@/components/landing/landing-below-fold"), {
  ssr: true,
  loading: () => <div className="min-h-[400px]" />,
});

const glassCard: CSSProperties = {
  background: PC.glassBg,
  WebkitBackdropFilter: "blur(20px)",
  backdropFilter: "blur(20px)",
  border: `1px solid ${PC.glassBorder}`,
  borderRadius: 16,
  boxShadow: PC.cardShadow,
};

const pageBg: CSSProperties = {
  backgroundColor: PC.bg,
  backgroundImage: `${PC.gradientBg}, radial-gradient(circle at 0% 100%, rgba(79, 70, 229, 0.08), transparent 45%)`,
  backgroundSize: "100% 100%, 100% 100%, 48px 48px, 48px 48px",
  color: PC.text,
  minHeight: "100vh",
};

const SOFTWARE_APPLICATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Locavio",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Logiciel de gestion locative en ligne pour propriétaires bailleurs. Quittances, baux, états des lieux, révision IRL.",
  url: "https://locavio.fr",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "EUR",
    description: "Plan Découverte gratuit disponible",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    reviewCount: "12",
  },
} as const;

const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Locavio",
  url: "https://locavio.fr",
  logo: "https://locavio.fr/logos/lockup-horizontal-sombre.svg",
  contactPoint: {
    "@type": "ContactPoint",
    email: "contact@locavio.fr",
    contactType: "customer service",
    availableLanguage: "French",
  },
} as const;

function AnimatedBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[-1] overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.08),transparent_55%)]" />
      <div className="absolute left-[6%] top-[8%] h-[640px] w-[640px] rounded-full bg-[#7c3aed] opacity-[0.25] blur-[120px] animate-[locavio-orbit-1_35s_linear_infinite]" />
      <div className="absolute right-[6%] top-[10%] h-[800px] w-[800px] rounded-full bg-[#4f46e5] opacity-[0.25] blur-[130px] animate-[locavio-orbit-2_35s_linear_infinite]" />
      <div className="absolute left-[18%] bottom-[4%] h-[560px] w-[560px] rounded-full bg-[#a78bfa] opacity-[0.25] blur-[110px] animate-[locavio-orbit-3_35s_linear_infinite]" />
      <div className="absolute right-[14%] bottom-[8%] h-[500px] w-[500px] rounded-full bg-[#6366f1] opacity-[0.25] blur-[105px] animate-[locavio-orbit-4_35s_linear_infinite]" />
    </div>
  );
}

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [parallax, setParallax] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 50);
      const scrollTop = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollHeight > 0 ? Math.min(100, Math.max(0, (scrollTop / scrollHeight) * 100)) : 0;
      setScrollProgress(progress);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setParallax(window.scrollY * 0.06));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div className="relative isolate" style={pageBg}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(SOFTWARE_APPLICATION_JSON_LD) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSON_LD) }}
      />
      <div
        className="pointer-events-none fixed left-0 top-0 z-[100] h-[3px]"
        style={{
          width: `${scrollProgress}%`,
          background: "linear-gradient(90deg, #7c3aed 0%, #4f46e5 100%)",
          transition: "width 120ms linear",
        }}
      />
      <AnimatedBackground />
      <header
        className="sticky top-0 z-[60] border-b"
        style={{
          borderColor: PC.border,
          backgroundColor: isScrolled ? "rgba(6,6,15,0.92)" : "rgba(6,6,15,0.8)",
          WebkitBackdropFilter: "blur(20px)",
          backdropFilter: "blur(20px)",
          transition: "background-color 200ms ease-out",
        }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/landing" className="flex items-center gap-2.5 font-bold tracking-tight" style={{ color: PC.text }}>
            <LogoFull className="h-9 w-auto" />
          </Link>
          <Link
            href="/qui-sommes-nous"
            className="group relative text-sm font-medium transition duration-200 ease-out hover:text-white"
            style={{ color: "#c4b5fd", textDecoration: "none", letterSpacing: "0.02em", fontWeight: 500 }}
          >
            Qui sommes-nous ?
            <span
              aria-hidden
              className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 transition-transform duration-200 ease-out group-hover:scale-x-100"
              style={{ backgroundColor: "#c4b5fd" }}
            />
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-[40px] items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition duration-200 ease-out"
            style={{
              border: `1px solid rgba(124, 58, 237, 0.45)`,
              color: PC.secondary,
              backgroundColor: "transparent",
              boxShadow: "0 0 0 1px rgba(124,58,237,0.2)",
            }}
          >
            Se connecter
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-10 sm:px-6 lg:px-8">
        {/* HERO */}
        <section className="landing-shell landing-section relative overflow-hidden rounded-2xl px-6 py-20 sm:px-12 sm:py-24" style={glassCard}>
          <div
            className="pointer-events-none absolute inset-0 opacity-70 will-change-transform"
            style={{
              backgroundImage:
                "linear-gradient(rgba(139,92,246,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.06) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
              transform: `translateY(${parallax}px)`,
              animation: "locavio-grid-drift 20s linear infinite",
            }}
          />
          <div
            className="pointer-events-none absolute left-1/2 top-[34%] h-44 w-96 -translate-x-1/2 rounded-full will-change-transform"
            style={{
              background: "radial-gradient(ellipse at center, rgba(124,58,237,0.28) 0%, rgba(124,58,237,0) 70%)",
              filter: "blur(60px)",
              animation: "locavio-pulse 3s ease infinite",
            }}
          />
          <div className="relative z-[1] mx-auto max-w-3xl text-center">
            <div className="hero-reveal" style={{ animationDelay: "0ms" }}>
              <img
                src="/logos/logomark-couleur.svg"
                alt="Logo Locavio"
                width={64}
                height={64}
                loading="eager"
                fetchPriority="high"
                className="mx-auto h-16 w-16"
              />
            </div>
            <h1
              className="hero-reveal mt-8 text-4xl font-extrabold leading-[1.1] tracking-[-0.03em] sm:text-5xl sm:leading-[1.08]"
              style={{ color: PC.text, animationDelay: "150ms" }}
            >
              <span className="locavio-gradient-text-animated">Gérez vos locations.</span>
              <br />
              Sans perdre votre temps.
            </h1>
            <p
              className="hero-reveal mx-auto mt-6 max-w-2xl text-base font-medium leading-[1.7] sm:text-lg"
              style={{ color: PC.muted, animationDelay: "300ms" }}
            >
              Quittances, baux, états des lieux, révision des loyers, gestion des documents — tout est centralisé et
              automatisé en quelques clics. Locavio vous libère des tâches administratives pour que vous vous concentriez
              sur l&apos;essentiel : investir.
            </p>
            <div className="hero-reveal mt-10 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: "450ms" }}>
              <Link
                href="/register"
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl px-7 py-3 text-sm font-semibold transition"
                style={{
                  background: PC.gradientPrimary,
                  color: PC.white,
                  boxShadow: `${PC.activeRing}, ${PC.glowShadow}`,
                  transitionDuration: "200ms",
                  transitionTimingFunction: "ease-out",
                }}
              >
                Commencer gratuitement
              </Link>
              <Link
                href="#tarifs"
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl px-7 py-3 text-sm font-semibold transition"
                style={{
                  border: `1px solid ${PC.borderStrong}`,
                  color: PC.text,
                  backgroundColor: PC.glassBg,
                }}
              >
                Voir les tarifs
              </Link>
            </div>
            <ul
              className="hero-reveal mx-auto mt-10 flex max-w-lg flex-col gap-2 text-left text-sm font-medium sm:mx-auto sm:max-w-md sm:text-center"
              style={{ color: PC.muted, animationDelay: "600ms" }}
            >
              <li>✓ Gratuit pour commencer</li>
              <li>✓ Sans carte bancaire</li>
              <li>✓ Données sécurisées</li>
            </ul>
            {Array.from({ length: 7 }).map((_, i) => (
              <span
                key={i}
                className="pointer-events-none absolute rounded-full will-change-transform"
                style={{
                  width: 4,
                  height: 4,
                  left: `${12 + i * 11}%`,
                  top: `${18 + (i % 3) * 16}%`,
                  backgroundColor: i % 2 === 0 ? "#a78bfa" : "#6366f1",
                  opacity: 0.3,
                  animation: `locavio-float-y ${3 + i * 0.7}s ease-in-out ${i * 0.3}s infinite`,
                }}
              />
            ))}
          </div>
        </section>

        <LandingBelowFold />
      </main>
    </div>
  );
}
