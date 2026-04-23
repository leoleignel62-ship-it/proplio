"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type ModeLocation = "classique" | "saisonnier";

const STORAGE_KEY = "proplio-mode-location";

function readStoredMode(): ModeLocation {
  if (typeof window === "undefined") return "classique";
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw === "saisonnier" ? "saisonnier" : "classique";
}

export function useModeLocation() {
  const [mode, setModeState] = useState<ModeLocation>("classique");

  useEffect(() => {
    setModeState(readStoredMode());
  }, []);

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
