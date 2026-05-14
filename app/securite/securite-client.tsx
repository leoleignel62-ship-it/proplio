"use client";

import { CheckCircle, CreditCard, Globe, Lock, Shield } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MarketingPublicShell } from "@/components/landing/marketing-public-shell";
import { LandingFooter } from "@/components/landing/landing-footer";
import { MarketingCardIcon, publicWhiteCard } from "@/components/landing/marketing-card-icon";
import { RevealOnView } from "@/components/landing/reveal-on-view";

const certifications: { Icon: LucideIcon; title: string; text: string; explain: string }[] = [
  {
    Icon: Lock,
    title: "SOC 2 Type II",
    text: "Nos infrastructures sont certifiées SOC 2 Type II — le standard de sécurité cloud le plus exigeant.",
    explain:
      "Cette certification garantit que les systèmes qui stockent vos données respectent des contrôles stricts de sécurité, disponibilité et confidentialité, audités par des tiers indépendants.",
  },
  {
    Icon: CreditCard,
    title: "PCI-DSS Level 1",
    text: "Les paiements sont traités via une infrastructure certifiée PCI-DSS Level 1 — la certification maximale pour les données bancaires.",
    explain:
      "Le niveau le plus élevé de conformité pour le traitement des données de paiement. Vos informations bancaires ne transitent jamais par nos serveurs.",
  },
  {
    Icon: Globe,
    title: "RGPD & Données en Europe",
    text: "Vos données sont hébergées en Europe et traitées conformément au Règlement Général sur la Protection des Données.",
    explain:
      "Vos données sont hébergées dans des datacenters européens. Vous disposez d'un droit d'accès, de rectification et de suppression à tout moment.",
  },
  {
    Icon: Shield,
    title: "Chiffrement TLS/HTTPS",
    text: "Toutes les communications sont chiffrées en TLS. Aucune donnée ne transite en clair sur le réseau.",
    explain:
      "Chaque échange entre votre navigateur et Locavio est chiffré. Impossible d'intercepter vos données en transit.",
  },
];

const engagements = [
  "Vos données ne sont jamais revendues",
  "Accès strictement limité par rôle",
  "Sauvegardes automatiques quotidiennes",
  "Aucune publicité, aucun tracking tiers",
];

const faqSecurity = [
  {
    q: "Qui peut accéder à mes données ?",
    a: "Seul vous avez accès à vos données. Notre équipe technique n'accède aux données qu'en cas de support explicitement demandé par vous, et uniquement le temps nécessaire.",
  },
  {
    q: "Que se passe-t-il si je supprime mon compte ?",
    a: "Toutes vos données sont définitivement supprimées de nos serveurs dans un délai de 30 jours suivant la suppression de votre compte.",
  },
  {
    q: "Mes documents PDF sont-ils stockés en sécurité ?",
    a: "Vos documents sont stockés dans un espace de stockage chiffré, accessible uniquement via des URLs temporaires sécurisées. Personne d'autre que vous ne peut y accéder.",
  },
];

export function SecuriteClient() {
  return (
    <MarketingPublicShell>
      <main className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 lg:px-8">
        <RevealOnView>
          <header className="space-y-4 pb-8 text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-[#1a0533] sm:text-5xl">La sécurité de vos données, notre priorité</h1>
            <p className="mx-auto max-w-2xl text-lg text-[#6b7280]">
              Vos données locatives sont confidentielles. Locavio repose sur des infrastructures certifiées aux standards les plus exigeants.
            </p>
          </header>
        </RevealOnView>

        <RevealOnView className="my-12">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {certifications.map((c) => (
              <article key={c.title} className={`px-5 py-6 sm:px-8 sm:py-8 ${publicWhiteCard}`}>
                <MarketingCardIcon Icon={c.Icon} />
                <h2 className="mt-3 text-lg font-semibold text-[#1a0533]">{c.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-[#6b7280]">{c.text}</p>
                <p className="mt-4 text-sm leading-relaxed text-[#9ca3af]">{c.explain}</p>
              </article>
            ))}
          </div>
        </RevealOnView>

        <RevealOnView className="my-12 py-8">
          <h2 className="text-center text-2xl font-bold text-[#1a0533]">Ce que nous nous engageons à faire</h2>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {engagements.map((line) => (
              <div key={line} className={`flex items-start gap-2 px-4 py-3 text-[#6b7280] ${publicWhiteCard}`}>
                <CheckCircle size={20} className="mt-0.5 shrink-0 text-[#7c3aed]" aria-hidden />
                <span>{line}</span>
              </div>
            ))}
          </div>
        </RevealOnView>

        <RevealOnView className="my-12 space-y-4 py-8">
          <h2 className="text-center text-2xl font-bold text-[#1a0533]">Questions fréquentes</h2>
          <div className="mx-auto max-w-3xl space-y-3">
            {faqSecurity.map((item) => (
              <details
                key={item.q}
                className="group cursor-pointer rounded-2xl border border-gray-200 bg-white px-5 py-4 transition-all duration-300 hover:border-violet-100 hover:shadow-md"
              >
                <summary className="list-none font-semibold text-[#1a0533] [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-3">
                    {item.q}
                    <span className="text-lg text-violet-600 transition group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-[#6b7280]">{item.a}</p>
              </details>
            ))}
          </div>
        </RevealOnView>

        <RevealOnView>
          <section className={`my-12 mb-0 px-8 py-8 text-center ${publicWhiteCard}`}>
            <h2 className="text-xl font-bold text-[#1a0533]">Vous avez d&apos;autres questions sur la sécurité ?</h2>
            <a href="mailto:contact@locavio.fr" className="mt-4 inline-block text-violet-600 hover:text-[#1a0533]">
              contact@locavio.fr
            </a>
          </section>
        </RevealOnView>

        <LandingFooter />
      </main>
    </MarketingPublicShell>
  );
}
