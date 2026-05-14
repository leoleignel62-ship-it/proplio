"use client";

import { MarketingPublicShell } from "@/components/landing/marketing-public-shell";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingPricingSection, PricingLaunchBanner } from "@/components/landing/landing-pricing-section";
import { RevealOnView } from "@/components/landing/reveal-on-view";

export function TarifsClient() {
  return (
    <MarketingPublicShell>
      <main className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 lg:px-8">
        <RevealOnView>
          <header className="space-y-4 pb-8 text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-[#1a0533] sm:text-5xl">Simple, transparent, sans surprise</h1>
            <p className="mx-auto max-w-xl text-lg text-[#6b7280]">Commencez gratuitement, évoluez selon vos besoins.</p>
          </header>
        </RevealOnView>

        <RevealOnView className="my-12 mb-0">
          <LandingPricingSection
            sectionId="tarifs"
            showIntro={false}
            className="!mt-0"
            launchBanner={<PricingLaunchBanner />}
          />
        </RevealOnView>

        <LandingFooter />
      </main>
    </MarketingPublicShell>
  );
}
