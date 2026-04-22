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

/** Première règle non satisfaite, ou inclusion si tout passe (debug / logs). */
function raisonEligibiliteIrl(
  bail: BailIrlEligibleInput,
  options: DetecterBauxEligiblesOptions,
  today: Date,
): { inclus: boolean; raison: string } {
  if (!bail.date_debut || !String(bail.date_debut).trim()) {
    return { inclus: false, raison: "date_debut absente ou vide" };
  }
  if (!options.omitIrlReferenceCheck) {
    const irlRef = Number(bail.irl_reference ?? 0);
    if (!Number.isFinite(irlRef) || irlRef <= 0) {
      return {
        inclus: false,
        raison: `irl_reference manquant ou ≤ 0 (valeur : ${JSON.stringify(bail.irl_reference)})`,
      };
    }
  }
  const loyerInit = Number(bail.loyer_initial ?? 0);
  if (!Number.isFinite(loyerInit) || loyerInit <= 0) {
    return {
      inclus: false,
      raison: `loyer_initial manquant ou ≤ 0 (valeur : ${JSON.stringify(bail.loyer_initial)})`,
    };
  }
  const loyer = Number(bail.loyer ?? 0);
  if (!Number.isFinite(loyer) || loyer <= 0) {
    return { inclus: false, raison: `loyer manquant ou ≤ 0 (valeur : ${JSON.stringify(bail.loyer)})` };
  }
  if (!revisionLoyerAutorisee(bail.revision_loyer)) {
    const raw = (bail.revision_loyer ?? "").trim();
    if (!raw) return { inclus: false, raison: "revision_loyer vide" };
    return { inclus: false, raison: "revision_loyer exclut la révision (« non », « aucune » ou valeur incompatible)" };
  }
  if (!estDansFenetreRevisionAnnuelle(bail.date_debut, today)) {
    const lastAnn = getDerniereDateAnniversaireBail(bail.date_debut, today);
    if (!lastAnn) {
      return {
        inclus: false,
        raison: "fenêtre anniversaire : aucun anniversaire d’au moins 1 an encore atteint (bail trop récent ou date invalide)",
      };
    }
    const fin = addMonths(lastAnn, 3);
    const t0 = startOfDay(today);
    if (t0 > fin) {
      return {
        inclus: false,
        raison: `fenêtre anniversaire dépassée (anniversaire ${formatDateIsoLocal(lastAnn)}, fin fenêtre ${formatDateIsoLocal(fin)}, aujourd’hui ${formatDateIsoLocal(t0)})`,
      };
    }
    return {
      inclus: false,
      raison: `hors fenêtre anniversaire + 3 mois (anniversaire ${formatDateIsoLocal(lastAnn)}, aujourd’hui ${formatDateIsoLocal(t0)})`,
    };
  }
  if (!pasDeRevisionValidee12Mois(bail.date_derniere_revision, today)) {
    const ddr = String(bail.date_derniere_revision ?? "").slice(0, 10);
    return {
      inclus: false,
      raison: `date_derniere_revision trop récente (révision dans les 12 derniers mois) : ${ddr || "présente"}`,
    };
  }
  if (options.bailIdsAvecRevisionProposee.has(String(bail.id))) {
    return { inclus: false, raison: "révision IRL avec statut « proposee » déjà enregistrée pour ce bail" };
  }

  const lastAnn = getDerniereDateAnniversaireBail(bail.date_debut, today);
  const annStr = lastAnn ? formatDateIsoLocal(lastAnn) : null;
  if (
    annStr &&
    options.revisionsPourRefus?.length &&
    options.revisionsPourRefus.some(
      (r) =>
        String(r.bail_id) === String(bail.id) &&
        String(r.statut ?? "").toLowerCase() === "refusee" &&
        String(r.date_revision).slice(0, 10) === annStr,
    )
  ) {
    return {
      inclus: false,
      raison: `révision « refusee » déjà enregistrée pour ce cycle (date_revision = ${annStr})`,
    };
  }

  return {
    inclus: true,
    raison: "toutes les conditions d’éligibilité sont satisfaites (fenêtre anniversaire, IRL, loyer, pas de blocage révision)",
  };
}

/**
 * irlActuel : réservé pour évolutions (non utilisé dans les règles actuelles).
 */
export function detecterBauxEligibles(
  baux: BailIrlEligibleInput[],
  _irlActuel: number,
  options: DetecterBauxEligiblesOptions,
): BailIrlEligibleInput[] {
  if (!Array.isArray(baux)) {
    console.warn("[detecterBauxEligibles] paramètre `baux` invalide (pas un tableau) :", baux);
    return [];
  }
  const n = baux.length;
  if (n === 0) {
    console.log("[detecterBauxEligibles] entrée : tableau vide (0 bail) — rien à évaluer");
    return [];
  }

  const today = new Date();
  console.log(
    `[detecterBauxEligibles] entrée : ${n} bail(s), omitIrlReferenceCheck=${Boolean(options.omitIrlReferenceCheck)}, proposee en attente sur ${options.bailIdsAvecRevisionProposee.size} id(s)`,
  );

  const out: BailIrlEligibleInput[] = [];
  for (const bail of baux) {
    const { inclus, raison } = raisonEligibiliteIrl(bail, options, today);
    const verdict = inclus ? "INCLUS" : "EXCLU";
    console.log(
      `[detecterBauxEligibles] ${verdict} id=${String(bail.id)} statut=${String(bail.statut ?? "")} date_debut=${String(bail.date_debut ?? "")} → ${raison}`,
    );
    if (inclus) out.push(bail);
  }

  console.log(`[detecterBauxEligibles] sortie : ${out.length} bail(s) éligible(s) sur ${n}`);
  return out;
}
