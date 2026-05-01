"use client";

import Link from "next/link";
import { MarketingPublicShell } from "@/components/landing/marketing-public-shell";
import { LandingFooter } from "@/components/landing/landing-footer";

const cards = [
  {
    emoji: "🏠",
    title: "Vous louez en longue durée",
    subtitle: "Le bailleur classique",
    description:
      "Vous avez un ou plusieurs logements loués à l'année et vous passez trop de temps sur la paperasse administrative. Locavio automatise vos quittances, génère vos baux conformes à la loi ALUR, gère vos états des lieux et calcule automatiquement vos révisions de loyer.",
    features: [
      "Quittances automatiques",
      "Baux conformes loi ALUR",
      "États des lieux avec photos",
      "Révision IRL automatique",
      "Dossiers de candidature",
    ],
  },
  {
    emoji: "🌊",
    title: "Vous faites de la location saisonnière",
    subtitle: "Le loueur courte durée",
    description:
      "Vous gérez des locations courte durée via Airbnb, Booking ou en direct. Entre les réservations, les contrats, les voyageurs et les taxes de séjour, Locavio centralise tout en quelques clics.",
    features: [
      "Gestion des réservations",
      "Contrats de séjour automatiques",
      "Suivi des voyageurs",
      "Taxes de séjour calculées",
      "États des lieux saisonniers",
      "Dashboard revenus & taux d'occupation",
    ],
  },
  {
    emoji: "📈",
    title: "Vous gérez plusieurs biens",
    subtitle: "Le propriétaire qui se développe",
    description:
      "Votre patrimoine immobilier grandit et vous avez besoin d'une vue centralisée sur l'ensemble de vos biens, locataires et revenus. Locavio vous donne une vision claire et globale pour piloter votre activité.",
    features: [
      "Vue centralisée multi-logements",
      "Suivi financier global",
      "Classique et saisonnier au même endroit",
      "Dossiers candidats avec scoring",
      "Historique complet",
    ],
  },
];

export function PourQuiClient() {
  return (
    <MarketingPublicShell>
      <main className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 lg:px-8">
        <header className="marketing-fade-section space-y-6 pb-16 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">Locavio est fait pour vous</h1>
          <p className="mx-auto max-w-2xl text-lg text-white/60">
            Que vous soyez propriétaire bailleur, loueur saisonnier ou gestionnaire de plusieurs biens, Locavio s&apos;adapte à votre situation.
          </p>
        </header>

        <div className="my-24 grid grid-cols-1 gap-8 md:grid-cols-3">
          {cards.map((c) => (
            <article
              key={c.title}
              className="marketing-fade-section flex flex-col rounded-2xl border border-white/10 bg-white/5 px-6 py-16 backdrop-blur-sm"
            >
              <p className="text-3xl" aria-hidden>
                {c.emoji}
              </p>
              <h2 className="mt-4 text-xl font-bold text-white">{c.title}</h2>
              <p className="mt-1 text-sm font-medium text-violet-300">{c.subtitle}</p>
              <p className="mt-4 flex-1 text-sm leading-relaxed text-white/60">{c.description}</p>
              <ul className="mt-6 space-y-2 text-sm text-white/80">
                {c.features.map((f) => (
                  <li key={f}>
                    <span className="mr-2 text-violet-400">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-violet-600 py-3 text-center text-sm font-semibold text-white transition hover:bg-violet-500"
              >
                Commencer gratuitement →
              </Link>
            </article>
          ))}
        </div>

        <section className="marketing-fade-section my-24 mb-0 rounded-2xl border border-white/10 bg-white/5 px-8 py-16 text-center backdrop-blur-sm">
          <h2 className="text-2xl font-bold text-white">Pas sûr de quel profil vous correspond ?</h2>
          <p className="mx-auto mt-4 max-w-xl text-white/60">
            Commencez gratuitement et explorez Locavio à votre rythme. Aucune carte bancaire requise.
          </p>
          <Link
            href="/register"
            className="mt-6 inline-flex rounded-xl bg-violet-600 px-6 py-3 font-semibold text-white transition hover:bg-violet-500"
          >
            Essayer Locavio gratuitement →
          </Link>
        </section>

        <LandingFooter />
      </main>
    </MarketingPublicShell>
  );
}
