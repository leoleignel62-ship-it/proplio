"use client";

import { MarketingPublicShell } from "@/components/landing/marketing-public-shell";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingPricingSection } from "@/components/landing/landing-pricing-section";

export function TarifsClient() {
  return (
    <MarketingPublicShell>
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6 lg:px-8">
        <header className="marketing-fade-section mb-12 space-y-4 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">Simple, transparent, sans surprise</h1>
          <p className="mx-auto max-w-xl text-lg text-white/60">Commencez gratuitement, évoluez selon vos besoins.</p>
        </header>

        <LandingPricingSection sectionId="tarifs" showIntro={false} className="!mt-0" />

        <LandingFooter />
      </main>
    </MarketingPublicShell>
  );
}
