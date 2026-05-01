"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import { Home, TrendingUp, Users } from "lucide-react";
import { MarketingPublicShell } from "@/components/landing/marketing-public-shell";
import { LandingFooter } from "@/components/landing/landing-footer";
import { PC } from "@/lib/locavio-colors";

type Mode = "classique" | "saisonnier";

type ExempleEmailFormType = "quittance" | "bail" | "edl" | "contrat-saisonnier";

type ApiExempleType = "quittance" | "bail" | "etat-des-lieux" | "contrat-sejour";

function toApiExempleType(type: ExempleEmailFormType): ApiExempleType {
  if (type === "edl") return "etat-des-lieux";
  if (type === "contrat-saisonnier") return "contrat-sejour";
  return type;
}

function ExempleEmailForm({ type }: { type: ExempleEmailFormType }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/landing/send-exemple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, type: toApiExempleType(type) }),
      });
      if (res.ok) setStatus("success");
      else setStatus("error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <p className="mt-3 text-sm text-emerald-400">
        ✓ C&apos;est parti ! Vérifiez votre boîte mail 📬
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-wrap gap-2">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Votre email"
        className="min-w-[180px] flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-white/40 focus:border-violet-500/60"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="whitespace-nowrap rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-60"
      >
        {status === "loading" ? "Envoi…" : "Recevoir un exemple →"}
      </button>
      {status === "error" ? (
        <p className="w-full text-xs text-red-400">Une erreur est survenue, réessayez.</p>
      ) : null}
    </form>
  );
}

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

const visualShell = "rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm";

export function FonctionnalitesClient() {
  const [mode, setMode] = useState<Mode>("classique");

  return (
    <MarketingPublicShell>
      <main className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 lg:px-8">
        <header className="marketing-fade-section space-y-6 pb-8 text-center">
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
          <div className="my-12 space-y-12">
            {[
              {
                badge: "Disponible sur tous les plans" as const,
                badgeTone: "all" as const,
                title: "Quittances en 1 clic, dès réception du loyer",
                desc: "Générez et envoyez vos quittances en 1 clic dès réception du loyer. PDF conforme généré instantanément, envoyé par email à votre locataire automatiquement.",
                exempleType: "quittance" as const,
                visual: (
                  <div className={visualShell}>
                    <p className="text-sm font-bold text-violet-400">QUITTANCE DE LOYER — Mai 2026</p>
                    <p className="mt-3 text-sm text-white/80">Bailleur : Sophie Proprietaire</p>
                    <p className="mt-1 text-sm text-white/80">Locataire : Thomas Dubois</p>
                    <p className="mt-1 text-sm text-white/80">Logement : Studio 69001 Lyon</p>
                    <hr className="my-4 border-white/10" />
                    <p className="text-2xl font-bold text-white">620 €</p>
                    <p className="mt-1 text-xs text-white/50">Loyer : 600€ + Charges : 20€</p>
                    <span className="mt-4 inline-block rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400">
                      Envoyée par email ✓
                    </span>
                  </div>
                ),
              },
              {
                badge: "Plan Starter et plus",
                badgeTone: "starter" as const,
                title: "Baux légaux générés en quelques minutes",
                desc: "Créez des baux conformes à la loi ALUR. Les données propriétaire et locataire sont injectées automatiquement. Envoyez par email et suivez le statut en temps réel.",
                exempleType: "bail" as const,
                visual: (
                  <div className={visualShell}>
                    <p className="text-sm font-bold text-violet-400">BAIL D&apos;HABITATION</p>
                    <p className="mt-1 text-xs text-white/50">Conforme loi ALUR — 3 ans</p>
                    <hr className="my-4 border-white/10" />
                    <p className="text-sm text-white/85">📍 12 rue des Lilas, 75011 Paris</p>
                    <p className="mt-2 text-sm text-white/85">👤 Locataire : Sophie Martin</p>
                    <p className="mt-2 text-sm text-white/85">💰 Loyer mensuel : 850 € CC</p>
                    <hr className="my-4 border-white/10" />
                    <p className="text-sm text-white/70">Date de début : 01/09/2023</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full bg-violet-500/20 px-3 py-1 text-xs font-semibold text-violet-300">PDF généré ✓</span>
                      <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400">Envoyé par email ✓</span>
                    </div>
                  </div>
                ),
              },
              {
                badge: "Plan Starter et plus",
                badgeTone: "starter" as const,
                title: "États des lieux complets, directement depuis votre smartphone",
                desc: "Documentez l'état de votre logement à l'entrée et à la sortie avec photos, commentaires et PDF automatique. Comparaison entrée/sortie intégrée.",
                exempleType: "edl" as const,
                visual: (
                  <div className={visualShell}>
                    <p className="text-sm font-bold text-violet-400">ÉTAT DES LIEUX D&apos;ENTRÉE</p>
                    <p className="mt-1 text-xs text-white/50">01/09/2023 — 12 rue des Lilas, Paris</p>
                    <hr className="my-4 border-white/10" />
                    <ul className="space-y-2 text-sm text-white/85">
                      <li className="flex flex-wrap items-center justify-between gap-2">
                        <span>✓ Salon</span>
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">Bon état</span>
                      </li>
                      <li className="flex flex-wrap items-center justify-between gap-2">
                        <span>✓ Cuisine</span>
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">Bon état</span>
                      </li>
                      <li className="flex flex-wrap items-center justify-between gap-2">
                        <span>✓ Chambre</span>
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">Bon état</span>
                      </li>
                      <li className="flex flex-wrap items-center justify-between gap-2">
                        <span>✓ Salle de bain</span>
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">Bon état</span>
                      </li>
                      <li className="flex flex-wrap items-center justify-between gap-2">
                        <span>⚠ Entrée</span>
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300">Égratignure sol</span>
                      </li>
                    </ul>
                    <hr className="my-4 border-white/10" />
                    <p className="text-sm text-white/65">📸 12 photos jointes</p>
                    <span className="mt-3 inline-block rounded-full bg-violet-500/20 px-3 py-1 text-xs font-semibold text-violet-300">PDF généré ✓</span>
                  </div>
                ),
              },
              {
                badge: "Plan Starter et plus",
                badgeTone: "starter" as const,
                title: "Révision annuelle des loyers calculée automatiquement",
                desc: "Locavio détecte les baux éligibles et calcule le nouveau loyer selon l'indice IRL de l'INSEE. Envoyez la lettre officielle en PDF par email en un clic.",
                visual: (
                  <div className={visualShell}>
                    <p className="text-sm font-bold text-violet-400">RÉVISION ANNUELLE — IRL Q1 2026</p>
                    <hr className="my-4 border-white/10" />
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <span className="text-white/55">Indice de référence</span>
                      <span className="text-right text-white">3,5 %</span>
                      <span className="text-white/55">Loyer actuel</span>
                      <span className="text-right text-white">850 €</span>
                      <span className="text-white/55">Nouveau loyer</span>
                      <span className="text-right text-lg font-bold text-emerald-400">879,75 €</span>
                      <span className="text-white/55">Augmentation</span>
                      <span className="text-right font-semibold text-emerald-400">+29,75 €/mois</span>
                    </div>
                    <hr className="my-4 border-white/10" />
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-violet-500/20 px-3 py-1 text-xs font-semibold text-violet-300">Lettre officielle PDF prête</span>
                      <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400">Envoyée à Sophie Martin ✓</span>
                    </div>
                  </div>
                ),
              },
              {
                badge: "Plan Starter et plus",
                badgeTone: "starter" as const,
                title: "Analysez la solvabilité de vos candidats",
                desc: "Envoyez un questionnaire personnalisé à chaque candidat. Locavio analyse automatiquement le dossier et vous attribue une note de solvabilité claire.",
                visual: (
                  <div className={visualShell}>
                    <p className="text-sm font-bold text-violet-400">DOSSIER DE CANDIDATURE</p>
                    <p className="mt-2 font-semibold text-white">Antoine Moreau</p>
                    <p className="text-xs text-white/50">Candidature — Appt 75011 Paris</p>
                    <hr className="my-4 border-white/10" />
                    <div className="flex flex-wrap items-end gap-2">
                      <span className="text-4xl font-bold text-emerald-400">87</span>
                      <span className="pb-1 text-lg text-white/40">/100</span>
                      <span className="mb-1 ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-400">Excellent ✓</span>
                    </div>
                    <hr className="my-4 border-white/10" />
                    <ul className="space-y-2 text-sm text-white/80">
                      <li className="text-emerald-400/95">✓ Revenus : 3,2x le loyer</li>
                      <li className="text-emerald-400/95">✓ CDI — 3 ans d&apos;ancienneté</li>
                      <li className="text-emerald-400/95">✓ Garant Visale</li>
                    </ul>
                  </div>
                ),
              },
              {
                badge: "Disponible sur tous les plans",
                badgeTone: "all" as const,
                title: "Pilotez vos revenus en un coup d'œil",
                desc: "Suivez vos loyers attendus, encaissés et en retard. Graphique annuel, suivi par logement, vue d'ensemble de votre patrimoine.",
                visual: (
                  <div className={visualShell}>
                    <p className="text-sm font-bold text-violet-400">REVENUS 2026</p>
                    <p className="mt-1 text-xs text-white/50">Suivi mensuel</p>
                    <div className="mt-4 flex h-28 items-end justify-between gap-1 px-0.5">
                      {[45, 60, 55, 70, 65, 80, 75, 84].map((h, i) => (
                        <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                          <div className="w-full max-w-[14px] rounded-t bg-violet-600" style={{ height: `${h}%`, minHeight: 10 }} />
                          <span className="text-[9px] text-white/40">{["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû"][i]}</span>
                        </div>
                      ))}
                    </div>
                    <hr className="my-4 border-white/10" />
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <span className="text-white/55">Encaissé ce mois</span>
                      <span className="text-right font-semibold text-emerald-400">3 170 €</span>
                      <span className="text-white/55">Potentiel total</span>
                      <span className="text-right font-medium text-white/70">3 760 €</span>
                    </div>
                  </div>
                ),
              },
              {
                badge: "Disponible sur tous les plans",
                badgeTone: "all" as const,
                title: "Toutes vos données au même endroit",
                desc: "Centralisez les informations de vos locataires, coordonnées, historique des paiements et documents depuis une interface claire.",
                visual: (
                  <div className={visualShell}>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3 text-center">
                        <Home className="mx-auto h-5 w-5 text-violet-400" />
                        <p className="mt-2 text-2xl font-bold text-white">3</p>
                        <p className="text-[10px] text-white/50">Logements</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3 text-center">
                        <Users className="mx-auto h-5 w-5 text-violet-400" />
                        <p className="mt-2 text-2xl font-bold text-white">5</p>
                        <p className="text-[10px] text-white/50">Locataires</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3 text-center">
                        <TrendingUp className="mx-auto h-5 w-5 text-violet-400" />
                        <p className="mt-2 text-xl font-bold text-white">3 760€</p>
                        <p className="text-[10px] text-white/50">/ mois</p>
                      </div>
                    </div>
                    <hr className="my-4 border-white/10" />
                    <ul className="space-y-2 text-sm text-white/60">
                      <li className="flex gap-2">
                        <span className="text-violet-400">●</span>
                        Quittance Mai — Sophie Martin
                      </li>
                      <li className="flex gap-2">
                        <span className="text-violet-400">●</span>
                        Bail signé — Thomas Dubois
                      </li>
                      <li className="flex gap-2">
                        <span className="text-violet-400">●</span>
                        EDL complété — Marie Chen
                      </li>
                    </ul>
                  </div>
                ),
              },
            ].map((block, i) => (
              <section key={block.title} className="marketing-fade-section grid gap-10 md:grid-cols-2 md:items-center">
                <div className={i % 2 === 1 ? "md:order-2" : undefined}>
                  <Badge tone={block.badgeTone}>{block.badge}</Badge>
                  <h2 className="mt-4 text-2xl font-bold text-white sm:text-3xl">{block.title}</h2>
                  <p className="mt-4 leading-relaxed text-white/60">{block.desc}</p>
                  {"exempleType" in block && block.exempleType ? <ExempleEmailForm type={block.exempleType} /> : null}
                </div>
                <div className={i % 2 === 1 ? "md:order-1" : undefined}>{block.visual}</div>
              </section>
            ))}
          </div>
        ) : (
          <div className="my-12 space-y-12">
            {[
              {
                badge: "Plan Starter et plus",
                title: "Gérez toutes vos réservations",
                desc: "Vue liste ou calendrier planning. Statuts, sources (Airbnb, Booking, Direct) et actions rapides depuis une interface unifiée.",
                visual: (
                  <div className={visualShell}>
                    <p className="font-semibold text-white">Thomas Martin</p>
                    <p className="mt-1 text-xs text-white/50">12 juil → 19 juil 2026 · 7 nuits</p>
                    <span className="mt-2 inline-block rounded-full bg-sky-500/20 px-3 py-1 text-xs font-semibold text-sky-300">À venir</span>
                    <hr className="my-4 border-white/10" />
                    <p className="text-sm text-white/70">Source : Airbnb</p>
                    <p className="mt-2 text-lg font-bold text-white">Montant : 1 604 €</p>
                    <p className="mt-1 text-xs text-white/50">2 voyageurs · Appt Paris</p>
                  </div>
                ),
              },
              {
                badge: "Plan Starter et plus",
                title: "Centralisez vos voyageurs",
                desc: "Coordonnées, pièce d'identité et historique complet des séjours pour chaque voyageur.",
                visual: (
                  <div className={visualShell}>
                    <div className="flex items-start gap-3">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-600 text-lg font-bold text-white">
                        TM
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-white">Thomas Martin</p>
                        <p className="text-xs text-white/50">thomas.m@email.com</p>
                      </div>
                    </div>
                    <hr className="my-4 border-white/10" />
                    <p className="text-sm text-white/65">2 séjours · Dernier : juil 2026</p>
                    <span className="mt-3 inline-block rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400">Voyageur fidèle</span>
                  </div>
                ),
              },
              {
                badge: "Plan Starter et plus",
                title: "Contrats de séjour prêts en quelques minutes",
                desc: "Générez et envoyez automatiquement les contrats de séjour à vos voyageurs par email en PDF. Toutes les informations de réservation sont injectées automatiquement.",
                exempleType: "contrat-saisonnier" as const,
                visual: (
                  <div className={visualShell}>
                    <p className="text-sm font-bold text-violet-400">CONTRAT DE LOCATION SAISONNIÈRE</p>
                    <p className="mt-1 text-xs text-white/40">Articles L.324-1 du Code du tourisme</p>
                    <hr className="my-4 border-white/10" />
                    <p className="text-sm text-white/85">Thomas Martin → Sophie Proprietaire</p>
                    <p className="mt-2 text-sm text-white/85">12 juil → 19 juil 2026</p>
                    <p className="mt-2 text-sm font-semibold text-white">Montant total : 1 604 €</p>
                    <hr className="my-4 border-white/10" />
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400">Contrat envoyé ✓</span>
                      <span className="rounded-full bg-violet-500/20 px-3 py-1 text-xs font-semibold text-violet-300">Signé par les deux parties</span>
                    </div>
                  </div>
                ),
              },
              {
                badge: "Plan Starter et plus",
                title: "États des lieux adaptés au saisonnier",
                desc: "Réalisez vos états des lieux entre chaque séjour directement depuis votre smartphone avec photos et PDF automatique.",
                visual: (
                  <div className={visualShell}>
                    <p className="text-sm font-bold text-violet-400">ÉTAT DES LIEUX — ENTRÉE</p>
                    <p className="mt-1 text-xs text-white/50">12/07/2026 — Appt Paris</p>
                    <hr className="my-4 border-white/10" />
                    <ul className="space-y-2 text-sm text-white/80">
                      <li>✓ Salon — Bon état</li>
                      <li>✓ Cuisine — Bon état</li>
                      <li>✓ Chambre — Bon état</li>
                    </ul>
                    <p className="mt-3 text-sm text-white/60">📸 8 photos jointes</p>
                    <span className="mt-3 inline-block rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400">Complété ✓</span>
                  </div>
                ),
              },
              {
                badge: "Plan Starter et plus",
                title: "Taxes de séjour calculées automatiquement",
                desc: "Calculez et exportez automatiquement les taxes de séjour à déclarer auprès de votre commune.",
                visual: (
                  <div className={visualShell}>
                    <p className="text-sm font-bold text-violet-400">TAXE DE SÉJOUR — T2 2026</p>
                    <hr className="my-4 border-white/10" />
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <span className="text-white/55">Réservations</span>
                      <span className="text-right text-white">4</span>
                      <span className="text-white/55">Voyageurs-nuits</span>
                      <span className="text-right text-white">42</span>
                      <span className="text-white/55">Taux communal</span>
                      <span className="text-right text-white">1,75 €</span>
                      <span className="text-white/55">Total à déclarer</span>
                      <span className="text-right text-lg font-bold text-emerald-400">73,50 €</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300">À déclarer avant le 30/06</span>
                      <span className="rounded-full bg-violet-500/20 px-3 py-1 text-xs font-semibold text-violet-300">Export CSV prêt ✓</span>
                    </div>
                  </div>
                ),
              },
              {
                badge: "Plan Starter et plus",
                title: "Pilotez votre activité saisonnière",
                desc: "Revenus encaissés et à venir, taux d'occupation, répartition par source Airbnb/Booking/Direct, graphique mensuel.",
                visual: (
                  <div className={visualShell}>
                    <p className="text-sm font-bold text-violet-400">REVENUS SAISONNIERS 2026</p>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-lg font-bold text-emerald-400">4 200 €</p>
                        <p className="text-[10px] text-white/50">Encaissés</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-violet-400">1 850 €</p>
                        <p className="text-[10px] text-white/50">À venir</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-white">68 %</p>
                        <p className="text-[10px] text-white/50">Occupation</p>
                      </div>
                    </div>
                    <hr className="my-4 border-white/10" />
                    <p className="text-xs font-medium text-white/55">Répartition sources</p>
                    <div className="mt-2 space-y-2">
                      <div>
                        <div className="mb-1 flex justify-between text-[11px] text-white/60">
                          <span>Airbnb 60 %</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                          <div className="h-full w-[60%] rounded-full bg-violet-500" />
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 text-[11px] text-white/60">Direct 25 %</div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                          <div className="h-full w-[25%] rounded-full bg-violet-400/80" />
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 text-[11px] text-white/60">Booking 15 %</div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                          <div className="h-full w-[15%] rounded-full bg-violet-700" />
                        </div>
                      </div>
                    </div>
                  </div>
                ),
              },
            ].map((block, i) => (
              <section key={block.title} className="marketing-fade-section grid gap-10 md:grid-cols-2 md:items-center">
                <div className={i % 2 === 1 ? "md:order-2" : undefined}>
                  <Badge tone="starter">{block.badge}</Badge>
                  <h2 className="mt-4 text-2xl font-bold text-white sm:text-3xl">{block.title}</h2>
                  <p className="mt-4 leading-relaxed text-white/60">{block.desc}</p>
                  {"exempleType" in block && block.exempleType ? <ExempleEmailForm type={block.exempleType} /> : null}
                </div>
                <div className={i % 2 === 1 ? "md:order-1" : undefined}>{block.visual}</div>
              </section>
            ))}
          </div>
        )}

        <section className="marketing-fade-section my-12 mb-0 rounded-2xl border border-white/10 bg-white/5 px-8 py-8 text-center backdrop-blur-sm">
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
