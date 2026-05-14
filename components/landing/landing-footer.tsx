"use client";

import Image from "next/image";
import Link from "next/link";

const ease = "200ms ease-out";

export function LandingFooter() {
  return (
    <footer
      id="footer"
      className="mt-12 border-t border-[rgba(124,58,237,0.1)] px-4 pt-12 pb-8 sm:px-6"
      style={{
        background: "#ffffff",
      }}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-xs shrink-0">
          <Image
            src="/logos/lockup-horizontal-clair.svg"
            alt="Locavio"
            width={120}
            height={28}
            className="h-auto w-[120px]"
          />
          <p className="mt-3 text-sm leading-relaxed text-[#6b7280]">
            Gestion locative simplifiée pour les propriétaires français 🇫🇷
          </p>
        </div>
        <nav className="flex min-w-0 flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-[#6b7280]">
          <Link href="/tarifs" className="transition hover:text-[#1a0533]" style={{ transition: ease }}>
            Tarifs
          </Link>
          <Link href="/login" className="transition hover:text-[#1a0533]" style={{ transition: ease }}>
            Connexion
          </Link>
          <Link href="/register" className="transition hover:text-[#1a0533]" style={{ transition: ease }}>
            Créer un compte
          </Link>
          <Link href="/mentions-legales" className="transition hover:text-[#1a0533]" style={{ transition: ease }}>
            Mentions légales
          </Link>
          <Link href="/cgu" className="transition hover:text-[#1a0533]" style={{ transition: ease }}>
            CGU
          </Link>
          <Link href="/politique-de-confidentialite" className="transition hover:text-[#1a0533]" style={{ transition: ease }}>
            Politique de confidentialité
          </Link>
          <Link href="/qui-sommes-nous" className="transition hover:text-[#1a0533]" style={{ transition: ease }}>
            Qui sommes-nous
          </Link>
        </nav>
      </div>
      <p className="mx-auto mt-8 max-w-6xl text-center text-sm text-[#9ca3af] sm:text-left">
        © {new Date().getFullYear()} Locavio. Tous droits réservés.
      </p>
      <p className="mx-auto mt-6 max-w-6xl border-t border-gray-100 pt-6 text-center text-xs text-[#6b7280] sm:text-left">
        ✓ Hébergé en Europe · ✓ Données chiffrées · ✓ Conforme RGPD
      </p>
    </footer>
  );
}
