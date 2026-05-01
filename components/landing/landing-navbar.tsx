"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoFull } from "@/components/locavio-icons";
import { PC } from "@/lib/locavio-colors";

type LandingNavbarProps = {
  isScrolled: boolean;
};

export function LandingNavbar({ isScrolled }: LandingNavbarProps) {
  const pathname = usePathname();
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
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6 lg:px-8">
        <Link href="/landing" className="flex shrink-0 items-center gap-2.5 font-bold tracking-tight" style={{ color: PC.text }}>
          <LogoFull className="h-9 w-auto" />
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-1 md:flex" aria-label="Navigation principale">
          {centerLinks.map((item) => {
            const active = pathname === item.href;
            const inactiveStyle: CSSProperties = {
              color: "#c4b5fd",
              textDecoration: "none",
              letterSpacing: "0.02em",
              fontWeight: 500,
              fontSize: "0.875rem",
            };
            const activeStyle: CSSProperties = {
              color: "#ffffff",
              textDecoration: "none",
              letterSpacing: "0.02em",
              fontWeight: 600,
              fontSize: "0.875rem",
              borderBottom: "2px solid #7c3aed",
            };
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative rounded-lg px-3 py-1.5 text-sm transition duration-200 ease-out ${
                  active ? "" : "group hover:bg-white/5 hover:text-white"
                }`}
                style={active ? activeStyle : inactiveStyle}
              >
                {item.label}
                {!active ? (
                  <span
                    aria-hidden
                    className="absolute bottom-0 left-3 right-3 h-px origin-left scale-x-0 transition-transform duration-200 ease-out group-hover:scale-x-100"
                    style={{ backgroundColor: "#c4b5fd" }}
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <span className="mx-2 hidden h-5 w-px shrink-0 bg-white/20 md:block" aria-hidden />

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-[#c4b5fd] transition-all duration-200 hover:border-white/40 hover:bg-white/5 hover:text-white"
          >
            Se connecter
          </Link>
          <Link
            href="/register"
            className="hidden min-h-[40px] items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition duration-200 ease-out sm:inline-flex"
            style={{
              background: PC.gradientPrimary,
              color: PC.white,
              boxShadow: `${PC.activeRing}, ${PC.glowShadow}, 0 0 20px rgba(124,58,237,0.4)`,
            }}
          >
            Commencer gratuitement →
          </Link>
        </div>
      </div>
    </header>
  );
}
