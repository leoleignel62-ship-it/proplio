export const DOCUMENT_LOGEMENT_BUCKET = "documents-logements";

export const DOCUMENT_CATEGORIES = [
  "diagnostics",
  "assurances",
  "contrats",
  "travaux",
  "photos",
  "autres",
] as const;

export type DocumentLogementCategory = (typeof DOCUMENT_CATEGORIES)[number];

export function isDocumentLogementCategory(v: string): v is DocumentLogementCategory {
  return (DOCUMENT_CATEGORIES as readonly string[]).includes(v);
}

export const MAX_DOCUMENT_UPLOAD_BYTES = 10 * 1024 * 1024;
