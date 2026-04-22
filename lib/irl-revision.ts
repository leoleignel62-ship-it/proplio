export type BailIrlEligibleInput = {
  id: string;
  logement_id?: string | null;
  date_debut: string | null;
  irl_reference: number | null;
  loyer_initial: number | null;
  revision_loyer: string | null;
  loyer: number;
  date_derniere_revision: string | null;
  statut: string;
};

export type CalculNouveauLoyerResult = {
  nouveauLoyer: number;
  variationEuro: number;
  variationPct: number;
};

function stripTime(s: string): string {
  return s.includes("T") ? s.slice(0, 10) : s.slice(0, 10);
}

function parseLocalDate(dateStr: string): Date | null {
  const d = stripTime(dateStr);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const [y, m, day] = d.split("-").map(Number);
  const dt = new Date(y, m - 1, day);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function addYears(d: Date, years: number): Date {
  const out = new Date(d.getTime());
  out.setFullYear(out.getFullYear() + years);
  return out;
}

function addMonths(d: Date, months: number): Date {
  const out = new Date(d.getTime());
  out.setMonth(out.getMonth() + months);
  return out;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** ISO local (évite le décalage UTC sur toISOString). */
export function formatDateIsoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Dernière date anniversaire du bail (même jour/mois que date_debut), au plus tard aujourd’hui,
 * avec au moins 1 an écoulé depuis le début.
 */
export function getDerniereDateAnniversaireBail(dateDebutStr: string, today = new Date()): Date | null {
  const start = parseLocalDate(dateDebutStr);
  if (!start) return null;
  const t0 = startOfDay(today);
  let n = 1;
  let last: Date | null = null;
  for (;;) {
    const ann = addYears(start, n);
    const ann0 = startOfDay(ann);
    if (ann0 > t0) break;
    last = ann0;
    n += 1;
  }
  return last;
}

/** Fenêtre : anniversaire atteint et aujourd’hui dans les 3 mois suivant cet anniversaire. */
export function estDansFenetreRevisionAnnuelle(dateDebutStr: string, today = new Date()): boolean {
  const last = getDerniereDateAnniversaireBail(dateDebutStr, today);
  if (!last) return false;
  const t0 = startOfDay(today);
  const fin = addMonths(last, 3);
  return last <= t0 && t0 <= fin;
}

function revisionLoyerAutorisee(revisionLoyer: string | null | undefined): boolean {
  const t = (revisionLoyer ?? "").trim().toLowerCase();
  if (!t) return false;
  if (t === "non" || t === "aucune") return false;
  return true;
}

function pasDeRevisionValidee12Mois(dateDerniereRevision: string | null | undefined, today = new Date()): boolean {
  if (dateDerniereRevision == null || String(dateDerniereRevision).trim() === "") return true;
  const d = parseLocalDate(String(dateDerniereRevision));
  if (!d) return true;
  const lim = addMonths(startOfDay(today), -12);
  return d < lim;
}

export function calculerNouveauLoyer(
  loyerActuel: number,
  irlReference: number,
  irlNouveau: number,
): CalculNouveauLoyerResult {
  if (!Number.isFinite(loyerActuel) || !Number.isFinite(irlReference) || !Number.isFinite(irlNouveau)) {
    return { nouveauLoyer: loyerActuel, variationEuro: 0, variationPct: 0 };
  }
  if (irlReference <= 0) {
    return { nouveauLoyer: loyerActuel, variationEuro: 0, variationPct: 0 };
  }
  const raw = loyerActuel * (irlNouveau / irlReference);
  const nouveauLoyer = Math.round(raw * 100) / 100;
  const variationEuro = Math.round((nouveauLoyer - loyerActuel) * 100) / 100;
  const variationPct =
    loyerActuel > 0 ? Math.round(((nouveauLoyer - loyerActuel) / loyerActuel) * 10000) / 100 : 0;
  return { nouveauLoyer, variationEuro, variationPct };
}

export type RevisionIrlStatutRow = {
  bail_id: string;
  statut: string;
  date_revision: string;
};

export type DetecterBauxEligiblesOptions = {
  /** Baux ayant déjà une ligne `proposee` dans revisions_irl */
  bailIdsAvecRevisionProposee: Set<string>;
  /** Lignes refusee : exclure le bail si refus pour la même date d’anniversaire que le cycle actuel */
  revisionsPourRefus?: RevisionIrlStatutRow[];
  /** Si true : ne pas exiger irl_reference > 0 (ex. baux à compléter depuis la page Révision IRL) */
  omitIrlReferenceCheck?: boolean;
};

/**
 * irlActuel : réservé pour évolutions (non utilisé dans les règles actuelles).
 */
export function detecterBauxEligibles(
  baux: BailIrlEligibleInput[],
  _irlActuel: number,
  options: DetecterBauxEligiblesOptions,
): BailIrlEligibleInput[] {
  const today = new Date();
  const out: BailIrlEligibleInput[] = [];
  for (const bail of baux) {
    if (String(bail.statut ?? "").toLowerCase() !== "actif") continue;
    if (!bail.date_debut) continue;
    if (!options.omitIrlReferenceCheck) {
      const irlRef = Number(bail.irl_reference ?? 0);
      if (!Number.isFinite(irlRef) || irlRef <= 0) continue;
    }
    const loyerInit = Number(bail.loyer_initial ?? 0);
    if (!Number.isFinite(loyerInit) || loyerInit <= 0) continue;
    const loyer = Number(bail.loyer ?? 0);
    if (!Number.isFinite(loyer) || loyer <= 0) continue;
    if (!revisionLoyerAutorisee(bail.revision_loyer)) continue;
    if (!estDansFenetreRevisionAnnuelle(bail.date_debut, today)) continue;
    if (!pasDeRevisionValidee12Mois(bail.date_derniere_revision, today)) continue;
    if (options.bailIdsAvecRevisionProposee.has(String(bail.id))) continue;

    const lastAnn = getDerniereDateAnniversaireBail(bail.date_debut, today);
    const annStr = lastAnn ? formatDateIsoLocal(lastAnn) : null;
    if (annStr && options.revisionsPourRefus?.length) {
      const refusedHere = options.revisionsPourRefus.some(
        (r) =>
          String(r.bail_id) === String(bail.id) &&
          String(r.statut ?? "").toLowerCase() === "refusee" &&
          String(r.date_revision).slice(0, 10) === annStr,
      );
      if (refusedHere) continue;
    }

    out.push(bail);
  }
  return out;
}
