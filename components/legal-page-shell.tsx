"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { LogoFull } from "@/components/locavio-icons";
import { PC } from "@/lib/locavio-colors";

export function LegalPageShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0a0a0f", color: PC.text }}>
      <header
        className="border-b"
        style={{
          borderColor: PC.border,
          backgroundColor: "rgba(10, 10, 15, 0.88)",
          WebkitBackdropFilter: "blur(12px)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/landing" className="flex items-center gap-2.5 font-bold tracking-tight" style={{ color: PC.text }}>
            <LogoFull className="h-9 w-auto" />
          </Link>
          <Link href="/landing" className="text-sm font-medium underline" style={{ color: PC.muted }}>
            Retour vers l&apos;accueil
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-12">
        <article className="mx-auto max-w-[800px] space-y-8 leading-relaxed">
          <h1 className="text-3xl font-extrabold tracking-[-0.02em]" style={{ color: "#7c3aed" }}>
            {title}
          </h1>
          <div className="space-y-6 text-sm sm:text-base">{children}</div>
        </article>
      </main>

      <footer className="border-t px-4 py-12 sm:px-6" style={{ borderColor: PC.border, backgroundColor: PC.bg }}>
        <div className="mx-auto flex max-w-6xl flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-2">
            <LogoFull className="h-9 w-auto" />
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium" style={{ color: PC.muted }}>
            <Link href="/landing#tarifs" className="transition hover:text-white">
              Tarifs
            </Link>
            <Link href="/login" className="transition hover:text-white">
              Connexion
            </Link>
            <Link href="/register" className="transition hover:text-white">
              Créer un compte
            </Link>
            <Link href="/mentions-legales" className="transition hover:text-white">
              Mentions légales
            </Link>
            <Link href="/cgu" className="transition hover:text-white">
              CGU
            </Link>
            <Link href="/politique-de-confidentialite" className="transition hover:text-white">
              Politique de confidentialité
            </Link>
            <Link href="/qui-sommes-nous" className="transition hover:text-white">
              Qui sommes-nous
            </Link>
          </nav>
        </div>
        <p className="mx-auto mt-8 max-w-6xl text-center text-sm sm:text-left" style={{ color: PC.tertiary }}>
          © {new Date().getFullYear()} Locavio. Tous droits réservés.
        </p>
      </footer>
    </div>
  );
}
