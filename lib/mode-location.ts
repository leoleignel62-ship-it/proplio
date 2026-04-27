"use client";

import { useCallback, useMemo, useState } from "react";

export type ModeLocation = "classique" | "saisonnier";

const STORAGE_KEY = "locavio-mode-location";

/**
 * Chaque session / rechargement démarre en classique.
 * localStorage n’est mis à jour que lorsque l’utilisateur change le mode (toggle).
 */
export function useModeLocation() {
  const [mode, setModeState] = useState<ModeLocation>("classique");

  const setMode = useCallback((next: ModeLocation) => {
    setModeState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  }, []);

  const isClassique = mode === "classique";
  const isSaisonnier = mode === "saisonnier";

  return useMemo(
    () => ({ mode, setMode, isClassique, isSaisonnier }),
    [mode, setMode, isClassique, isSaisonnier],
  );
}
