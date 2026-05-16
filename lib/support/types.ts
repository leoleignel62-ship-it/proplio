export type SupportPriorite = "normale" | "urgente";
export type SupportStatut = "ouvert" | "en_cours" | "resolu";
export type SupportAuteur = "proprietaire" | "admin";

export const SUPPORT_PRIORITES: SupportPriorite[] = ["normale", "urgente"];
export const SUPPORT_STATUTS: SupportStatut[] = ["ouvert", "en_cours", "resolu"];

export function normalizePriorite(value: string | null | undefined): SupportPriorite {
  return value === "urgente" ? "urgente" : "normale";
}

export function normalizeStatut(value: string | null | undefined): SupportStatut {
  if (value === "en_cours" || value === "resolu") return value;
  return "ouvert";
}
