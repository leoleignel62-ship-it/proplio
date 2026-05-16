"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LogoFull } from "@/components/locavio-icons";

const PAGE_BG = "#f8f7ff";
const TEXT_COLOR = "#1a0533";
const ACCENT = "#7c3aed";
const MUTED = "#6b7280";

function RejoindreContent() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref")?.trim() ?? "";
  const registerHref = ref ? `/register?ref=${encodeURIComponent(ref)}` : "/register";

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-12"
      style={{ backgroundColor: PAGE_BG, color: TEXT_COLOR }}
    >
      <div
        className="w-full max-w-lg text-center"
        style={{
          backgroundColor: "#ffffff",
          borderRadius: 16,
          padding: "2.5rem 2rem",
          boxShadow: "0 4px 24px rgba(26, 5, 51, 0.08)",
          border: "1px solid rgba(124, 58, 237, 0.12)",
        }}
      >
        <div className="flex justify-center">
          <LogoFull className="h-9 w-auto" />
        </div>

        <h1
          className="mt-8 text-2xl font-extrabold leading-tight tracking-[-0.03em] sm:text-3xl"
          style={{ color: TEXT_COLOR }}
        >
          Votre ami vous offre 1 mois gratuit sur Locavio
        </h1>

        <p className="mt-4 text-base leading-relaxed" style={{ color: MUTED }}>
          Gérez vos locations en toute simplicité. Commencez gratuitement, sans carte bancaire.
        </p>

        <Link
          href={registerHref}
          className="mt-8 inline-flex w-full items-center justify-center rounded-xl px-6 py-3.5 text-sm font-semibold transition hover:opacity-95 sm:w-auto"
          style={{
            backgroundColor: ACCENT,
            color: "#ffffff",
            boxShadow: "0 2px 8px rgba(124, 58, 237, 0.35)",
          }}
        >
          Créer mon compte gratuitement →
        </Link>

        <p className="mt-8 text-xs leading-relaxed" style={{ color: MUTED }}>
          Offre réservée aux nouveaux inscrits. 1 mois offert à l&apos;activation d&apos;un plan payant.
        </p>
      </div>
    </div>
  );
}

function RejoindreFallback() {
  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ backgroundColor: PAGE_BG, color: MUTED }}
    >
      <p className="text-sm">Chargement…</p>
    </div>
  );
}

export default function RejoindrePage() {
  return (
    <Suspense fallback={<RejoindreFallback />}>
      <RejoindreContent />
    </Suspense>
  );
}
