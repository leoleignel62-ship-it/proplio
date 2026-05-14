"use client";

import { usePathname } from "next/navigation";
import { AnimatedParticles } from "@/components/landing/animated-particles";

const MARKETING_PREFIXES = [
  "/fonctionnalites",
  "/pour-qui",
  "/tarifs",
  "/securite",
  "/blog",
  "/qui-sommes-nous",
] as const;

function isMarketingParticlesRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return MARKETING_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Particules sur les pages marketing hors /landing (la landing monte son propre canvas). */
export function PublicMarketingParticlesGate() {
  const pathname = usePathname();
  if (!isMarketingParticlesRoute(pathname)) return null;
  return <AnimatedParticles />;
}
