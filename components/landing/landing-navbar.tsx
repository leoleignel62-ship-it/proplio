"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { PC } from "@/lib/locavio-colors";

const LANDING_LOGO_SRC = "/logos/lockup-horizontal-clair.svg";

type LandingNavbarProps = {
  isScrolled: boolean;
};

export function LandingNavbar({ isScrolled }: LandingNavbarProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
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
        backgroundColor: isScrolled ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.8)",
        WebkitBackdropFilter: "blur(20px)",
        backdropFilter: "blur(20px)",
        transition: "background-color 200ms ease-out",
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6 lg:px-8">
        <Link href="/landing" className="flex shrink-0 items-center gap-2.5 font-bold tracking-tight" style={{ color: PC.text }}>
          <img src={LANDING_LOGO_SRC} alt="Locavio" width={140} height={28} className="h-9 w-auto" />
        </Link>

        <nav
          className="hidden min-w-0 flex-1 flex-nowrap items-center justify-center gap-4 lg:flex"
          aria-label="Navigation principale"
        >
          {centerLinks.map((item) => {
            const active = pathname === item.href;
            const inactiveStyle: CSSProperties = {
              color: "#6b7280",
              textDecoration: "none",
              letterSpacing: "0.02em",
              fontWeight: 500,
              fontSize: "0.8rem",
            };
            const activeStyle: CSSProperties = {
              color: "#1a0533",
              textDecoration: "none",
              letterSpacing: "0.02em",
              fontWeight: 600,
              fontSize: "0.8rem",
              borderBottom: "2px solid #7c3aed",
            };
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative whitespace-nowrap rounded-lg px-2 py-1.5 transition duration-200 ease-out lg:px-2.5 ${
                  active ? "" : "group hover:bg-gray-100 hover:text-gray-900"
                }`}
                style={active ? activeStyle : inactiveStyle}
              >
                {item.label}
                {!active ? (
                  <span
                    aria-hidden
                    className="absolute bottom-0 left-3 right-3 h-px origin-left scale-x-0 transition-transform duration-200 ease-out group-hover:scale-x-100"
                    style={{ backgroundColor: "#6b7280" }}
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <span className="mx-2 hidden h-5 w-px shrink-0 bg-gray-200 lg:block" aria-hidden />

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden rounded-lg p-2 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
            aria-label="Menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Link
            href="/login"
            className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-[#6b7280] transition-all duration-200 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900"
          >
            Se connecter
          </Link>
          <Link
            href="/register"
            className="hidden min-h-[40px] items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition duration-200 ease-out lg:inline-flex"
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

      {menuOpen ? (
        <div className="lg:hidden border-t border-gray-100 bg-white backdrop-blur-xl">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4" aria-label="Navigation mobile">
            {centerLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`rounded-xl px-4 py-3 text-sm font-medium transition ${
                  pathname === item.href
                    ? "border-l-2 border-violet-600 bg-violet-50 text-[#1a0533]"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-3 flex flex-col gap-2 border-t border-gray-100 pt-3">
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="rounded-xl border border-gray-200 px-4 py-3 text-center text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Se connecter
              </Link>
              <Link
                href="/register"
                onClick={() => setMenuOpen(false)}
                className="rounded-xl bg-violet-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-violet-500"
              >
                Commencer gratuitement →
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
