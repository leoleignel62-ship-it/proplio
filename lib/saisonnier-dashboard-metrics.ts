import type { SupabaseClient } from "@supabase/supabase-js";

export type SaisonnierCheckRow = {
  id: string;
  date_arrivee: string;
  date_depart: string;
  nb_voyageurs: number;
  logements: { nom: string } | null;
  voyageurs: { prenom: string; nom: string } | null;
};

export type SaisonnierPendingRow = {
  id: string;
  date_arrivee: string;
  date_depart: string;
  tarif_total: number;
  logements: { nom: string } | null;
  voyageurs: { prenom: string; nom: string } | null;
};

export type SaisonnierDashData = {
  revenusMois: number;
  tauxOccupation: number;
  resaActives: number;
  taxesAReverser: number;
  checkins: SaisonnierCheckRow[];
  checkouts: Array<SaisonnierCheckRow & { menage_prevu: boolean }>;
  enAttente: SaisonnierPendingRow[];
};

export function emptySaisonnierDash(): SaisonnierDashData {
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

type DashboardReservationRow = {
  date_arrivee: string;
  date_depart: string;
  statut: string | null;
  tarif_total: number | null;
  source: string | null;
  logement_id: string;
  nb_nuits: number | null;
};

function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function getYearWindow(annee: number): { start: string; end: string } {
  return { start: `${annee}-01-01`, end: `${annee}-12-31` };
}

function normalizeSource(source: string | null): "airbnb" | "booking" | "direct" | "autre" {
  const s = String(source ?? "").toLowerCase();
  if (s === "airbnb") return "airbnb";
  if (s === "booking") return "booking";
  if (s === "direct") return "direct";
  return "autre";
}

function getReservationNights(row: DashboardReservationRow): number {
  if (Number.isFinite(row.nb_nuits) && Number(row.nb_nuits) > 0) {
    return Number(row.nb_nuits);
  }
  const diffMs = parseISODate(row.date_depart).getTime() - parseISODate(row.date_arrivee).getTime();
  return Math.max(0, Math.round(diffMs / 86400000));
}

/** Revenus : uniquement si un prix a été saisi (strictement positif). */
function montantPourRevenu(tarifTotal: number | null | undefined): number {
  const t = Number(tarifTotal ?? 0);
  return t > 0 ? t : 0;
}

function getReservationStatus(
  row: DashboardReservationRow,
  todayIso: string,
): "annulee" | "terminee" | "enCours" | "aVenir" {
  if (row.statut === "annulee") return "annulee";
  if (row.date_depart < todayIso) return "terminee";
  if (row.date_arrivee <= todayIso && row.date_depart >= todayIso) return "enCours";
  return "aVenir";
}

async function fetchDashboardReservations(
  supabase: SupabaseClient,
  proprietaireId: string,
  annee: number,
  logementId?: string,
): Promise<DashboardReservationRow[]> {
  const { start, end } = getYearWindow(annee);
  let query = supabase
    .from("reservations")
    .select("logement_id, date_arrivee, date_depart, statut, tarif_total, source, nb_nuits")
    .eq("proprietaire_id", proprietaireId)
    .lte("date_arrivee", end)
    .gte("date_depart", start);

  if (logementId) {
    query = query.eq("logement_id", logementId);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as DashboardReservationRow[];
}

async function getNbLogements(
  supabase: SupabaseClient,
  proprietaireId: string,
  logementId?: string,
): Promise<number> {
  let query = supabase.from("logements").select("id", { count: "exact", head: true }).eq("proprietaire_id", proprietaireId);
  if (logementId) query = query.eq("id", logementId);
  const { count, error } = await query;
  if (error) return 0;
  return count ?? 0;
}

export async function getAnneesDisponibles(
  supabase: SupabaseClient,
  proprietaireId: string,
): Promise<number[]> {
  const { data, error } = await supabase
    .from("reservations")
    .select("date_arrivee, date_depart")
    .eq("proprietaire_id", proprietaireId);
  if (error || !data) return [];

  const years = new Set<number>();
  for (const row of data) {
    const y1 = Number(String(row.date_arrivee ?? "").slice(0, 4));
    const y2 = Number(String(row.date_depart ?? "").slice(0, 4));
    if (Number.isFinite(y1)) years.add(y1);
    if (Number.isFinite(y2)) years.add(y2);
  }
  return Array.from(years).sort((a, b) => b - a);
}

export async function getRevenusAnnuels(
  supabase: SupabaseClient,
  annee: number,
  proprietaireId: string,
  logementId?: string,
): Promise<{
  revenusEncaisses: number;
  revenusAVenir: number;
  totalAnnuel: number;
  revpan: number;
  moyParReservation: number;
  variationVsAnneePrec: number;
  sansPrixRevenusCount: number;
}> {
  const [currentRows, prevRows] = await Promise.all([
    fetchDashboardReservations(supabase, proprietaireId, annee, logementId),
    fetchDashboardReservations(supabase, proprietaireId, annee - 1, logementId),
  ]);
  const todayIso = toDateOnly(new Date());

  const revenusEncaisses = currentRows
    .filter((r) => getReservationStatus(r, todayIso) === "terminee")
    .reduce((sum, r) => sum + montantPourRevenu(r.tarif_total), 0);

  const revenusAVenir = currentRows
    .filter((r) => getReservationStatus(r, todayIso) === "aVenir" && r.statut !== "annulee" && r.statut !== "en_attente")
    .reduce((sum, r) => sum + montantPourRevenu(r.tarif_total), 0);

  const totalAnnuel = revenusEncaisses + revenusAVenir;
  const validReservations = currentRows.filter((r) => getReservationStatus(r, todayIso) !== "annulee");
  const nuitsOccupees = validReservations.reduce((sum, r) => sum + getReservationNights(r), 0);
  const revpan = nuitsOccupees > 0 ? totalAnnuel / nuitsOccupees : 0;
  const resaAvecPrix = validReservations.filter((r) => montantPourRevenu(r.tarif_total) > 0).length;
  const moyParReservation = resaAvecPrix > 0 ? totalAnnuel / resaAvecPrix : 0;

  const prevTotal = prevRows
    .filter((r) => r.statut !== "annulee")
    .reduce((sum, r) => sum + montantPourRevenu(r.tarif_total), 0);
  const variationVsAnneePrec = prevTotal > 0 ? ((totalAnnuel - prevTotal) / prevTotal) * 100 : 0;

  const sansPrixRevenusCount = currentRows.filter(
    (r) =>
      r.statut !== "annulee" &&
      String(r.source ?? "").toLowerCase() !== "blocage" &&
      Number(r.tarif_total ?? 0) <= 0,
  ).length;

  return {
    revenusEncaisses,
    revenusAVenir,
    totalAnnuel,
    revpan,
    moyParReservation,
    variationVsAnneePrec,
    sansPrixRevenusCount,
  };
}

export async function getReservationsStats(
  supabase: SupabaseClient,
  annee: number,
  proprietaireId: string,
  logementId?: string,
): Promise<{ total: number; terminees: number; enCours: number; aVenir: number; annulees: number }> {
  const rows = await fetchDashboardReservations(supabase, proprietaireId, annee, logementId);
  const todayIso = toDateOnly(new Date());
  const stats = { total: rows.length, terminees: 0, enCours: 0, aVenir: 0, annulees: 0 };
  for (const row of rows) {
    const status = getReservationStatus(row, todayIso);
    if (status === "annulee") stats.annulees += 1;
    else if (status === "terminee") stats.terminees += 1;
    else if (status === "enCours") stats.enCours += 1;
    else stats.aVenir += 1;
  }
  return stats;
}

export async function getTauxOccupation(
  supabase: SupabaseClient,
  annee: number,
  proprietaireId: string,
  logementId?: string,
): Promise<{
  nuitsOccupees: number;
  nuitsDisponibles: number;
  tauxOccupation: number;
  moisLePlusRentable: { mois: string; revenus: number };
  moisLeMoinsRentable: { mois: string; revenus: number };
}> {
  const rows = await fetchDashboardReservations(supabase, proprietaireId, annee, logementId);
  const revenusParMois = Array.from({ length: 12 }, () => 0);
  let nuitsOccupees = 0;
  for (const row of rows) {
    if (row.statut === "annulee") continue;
    nuitsOccupees += getReservationNights(row);
    const month = parseISODate(row.date_arrivee).getMonth();
    revenusParMois[month] += montantPourRevenu(row.tarif_total);
  }
  const nbLogements = await getNbLogements(supabase, proprietaireId, logementId);
  const nuitsDisponibles = 365 * nbLogements;
  const tauxOccupation = nuitsDisponibles > 0 ? (nuitsOccupees / nuitsDisponibles) * 100 : 0;
  const moisFr = ["Jan", "Fev", "Mar", "Avr", "Mai", "Juin", "Juil", "Aout", "Sep", "Oct", "Nov", "Dec"];
  let idxMax = 0;
  let idxMin = 0;
  for (let i = 1; i < 12; i += 1) {
    if (revenusParMois[i] > revenusParMois[idxMax]) idxMax = i;
    if (revenusParMois[i] < revenusParMois[idxMin]) idxMin = i;
  }
  return {
    nuitsOccupees,
    nuitsDisponibles,
    tauxOccupation,
    moisLePlusRentable: { mois: moisFr[idxMax]!, revenus: revenusParMois[idxMax]! },
    moisLeMoinsRentable: { mois: moisFr[idxMin]!, revenus: revenusParMois[idxMin]! },
  };
}

export async function getRevenusParMois(
  supabase: SupabaseClient,
  annee: number,
  proprietaireId: string,
  logementId?: string,
): Promise<Array<{ mois: string; revenus: number; nuits: number; nbReservations: number }>> {
  const rows = await fetchDashboardReservations(supabase, proprietaireId, annee, logementId);
  const moisFr = ["Jan", "Fev", "Mar", "Avr", "Mai", "Juin", "Juil", "Aout", "Sep", "Oct", "Nov", "Dec"];
  const mapped = Array.from({ length: 12 }, (_, idx) => ({
    mois: moisFr[idx]!,
    revenus: 0,
    nuits: 0,
    nbReservations: 0,
  }));
  for (const row of rows) {
    if (row.statut === "annulee") continue;
    const idx = parseISODate(row.date_arrivee).getMonth();
    mapped[idx]!.revenus += montantPourRevenu(row.tarif_total);
    mapped[idx]!.nuits += getReservationNights(row);
    mapped[idx]!.nbReservations += 1;
  }
  return mapped;
}

export async function getSourcesRepartition(
  supabase: SupabaseClient,
  annee: number,
  proprietaireId: string,
  logementId?: string,
): Promise<{ airbnb: number; direct: number; booking: number; autre: number }> {
  const rows = await fetchDashboardReservations(supabase, proprietaireId, annee, logementId);
  const buckets = { airbnb: 0, direct: 0, booking: 0, autre: 0 };
  const valid = rows.filter((r) => r.statut !== "annulee");
  for (const row of valid) {
    const key = normalizeSource(row.source);
    buckets[key] += 1;
  }
  const total = valid.length;
  if (!total) return buckets;
  return {
    airbnb: (buckets.airbnb / total) * 100,
    direct: (buckets.direct / total) * 100,
    booking: (buckets.booking / total) * 100,
    autre: (buckets.autre / total) * 100,
  };
}

export async function getSaisonnierDashboardSnapshot(
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
      const overlap = r.date_arrivee <= monthEndStr && r.date_depart >= monthStartStr;
      if (overlap && (r.statut === "terminee" || r.statut === "en_cours")) {
        const portion =
          montantPourRevenu(r.tarif_total) *
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

export type PortfolioKind = "onlyClassique" | "onlySaisonnier" | "mixed";

export async function getPortfolioKind(supabase: SupabaseClient, ownerId: string): Promise<PortfolioKind> {
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

export async function getEncaisseClassiqueMoisCourant(supabase: SupabaseClient, ownerId: string): Promise<number> {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const { data, error } = await supabase
      .from("quittances")
      .select("total, envoyee, mois, annee")
      .eq("proprietaire_id", ownerId);
    if (error || !data) return 0;
    return data
      .filter((q) => q.envoyee && Number(q.mois) === currentMonth && Number(q.annee) === currentYear)
      .reduce((sum, q) => sum + Number(q.total ?? 0), 0);
  } catch {
    return 0;
  }
}
