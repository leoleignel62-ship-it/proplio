"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { LogoFull } from "@/components/locavio-icons";
import { PC } from "@/lib/locavio-colors";

const navLinkClass = "group relative text-sm transition duration-200 ease-out hover:text-white";
const navLinkStyle: CSSProperties = {
  color: "#c4b5fd",
  textDecoration: "none",
  letterSpacing: "0.02em",
  fontWeight: 500,
  fontSize: "0.875rem",
};

type LandingNavbarProps = {
  isScrolled: boolean;
};

export function LandingNavbar({ isScrolled }: LandingNavbarProps) {
  const centerLinks: { href: string; label: string }[] = [
    { href: "/fonctionnalites", label: "Fonctionnalités" },
    { href: "/pour-qui", label: "Pour qui" },
    { href: "/tarifs", label: "Tarifs" },
    { href: "/securite", label: "Sécurité" },
    { href: "/blog", label: "Blog" },
    { href: "/qui-sommes-nous", label: "Qui sommes-nous" },
  ];

  return (
    <header
      className="sticky top-0 z-[60] border-b"
      style={{
        borderColor: PC.border,
        backgroundColor: isScrolled ? "rgba(6,6,15,0.92)" : "rgba(6,6,15,0.8)",
        WebkitBackdropFilter: "blur(20px)",
        backdropFilter: "blur(20px)",
        transition: "background-color 200ms ease-out",
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/landing" className="flex shrink-0 items-center gap-2.5 font-bold tracking-tight" style={{ color: PC.text }}>
          <LogoFull className="h-9 w-auto" />
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-6 md:flex" aria-label="Navigation principale">
          {centerLinks.map((item) => (
            <Link key={item.href} href={item.href} className={navLinkClass} style={navLinkStyle}>
              {item.label}
              <span
                aria-hidden
                className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 transition-transform duration-200 ease-out group-hover:scale-x-100"
                style={{ backgroundColor: "#c4b5fd" }}
              />
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="inline-flex min-h-[40px] items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold transition duration-200 ease-out sm:px-4"
            style={{
              border: `1px solid rgba(124, 58, 237, 0.45)`,
              color: PC.secondary,
              backgroundColor: "transparent",
              boxShadow: "0 0 0 1px rgba(124,58,237,0.2)",
            }}
          >
            Se connecter
          </Link>
          <Link
            href="/register"
            className="hidden min-h-[40px] items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition duration-200 ease-out sm:inline-flex"
            style={{
              background: PC.gradientPrimary,
              color: PC.white,
              boxShadow: `${PC.activeRing}, ${PC.glowShadow}`,
            }}
          >
            Commencer gratuitement →
          </Link>
        </div>
      </div>
    </header>
  );
}
