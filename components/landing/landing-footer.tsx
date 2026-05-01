"use client";

import Link from "next/link";

const ease = "200ms ease-out";

export function LandingFooter() {
  return (
    <footer
      id="footer"
      className="border-t px-4 py-12 sm:px-6"
      style={{
        background: "rgba(124, 58, 237, 0.08)",
        WebkitBackdropFilter: "blur(12px)",
        backdropFilter: "blur(12px)",
        borderTop: "1px solid rgba(124, 58, 237, 0.25)",
      }}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="text-sm font-semibold text-white">Locavio</div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-white/60">
          <Link href="/tarifs" className="transition text-white/60 hover:text-white" style={{ transition: ease }}>
            Tarifs
          </Link>
          <Link href="/login" className="transition text-white/60 hover:text-white" style={{ transition: ease }}>
            Connexion
          </Link>
          <Link href="/register" className="transition text-white/60 hover:text-white" style={{ transition: ease }}>
            Créer un compte
          </Link>
          <Link href="/mentions-legales" className="transition text-white/60 hover:text-white" style={{ transition: ease }}>
            Mentions légales
          </Link>
          <Link href="/cgu" className="transition text-white/60 hover:text-white" style={{ transition: ease }}>
            CGU
          </Link>
          <Link href="/politique-de-confidentialite" className="transition text-white/60 hover:text-white" style={{ transition: ease }}>
            Politique de confidentialité
          </Link>
          <Link href="/qui-sommes-nous" className="transition text-white/60 hover:text-white" style={{ transition: ease }}>
            Qui sommes-nous
          </Link>
        </nav>
      </div>
      <p className="mx-auto mt-8 max-w-6xl text-center text-sm text-white/40 sm:text-left">
        © {new Date().getFullYear()} Locavio. Tous droits réservés.
      </p>
      <p className="mx-auto mt-2 max-w-6xl text-center text-xs text-white/40 sm:text-left">
        Gestion locative simplifiée pour les propriétaires français.
      </p>
    </footer>
  );
}
