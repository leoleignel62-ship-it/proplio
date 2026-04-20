/**
 * Colonne SQL attendue : `type` = 'entree' | 'sortie' (minuscules, sans accents).
 * La colonne historique `type_etat` est conservée en parallèle et synchronisée à l'écriture.
 */
export function normalizeEdlTypeEtatInput(raw: string): "entree" | "sortie" {
  const t = raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  return t === "sortie" ? "sortie" : "entree";
}

export function getEdlTypeEtatFromRow(row: Record<string, unknown> | null | undefined): "entree" | "sortie" {
  const a = row?.type_etat;
  const b = row?.type;
  const raw =
    typeof a === "string" && a.trim() !== ""
      ? a
      : typeof b === "string" && b.trim() !== ""
        ? b
        : "entree";
  return normalizeEdlTypeEtatInput(raw);
}
