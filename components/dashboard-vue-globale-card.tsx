"use client";

import Link from "next/link";
import { PC } from "@/lib/proplio-colors";

type Props = {
  encaisseClassiqueMois: number;
  revenusSaisonnierMois: number;
  otherModeHref: string;
  otherModeLabel: string;
  onNavigateOther?: () => void;
};

export function DashboardVueGlobaleCard({
  encaisseClassiqueMois,
  revenusSaisonnierMois,
  otherModeHref,
  otherModeLabel,
  onNavigateOther,
}: Props) {
  const total = encaisseClassiqueMois + revenusSaisonnierMois;
  return (
    <section
      className="space-y-4 p-5 sm:p-6"
      style={{
        backgroundColor: PC.card,
        border: `1px solid ${PC.primaryBorder40}`,
        borderRadius: 12,
        boxShadow: PC.cardShadow,
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: PC.text }}>
            Vue globale
          </h2>
          <p className="text-sm" style={{ color: PC.muted }}>
            Classique + saisonnier — {new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date())}
          </p>
        </div>
        <Link
          href={otherModeHref}
          className="inline-flex rounded-lg px-4 py-2 text-sm font-semibold transition hover:opacity-90"
          style={{ backgroundColor: PC.primary, color: PC.white }}
          onClick={() => onNavigateOther?.()}
        >
          {otherModeLabel}
        </Link>
      </div>
      <article className="rounded-xl p-4" style={{ backgroundColor: PC.primaryBg10, border: `1px solid ${PC.border}` }}>
        <p className="text-xs font-medium" style={{ color: PC.muted }}>
          Total revenus tous types (mois en cours)
        </p>
        <p className="mt-2 text-2xl font-bold tabular-nums" style={{ color: PC.text }}>
          {total.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €
        </p>
      </article>
      <div className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-xl p-4" style={{ backgroundColor: PC.primaryBg10, border: `1px solid ${PC.border}` }}>
          <p className="text-xs font-medium" style={{ color: PC.muted }}>
            Revenus classique (quittances encaissées)
          </p>
          <p className="mt-2 text-lg font-bold tabular-nums" style={{ color: PC.text }}>
            {encaisseClassiqueMois.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €
          </p>
        </article>
        <article className="rounded-xl p-4" style={{ backgroundColor: PC.successBg10, border: `1px solid ${PC.borderSuccess40}` }}>
          <p className="text-xs font-medium" style={{ color: PC.muted }}>
            Revenus saisonnier (séjours)
          </p>
          <p className="mt-2 text-lg font-bold tabular-nums" style={{ color: PC.success }}>
            {revenusSaisonnierMois.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €
          </p>
        </article>
      </div>
    </section>
  );
}
