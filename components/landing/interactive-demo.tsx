"use client";

import Link from "next/link";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import {
  Calendar,
  ClipboardList,
  FileText,
  FolderOpen,
  Home,
  LayoutDashboard,
  Receipt,
  ScrollText,
  TrendingUp,
  Users,
} from "lucide-react";
import { LogoFull } from "@/components/locavio-icons";
import { PC } from "@/lib/locavio-colors";

type DemoMode = "classique" | "saisonnier";

type ClassiqueSection = "dashboard" | "locataires" | "dossiers" | "quittances" | "baux" | "edl" | "irl";
type SaisonnierSection = "dashboard" | "reservations" | "voyageurs" | "contrats" | "edl" | "taxe";

const BAR_ENCAIS_PCT = [72, 80, 65, 88, 92, 78, 85, 90, 76, 82, 94, 84];

function cn(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function SignupModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" role="dialog" aria-modal aria-labelledby="interactive-demo-signup-title">
      <button type="button" className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" aria-label="Fermer" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-sm rounded-2xl border border-violet-500/30 p-8 shadow-2xl"
        style={{ backgroundColor: "#141428" }}
      >
        <h2 id="interactive-demo-signup-title" className="text-lg font-semibold text-white">
          Créez votre compte gratuitement
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-white/65">
          Pour accéder à toutes les fonctionnalités, inscrivez-vous en 30 secondes.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="order-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/5 sm:order-1"
            onClick={onClose}
          >
            Fermer
          </button>
          <Link
            href="/register"
            className="order-1 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-violet-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-lg transition hover:bg-violet-500 sm:order-2"
            onClick={onClose}
          >
            Commencer gratuitement →
          </Link>
        </div>
      </div>
    </div>
  );
}

function DemoNavLink({
  active,
  onClick,
  Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  Icon: ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg py-2.5 pl-3 pr-2 text-left text-sm font-medium transition-colors",
        active ? "text-[#a78bfa]" : "text-white/50 hover:bg-white/[0.04]",
      )}
      style={
        active
          ? {
              backgroundColor: "rgba(124,58,237,0.15)",
              boxShadow: "inset 2px 0 0 0 #7c3aed",
            }
          : undefined
      }
    >
      <Icon className="h-4 w-4 shrink-0 opacity-90" />
      <span className="truncate">{label}</span>
    </button>
  );
}

function Badge({ children, tone }: { children: ReactNode; tone: "green" | "yellow" | "orange" | "red" | "blue" | "gray" | "violet" }) {
  const map = {
    green: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
    yellow: "bg-amber-500/15 text-amber-300 border-amber-500/25",
    orange: "bg-orange-500/15 text-orange-300 border-orange-500/25",
    red: "bg-red-500/15 text-red-300 border-red-500/25",
    blue: "bg-sky-500/15 text-sky-300 border-sky-500/25",
    gray: "bg-white/10 text-white/55 border-white/10",
    violet: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  } as const;
  return <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", map[tone])}>{children}</span>;
}

function CardShell({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-xl border border-white/[0.08] bg-white/[0.05] p-4", className)}>{children}</div>;
}

export function InteractiveDemo() {
  const [mode, setMode] = useState<DemoMode>("classique");
  const [classiqueSection, setClassiqueSection] = useState<ClassiqueSection>("dashboard");
  const [saisonnierSection, setSaisonnierSection] = useState<SaisonnierSection>("dashboard");
  const [signupOpen, setSignupOpen] = useState(false);

  useEffect(() => {
    setClassiqueSection("dashboard");
    setSaisonnierSection("dashboard");
  }, [mode]);

  const dateLong = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const openSignup = () => setSignupOpen(true);

  const pillInactive = PC.cardHover;
  const pillActive = "#7c3aed";

  const renderClassique = () => {
    switch (classiqueSection) {
      case "dashboard":
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white">Bonjour Léo 👋</h3>
              <p className="text-xs capitalize text-white/45">{dateLong}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <CardShell>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-medium text-white/50">Logements actifs</p>
                    <p className="mt-1 text-2xl font-extrabold tabular-nums text-white">3</p>
                  </div>
                  <Home className="h-5 w-5 text-violet-400" />
                </div>
              </CardShell>
              <CardShell>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-medium text-white/50">Locataires actifs</p>
                    <p className="mt-1 text-2xl font-extrabold tabular-nums text-white">5</p>
                  </div>
                  <Users className="h-5 w-5 text-violet-400" />
                </div>
              </CardShell>
              <CardShell>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-medium text-white/50">Quittances ce mois</p>
                    <p className="mt-1 text-2xl font-extrabold tabular-nums text-white">5</p>
                  </div>
                  <FileText className="h-5 w-5 text-emerald-400" />
                </div>
              </CardShell>
              <CardShell>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-medium text-white/50">Baux actifs</p>
                    <p className="mt-1 text-2xl font-extrabold tabular-nums text-white">3</p>
                  </div>
                  <ScrollText className="h-5 w-5 text-violet-400" />
                </div>
              </CardShell>
            </div>
            <CardShell className="mt-4 space-y-3">
              <p className="text-sm font-semibold text-white">Suivi financier — mai 2026</p>
              <div className="grid gap-2 text-sm">
                <p className="text-white/80">
                  Potentiel total : <span className="font-semibold text-white">3 760 €</span>
                </p>
                <p className="text-emerald-400">
                  Encaissé : <span className="font-semibold">3 170 €</span>
                </p>
                <p className="text-amber-400">
                  Manque à gagner : <span className="font-semibold">590 €</span>
                </p>
              </div>
              <div className="pt-1">
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-violet-600" style={{ width: "84%" }} />
                </div>
                <p className="mt-1 text-[11px] text-white/45">Progression : 84 %</p>
              </div>
            </CardShell>
            <CardShell className="space-y-3">
              <p className="text-sm font-semibold text-white">Revenus 2026</p>
              <div className="flex h-28 items-end gap-1 px-0.5">
                {BAR_ENCAIS_PCT.map((pct, i) => (
                  <div key={i} className="relative flex h-full min-w-0 flex-1 items-end justify-center">
                    <div
                      className="absolute bottom-0 left-1/2 w-[85%] -translate-x-1/2 rounded-t bg-white/15"
                      style={{ height: "100%" }}
                      title="Potentiel"
                    />
                    <div
                      className="relative z-[1] w-[70%] rounded-t bg-gradient-to-t from-violet-700 to-violet-400"
                      style={{ height: `${pct}%` }}
                      title="Encaissés"
                    />
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-4 text-[11px] text-white/50">
                <span>
                  <span className="font-bold text-violet-400">■</span> Encaissés
                </span>
                <span>
                  <span className="font-bold text-white/35">■</span> Potentiel
                </span>
              </div>
            </CardShell>
          </div>
        );
      case "locataires":
        return (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-white">Locataires</h3>
            {[
              { name: "Sophie Martin", place: "Appt 75011 Paris", rent: "850€/mois", badge: "Actif" as const, t: "green" as const },
              { name: "Thomas Dubois", place: "Studio 69001 Lyon", rent: "620€/mois", badge: "Actif", t: "green" as const },
              { name: "Marie Chen", place: "Appt 33000 Bordeaux", rent: "780€/mois", badge: "Actif", t: "green" as const },
              { name: "Lucas Bernard", place: "Appt 75015 Paris", rent: "920€/mois", badge: "Actif", t: "green" as const },
              { name: "Emma Petit", place: "Studio 31000 Toulouse", rent: "590€/mois", badge: "En attente", t: "yellow" as const },
            ].map((row) => (
              <CardShell key={row.name} className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-white">{row.name}</p>
                  <p className="text-xs text-white/50">
                    {row.place} · {row.rent}
                  </p>
                </div>
                <Badge tone={row.t}>{row.badge}</Badge>
              </CardShell>
            ))}
          </div>
        );
      case "dossiers":
        return (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-white">Dossiers de candidature</h3>
            {[
              { name: "Antoine Moreau", place: "Appt 75011", score: "87/100", qual: "Excellent", qt: "green" as const, stat: "Reçu", st: "green" as const },
              { name: "Julie Lambert", place: "Studio Lyon", score: "72/100", qual: "Bon", qt: "orange" as const, stat: "En cours", st: "blue" as const },
              { name: "Pierre Durand", place: "Appt Bordeaux", score: "45/100", qual: "Insuffisant", qt: "red" as const, stat: "Reçu", st: "green" as const },
            ].map((d) => (
              <CardShell key={d.name}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-white">{d.name}</p>
                    <p className="text-xs text-white/50">
                      {d.place} · Score {d.score}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge tone={d.qt}>{d.qual}</Badge>
                    <Badge tone={d.st}>{d.stat}</Badge>
                  </div>
                </div>
              </CardShell>
            ))}
          </div>
        );
      case "quittances":
        return (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-white">Quittances de loyer</h3>
              <button
                type="button"
                className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-violet-500"
                onClick={openSignup}
              >
                + Nouvelle quittance
              </button>
            </div>
            {[
              { m: "Mai 2026", who: "Sophie Martin", amt: "850€", tone: "green" as const, lab: "Envoyée" },
              { m: "Mai 2026", who: "Thomas Dubois", amt: "620€", tone: "green" as const, lab: "Envoyée" },
              { m: "Mai 2026", who: "Marie Chen", amt: "780€", tone: "green" as const, lab: "Envoyée" },
              { m: "Mai 2026", who: "Lucas Bernard", amt: "920€", tone: "green" as const, lab: "Envoyée" },
              { m: "Mai 2026", who: "Emma Petit", amt: "590€", tone: "yellow" as const, lab: "En attente" },
              { m: "Avr 2026", who: "Sophie Martin", amt: "850€", tone: "green" as const, lab: "Envoyée" },
            ].map((q, i) => (
              <CardShell key={`${q.m}-${q.who}-${i}`} className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm text-white/80">
                    {q.m} — {q.who}
                  </p>
                  <p className="text-xs text-white/45">{q.amt}</p>
                </div>
                <Badge tone={q.tone}>{q.lab}</Badge>
              </CardShell>
            ))}
          </div>
        );
      case "baux":
        return (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-white">Baux de location</h3>
            {[
              { who: "Sophie Martin", place: "Appt 75011 Paris", dur: "3 ans", start: "01/09/2023", rent: "850€" },
              { who: "Thomas Dubois", place: "Studio Lyon", dur: "1 an", start: "15/03/2024", rent: "620€" },
              { who: "Marie Chen", place: "Appt Bordeaux", dur: "3 ans", start: "01/01/2024", rent: "780€" },
            ].map((b) => (
              <CardShell key={b.who}>
                <p className="font-semibold text-white">
                  Bail — {b.who} — {b.place}
                </p>
                <p className="mt-1 text-xs text-white/55">
                  {b.dur} | Début : {b.start} | Loyer : {b.rent}
                </p>
                <div className="mt-2">
                  <Badge tone="green">Actif</Badge>
                </div>
              </CardShell>
            ))}
          </div>
        );
      case "edl":
        return (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-white">États des lieux</h3>
            <CardShell>
              <p className="font-semibold text-white">EDL Entrée — Sophie Martin — 01/09/2023</p>
              <p className="mt-1 text-xs text-white/50">Appt 75011 Paris</p>
              <div className="mt-2">
                <Badge tone="green">Complété</Badge>
              </div>
            </CardShell>
            <CardShell>
              <p className="font-semibold text-white">EDL Sortie — Thomas Dubois — 14/03/2024</p>
              <p className="mt-1 text-xs text-white/50">Studio Lyon</p>
              <div className="mt-2">
                <Badge tone="gray">En cours</Badge>
              </div>
            </CardShell>
          </div>
        );
      case "irl":
        return (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-white">Révision des loyers IRL</h3>
            <CardShell>
              <p className="font-semibold text-white">Sophie Martin</p>
              <p className="mt-1 text-sm text-white/65">
                Loyer actuel : 850€ → Nouveau loyer : 867€ <span className="text-violet-300">(+2.0 % IRL Q1 2026)</span>
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge tone="violet">À envoyer</Badge>
                <button
                  type="button"
                  className="rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-200 hover:bg-violet-500/20"
                  onClick={openSignup}
                >
                  Envoyer la lettre →
                </button>
              </div>
            </CardShell>
            <CardShell>
              <p className="font-semibold text-white">Marie Chen</p>
              <p className="mt-1 text-sm text-white/65">
                Loyer actuel : 780€ → Nouveau loyer : 796€ <span className="text-violet-300">(+2.0 % IRL Q1 2026)</span>
              </p>
              <div className="mt-2">
                <Badge tone="green">Envoyée</Badge>
              </div>
            </CardShell>
          </div>
        );
      default:
        return null;
    }
  };

  const renderSaisonnier = () => {
    switch (saisonnierSection) {
      case "dashboard":
        return (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-white">Dashboard Saisonnier</h3>
              <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70">2026</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <CardShell>
                <p className="text-xs text-white/50">Revenus encaissés</p>
                <p className="mt-1 text-xl font-bold text-emerald-400">4 200 €</p>
                <p className="mt-1 text-[11px] text-emerald-400/90">+12 % vs 2025</p>
              </CardShell>
              <CardShell>
                <p className="text-xs text-white/50">Revenus à venir</p>
                <p className="mt-1 text-xl font-bold text-violet-300">1 850 €</p>
              </CardShell>
              <CardShell>
                <p className="text-xs text-white/50">Total annuel</p>
                <p className="mt-1 text-xl font-bold text-white">6 050 €</p>
              </CardShell>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-white/80">Total: 8</span>
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-emerald-400">Terminées: 5</span>
              <span className="rounded-full bg-sky-500/20 px-2.5 py-1 text-sky-300">En cours: 1</span>
              <span className="rounded-full bg-violet-500/20 px-2.5 py-1 text-violet-300">À venir: 2</span>
              <span className="rounded-full bg-red-500/20 px-2.5 py-1 text-red-300">Annulées: 0</span>
            </div>
            <CardShell>
              <p className="text-sm font-semibold text-white">Taux d&apos;occupation</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-violet-600" style={{ width: "68%" }} />
              </div>
              <p className="mt-2 text-xs text-white/55">68 % — 124 nuits occupées / 182 disponibles</p>
            </CardShell>
            <CardShell>
              <p className="text-sm font-semibold text-white">Répartition sources</p>
              <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full">
                <div className="h-full bg-[#ff5a5f]" style={{ width: "60%" }} />
                <div className="h-full bg-violet-600" style={{ width: "25%" }} />
                <div className="h-full bg-[#003580]" style={{ width: "15%" }} />
              </div>
              <p className="mt-2 text-[11px] text-white/55">Airbnb 60 % · Direct 25 % · Booking 15 %</p>
            </CardShell>
          </div>
        );
      case "reservations":
        return (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-white">Réservations</h3>
            {[
              { who: "Thomas Martin", dates: "12-19 juil 2026", n: "7 nuits", price: "1 604€", src: "Airbnb", tone: "blue" as const, lab: "À venir" },
              { who: "Emma Rousseau", dates: "01-08 août 2026", n: "7 nuits", price: "1 715€", src: "Direct", tone: "blue" as const, lab: "À venir" },
              { who: "Jean-Pierre Blanc", dates: "15-22 juin 2026", n: "7 nuits", price: "1 450€", src: "Booking", tone: "green" as const, lab: "Terminée" },
              { who: "Isabelle Moreau", dates: "01-07 juin 2026", n: "6 nuits", price: "1 200€", src: "Airbnb", tone: "green" as const, lab: "Terminée" },
            ].map((r) => (
              <CardShell key={r.who + r.dates}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-white">{r.who}</p>
                    <p className="text-xs text-white/50">
                      {r.dates} · {r.n} · {r.price}
                    </p>
                    <p className="mt-1 text-[11px] text-white/45">Source: {r.src}</p>
                  </div>
                  <Badge tone={r.tone}>{r.lab}</Badge>
                </div>
              </CardShell>
            ))}
          </div>
        );
      case "voyageurs":
        return (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-white">Voyageurs</h3>
            {[
              { name: "Thomas Martin", email: "thomas.m@email.com", trips: "2 séjours" },
              { name: "Emma Rousseau", email: "emma.r@email.com", trips: "1 séjour" },
              { name: "Jean-Pierre Blanc", email: "jp.blanc@email.com", trips: "3 séjours" },
              { name: "Isabelle Moreau", email: "i.moreau@email.com", trips: "1 séjour" },
            ].map((v) => (
              <CardShell key={v.email}>
                <p className="font-semibold text-white">{v.name}</p>
                <p className="text-xs text-violet-300/90">{v.email}</p>
                <p className="mt-1 text-xs text-white/45">{v.trips}</p>
              </CardShell>
            ))}
          </div>
        );
      case "contrats":
        return (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-white">Contrats de séjour</h3>
            <CardShell>
              <p className="font-semibold text-white">Thomas Martin · 12-19 juil 2026 · 1 604€</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge tone="green">Envoyé</Badge>
                <span className="text-xs text-white/45">PDF ✓</span>
              </div>
            </CardShell>
            <CardShell>
              <p className="font-semibold text-white">Emma Rousseau · 01-08 août 2026 · 1 715€</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge tone="orange">À envoyer</Badge>
                <button
                  type="button"
                  className="rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-200 hover:bg-violet-500/20"
                  onClick={openSignup}
                >
                  Envoyer →
                </button>
              </div>
            </CardShell>
            <CardShell>
              <p className="font-semibold text-white">Jean-Pierre Blanc · 15-22 juin 2026 · 1 450€</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge tone="green">Envoyé</Badge>
                <span className="text-xs text-white/45">PDF ✓</span>
              </div>
            </CardShell>
          </div>
        );
      case "edl":
        return (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-white">États des lieux</h3>
            <CardShell>
              <p className="font-semibold text-white">Entrée — Thomas Martin — 12/07/2026</p>
              <div className="mt-2">
                <Badge tone="blue">Planifié</Badge>
              </div>
            </CardShell>
            <CardShell>
              <p className="font-semibold text-white">Sortie — Jean-Pierre Blanc — 22/06/2026</p>
              <div className="mt-2">
                <Badge tone="green">Complété</Badge>
              </div>
            </CardShell>
            <CardShell>
              <p className="font-semibold text-white">Entrée — Emma Rousseau — 01/08/2026</p>
              <div className="mt-2">
                <Badge tone="blue">Planifié</Badge>
              </div>
            </CardShell>
          </div>
        );
      case "taxe":
        return (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-white">Taxe de séjour</h3>
            <CardShell className="space-y-2">
              <p className="text-sm text-white/80">T2 2026 — 3 réservations</p>
              <p className="text-sm text-white/65">Total voyageurs : 6 pers. × nuits × 1,75€</p>
              <p className="text-lg font-semibold text-white">Total à déclarer : 73,50€</p>
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Badge tone="orange">À déclarer</Badge>
                <button
                  type="button"
                  className="rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-200 hover:bg-violet-500/20"
                  onClick={openSignup}
                >
                  Exporter →
                </button>
              </div>
            </CardShell>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div className="landing-interactive-demo-enter mx-auto w-full max-w-[1000px]">
        <div className="mb-4 flex justify-center px-1">
          <div
            className="w-full max-w-sm rounded-full p-1"
            style={{ backgroundColor: PC.inputBg, border: `1px solid ${PC.border}` }}
            role="group"
            aria-label="Mode de démonstration"
          >
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                className="rounded-full py-2.5 text-xs font-semibold transition-all duration-200"
                style={{
                  backgroundColor: mode === "classique" ? pillActive : pillInactive,
                  color: mode === "classique" ? PC.white : PC.muted,
                  boxShadow: mode === "classique" ? PC.activeRing : "none",
                }}
                onClick={() => setMode("classique")}
              >
                Classique
              </button>
              <button
                type="button"
                className="rounded-full py-2.5 text-xs font-semibold transition-all duration-200"
                style={{
                  backgroundColor: mode === "saisonnier" ? pillActive : pillInactive,
                  color: mode === "saisonnier" ? PC.white : PC.muted,
                  boxShadow: mode === "saisonnier" ? PC.activeRing : "none",
                }}
                onClick={() => setMode("saisonnier")}
              >
                Saisonnier
              </button>
            </div>
          </div>
        </div>

        <div
          className="mx-auto flex w-full max-w-[1000px] overflow-hidden rounded-2xl"
          style={{
            height: 580,
            border: "1px solid rgba(124,58,237,0.3)",
            borderRadius: 16,
            boxShadow: "0 0 60px rgba(124,58,237,0.15)",
            backgroundColor: "#0d0d1a",
          }}
        >
          <aside
            className="flex w-[220px] shrink-0 flex-col py-0"
            style={{ backgroundColor: "#08080f", borderRight: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="px-4 pt-4">
              <LogoFull className="h-8 w-auto text-white" />
            </div>
            <nav className="mt-4 min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
              {mode === "classique" ? (
                <>
                  <DemoNavLink active={classiqueSection === "dashboard"} onClick={() => setClassiqueSection("dashboard")} Icon={LayoutDashboard} label="Dashboard" />
                  <DemoNavLink active={classiqueSection === "locataires"} onClick={() => setClassiqueSection("locataires")} Icon={Users} label="Locataires" />
                  <DemoNavLink active={classiqueSection === "dossiers"} onClick={() => setClassiqueSection("dossiers")} Icon={FolderOpen} label="Dossiers" />
                  <DemoNavLink active={classiqueSection === "quittances"} onClick={() => setClassiqueSection("quittances")} Icon={FileText} label="Quittances" />
                  <DemoNavLink active={classiqueSection === "baux"} onClick={() => setClassiqueSection("baux")} Icon={ScrollText} label="Baux" />
                  <DemoNavLink active={classiqueSection === "edl"} onClick={() => setClassiqueSection("edl")} Icon={ClipboardList} label="États des lieux" />
                  <DemoNavLink active={classiqueSection === "irl"} onClick={() => setClassiqueSection("irl")} Icon={TrendingUp} label="Révision IRL" />
                </>
              ) : (
                <>
                  <DemoNavLink active={saisonnierSection === "dashboard"} onClick={() => setSaisonnierSection("dashboard")} Icon={LayoutDashboard} label="Dashboard" />
                  <DemoNavLink active={saisonnierSection === "reservations"} onClick={() => setSaisonnierSection("reservations")} Icon={Calendar} label="Réservations" />
                  <DemoNavLink active={saisonnierSection === "voyageurs"} onClick={() => setSaisonnierSection("voyageurs")} Icon={Users} label="Voyageurs" />
                  <DemoNavLink active={saisonnierSection === "contrats"} onClick={() => setSaisonnierSection("contrats")} Icon={ScrollText} label="Contrats" />
                  <DemoNavLink active={saisonnierSection === "edl"} onClick={() => setSaisonnierSection("edl")} Icon={ClipboardList} label="États des lieux" />
                  <DemoNavLink active={saisonnierSection === "taxe"} onClick={() => setSaisonnierSection("taxe")} Icon={Receipt} label="Taxe de séjour" />
                </>
              )}
            </nav>
            <div className="mt-auto border-t border-white/[0.06] px-3 py-3">
              <div className="flex items-center gap-2">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ background: PC.gradientPrimary }}
                >
                  LL
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-white">Léo Leignel</p>
                  <p className="truncate text-[10px] text-white/50">gestionlocative@…</p>
                </div>
              </div>
            </div>
          </aside>

          <div className="interactive-demo-main-scroll min-h-0 flex-1 overflow-y-auto p-4 text-left font-sans">{mode === "classique" ? renderClassique() : renderSaisonnier()}</div>
        </div>
      </div>

      <SignupModal open={signupOpen} onClose={() => setSignupOpen(false)} />
    </>
  );
}
