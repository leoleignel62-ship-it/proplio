"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { MarketingPublicShell } from "@/components/landing/marketing-public-shell";
import { LandingFooter } from "@/components/landing/landing-footer";
import { PC } from "@/lib/locavio-colors";

type Mode = "classique" | "saisonnier";

function Badge({ children, tone }: { children: ReactNode; tone: "all" | "starter" }) {
  return (
    <span
      className="inline-block rounded-full px-3 py-1 text-xs font-semibold"
      style={{
        backgroundColor: tone === "all" ? PC.successBg10 : PC.primaryBg10,
        color: tone === "all" ? PC.success : PC.secondary,
        border: `1px solid ${tone === "all" ? PC.borderSuccess40 : PC.primaryBorder40}`,
      }}
    >
      {children}
    </span>
  );
}

export function FonctionnalitesClient() {
  const [mode, setMode] = useState<Mode>("classique");

  return (
    <MarketingPublicShell>
      <main className="mx-auto max-w-6xl space-y-16 px-4 pb-24 pt-10 sm:px-6 lg:px-8">
        <header className="marketing-fade-section space-y-6 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">Tout ce dont vous avez besoin</h1>
          <p className="mx-auto max-w-2xl text-lg text-white/60">
            Des outils pensés pour simplifier chaque étape de la gestion locative, que vous louiez en longue durée ou en saisonnier.
          </p>

          <div
            className="mx-auto inline-flex rounded-full p-1"
            style={{ backgroundColor: PC.inputBg, border: `1px solid ${PC.border}` }}
            role="group"
            aria-label="Mode d'affichage"
          >
            <button
              type="button"
              onClick={() => setMode("classique")}
              className="rounded-full px-6 py-2.5 text-sm font-semibold transition"
              style={{
                backgroundColor: mode === "classique" ? PC.primary : "transparent",
                color: mode === "classique" ? PC.white : PC.muted,
                boxShadow: mode === "classique" ? PC.activeRing : "none",
              }}
            >
              Classique
            </button>
            <button
              type="button"
              onClick={() => setMode("saisonnier")}
              className="rounded-full px-6 py-2.5 text-sm font-semibold transition"
              style={{
                backgroundColor: mode === "saisonnier" ? PC.primary : "transparent",
                color: mode === "saisonnier" ? PC.white : PC.muted,
                boxShadow: mode === "saisonnier" ? PC.activeRing : "none",
              }}
            >
              Saisonnier
            </button>
          </div>
        </header>

        {mode === "classique" ? (
          <div className="space-y-24">
            {[
              {
                badge: "Disponible sur tous les plans" as const,
                badgeTone: "all" as const,
                title: "Quittances en 1 clic, dès réception du loyer",
                desc: "Générez et envoyez vos quittances en 1 clic dès réception du loyer. PDF conforme généré instantanément, envoyé par email à votre locataire automatiquement.",
                visual: (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                    <p className="text-2xl font-bold text-white">850 €</p>
                    <p className="text-sm text-white/50">Avril 2026</p>
                    <span className="mt-3 inline-block rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400">
                      Envoyée ✓
                    </span>
                  </div>
                ),
              },
              {
                badge: "Plan Starter et plus",
                badgeTone: "starter" as const,
                title: "Baux légaux générés en quelques minutes",
                desc: "Créez des baux conformes à la loi ALUR. Les données propriétaire et locataire sont injectées automatiquement. Envoyez par email et suivez le statut en temps réel.",
                visual: (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                    <p className="font-semibold text-white">Bail 3 ans — 75011 Paris</p>
                    <span className="mt-3 inline-block rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400">
                      PDF généré ✓
                    </span>
                  </div>
                ),
              },
              {
                badge: "Plan Starter et plus",
                badgeTone: "starter" as const,
                title: "États des lieux complets, directement depuis votre smartphone",
                desc: "Documentez l'état de votre logement à l'entrée et à la sortie avec photos, commentaires et PDF automatique. Comparaison entrée/sortie intégrée.",
                visual: (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/80 backdrop-blur-sm">
                    <p>Salon ✓ · Cuisine ✓ · Chambre ✓</p>
                  </div>
                ),
              },
              {
                badge: "Plan Starter et plus",
                badgeTone: "starter" as const,
                title: "Révision annuelle des loyers calculée automatiquement",
                desc: "Locavio détecte les baux éligibles et calcule le nouveau loyer selon l'indice IRL de l'INSEE. Envoyez la lettre officielle en PDF par email en un clic.",
                visual: (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                    <p className="text-lg font-bold text-white">
                      850 € → 867 € <span className="text-violet-300">(+2.0% IRL)</span>
                    </p>
                  </div>
                ),
              },
              {
                badge: "Plan Starter et plus",
                badgeTone: "starter" as const,
                title: "Analysez la solvabilité de vos candidats",
                desc: "Envoyez un questionnaire personnalisé à chaque candidat. Locavio analyse automatiquement le dossier et vous attribue une note de solvabilité claire.",
                visual: (
                  <div className="rounded-2xl border border-violet-500/30 bg-white/5 p-5 backdrop-blur-sm">
                    <p className="text-sm font-semibold text-emerald-400">Dossier reçu ✓</p>
                    <p className="mt-2 font-semibold text-white">Sophie Bernard</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-lg font-bold text-emerald-400">
                        A
                      </span>
                      <span className="font-bold text-white">87/100</span>
                    </div>
                    <p className="mt-2 text-xs text-white/60">CDI · Garant Visale</p>
                  </div>
                ),
              },
              {
                badge: "Disponible sur tous les plans",
                badgeTone: "all" as const,
                title: "Pilotez vos revenus en un coup d'œil",
                desc: "Suivez vos loyers attendus, encaissés et en retard. Graphique annuel, suivi par logement, vue d'ensemble de votre patrimoine.",
                visual: (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                    <div className="flex h-16 items-end justify-between gap-1">
                      {[35, 55, 42, 70, 48, 80, 52, 65, 45, 72, 58, 68].map((h, i) => (
                        <div
                          key={i}
                          className="w-full max-w-[12px] rounded-t bg-violet-600"
                          style={{ height: `${h}%`, minHeight: 8 }}
                        />
                      ))}
                    </div>
                    <p className="mt-3 text-sm font-semibold text-emerald-400">2 450 € encaissés ce mois</p>
                  </div>
                ),
              },
              {
                badge: "Disponible sur tous les plans",
                badgeTone: "all" as const,
                title: "Toutes vos données au même endroit",
                desc: "Centralisez les informations de vos locataires, coordonnées, historique des paiements et documents depuis une interface claire.",
                visual: (
                  <div className="flex flex-wrap gap-2">
                    {["3 logements", "5 locataires", "8 450€/mois"].map((t) => (
                      <span key={t} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/80">
                        {t}
                      </span>
                    ))}
                  </div>
                ),
              },
            ].map((block, i) => (
              <section key={block.title} className="marketing-fade-section grid gap-10 md:grid-cols-2 md:items-center">
                <div className={i % 2 === 1 ? "md:order-2" : undefined}>
                  <Badge tone={block.badgeTone}>{block.badge}</Badge>
                  <h2 className="mt-4 text-2xl font-bold text-white sm:text-3xl">{block.title}</h2>
                  <p className="mt-4 leading-relaxed text-white/60">{block.desc}</p>
                </div>
                <div className={i % 2 === 1 ? "md:order-1" : undefined}>{block.visual}</div>
              </section>
            ))}
          </div>
        ) : (
          <div className="space-y-24">
            {[
              {
                badge: "Plan Starter et plus",
                title: "Gérez toutes vos réservations",
                desc: "Vue liste ou calendrier planning. Statuts, sources (Airbnb, Booking, Direct) et actions rapides depuis une interface unifiée.",
                visual: (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm backdrop-blur-sm">
                    <p className="font-semibold text-white">12 juil → 19 juil</p>
                    <p className="mt-1 text-white/60">Thomas Martin</p>
                    <span className="mt-2 inline-block rounded-full bg-violet-500/25 px-2 py-0.5 text-xs text-violet-200">En cours</span>
                  </div>
                ),
              },
              {
                badge: "Plan Starter et plus",
                title: "Centralisez vos voyageurs",
                desc: "Coordonnées, pièce d'identité et historique complet des séjours pour chaque voyageur.",
                visual: (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-600 text-lg font-bold text-white">
                        TM
                      </span>
                      <div>
                        <p className="font-semibold text-white">Thomas Martin</p>
                        <p className="text-sm text-white/55">3 séjours · Dernière visite : mars 2026</p>
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                badge: "Plan Starter et plus",
                title: "Contrats de séjour prêts en quelques minutes",
                desc: "Générez et envoyez automatiquement les contrats de séjour à vos voyageurs par email en PDF. Toutes les informations de réservation sont injectées automatiquement.",
                visual: (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                    <p className="text-sm font-semibold text-emerald-400">Contrat PDF généré ✓</p>
                    <p className="mt-2 text-white/80">12-19 juil 2026 · 1 604€</p>
                  </div>
                ),
              },
              {
                badge: "Plan Starter et plus",
                title: "États des lieux adaptés au saisonnier",
                desc: "Réalisez vos états des lieux entre chaque séjour directement depuis votre smartphone avec photos et PDF automatique.",
                visual: (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/80 backdrop-blur-sm">
                    Entrée ✓ · Sortie ✓ · PDF envoyé ✓
                  </div>
                ),
              },
              {
                badge: "Plan Starter et plus",
                title: "Taxes de séjour calculées automatiquement",
                desc: "Calculez et exportez automatiquement les taxes de séjour à déclarer auprès de votre commune.",
                visual: (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5 font-mono text-sm text-white/90 backdrop-blur-sm">
                    2 pers. × 7 nuits × 1.75€ = 24,50€ ✓
                  </div>
                ),
              },
              {
                badge: "Plan Starter et plus",
                title: "Pilotez votre activité saisonnière",
                desc: "Revenus encaissés et à venir, taux d'occupation, répartition par source Airbnb/Booking/Direct, graphique mensuel.",
                visual: (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm backdrop-blur-sm">
                    <p className="text-white/80">Taux d&apos;occupation : 78%</p>
                    <p className="mt-1 text-white/80">Revenus : 4 200€</p>
                    <p className="mt-1 font-medium text-violet-300">Airbnb 60%</p>
                  </div>
                ),
              },
            ].map((block, i) => (
              <section key={block.title} className="marketing-fade-section grid gap-10 md:grid-cols-2 md:items-center">
                <div className={i % 2 === 1 ? "md:order-2" : undefined}>
                  <Badge tone="starter">{block.badge}</Badge>
                  <h2 className="mt-4 text-2xl font-bold text-white sm:text-3xl">{block.title}</h2>
                  <p className="mt-4 leading-relaxed text-white/60">{block.desc}</p>
                </div>
                <div className={i % 2 === 1 ? "md:order-1" : undefined}>{block.visual}</div>
              </section>
            ))}
          </div>
        )}

        <section className="marketing-fade-section rounded-2xl border border-white/10 bg-white/5 p-10 text-center backdrop-blur-sm">
          <h2 className="text-2xl font-bold text-white">Prêt à simplifier votre gestion locative ?</h2>
          <Link
            href="/register"
            className="mt-6 inline-flex rounded-xl bg-violet-600 px-6 py-3 font-semibold text-white transition hover:bg-violet-500"
          >
            Commencer gratuitement →
          </Link>
          <p className="mt-4 text-sm text-white/55">Gratuit pour commencer · Sans carte bancaire</p>
        </section>

        <LandingFooter />
      </main>
    </MarketingPublicShell>
  );
}
