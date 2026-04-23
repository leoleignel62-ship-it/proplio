"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  IconBank,
  IconBuilding,
  IconCalendar,
  IconChart,
  IconContract,
  IconDocument,
  IconEuroCircle,
  IconUsers,
} from "@/components/proplio-icons";
import { isProprietaireOnboardingIncomplete } from "@/lib/proprietaire-profile";
import { useModeLocation } from "@/lib/mode-location";
import { PC } from "@/lib/proplio-colors";
import type { SupabaseClient } from "@supabase/supabase-js";

type DashboardStats = {
  logements: number;
  locataires: number;
  quittancesEnvoyeesCeMois: number;
  bauxActifs: number;
};

type FinancialMetrics = {
  potentielTotal: number;
  encaisseMois: number;
  manque: number;
  totalLogements: number;
  logementsLouesCeMois: number;
  chambresLouees: number;
  logementsVacants: number;
  chambresDisponibles: number;
  tauxRemplissage: number;
};

type AnnualChartData = {
  labels: string[];
  encaisses: number[];
  manque: number[];
  potentiel: number[];
};

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Avr", "Mai", "Jun", "Jul", "Aou", "Sep", "Oct", "Nov", "Dec"];

function emptyDashboardStats(): DashboardStats {
  return { logements: 0, locataires: 0, quittancesEnvoyeesCeMois: 0, bauxActifs: 0 };
}

function emptyFinancialMetrics(): FinancialMetrics {
  return {
    potentielTotal: 0,
    encaisseMois: 0,
    manque: 0,
    totalLogements: 0,
    logementsLouesCeMois: 0,
    chambresLouees: 0,
    logementsVacants: 0,
    chambresDisponibles: 0,
    tauxRemplissage: 0,
  };
}

function emptyAnnualChart(): AnnualChartData {
  const zeros = Array.from({ length: 12 }, () => 0);
  return { labels: [...MONTH_LABELS], encaisses: zeros, manque: zeros, potentiel: zeros };
}

async function getCount(supabase: SupabaseClient, table: string, ownerId: string) {
  try {
    const { count, error } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("proprietaire_id", ownerId);

    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

async function getBauxActifsCount(supabase: SupabaseClient, ownerId: string) {
  try {
    const { count, error } = await supabase
      .from("baux")
      .select("id", { count: "exact", head: true })
      .eq("proprietaire_id", ownerId)
      .eq("statut", "actif");

    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

async function getQuittancesEnvoyeesCeMois(supabase: SupabaseClient, ownerId: string) {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from("quittances")
      .select("id", { count: "exact", head: true })
      .eq("proprietaire_id", ownerId)
      .eq("envoyee", true)
      .gte("created_at", startOfMonth.toISOString());

    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

async function getDashboardStats(supabase: SupabaseClient, ownerId: string): Promise<DashboardStats> {
  try {
    const [logements, locataires, quittancesEnvoyeesCeMois, bauxActifs] = await Promise.all([
      getCount(supabase, "logements", ownerId),
      getCount(supabase, "locataires", ownerId),
      getQuittancesEnvoyeesCeMois(supabase, ownerId),
      getBauxActifsCount(supabase, ownerId),
    ]);

    return {
      logements,
      locataires,
      quittancesEnvoyeesCeMois,
      bauxActifs,
    };
  } catch {
    return emptyDashboardStats();
  }
}

async function getFinancialAndAnnual(
  supabase: SupabaseClient,
  ownerId: string,
): Promise<{ financial: FinancialMetrics; annual: AnnualChartData }> {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const [logRes, locRes, quitRes] = await Promise.all([
      supabase
        .from("logements")
        .select("id, loyer, charges, est_colocation, nombre_chambres, chambres_details")
        .eq("proprietaire_id", ownerId),
      supabase
        .from("locataires")
        .select("logement_id, colocation_chambre_index")
        .eq("proprietaire_id", ownerId),
      supabase
        .from("quittances")
        .select("total, envoyee, mois, annee, logement_id")
        .eq("proprietaire_id", ownerId),
    ]);

    const logements = logRes.data ?? [];
    const locataires = locRes.data ?? [];
    const quittances = quitRes.data ?? [];

    const locatairesByLogement = new Map<string, Array<{ colocation_chambre_index: number | null }>>();
    for (const loc of locataires) {
      const logementId = loc.logement_id as string | null;
      if (!logementId) continue;
      const arr = locatairesByLogement.get(logementId) ?? [];
      arr.push({ colocation_chambre_index: (loc.colocation_chambre_index as number | null) ?? null });
      locatairesByLogement.set(logementId, arr);
    }

    const potentielTotal = logements.reduce((sum, row) => {
      const isColocation = Boolean(row.est_colocation);
      const charges = Number(row.charges ?? 0);
      if (!isColocation) return sum + Number(row.loyer ?? 0) + charges;
      const chambres = Array.isArray(row.chambres_details) ? row.chambres_details : [];
      const loyerChambres = chambres.reduce((acc, ch) => acc + Number((ch as { loyer?: number }).loyer ?? 0), 0);
      const loyerFallback = Number(row.loyer ?? 0);
      const totalColocation = loyerChambres > 0 ? loyerChambres : loyerFallback;
      return sum + totalColocation + charges;
    }, 0);

    const quittancesCeMois = quittances.filter(
      (q) => q.envoyee && Number(q.mois) === currentMonth && Number(q.annee) === currentYear,
    );
    const encaisseMois = quittancesCeMois.reduce((sum, q) => sum + Number(q.total ?? 0), 0);

    const logementsLouesCeMois = new Set(
      quittancesCeMois.map((q) => (q as { logement_id?: string | null }).logement_id).filter(Boolean),
    ).size;

    let chambresDisponibles = 0;
    for (const row of logements) {
      if (!row.est_colocation) continue;
      const declaredRooms = Math.max(1, Number(row.nombre_chambres ?? 0));
      const detailRooms = Array.isArray(row.chambres_details) ? row.chambres_details.length : 0;
      const totalRooms = Math.max(declaredRooms, detailRooms || 1);
      const occupied = (locatairesByLogement.get(String(row.id)) ?? []).filter(
        (l) => l.colocation_chambre_index != null && l.colocation_chambre_index >= 1,
      ).length;
      chambresDisponibles += Math.max(0, totalRooms - occupied);
    }
    const chambresLouees = (locataires as Array<{ colocation_chambre_index: number | null }>).filter(
      (l) => l.colocation_chambre_index != null && l.colocation_chambre_index >= 1,
    ).length;

    const totalLogements = logements.length;
    const logementsVacants = logements.filter((logement) => {
      const logementId = String(logement.id);
      const assigned = locatairesByLogement.get(logementId) ?? [];
      return assigned.length === 0;
    }).length;
    const manque = potentielTotal - encaisseMois;
    const tauxRemplissage = potentielTotal > 0 ? Math.min(100, (encaisseMois / potentielTotal) * 100) : 0;

    const encaissesByMonth = Array.from({ length: 12 }, () => 0);
    for (const q of quittances) {
      if (!q.envoyee || Number(q.annee) !== currentYear) continue;
      const idx = Number(q.mois) - 1;
      if (idx >= 0 && idx < 12) encaissesByMonth[idx] += Number(q.total ?? 0);
    }
    const potentielByMonth = Array.from({ length: 12 }, () => potentielTotal);
    const manqueByMonth = encaissesByMonth.map((v) => Math.max(0, potentielTotal - v));

    return {
      financial: {
        potentielTotal,
        encaisseMois,
        manque,
        totalLogements,
        logementsLouesCeMois,
        chambresLouees,
        logementsVacants,
        chambresDisponibles,
        tauxRemplissage,
      },
      annual: {
        labels: [...MONTH_LABELS],
        encaisses: encaissesByMonth,
        manque: manqueByMonth,
        potentiel: potentielByMonth,
      },
    };
  } catch {
    return {
      financial: emptyFinancialMetrics(),
      annual: emptyAnnualChart(),
    };
  }
}

type SaisonnierCheckRow = {
  id: string;
  date_arrivee: string;
  date_depart: string;
  nb_voyageurs: number;
  logements: { nom: string } | null;
  voyageurs: { prenom: string; nom: string } | null;
};

type SaisonnierPendingRow = {
  id: string;
  date_arrivee: string;
  date_depart: string;
  tarif_total: number;
  logements: { nom: string } | null;
  voyageurs: { prenom: string; nom: string } | null;
};

type SaisonnierDashData = {
  revenusMois: number;
  tauxOccupation: number;
  resaActives: number;
  taxesAReverser: number;
  checkins: SaisonnierCheckRow[];
  checkouts: Array<SaisonnierCheckRow & { menage_prevu: boolean }>;
  enAttente: SaisonnierPendingRow[];
};

function emptySaisonnierDash(): SaisonnierDashData {
  return {
    revenusMois: 0,
    tauxOccupation: 0,
    resaActives: 0,
    taxesAReverser: 0,
    checkins: [],
    checkouts: [],
    enAttente: [],
  };
}

function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

function countNightsInCalendarMonth(arriveStr: string, departStr: string, year: number, month: number): number {
  const arr = parseISODate(arriveStr);
  const dep = parseISODate(departStr);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  let n = 0;
  for (let d = new Date(arr.getTime()); d < dep; d.setDate(d.getDate() + 1)) {
    if (d >= monthStart && d <= monthEnd) n++;
  }
  return n;
}

async function getSaisonnierDashboardSnapshot(
  supabase: SupabaseClient,
  ownerId: string,
): Promise<SaisonnierDashData> {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const monthStartStr = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const monthEndStr = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const todayStr = now.toISOString().slice(0, 10);
  const in7 = new Date(now);
  in7.setDate(in7.getDate() + 7);
  const in7Str = in7.toISOString().slice(0, 10);

  try {
    const { data: logs, error: logErr } = await supabase
      .from("logements")
      .select("id, nom, type_location")
      .eq("proprietaire_id", ownerId);
    if (logErr) return emptySaisonnierDash();

    const seasonalIds = new Set(
      (logs ?? [])
        .filter((row) => row.type_location === "saisonnier" || row.type_location === "les_deux")
        .map((row) => row.id as string),
    );
    const daysInMonth = lastDay;
    const nSeasonal = seasonalIds.size;
    const totalSlots = nSeasonal === 0 ? 0 : daysInMonth * nSeasonal;

    const { data: reservations, error: resErr } = await supabase
      .from("reservations")
      .select(
        `
        id,
        logement_id,
        date_arrivee,
        date_depart,
        nb_voyageurs,
        tarif_total,
        statut,
        logements ( nom ),
        voyageurs ( prenom, nom )
      `,
      )
      .eq("proprietaire_id", ownerId);
    if (resErr) return emptySaisonnierDash();

    const listRaw = reservations ?? [];
    const list = listRaw.map((r: Record<string, unknown>) => {
      const lg = r.logements;
      const vg = r.voyageurs;
      const logements = Array.isArray(lg) ? (lg[0] as { nom?: string } | undefined) ?? null : (lg as { nom?: string } | null);
      const voyageurs = Array.isArray(vg) ? (vg[0] as { prenom?: string; nom?: string } | undefined) ?? null : (vg as { prenom?: string; nom?: string } | null);
      return {
        id: String(r.id),
        logement_id: String(r.logement_id),
        date_arrivee: String(r.date_arrivee),
        date_depart: String(r.date_depart),
        nb_voyageurs: Number(r.nb_voyageurs ?? 1),
        tarif_total: Number(r.tarif_total ?? 0),
        statut: String(r.statut ?? ""),
        logements: logements ? { nom: String(logements.nom ?? "") } : null,
        voyageurs: voyageurs ? { prenom: String(voyageurs.prenom ?? ""), nom: String(voyageurs.nom ?? "") } : null,
      };
    });

    let revenusMois = 0;
    let occupiedNightsMonth = 0;
    let resaActives = 0;

    for (const r of list) {
      if (r.statut === "annulee") continue;
      const overlap =
        r.date_arrivee <= monthEndStr &&
        r.date_depart >= monthStartStr;
      if (overlap && (r.statut === "terminee" || r.statut === "en_cours")) {
        const portion =
          Number(r.tarif_total ?? 0) *
          (() => {
            const totalN = Math.max(
              1,
              Math.round(
                (parseISODate(r.date_depart).getTime() - parseISODate(r.date_arrivee).getTime()) / 86400000,
              ),
            );
            const inM = countNightsInCalendarMonth(r.date_arrivee, r.date_depart, y, m);
            return totalN > 0 ? Math.min(1, inM / totalN) : 0;
          })();
        revenusMois += portion;
      }
      if (r.statut === "confirmee" || r.statut === "en_cours") resaActives++;
      if (seasonalIds.has(r.logement_id)) {
        occupiedNightsMonth += countNightsInCalendarMonth(r.date_arrivee, r.date_depart, y, m);
      }
    }

    const { data: taxRows, error: taxErr } = await supabase
      .from("taxes_sejour")
      .select("montant, reversee")
      .eq("proprietaire_id", ownerId);
    let taxesAReverser = 0;
    if (!taxErr && taxRows) {
      for (const t of taxRows) {
        if (!t.reversee) taxesAReverser += Number(t.montant ?? 0);
      }
    }

    const checkinCandidates = list
      .filter(
        (r) =>
          r.statut !== "annulee" &&
          r.date_arrivee >= todayStr &&
          r.date_arrivee <= in7Str,
      )
      .sort((a, b) => a.date_arrivee.localeCompare(b.date_arrivee))
      .slice(0, 5);

    const checkoutCandidates = list
      .filter(
        (r) =>
          r.statut !== "annulee" &&
          r.date_depart >= todayStr &&
          r.date_depart <= in7Str,
      )
      .sort((a, b) => a.date_depart.localeCompare(b.date_depart))
      .slice(0, 5);

    const { data: menageRows } = await supabase
      .from("menages")
      .select("reservation_id")
      .eq("proprietaire_id", ownerId);
    const menageRes = new Set((menageRows ?? []).map((row) => row.reservation_id as string));

    const checkins: SaisonnierCheckRow[] = checkinCandidates.map((r) => ({
      id: r.id,
      date_arrivee: r.date_arrivee,
      date_depart: r.date_depart,
      nb_voyageurs: r.nb_voyageurs,
      logements: r.logements,
      voyageurs: r.voyageurs,
    }));

    const checkouts: Array<SaisonnierCheckRow & { menage_prevu: boolean }> = checkoutCandidates.map((r) => ({
      id: r.id,
      date_arrivee: r.date_arrivee,
      date_depart: r.date_depart,
      nb_voyageurs: r.nb_voyageurs,
      logements: r.logements,
      voyageurs: r.voyageurs,
      menage_prevu: menageRes.has(r.id),
    }));

    const enAttente: SaisonnierPendingRow[] = list
      .filter((r) => r.statut === "en_attente")
      .sort((a, b) => a.date_arrivee.localeCompare(b.date_arrivee))
      .map((r) => ({
        id: r.id,
        date_arrivee: r.date_arrivee,
        date_depart: r.date_depart,
        tarif_total: Number(r.tarif_total ?? 0),
        logements: r.logements,
        voyageurs: r.voyageurs,
      }));

    const tauxOccupation = totalSlots > 0 ? Math.min(100, (occupiedNightsMonth / totalSlots) * 100) : 0;

    return {
      revenusMois,
      tauxOccupation,
      resaActives,
      taxesAReverser,
      checkins,
      checkouts,
      enAttente,
    };
  } catch {
    return emptySaisonnierDash();
  }
}

type PortfolioKind = "onlyClassique" | "onlySaisonnier" | "mixed";

async function getPortfolioKind(supabase: SupabaseClient, ownerId: string): Promise<PortfolioKind> {
  try {
    const { data, error } = await supabase.from("logements").select("type_location").eq("proprietaire_id", ownerId);
    if (error || !data?.length) return "onlyClassique";
    let hasPureC = false;
    let hasPureS = false;
    let hasLesDeux = false;
    for (const row of data) {
      const t = (row.type_location as string | null) ?? "classique";
      if (t === "les_deux") hasLesDeux = true;
      else if (t === "saisonnier") hasPureS = true;
      else hasPureC = true;
    }
    if (hasLesDeux || (hasPureC && hasPureS)) return "mixed";
    if (hasPureS && !hasPureC) return "onlySaisonnier";
    if (hasPureC && !hasPureS) return "onlyClassique";
    return "mixed";
  } catch {
    return "onlyClassique";
  }
}

function StatCard({
  titre,
  valeur,
  description,
  icon: Icon,
  iconTint,
}: {
  titre: string;
  valeur: ReactNode;
  description: string;
  icon: ComponentType<{ className?: string; style?: CSSProperties }>;
  iconTint: string;
}) {
  return (
    <article
      className="relative overflow-hidden p-5 transition-shadow duration-200 ease-out"
      style={{
        backgroundColor: PC.card,
        border: `1px solid ${PC.border}`,
        borderRadius: 12,
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.25)",
      }}
    >
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 pr-2">
          <p className="text-[13px] font-medium leading-snug" style={{ color: PC.muted }}>
            {titre}
          </p>
          <p className="mt-2 text-3xl font-extrabold tabular-nums tracking-[-0.03em] sm:text-[34px]" style={{ color: PC.text }}>
            {valeur}
          </p>
          <p className="mt-2 text-sm font-normal leading-[1.6]" style={{ color: PC.muted }}>
            {description}
          </p>
        </div>
        <span
          className="flex shrink-0 items-center justify-center"
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: `${iconTint}22`,
            color: iconTint,
            border: `1px solid rgba(255,255,255,0.08)`,
          }}
        >
          <Icon className="!h-5 !w-5 shrink-0" aria-hidden />
        </span>
      </div>
    </article>
  );
}

export function DashboardContent() {
  const { setMode, isSaisonnier } = useModeLocation();
  const [prenom, setPrenom] = useState("");
  const [showProfileOnboardingBanner, setShowProfileOnboardingBanner] = useState(false);
  const [stats, setStats] = useState<DashboardStats>(emptyDashboardStats);
  const [financial, setFinancial] = useState<FinancialMetrics>(emptyFinancialMetrics);
  const [annual, setAnnual] = useState<AnnualChartData>(emptyAnnualChart);
  const [saisonnier, setSaisonnier] = useState<SaisonnierDashData>(emptySaisonnierDash);
  const [portfolioKind, setPortfolioKind] = useState<PortfolioKind>("onlyClassique");
  /** Évite ResponsiveContainer avec taille -1 au prérendu SSR / build statique. */
  const [chartMounted, setChartMounted] = useState(false);

  const annualChartRows = useMemo(
    () =>
      annual.labels.map((label, i) => ({
        mois: label,
        encaisses: annual.encaisses[i] ?? 0,
        manque: annual.manque[i] ?? 0,
        potentiel: annual.potentiel[i] ?? 0,
      })),
    [annual],
  );

  useEffect(() => {
    const id = requestAnimationFrame(() => setChartMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user || cancelled) return;

        const { data: proprietaire, error: propError } = await supabase
          .from("proprietaires")
          .select("id, prenom, nom, adresse")
          .eq("user_id", user.id)
          .maybeSingle();

        if (propError || cancelled) return;

        const name = (proprietaire?.prenom as string | undefined)?.trim() ?? "";
        if (!cancelled) setPrenom(name);

        const incomplete = isProprietaireOnboardingIncomplete({
          nom: String(proprietaire?.nom ?? ""),
          prenom: String(proprietaire?.prenom ?? ""),
          adresse: String(proprietaire?.adresse ?? ""),
        });
        if (!cancelled) setShowProfileOnboardingBanner(incomplete);

        const ownerId = proprietaire?.id as string | undefined;
        if (!ownerId || cancelled) return;

        const [dashboardStats, derived, snap, kind] = await Promise.all([
          getDashboardStats(supabase, ownerId),
          getFinancialAndAnnual(supabase, ownerId),
          getSaisonnierDashboardSnapshot(supabase, ownerId),
          getPortfolioKind(supabase, ownerId),
        ]);

        if (cancelled) return;
        setStats(dashboardStats);
        setFinancial(derived.financial);
        setAnnual(derived.annual);
        setSaisonnier(snap);
        setPortfolioKind(kind);
      } catch {
        /* garder zéros */
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const confirmReservation = useCallback(async (id: string) => {
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.from("reservations").update({ statut: "confirmee" }).eq("id", id);
      if (error) return;
      setSaisonnier((prev) => ({
        ...prev,
        enAttente: prev.enAttente.filter((r) => r.id !== id),
        resaActives: prev.resaActives + 1,
      }));
    } catch {
      /* ignore */
    }
  }, []);

  const dateLong = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const showVueGlobale = portfolioKind === "mixed";
  const showSaisonnierDash = portfolioKind === "onlySaisonnier" || (portfolioKind === "mixed" && isSaisonnier);
  const showClassicDash = portfolioKind === "onlyClassique" || (portfolioKind === "mixed" && !isSaisonnier);

  return (
    <>
      {showProfileOnboardingBanner ? (
        <div
          className="flex flex-col gap-4 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between"
          style={{
            backgroundColor: PC.primaryBg10,
            border: `1px solid ${PC.primaryBorder40}`,
            boxShadow: PC.cardShadow,
          }}
        >
          <p className="text-sm leading-relaxed" style={{ color: PC.text }}>
            👤 Complétez votre profil propriétaire pour que vos quittances et baux soient générés correctement.
          </p>
          <Link
            href="/parametres"
            className="inline-flex shrink-0 items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition"
            style={{ backgroundColor: PC.primary, color: PC.white }}
          >
            Compléter mon profil
          </Link>
        </div>
      ) : null}

      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="proplio-page-title">{`Bonjour${prenom ? ` ${prenom}` : ""}`}</h1>
          <p className="proplio-page-subtitle capitalize">{dateLong}</p>
        </div>
      </header>

      {showVueGlobale ? (
        <section
          className="space-y-4 p-5 sm:p-6"
          style={{
            backgroundColor: PC.card,
            border: `1px solid ${PC.primaryBorder40}`,
            borderRadius: 12,
            boxShadow: PC.cardShadow,
          }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold" style={{ color: PC.text }}>
                Vue globale
              </h2>
              <p className="text-sm" style={{ color: PC.muted }}>
                Classique + saisonnier — {new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date())}
              </p>
            </div>
            <button
              type="button"
              className="rounded-lg px-4 py-2 text-sm font-semibold transition hover:opacity-90"
              style={{ backgroundColor: PC.primary, color: PC.white }}
              onClick={() => setMode(isSaisonnier ? "classique" : "saisonnier")}
            >
              {isSaisonnier ? "Voir le mode classique" : "Voir le mode saisonnier"}
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <article className="rounded-xl p-4" style={{ backgroundColor: PC.primaryBg10, border: `1px solid ${PC.border}` }}>
              <p className="text-xs font-medium" style={{ color: PC.muted }}>
                Revenus classique (mois)
              </p>
              <p className="mt-2 text-xl font-bold tabular-nums" style={{ color: PC.text }}>
                {financial.encaisseMois.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €
              </p>
            </article>
            <article className="rounded-xl p-4" style={{ backgroundColor: PC.successBg10, border: `1px solid ${PC.borderSuccess40}` }}>
              <p className="text-xs font-medium" style={{ color: PC.muted }}>
                Revenus saisonnier (mois)
              </p>
              <p className="mt-2 text-xl font-bold tabular-nums" style={{ color: PC.success }}>
                {saisonnier.revenusMois.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €
              </p>
            </article>
            <article className="rounded-xl p-4" style={{ backgroundColor: PC.card, border: `1px solid ${PC.border}` }}>
              <p className="text-xs font-medium" style={{ color: PC.muted }}>
                Logements
              </p>
              <p className="mt-2 text-xl font-bold tabular-nums" style={{ color: PC.text }}>
                {stats.logements}
              </p>
            </article>
          </div>
        </section>
      ) : null}

      {showSaisonnierDash ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              titre="Revenus du mois"
              valeur={`${saisonnier.revenusMois.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €`}
              description="Réservations terminées ou en cours (quote-part mois)."
              icon={IconEuroCircle}
              iconTint={PC.success}
            />
            <StatCard
              titre="Taux d'occupation"
              valeur={`${Math.round(saisonnier.tauxOccupation)} %`}
              description="Nuits occupées / nuits disponibles (logements saisonniers)."
              icon={IconChart}
              iconTint={PC.primary}
            />
            <StatCard
              titre="Réservations actives"
              valeur={saisonnier.resaActives}
              description="Confirmées ou en cours."
              icon={IconCalendar}
              iconTint={PC.secondary}
            />
            <StatCard
              titre="Taxe de séjour"
              valeur={`${saisonnier.taxesAReverser.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €`}
              description="Total non encore reversé."
              icon={IconBank}
              iconTint={PC.warning}
            />
          </div>

          <section
            className="grid gap-4 lg:grid-cols-2"
            style={{ color: PC.text }}
          >
            <div className="rounded-xl p-5" style={{ backgroundColor: PC.card, border: `1px solid ${PC.border}` }}>
              <h3 className="text-base font-semibold">Prochains check-in</h3>
              <p className="mt-1 text-xs" style={{ color: PC.muted }}>
                Dans les 7 jours
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {saisonnier.checkins.length === 0 ? (
                  <li style={{ color: PC.muted }}>Aucun check-in prévu.</li>
                ) : (
                  saisonnier.checkins.map((row) => (
                    <li
                      key={row.id}
                      className="flex flex-col rounded-lg px-3 py-2"
                      style={{ backgroundColor: PC.bg, border: `1px solid ${PC.border}` }}
                    >
                      <span className="font-medium">{row.logements?.nom ?? "Logement"}</span>
                      <span style={{ color: PC.muted }}>
                        {(row.voyageurs?.prenom ?? "?") + " " + (row.voyageurs?.nom ?? "")} ·{" "}
                        {new Date(row.date_arrivee).toLocaleDateString("fr-FR")} · {row.nb_voyageurs} pers.
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
            <div className="rounded-xl p-5" style={{ backgroundColor: PC.card, border: `1px solid ${PC.border}` }}>
              <h3 className="text-base font-semibold">Prochains check-out</h3>
              <p className="mt-1 text-xs" style={{ color: PC.muted }}>
                Dans les 7 jours
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {saisonnier.checkouts.length === 0 ? (
                  <li style={{ color: PC.muted }}>Aucun check-out prévu.</li>
                ) : (
                  saisonnier.checkouts.map((row) => (
                    <li
                      key={row.id}
                      className="flex flex-col rounded-lg px-3 py-2"
                      style={{ backgroundColor: PC.bg, border: `1px solid ${PC.border}` }}
                    >
                      <span className="font-medium">{row.logements?.nom ?? "Logement"}</span>
                      <span style={{ color: PC.muted }}>
                        {new Date(row.date_depart).toLocaleDateString("fr-FR")}
                        {row.menage_prevu ? (
                          <span className="ml-2 rounded px-1.5 py-0.5 text-xs" style={{ backgroundColor: PC.primaryBg15, color: PC.secondary }}>
                            Ménage prévu
                          </span>
                        ) : null}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </section>

          <section className="rounded-xl p-5" style={{ backgroundColor: PC.card, border: `1px solid ${PC.border}` }}>
            <h3 className="text-base font-semibold" style={{ color: PC.text }}>
              Réservations en attente
            </h3>
            <ul className="mt-3 divide-y" style={{ borderColor: PC.border }}>
              {saisonnier.enAttente.length === 0 ? (
                <li className="py-3 text-sm" style={{ color: PC.muted }}>
                  Aucune réservation en attente.
                </li>
              ) : (
                saisonnier.enAttente.map((row) => (
                  <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                    <div>
                      <span className="font-medium" style={{ color: PC.text }}>
                        {row.logements?.nom ?? "Logement"}
                      </span>
                      <span className="ml-2" style={{ color: PC.muted }}>
                        {(row.voyageurs?.prenom ?? "") + " " + (row.voyageurs?.nom ?? "")} ·{" "}
                        {new Date(row.date_arrivee).toLocaleDateString("fr-FR")} →{" "}
                        {new Date(row.date_depart).toLocaleDateString("fr-FR")} · {row.tarif_total.toFixed(0)} €
                      </span>
                    </div>
                    <button
                      type="button"
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold"
                      style={{ backgroundColor: PC.primary, color: PC.white }}
                      onClick={() => void confirmReservation(row.id)}
                    >
                      Confirmer
                    </button>
                  </li>
                ))
              )}
            </ul>
          </section>
        </>
      ) : null}

      {showClassicDash ? (
        <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          titre="Logements actifs"
          valeur={stats.logements}
          description="Biens enregistrés sur Proplio."
          icon={IconBuilding}
          iconTint={PC.primaryLight}
        />
        <StatCard
          titre="Locataires actifs"
          valeur={stats.locataires}
          description="Profils locataires suivis."
          icon={IconUsers}
          iconTint={PC.secondary}
        />
        <StatCard
          titre="Quittances ce mois"
          valeur={stats.quittancesEnvoyeesCeMois}
          description="Marquées comme envoyées."
          icon={IconDocument}
          iconTint={PC.success}
        />
        <StatCard
          titre="Baux actifs"
          valeur={stats.bauxActifs}
          description="Contrats au statut actif."
          icon={IconContract}
          iconTint={PC.primary}
        />
      </div>

      <section
        className="space-y-4 p-5 sm:p-6"
        style={{ backgroundColor: PC.card, border: `1px solid ${PC.border}`, borderRadius: 12, boxShadow: PC.cardShadow }}
      >
        <h2 className="text-lg font-semibold" style={{ color: PC.text }}>
          Suivi financier — {new Intl.DateTimeFormat("fr-FR", { month: "long" }).format(new Date())}
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          <article className="rounded-xl p-4" style={{ backgroundColor: PC.primaryBg10, border: `1px solid ${PC.primaryBorder40}` }}>
            <p className="text-xs font-medium" style={{ color: PC.secondary }}>Potentiel total du parc</p>
            <p className="mt-2 text-2xl font-semibold" style={{ color: PC.primary }}>{financial.potentielTotal.toLocaleString("fr-FR")} €</p>
            <p className="mt-1 text-xs" style={{ color: PC.muted }}>{financial.totalLogements} logement(s) total</p>
          </article>
          <article className="rounded-xl p-4" style={{ backgroundColor: PC.successBg10, border: `1px solid ${PC.borderSuccess40}` }}>
            <p className="text-xs font-medium" style={{ color: PC.success }}>Actuellement encaissé</p>
            <p className="mt-2 text-2xl font-semibold" style={{ color: PC.success }}>{financial.encaisseMois.toLocaleString("fr-FR")} €</p>
            <p className="mt-1 text-xs" style={{ color: PC.muted }}>
              {financial.logementsLouesCeMois} logements · {financial.chambresLouees} chambres louées
            </p>
          </article>
          <article className="rounded-xl p-4" style={{ backgroundColor: PC.dangerBg10, border: `1px solid ${PC.borderDanger40}` }}>
            <p className="text-xs font-medium" style={{ color: PC.danger }}>Manque à gagner</p>
            <p className="mt-2 text-2xl font-semibold" style={{ color: PC.danger }}>{financial.manque.toLocaleString("fr-FR")} €</p>
            <p className="mt-1 text-xs" style={{ color: PC.muted }}>
              {financial.logementsVacants} logement(s) vacant(s) · {financial.chambresDisponibles} chambre(s) disponible(s)
            </p>
          </article>
        </div>
        <div className="space-y-2 rounded-xl p-4" style={{ backgroundColor: PC.bg, border: `1px solid ${PC.border}` }}>
          <div className="h-3 w-full overflow-hidden rounded-full" style={{ backgroundColor: PC.border }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(0, Math.min(100, financial.tauxRemplissage))}%`,
                background: `linear-gradient(90deg, ${PC.primary} 0%, ${PC.success} 100%)`,
              }}
            />
          </div>
          <div className="flex items-center justify-between text-xs" style={{ color: PC.muted }}>
            <span>0€</span>
            <span>{Math.round(financial.tauxRemplissage)}%</span>
            <span>Objectif : {financial.potentielTotal.toLocaleString("fr-FR")}€</span>
          </div>
        </div>
      </section>

      <section
        className="space-y-4 p-5 sm:p-6"
        style={{ backgroundColor: PC.card, border: `1px solid ${PC.border}`, borderRadius: 12, boxShadow: PC.cardShadow }}
      >
        <h2 className="text-lg font-semibold" style={{ color: PC.text }}>
          Revenus {new Date().getFullYear()}
        </h2>
        <div>
          <div className="min-h-[300px] w-full min-w-0" style={{ position: "relative", height: 300 }}>
            {chartMounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={annualChartRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(144, 144, 168, 0.12)" vertical={false} />
                  <XAxis dataKey="mois" tick={{ fill: PC.muted, fontSize: 12 }} axisLine={{ stroke: "rgba(144, 144, 168, 0.12)" }} tickLine={false} />
                  <YAxis
                    tick={{ fill: PC.muted, fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${Number(v).toLocaleString("fr-FR")} €`}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(144, 144, 168, 0.06)" }}
                    formatter={(value, name) => {
                      const n = Number(value ?? 0);
                      const titre: Record<string, string> = {
                        encaisses: "Revenus encaissés",
                        manque: "Manque à gagner",
                        potentiel: "Potentiel total",
                      };
                      const key = String(name);
                      return [`${n.toLocaleString("fr-FR")} €`, titre[key] ?? key];
                    }}
                    labelStyle={{ color: PC.text }}
                    contentStyle={{
                      backgroundColor: PC.card,
                      border: `1px solid ${PC.border}`,
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="encaisses" name="encaisses" fill={PC.primary} radius={[6, 6, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="manque" name="manque" fill="rgba(239, 68, 68, 0.25)" radius={[6, 6, 0, 0]} maxBarSize={40} />
                  <Line
                    type="monotone"
                    dataKey="potentiel"
                    name="potentiel"
                    stroke={PC.warning}
                    strokeWidth={2}
                    strokeDasharray="6 6"
                    dot={false}
                    activeDot={{ r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : null}
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-xs">
            <span style={{ color: PC.muted }}>
              <span style={{ color: PC.primary, fontWeight: 700 }}>■</span> Revenus encaissés
            </span>
            <span style={{ color: PC.muted }}>
              <span style={{ color: "rgba(239, 68, 68, 0.7)", fontWeight: 700 }}>■</span> Manque à gagner
            </span>
            <span style={{ color: PC.muted }}>
              <span style={{ color: PC.warning, fontWeight: 700 }}>━</span> Potentiel total
            </span>
          </div>
        </div>
      </section>
        </>
      ) : null}
    </>
  );
}
