"use client";

import dynamic from "next/dynamic";
import { Check } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { AnimatedParticles } from "@/components/landing/animated-particles";
import { LandingAnimatedBackground } from "@/components/landing/landing-animated-background";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingNavbar } from "@/components/landing/landing-navbar";
import { PC } from "@/lib/locavio-colors";

const LandingBelowFold = dynamic(() => import("@/components/landing/landing-below-fold"), {
  ssr: true,
  loading: () => <div className="min-h-[400px]" />,
});

const glassCard: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
};

const pageBg: CSSProperties = {
  backgroundColor: "#f8f7ff",
  color: "#1a0533",
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
  logo: "https://locavio.fr/logos/lockup-horizontal-clair.svg?v=2",
  contactPoint: {
    "@type": "ContactPoint",
    email: "contact@locavio.fr",
    contactType: "customer service",
    availableLanguage: "French",
  },
} as const;

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
      <LandingAnimatedBackground />
      <LandingNavbar isScrolled={isScrolled} />

      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="flex min-h-[calc(100vh-80px)] flex-col pt-10 pb-10">
          <section
            className="landing-shell landing-section relative flex min-h-0 flex-1 flex-col justify-center overflow-hidden rounded-2xl px-6 pt-8 pb-8 shadow-sm sm:px-12"
            style={glassCard}
          >
            <div
              className="landing-hero-halo-float1 pointer-events-none absolute left-[-12%] top-[8%] z-0 h-96 w-96 rounded-full bg-[#7c3aed] opacity-[0.06] blur-3xl"
              aria-hidden
            />
            <div
              className="landing-hero-halo-float2 pointer-events-none absolute right-[-8%] top-[22%] z-0 h-64 w-64 rounded-full bg-[#7c3aed] opacity-[0.04] blur-2xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0 z-0 opacity-70 will-change-transform"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(124,58,237,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.04) 1px, transparent 1px)",
                backgroundSize: "48px 48px",
                transform: `translateY(${parallax}px)`,
                animation: "locavio-grid-drift 20s linear infinite",
              }}
            />
            <div
              className="pointer-events-none absolute left-1/2 top-[34%] z-0 h-44 w-96 -translate-x-1/2 rounded-full will-change-transform"
              style={{
                background: "radial-gradient(ellipse at center, rgba(124,58,237,0.14) 0%, rgba(124,58,237,0) 70%)",
                filter: "blur(60px)",
                animation: "locavio-pulse 3s ease infinite",
              }}
            />
            <div className="relative z-[1] flex min-h-0 flex-col items-center justify-center text-center">
              <Image
                src="/logos/logomark-couleur.svg"
                alt="Locavio"
                width={72}
                height={72}
                className="mb-6 mx-auto"
              />
              <div className="landing-hero-title-intro" style={{ animation: "fadeInUp 0.7s ease-out both" }}>
                <h1
                  className="text-5xl font-extrabold leading-[1.1] tracking-[-0.03em] lg:text-6xl lg:leading-[1.08]"
                  style={{ color: "#1a0533" }}
                >
                  <span className="locavio-gradient-text-animated">Gérez vos locations.</span>
                  <br />
                  Sans perdre votre temps.
                </h1>
                <p className="mx-auto mt-6 max-w-2xl text-lg font-medium leading-[1.7] text-[#6b7280]">
                  Quittances, baux, états des lieux et révision IRL : tout centralisé et automatisé. Concentrez-vous sur
                  votre patrimoine.
                </p>
              </div>
              <div className="mt-6 flex flex-wrap justify-center gap-4">
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
                  href="/tarifs"
                  className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-gray-300 bg-white px-7 py-3 text-sm font-semibold text-[#1a0533] shadow-sm transition-all hover:border-gray-400 hover:bg-gray-50 hover:shadow-md"
                >
                  Voir les tarifs
                </Link>
              </div>
              <ul className="mt-10 flex flex-col items-center gap-3 text-sm font-medium text-[#4b5563]">
                <li className="flex items-center justify-center gap-2">
                  <Check className="size-4 shrink-0 text-[#7c3aed]" strokeWidth={2.5} aria-hidden />
                  Gratuit pour commencer
                </li>
                <li className="flex items-center justify-center gap-2">
                  <Check className="size-4 shrink-0 text-[#7c3aed]" strokeWidth={2.5} aria-hidden />
                  Sans carte bancaire
                </li>
                <li className="flex items-center justify-center gap-2">
                  <Check className="size-4 shrink-0 text-[#7c3aed]" strokeWidth={2.5} aria-hidden />
                  Données sécurisées
                </li>
              </ul>
            </div>

            {Array.from({ length: 7 }).map((_, i) => (
              <span
                key={i}
                className="pointer-events-none absolute z-0 rounded-full will-change-transform"
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
          </section>
        </div>

        <LandingBelowFold />
      </main>
      <LandingFooter marginTopClassName="mt-6" />
      <AnimatedParticles />
    </div>
  );
}
