/** Niveau d'état d'un élément (formulaire, PDF, comparaison) — valeurs stockées en snake_case. */
export type EtatNiveau =
  | "neuf"
  | "bon_etat"
  | "etat_usage"
  | "mauvais_etat"
  | "hors_service"
  | "absent";

export interface ElementEdl {
  state: EtatNiveau;
  comment: string;
  photoPath: string | null;
  /** Champs additionnels : sol.sousType, digicode.code, lit.taille, etc. */
  extra: Record<string, string | number | boolean>;
}

export interface RoomEdl {
  id: string;
  label: string;
  /** Pièces optionnelles : désactivées jusqu'à activation */
  enabled?: boolean;
  elements: Record<string, ElementEdl>;
}

export interface CompteursEdl {
  electricite: { index: string; photoPath: string | null };
  eauFroide: { index: string; photoPath: string | null };
  eauChaude: { index: string; photoPath: string | null };
  gaz: { index: string; photoPath: string | null };
}

export interface PiecesEdlData {
  version: 1;
  rooms: RoomEdl[];
  compteurs: CompteursEdl;
  clesRemises: number;
  badgesRemis: number;
  observationsGenerales: string;
}

/** Du meilleur au plus défavorable (pour comparaison : index plus grand = plus « pire »). */
export const ETAT_ORDER: EtatNiveau[] = [
  "neuf",
  "bon_etat",
  "etat_usage",
  "mauvais_etat",
  "hors_service",
  "absent",
];

export const ETAT_LABELS: Record<EtatNiveau, { label: string; color: string }> = {
  neuf: { label: "Neuf", color: "#3B82F6" },
  bon_etat: { label: "Bon état", color: "#10B981" },
  etat_usage: { label: "État d'usage", color: "#F59E0B" },
  mauvais_etat: { label: "Mauvais état", color: "#F97316" },
  hors_service: { label: "Hors service", color: "#EF4444" },
  absent: { label: "Absent", color: "#6B7280" },
};

export const ETAT_OPTIONS: EtatNiveau[] = [...ETAT_ORDER];

const LEGACY_ETAT_MAP: Record<string, EtatNiveau> = {
  bon: "bon_etat",
  usage: "etat_usage",
  reparer: "mauvais_etat",
  degrade: "hors_service",
  absent: "absent",
};

/** Normalise une valeur lue (JSON ancien ou nouveau schéma). */
export function normalizeEtatNiveau(raw: unknown): EtatNiveau {
  if (typeof raw !== "string" || !raw.trim()) return "bon_etat";
  const k = raw.trim().toLowerCase();
  if ((ETAT_ORDER as readonly string[]).includes(k)) return k as EtatNiveau;
  const legacy = LEGACY_ETAT_MAP[k];
  if (legacy) return legacy;
  return "bon_etat";
}

export function etatRank(e: EtatNiveau | string): number {
  return ETAT_ORDER.indexOf(normalizeEtatNiveau(e));
}

/** Libellé français pour affichage UI / PDF (sans emoji). */
export function formatEtatLabel(e: EtatNiveau | string): string {
  const n = normalizeEtatNiveau(e);
  return ETAT_LABELS[n].label;
}

export function emptyElement(): ElementEdl {
  return { state: "bon_etat", comment: "", photoPath: null, extra: {} };
}
