import type { CSSProperties } from "react";
import { PC } from "@/lib/locavio-colors";

/** Champ texte / textarea (inline, sans utilitaires Tailwind couleur) */
export const fieldInputStyle: CSSProperties = {
  borderRadius: 12,
  border: `1px solid rgba(255, 255, 255, 0.1)`,
  backgroundColor: PC.inputBg,
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
  backgroundColor: "rgba(13, 13, 18, 0.65)",
  padding: 16,
};

/** Carte panneau (listes, modales) */
export const panelCard: CSSProperties = {
  backgroundColor: PC.card,
  border: `1px solid ${PC.border}`,
  borderRadius: 12,
  boxShadow: PC.cardShadow,
};

/** Input compact (rounded-lg / 8px) */
export const fieldInputLg: CSSProperties = {
  ...fieldInputStyle,
  borderRadius: 8,
};

export const fieldSelectLg: CSSProperties = {
  ...fieldSelectStyle,
  borderRadius: 8,
};

/** Champ compact (rounded-md, formulaires grille) */
export const fieldInputMd: CSSProperties = {
  ...fieldInputStyle,
  borderRadius: 6,
  padding: "0.375rem 0.5rem",
};

export const fieldSelectMd: CSSProperties = {
  ...fieldInputMd,
  cursor: "pointer",
};
