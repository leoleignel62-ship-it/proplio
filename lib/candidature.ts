export const CANDIDATURE_TOKEN_VALIDITY_DAYS = 14;
export const CANDIDATURE_MAX_FILE_BYTES = 10 * 1024 * 1024;

export const CANDIDATURE_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export type CandidatureTypeContrat =
  | "CDI"
  | "CDD_long"
  | "CDD_court"
  | "independant"
  | "interimaire"
  | "etudiant"
  | "retraite"
  | "fonctionnaire"
  | "sans_emploi";

export type CandidatureTypeGarant =
  | "personnel_solvable"
  | "personnel_moins_solvable"
  | "bancaire"
  | "visale";

export type CandidatureSituation = "seul" | "couple" | "colocation" | "famille";

export function sanitizeFileName(name: string): string {
  return (name.trim() || "document").replace(/[^a-zA-Z0-9._\- ()]+/g, "_").slice(0, 140);
}

export function extensionForMime(mimeType: string): string {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "image/png") return "png";
  return "jpg";
}

export function isAllowedFileType(mimeType: string): boolean {
  return CANDIDATURE_ALLOWED_MIME_TYPES.includes(mimeType as (typeof CANDIDATURE_ALLOWED_MIME_TYPES)[number]);
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 Ko";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
}

export const TYPE_DOCUMENT_LABELS: Record<string, string> = {
  bulletin_salaire: "Bulletin de salaire",
  avis_imposition: "Avis d'imposition",
  contrat_travail: "Contrat de travail",
  piece_identite: "Pièce d'identité",
  justificatif_domicile: "Justificatif de domicile",
  document_garant: "Document garant",
  autre: "Autre",
};

export const NOTE_COLORS: Record<string, { bg: string; color: string }> = {
  A: { bg: "rgba(16, 185, 129, 0.16)", color: "#34d399" },
  B: { bg: "rgba(59, 130, 246, 0.16)", color: "#60a5fa" },
  C: { bg: "rgba(245, 158, 11, 0.16)", color: "#fbbf24" },
  D: { bg: "rgba(249, 115, 22, 0.16)", color: "#fb923c" },
  E: { bg: "rgba(239, 68, 68, 0.16)", color: "#f87171" },
};
