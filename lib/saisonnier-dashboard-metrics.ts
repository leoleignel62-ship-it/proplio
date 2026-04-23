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
