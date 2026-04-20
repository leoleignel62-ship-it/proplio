import type { CSSProperties } from "react";
import { PC } from "@/lib/proplio-colors";

/** Champ texte / textarea (inline, sans utilitaires Tailwind couleur) */
export const fieldInputStyle: CSSProperties = {
  borderRadius: 12,
  border: `1px solid ${PC.border}`,
  backgroundColor: PC.card,
  padding: "0.625rem 0.75rem",
  fontSize: "0.875rem",
  color: PC.text,
  outline: "none",
};

/** Select */
export const fieldSelectStyle: CSSProperties = {
  ...fieldInputStyle,
  cursor: "pointer",
};

/** Carte de champ EDL */
export const edlFieldCardStyle: CSSProperties = {
  borderRadius: 12,
  border: `1px solid ${PC.border}`,
  backgroundColor: "rgba(15, 15, 19, 0.4)",
  padding: 16,
};
