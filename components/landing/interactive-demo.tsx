"use client";

import Link from "next/link";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import {
  Building2,
  Calendar,
  Check,
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
import { PC } from "@/lib/locavio-colors";

const DEMO_LOGO_SRC = "/logos/lockup-horizontal-clair.svg?v=2";

type DemoMode = "classique" | "saisonnier";

type ClassiqueSection =
  | "dashboard"
  | "logements"
  | "locataires"
  | "dossiers"
  | "quittances"
  | "baux"
  | "edl"
  | "irl";
type SaisonnierSection =
  | "dashboard"
  | "saisonnier-logements"
  | "reservations"
  | "voyageurs"
  | "contrats"
  | "edl"
  | "taxe";

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
        className="relative z-10 w-full max-w-sm rounded-2xl border border-violet-200 p-8 shadow-2xl"
        style={{ backgroundColor: "#ffffff" }}
      >
        <h2 id="interactive-demo-signup-title" className="text-lg font-semibold text-[#1a0533]">
          Créez votre compte gratuitement
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[#6b7280]">
          Pour accéder à toutes les fonctionnalités, inscrivez-vous en 30 secondes.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="order-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-[#6b7280] transition hover:bg-gray-50 sm:order-1"
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
        active ? "text-[#7c3aed]" : "text-[#9ca3af] hover:bg-gray-100",
      )}
      style={
        active
          ? {
              backgroundColor: "rgba(124,58,237,0.08)",
              boxShadow: "inset 2px 0 0 0 #7c3aed",
            }
          : undefined
      }
    >
      <Icon className={`h-4 w-4 shrink-0 ${active ? "text-[#7c3aed]" : "text-[#9ca3af]"}`} />
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
    gray: "bg-gray-100 text-[#6b7280] border-gray-200",
    violet: "bg-violet-100 text-violet-700 border-violet-200",
  } as const;
  return <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", map[tone])}>{children}</span>;
}

function CardShell({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-xl border border-gray-200 bg-white p-4", className)}>{children}</div>;
}

const demoActionBtnClass =
  "rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-violet-500";

function SectionActionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-lg font-bold text-[#1a0533]">{title}</h3>
      <button type="button" className={demoActionBtnClass} onClick={onAction}>
        {actionLabel}
      </button>
    </div>
  );
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

  const pillInactive = "#f3f4f6";
  const pillActive = "#7c3aed";

  const renderClassique = () => {
    switch (classiqueSection) {
      case "dashboard":
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-[#1a0533]">Bonjour Sophie 👋</h3>
              <p className="text-xs capitalize text-[#9ca3af]">{dateLong}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <CardShell>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-medium text-[#9ca3af]">Logements actifs</p>
                    <p className="mt-1 text-2xl font-extrabold tabular-nums text-[#1a0533]">3</p>
                  </div>
                  <Home className="h-5 w-5 text-violet-400" />
                </div>
              </CardShell>
              <CardShell>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-medium text-[#9ca3af]">Locataires actifs</p>
                    <p className="mt-1 text-2xl font-extrabold tabular-nums text-[#1a0533]">5</p>
                  </div>
                  <Users className="h-5 w-5 text-violet-400" />
                </div>
              </CardShell>
              <CardShell>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-medium text-[#9ca3af]">Quittances ce mois</p>
                    <p className="mt-1 text-2xl font-extrabold tabular-nums text-[#1a0533]">5</p>
                  </div>
                  <FileText className="h-5 w-5 text-emerald-400" />
                </div>
              </CardShell>
              <CardShell>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-medium text-[#9ca3af]">Baux actifs</p>
                    <p className="mt-1 text-2xl font-extrabold tabular-nums text-[#1a0533]">3</p>
                  </div>
                  <ScrollText className="h-5 w-5 text-violet-400" />
                </div>
              </CardShell>
            </div>
            <CardShell className="mt-4 space-y-3">
              <p className="text-sm font-semibold text-[#1a0533]">Suivi financier — mai 2026</p>
              <div className="grid gap-2 text-sm">
                <p className="text-[#6b7280]">
                  Potentiel total : <span className="font-semibold text-[#1a0533]">3 760 €</span>
                </p>
                <p className="text-emerald-400">
                  Encaissé : <span className="font-semibold">3 170 €</span>
                </p>
                <p className="text-amber-400">
                  Manque à gagner : <span className="font-semibold">590 €</span>
                </p>
              </div>
              <div className="pt-1">
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-violet-600" style={{ width: "84%" }} />
                </div>
                <p className="mt-1 text-[11px] text-[#9ca3af]">Progression : 84 %</p>
              </div>
            </CardShell>
            <CardShell className="space-y-3">
              <p className="text-sm font-semibold text-[#1a0533]">Revenus 2026</p>
              <div className="flex h-28 items-end gap-1 px-0.5">
                {BAR_ENCAIS_PCT.map((pct, i) => (
                  <div key={i} className="relative flex h-full min-w-0 flex-1 items-end justify-center">
                    <div
                      className="absolute bottom-0 left-1/2 w-[85%] -translate-x-1/2 rounded-t bg-gray-200"
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
              <div className="flex flex-wrap gap-4 text-[11px] text-[#9ca3af]">
                <span>
                  <span className="font-bold text-violet-400">■</span> Encaissés
                </span>
                <span>
                  <span className="font-bold text-[#9ca3af]">■</span> Potentiel
                </span>
              </div>
            </CardShell>
          </div>
        );
      case "logements":
        return (
          <div className="space-y-3">
            <SectionActionHeader title="Mes logements" actionLabel="+ Ajouter un logement" onAction={openSignup} />
            {[
              {
                type: "Appartement",
                addr: "12 rue des Lilas, 75011 Paris",
                details: "3 pièces | 58m² | Loyer : 850€/mois",
                tenant: "Sophie Martin",
              },
              {
                type: "Studio",
                addr: "8 place Bellecour, 69001 Lyon",
                details: "1 pièce | 28m² | Loyer : 620€/mois",
                tenant: "Thomas Dubois",
              },
              {
                type: "Appartement",
                addr: "5 cours de l'Intendance, 33000 Bordeaux",
                details: "2 pièces | 45m² | Loyer : 780€/mois",
                tenant: "Marie Chen",
              },
            ].map((log) => (
              <CardShell key={log.addr}>
                <p className="font-semibold text-[#1a0533]">
                  {log.type} — {log.addr}
                </p>
                <p className="mt-1 text-xs text-[#6b7280]">{log.details}</p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-[#6b7280]">
                    Locataire : <span className="text-[#1a0533]">{log.tenant}</span>
                  </p>
                  <Badge tone="green">Loué</Badge>
                </div>
              </CardShell>
            ))}
          </div>
        );
      case "locataires":
        return (
          <div className="space-y-3">
            <SectionActionHeader title="Locataires" actionLabel="+ Nouveau locataire" onAction={openSignup} />
            {[
              { name: "Sophie Martin", place: "Appt 75011 Paris", rent: "850€/mois", badge: "Actif" as const, t: "green" as const },
              { name: "Thomas Dubois", place: "Studio 69001 Lyon", rent: "620€/mois", badge: "Actif", t: "green" as const },
              { name: "Marie Chen", place: "Appt 33000 Bordeaux", rent: "780€/mois", badge: "Actif", t: "green" as const },
              { name: "Lucas Bernard", place: "Appt 75015 Paris", rent: "920€/mois", badge: "Actif", t: "green" as const },
              { name: "Emma Petit", place: "Studio 31000 Toulouse", rent: "590€/mois", badge: "En attente", t: "yellow" as const },
            ].map((row) => (
              <CardShell key={row.name} className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-[#1a0533]">{row.name}</p>
                  <p className="text-xs text-[#9ca3af]">
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
            <SectionActionHeader title="Dossiers de candidature" actionLabel="+ Nouveau dossier" onAction={openSignup} />
            {[
              { name: "Antoine Moreau", place: "Appt 75011", score: "87/100", qual: "Excellent", qt: "green" as const, stat: "Reçu", st: "green" as const },
              { name: "Julie Lambert", place: "Studio Lyon", score: "72/100", qual: "Bon", qt: "orange" as const, stat: "En cours", st: "blue" as const },
              { name: "Pierre Durand", place: "Appt Bordeaux", score: "45/100", qual: "Insuffisant", qt: "red" as const, stat: "Reçu", st: "green" as const },
            ].map((d) => (
              <CardShell key={d.name}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[#1a0533]">{d.name}</p>
                    <p className="text-xs text-[#9ca3af]">
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
              <h3 className="text-lg font-bold text-[#1a0533]">Quittances de loyer</h3>
              <button type="button" className={demoActionBtnClass} onClick={openSignup}>
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
                  <p className="text-sm text-[#6b7280]">
                    {q.m} — {q.who}
                  </p>
                  <p className="text-xs text-[#9ca3af]">{q.amt}</p>
                </div>
                <Badge tone={q.tone}>{q.lab}</Badge>
              </CardShell>
            ))}
          </div>
        );
      case "baux":
        return (
          <div className="space-y-3">
            <SectionActionHeader title="Baux de location" actionLabel="+ Nouveau bail" onAction={openSignup} />
            {[
              { who: "Sophie Martin", place: "Appt 75011 Paris", dur: "3 ans", start: "01/09/2023", rent: "850€" },
              { who: "Thomas Dubois", place: "Studio Lyon", dur: "1 an", start: "15/03/2024", rent: "620€" },
              { who: "Marie Chen", place: "Appt Bordeaux", dur: "3 ans", start: "01/01/2024", rent: "780€" },
            ].map((b) => (
              <CardShell key={b.who}>
                <p className="font-semibold text-[#1a0533]">
                  Bail — {b.who} — {b.place}
                </p>
                <p className="mt-1 text-xs text-[#6b7280]">
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
            <SectionActionHeader title="États des lieux" actionLabel="+ Nouvel état des lieux" onAction={openSignup} />
            <CardShell>
              <p className="font-semibold text-[#1a0533]">EDL Entrée — Sophie Martin — 01/09/2023</p>
              <p className="mt-1 text-xs text-[#9ca3af]">Appt 75011 Paris</p>
              <div className="mt-2">
                <Badge tone="green">Complété</Badge>
              </div>
            </CardShell>
            <CardShell>
              <p className="font-semibold text-[#1a0533]">EDL Sortie — Thomas Dubois — 14/03/2024</p>
              <p className="mt-1 text-xs text-[#9ca3af]">Studio Lyon</p>
              <div className="mt-2">
                <Badge tone="gray">En cours</Badge>
              </div>
            </CardShell>
          </div>
        );
      case "irl":
        return (
          <div className="space-y-3">
            <SectionActionHeader title="Révision des loyers IRL" actionLabel="+ Nouvelle révision" onAction={openSignup} />
            <CardShell>
              <p className="font-semibold text-[#1a0533]">Sophie Martin</p>
              <p className="mt-1 text-sm text-[#6b7280]">
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
              <p className="font-semibold text-[#1a0533]">Marie Chen</p>
              <p className="mt-1 text-sm text-[#6b7280]">
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
              <h3 className="text-lg font-bold text-[#1a0533]">Dashboard Saisonnier</h3>
              <span className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-[#6b7280]">2026</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <CardShell>
                <p className="text-xs text-[#9ca3af]">Revenus encaissés</p>
                <p className="mt-1 text-xl font-bold text-emerald-400">4 200 €</p>
                <p className="mt-1 text-[11px] text-emerald-400/90">+12 % vs 2025</p>
              </CardShell>
              <CardShell>
                <p className="text-xs text-[#9ca3af]">Revenus à venir</p>
                <p className="mt-1 text-xl font-bold text-violet-300">1 850 €</p>
              </CardShell>
              <CardShell>
                <p className="text-xs text-[#9ca3af]">Total annuel</p>
                <p className="mt-1 text-xl font-bold text-[#1a0533]">6 050 €</p>
              </CardShell>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[#6b7280]">Total: 8</span>
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-emerald-400">Terminées: 5</span>
              <span className="rounded-full bg-sky-500/20 px-2.5 py-1 text-sky-300">En cours: 1</span>
              <span className="rounded-full bg-violet-500/20 px-2.5 py-1 text-violet-300">À venir: 2</span>
              <span className="rounded-full bg-red-500/20 px-2.5 py-1 text-red-300">Annulées: 0</span>
            </div>
            <CardShell>
              <p className="text-sm font-semibold text-[#1a0533]">Taux d&apos;occupation</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-violet-600" style={{ width: "68%" }} />
              </div>
              <p className="mt-2 text-xs text-[#6b7280]">68 % — 124 nuits occupées / 182 disponibles</p>
            </CardShell>
            <CardShell>
              <p className="text-sm font-semibold text-[#1a0533]">Répartition sources</p>
              <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full">
                <div className="h-full bg-[#ff5a5f]" style={{ width: "60%" }} />
                <div className="h-full bg-violet-600" style={{ width: "25%" }} />
                <div className="h-full bg-[#003580]" style={{ width: "15%" }} />
              </div>
              <p className="mt-2 text-[11px] text-[#6b7280]">Airbnb 60 % · Direct 25 % · Booking 15 %</p>
            </CardShell>
          </div>
        );
      case "saisonnier-logements":
        return (
          <div className="space-y-3">
            <SectionActionHeader title="Mes logements saisonniers" actionLabel="+ Ajouter un logement" onAction={openSignup} />
            <CardShell>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-[#1a0533]">Appartement — 12 rue des Lilas, 75011 Paris</p>
                  <p className="mt-1 text-xs text-[#6b7280]">3 pièces | 58m² | Tarif : 145€/nuit</p>
                  <p className="mt-2 text-[11px] text-[#9ca3af]">Sources : Airbnb · Direct</p>
                </div>
                <Badge tone="violet">Saisonnier</Badge>
              </div>
            </CardShell>
            <CardShell>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-[#1a0533]">Villa — 24 chemin des Oliviers, 06000 Nice</p>
                  <p className="mt-1 text-xs text-[#6b7280]">5 pièces | 120m² | Tarif : 280€/nuit</p>
                  <p className="mt-2 text-[11px] text-[#9ca3af]">Sources : Airbnb · Booking</p>
                </div>
                <Badge tone="violet">Saisonnier</Badge>
              </div>
            </CardShell>
          </div>
        );
      case "reservations":
        return (
          <div className="space-y-3">
            <SectionActionHeader title="Réservations" actionLabel="+ Nouvelle réservation" onAction={openSignup} />
            {[
              { who: "Thomas Martin", dates: "12-19 juil 2026", n: "7 nuits", price: "1 604€", src: "Airbnb", tone: "blue" as const, lab: "À venir" },
              { who: "Emma Rousseau", dates: "01-08 août 2026", n: "7 nuits", price: "1 715€", src: "Direct", tone: "blue" as const, lab: "À venir" },
              { who: "Jean-Pierre Blanc", dates: "15-22 juin 2026", n: "7 nuits", price: "1 450€", src: "Booking", tone: "green" as const, lab: "Terminée" },
              { who: "Isabelle Moreau", dates: "01-07 juin 2026", n: "6 nuits", price: "1 200€", src: "Airbnb", tone: "green" as const, lab: "Terminée" },
            ].map((r) => (
              <CardShell key={r.who + r.dates}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[#1a0533]">{r.who}</p>
                    <p className="text-xs text-[#9ca3af]">
                      {r.dates} · {r.n} · {r.price}
                    </p>
                    <p className="mt-1 text-[11px] text-[#9ca3af]">Source: {r.src}</p>
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
            <SectionActionHeader title="Voyageurs" actionLabel="+ Nouveau voyageur" onAction={openSignup} />
            {[
              { name: "Thomas Martin", email: "thomas.m@email.com", trips: "2 séjours" },
              { name: "Emma Rousseau", email: "emma.r@email.com", trips: "1 séjour" },
              { name: "Jean-Pierre Blanc", email: "jp.blanc@email.com", trips: "3 séjours" },
              { name: "Isabelle Moreau", email: "i.moreau@email.com", trips: "1 séjour" },
            ].map((v) => (
              <CardShell key={v.email}>
                <p className="font-semibold text-[#1a0533]">{v.name}</p>
                <p className="text-xs text-violet-300/90">{v.email}</p>
                <p className="mt-1 text-xs text-[#9ca3af]">{v.trips}</p>
              </CardShell>
            ))}
          </div>
        );
      case "contrats":
        return (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-[#1a0533]">Contrats de séjour</h3>
            <CardShell>
              <p className="font-semibold text-[#1a0533]">Thomas Martin · 12-19 juil 2026 · 1 604€</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge tone="green">Envoyé</Badge>
                <span className="inline-flex items-center gap-1 text-xs text-[#9ca3af]">
                  PDF <Check className="inline size-3 text-emerald-500" strokeWidth={2.5} aria-hidden />
                </span>
              </div>
            </CardShell>
            <CardShell>
              <p className="font-semibold text-[#1a0533]">Emma Rousseau · 01-08 août 2026 · 1 715€</p>
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
              <p className="font-semibold text-[#1a0533]">Jean-Pierre Blanc · 15-22 juin 2026 · 1 450€</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge tone="green">Envoyé</Badge>
                <span className="inline-flex items-center gap-1 text-xs text-[#9ca3af]">
                  PDF <Check className="inline size-3 text-emerald-500" strokeWidth={2.5} aria-hidden />
                </span>
              </div>
            </CardShell>
          </div>
        );
      case "edl":
        return (
          <div className="space-y-3">
            <SectionActionHeader title="États des lieux" actionLabel="+ Nouvel état des lieux" onAction={openSignup} />
            <CardShell>
              <p className="font-semibold text-[#1a0533]">Entrée — Thomas Martin — 12/07/2026</p>
              <div className="mt-2">
                <Badge tone="blue">Planifié</Badge>
              </div>
            </CardShell>
            <CardShell>
              <p className="font-semibold text-[#1a0533]">Sortie — Jean-Pierre Blanc — 22/06/2026</p>
              <div className="mt-2">
                <Badge tone="green">Complété</Badge>
              </div>
            </CardShell>
            <CardShell>
              <p className="font-semibold text-[#1a0533]">Entrée — Emma Rousseau — 01/08/2026</p>
              <div className="mt-2">
                <Badge tone="blue">Planifié</Badge>
              </div>
            </CardShell>
          </div>
        );
      case "taxe":
        return (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-[#1a0533]">Taxe de séjour</h3>
            <CardShell className="space-y-2">
              <p className="text-sm text-[#6b7280]">T2 2026 — 3 réservations</p>
              <p className="text-sm text-[#6b7280]">Total voyageurs : 6 pers. × nuits × 1,75€</p>
              <p className="text-lg font-semibold text-[#1a0533]">Total à déclarer : 73,50€</p>
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
      <div className="md:hidden rounded-2xl border border-gray-200 bg-white p-8 text-center backdrop-blur-sm">
        <p className="mb-4 text-sm text-[#6b7280]">La démo interactive est disponible sur ordinateur.</p>
        <Link
          href="/register"
          className="inline-flex rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500"
        >
          Essayer gratuitement →
        </Link>
      </div>

      <div className="landing-interactive-demo-enter mx-auto hidden w-full max-w-[1000px] md:block">
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
            backgroundColor: "#f8f7ff",
          }}
        >
          <aside
            className="flex w-[220px] shrink-0 flex-col py-0"
            style={{ backgroundColor: "#ffffff", borderRight: "1px solid rgba(124,58,237,0.1)" }}
          >
            <div className="px-4 pt-4">
              <img src={DEMO_LOGO_SRC} alt="Locavio" width={140} height={28} className="h-8 w-auto" />
            </div>
            <nav className="mt-4 min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
              {mode === "classique" ? (
                <>
                  <DemoNavLink active={classiqueSection === "dashboard"} onClick={() => setClassiqueSection("dashboard")} Icon={LayoutDashboard} label="Dashboard" />
                  <DemoNavLink active={classiqueSection === "logements"} onClick={() => setClassiqueSection("logements")} Icon={Building2} label="Logements" />
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
                  <DemoNavLink
                    active={saisonnierSection === "saisonnier-logements"}
                    onClick={() => setSaisonnierSection("saisonnier-logements")}
                    Icon={Building2}
                    label="Logements"
                  />
                  <DemoNavLink active={saisonnierSection === "reservations"} onClick={() => setSaisonnierSection("reservations")} Icon={Calendar} label="Réservations" />
                  <DemoNavLink active={saisonnierSection === "voyageurs"} onClick={() => setSaisonnierSection("voyageurs")} Icon={Users} label="Voyageurs" />
                  <DemoNavLink active={saisonnierSection === "contrats"} onClick={() => setSaisonnierSection("contrats")} Icon={ScrollText} label="Contrats" />
                  <DemoNavLink active={saisonnierSection === "edl"} onClick={() => setSaisonnierSection("edl")} Icon={ClipboardList} label="États des lieux" />
                  <DemoNavLink active={saisonnierSection === "taxe"} onClick={() => setSaisonnierSection("taxe")} Icon={Receipt} label="Taxe de séjour" />
                </>
              )}
            </nav>
            <div className="mt-auto border-t border-gray-200 px-3 py-3">
              <div className="flex items-center gap-2">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ background: PC.gradientPrimary }}
                >
                  SP
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-[#1a0533]">Sophie Proprietaire</p>
                  <p className="truncate text-[10px] text-[#9ca3af]">sophie.p@exemple.fr</p>
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
