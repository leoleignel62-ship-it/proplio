/**
 * Tarifs saisonniers récurrents (MM-DD chaque année) + tarif par défaut.
 */

export type TarifCreneau = {
  id: string;
  nom: string;
  date_debut: string;
  date_fin: string;
  tarif: number;
};

export type LogementTarifInput = {
  tarifs_creneaux?: unknown;
  tarif_nuit_defaut?: number | null;
  /** Ancien champ — utilisé si défaut absent */
  tarif_nuit_moyenne?: number | null;
};

function normalizeMmDd(s: string): string {
  const t = String(s).trim();
  const m = t.match(/^(\d{1,2})-(\d{1,2})$/);
  if (!m) return "01-01";
  const mm = String(Math.min(12, Math.max(1, parseInt(m[1]!, 10)))).padStart(2, "0");
  const dd = String(Math.min(31, Math.max(1, parseInt(m[2]!, 10)))).padStart(2, "0");
  return `${mm}-${dd}`;
}

export function dateIsoToMmDd(isoDate: string): string {
  const part = isoDate.slice(0, 10);
  const [mo, d] = part.split("-").slice(1);
  if (!mo || !d) return "01-01";
  return `${mo}-${d}`;
}

/** Inclusif sur debut et fin ; si debut > fin (ex. 12-15 → 01-05), fenêtre à cheval sur l’année. */
export function isMdInCreneau(md: string, debut: string, fin: string): boolean {
  const a = normalizeMmDd(debut);
  const b = normalizeMmDd(fin);
  if (a <= b) return md >= a && md <= b;
  return md >= a || md <= b;
}

export function parseTarifsCreneauxJson(raw: unknown): TarifCreneau[] {
  if (!Array.isArray(raw)) return [];
  const out: TarifCreneau[] = [];
  for (const x of raw) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const id = String(o.id ?? "").trim();
    const nom = String(o.nom ?? "").trim();
    const date_debut = normalizeMmDd(String(o.date_debut ?? ""));
    const date_fin = normalizeMmDd(String(o.date_fin ?? ""));
    const tarif = Number(o.tarif);
    if (!id || !Number.isFinite(tarif) || tarif < 0) continue;
    out.push({ id, nom: nom || "Période", date_debut, date_fin, tarif });
  }
  return out;
}

export function getTarifNuit(logement: LogementTarifInput, isoDate: string): number {
  const md = dateIsoToMmDd(isoDate);
  const creneaux = parseTarifsCreneauxJson(logement.tarifs_creneaux);
  for (const c of creneaux) {
    if (isMdInCreneau(md, c.date_debut, c.date_fin)) return c.tarif;
  }
  const def = Number(logement.tarif_nuit_defaut);
  if (Number.isFinite(def) && def >= 0) return def;
  return Number(logement.tarif_nuit_moyenne ?? 0);
}

/** Chaque nuit comprise entre date_arrivee (inclus) et date_depart (exclus). */
export function calculerMontantReservation(
  logement: LogementTarifInput,
  date_arrivee: string,
  date_depart: string,
): number {
  const start = new Date(`${date_arrivee.slice(0, 10)}T12:00:00`);
  const end = new Date(`${date_depart.slice(0, 10)}T12:00:00`);
  if (!(start < end)) return 0;
  let sum = 0;
  for (let d = new Date(start.getTime()); d < end; d.setDate(d.getDate() + 1)) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    sum += getTarifNuit(logement, `${y}-${m}-${day}`);
  }
  return Math.round(sum * 100) / 100;
}
