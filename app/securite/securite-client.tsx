"use client";

import { MarketingPublicShell } from "@/components/landing/marketing-public-shell";
import { LandingFooter } from "@/components/landing/landing-footer";

const certifications = [
  {
    icon: "🔒",
    title: "SOC 2 Type II",
    text: "Supabase, Vercel et Resend sont certifiés SOC 2 Type II — le standard de sécurité cloud le plus exigeant.",
    explain:
      "Cette certification garantit que les systèmes qui stockent vos données respectent des contrôles stricts de sécurité, disponibilité et confidentialité, audités par des tiers indépendants.",
  },
  {
    icon: "💳",
    title: "PCI-DSS Level 1",
    text: "Les paiements sont gérés par Stripe, certifié PCI-DSS Level 1 — la certification maximale pour les données bancaires.",
    explain:
      "Le niveau le plus élevé de conformité pour le traitement des données de paiement. Vos informations bancaires ne transitent jamais par nos serveurs.",
  },
  {
    icon: "🇪🇺",
    title: "RGPD & Données en Europe",
    text: "Vos données sont hébergées en Europe et traitées conformément au Règlement Général sur la Protection des Données.",
    explain:
      "Vos données sont hébergées dans des datacenters européens. Vous disposez d'un droit d'accès, de rectification et de suppression à tout moment.",
  },
  {
    icon: "🔐",
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
      <main className="mx-auto max-w-6xl space-y-20 px-4 pb-24 pt-10 sm:px-6 lg:px-8">
        <header className="marketing-fade-section space-y-4 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">La sécurité de vos données, notre priorité</h1>
          <p className="mx-auto max-w-2xl text-lg text-white/60">
            Vos données locatives sont confidentielles. Locavio repose sur des infrastructures certifiées aux standards les plus exigeants.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {certifications.map((c) => (
            <article
              key={c.title}
              className="marketing-fade-section rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
            >
              <p className="text-2xl" aria-hidden>
                {c.icon}
              </p>
              <h2 className="mt-3 text-lg font-semibold text-white">{c.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-white/60">{c.text}</p>
              <p className="mt-4 text-sm leading-relaxed text-white/50">{c.explain}</p>
            </article>
          ))}
        </div>

        <section className="marketing-fade-section">
          <h2 className="text-center text-2xl font-bold text-white">Ce que nous nous engageons à faire</h2>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {engagements.map((line) => (
              <div key={line} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white/80 backdrop-blur-sm">
                <span className="mr-2 text-violet-400">✓</span>
                {line}
              </div>
            ))}
          </div>
        </section>

        <section className="marketing-fade-section space-y-4">
          <h2 className="text-center text-2xl font-bold text-white">Questions fréquentes</h2>
          <div className="mx-auto max-w-3xl space-y-3">
            {faqSecurity.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-sm"
              >
                <summary className="cursor-pointer list-none font-semibold text-white [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-3">
                    {item.q}
                    <span className="text-lg text-violet-300 transition group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-white/60">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="marketing-fade-section rounded-2xl border border-white/10 bg-white/5 p-10 text-center backdrop-blur-sm">
          <h2 className="text-xl font-bold text-white">Vous avez d&apos;autres questions sur la sécurité ?</h2>
          <a href="mailto:contact@locavio.fr" className="mt-4 inline-block text-violet-300 hover:text-white">
            contact@locavio.fr
          </a>
        </section>

        <LandingFooter />
      </main>
    </MarketingPublicShell>
  );
}
