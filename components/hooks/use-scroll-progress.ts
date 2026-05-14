"use client";

import { useEffect, useState } from "react";

function computeProgress(): number {
  if (typeof document === "undefined" || typeof window === "undefined") return 0;
  const doc = document.documentElement;
  const scrollable = doc.scrollHeight - window.innerHeight;
  if (scrollable <= 0) return 0;
  return Math.min(1, Math.max(0, window.scrollY / scrollable));
}

/**
 * Progression du scroll entre 0 et 1 (scrollY / (documentHeight - windowHeight)).
 * Mise à jour sur l’événement scroll avec throttle ~16 ms.
 */
export function useScrollProgress(): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setProgress(0);
      return;
    }

    let lastEmit = 0;
    const onScroll = () => {
      const now = performance.now();
      if (now - lastEmit < 16) return;
      lastEmit = now;
      setProgress(computeProgress());
    };

    setProgress(computeProgress());
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return progress;
}
