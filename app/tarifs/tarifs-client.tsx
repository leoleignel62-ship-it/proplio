"use client";

import Link from "next/link";
import { MarketingPublicShell } from "@/components/landing/marketing-public-shell";
import { LandingFooter } from "@/components/landing/landing-footer";
import { PublicFinalCta } from "@/components/landing/public-final-cta";
import { PublicPageHeader } from "@/components/landing/public-page-header";
import { LandingPricingSection, PricingLaunchBanner } from "@/components/landing/landing-pricing-section";
import { RevealOnView } from "@/components/landing/reveal-on-view";

export function TarifsClient() {
  return (
    <MarketingPublicShell>
      <main className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 lg:px-8">
        <RevealOnView>
          <PublicPageHeader>
            <h1 className="text-4xl font-extrabold tracking-tight text-[#1a0533] sm:text-5xl">Simple, transparent, sans surprise</h1>
            <p className="mx-auto max-w-xl text-lg text-[#6b7280]">Commencez gratuitement, évoluez selon vos besoins.</p>
          </PublicPageHeader>
        </RevealOnView>

        <RevealOnView className="mt-4 mb-0">
          <LandingPricingSection
            sectionId="tarifs"
            showIntro={false}
            className="!mt-0 !pt-0 !pb-6 scroll-mt-20"
            launchBanner={<PricingLaunchBanner />}
          />
        </RevealOnView>

        <RevealOnView>
          <PublicFinalCta title="Prêt à simplifier votre gestion locative ?">
            <Link
              href="/register"
              className="inline-flex cursor-pointer rounded-xl bg-white px-6 py-3 font-semibold text-[#7c3aed] transition hover:bg-gray-50"
            >
              Commencer gratuitement →
            </Link>
            <p className="text-sm text-white/90">Gratuit pour commencer · Sans carte bancaire</p>
          </PublicFinalCta>
        </RevealOnView>

        <LandingFooter />
      </main>
    </MarketingPublicShell>
  );
}
