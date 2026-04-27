"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PlanFreeModuleUpsell } from "@/components/plan-free-module-upsell";
import { BtnNeutral } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { getCurrentProprietaireId } from "@/lib/proprietaire-profile";
import { getOwnerPlan, type LocavioPlan } from "@/lib/plan-limits";
import { formatSubmitError } from "@/lib/supabase-submit-error";
import { supabase } from "@/lib/supabase";
import { PC } from "@/lib/locavio-colors";

type TaxRow = {
  id: string;
  montant: number;
  nb_personnes: number;
  nb_nuits: number;
  tarif_par_personne_nuit: number;
  mois: number;
  annee: number;
  reversee: boolean | null;
  date_reversement: string | null;
  reservation_id: string | null;
  logements: { nom: string } | null;
};

type LogementTaxGroup = {
  logementNom: string;
  total: number;
  pendingTotal: number;
  count: number;
  allReversee: boolean;
  idsNotReversee: string[];
  idsReversee: string[];
};

const CARD_BG = "#13131a";
const BORDER_VIOLET = "rgba(124, 58, 237, 0.65)";
const BORDER_GREEN = "rgba(22, 163, 74, 0.65)";
const GREEN_TEXT = "#22c55e";

function formatEuros(n: number): string {
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export default function TaxesSejourPage() {
  const toast = useToast();
  const [plan, setPlan] = useState<LocavioPlan>("free");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<TaxRow[]>([]);
  const [error, setError] = useState("");
  const [toggleBusyKey, setToggleBusyKey] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();
  const [annee, setAnnee] = useState(currentYear);

  const load = useCallback(async () => {
    const { proprietaireId, error: e } = await getCurrentProprietaireId();
    if (e || !proprietaireId) {
      setLoading(false);
      return;
    }
    const p = await getOwnerPlan(proprietaireId);
    setPlan(p);
    if (p === "free") {
      setLoading(false);
      return;
    }
    const { data, error: qErr } = await supabase
      .from("taxes_sejour")
      .select("*, logements(nom)")
      .eq("proprietaire_id", proprietaireId)
      .order("annee", { ascending: false })
      .order("mois", { ascending: false });
    if (qErr) setError(formatSubmitError(qErr));
    const raw = (data ?? []) as Record<string, unknown>[];
    setRows(
      raw.map((r) => {
        const lg = r.logements as { nom?: string } | { nom?: string }[] | null;
        const logements = Array.isArray(lg) ? lg[0] ?? null : lg;
        return {
          id: String(r.id),
          montant: Number(r.montant ?? 0),
          nb_personnes: Number(r.nb_personnes ?? 0),
          nb_nuits: Number(r.nb_nuits ?? 0),
          tarif_par_personne_nuit: Number(r.tarif_par_personne_nuit ?? 0),
          mois: Number(r.mois ?? 0),
          annee: Number(r.annee ?? 0),
          reversee: (r.reversee as boolean | null) ?? null,
          date_reversement: (r.date_reversement as string | null) ?? null,
          reservation_id: (r.reservation_id as string | null) ?? null,
          logements: logements ? { nom: String(logements.nom ?? "") } : null,
        };
      }),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const anneesDisponibles = useMemo(() => {
    const set = new Set<number>([currentYear, ...rows.map((r) => r.annee)]);
    return Array.from(set).sort((a, b) => b - a);
  }, [rows, currentYear]);

  useEffect(() => {
    if (!anneesDisponibles.includes(annee)) {
      setAnnee(anneesDisponibles[0] ?? currentYear);
    }
  }, [anneesDisponibles, annee, currentYear]);

  const yearIndex = anneesDisponibles.findIndex((y) => y === annee);
  const canGoPreviousYear = yearIndex >= 0 && yearIndex < anneesDisponibles.length - 1;
  const canGoNextYear = yearIndex > 0;

  const yearlyRows = useMemo(() => rows.filter((r) => r.annee === annee), [rows, annee]);

  const groupedByLogement = useMemo((): LogementTaxGroup[] => {
    const map = new Map<string, LogementTaxGroup>();
    for (const row of yearlyRows) {
      const key = row.logements?.nom?.trim() || "Logement non renseigné";
      if (!map.has(key)) {
        map.set(key, {
          logementNom: key,
          total: 0,
          pendingTotal: 0,
          count: 0,
          allReversee: true,
          idsNotReversee: [],
          idsReversee: [],
        });
      }
      const bucket = map.get(key)!;
      bucket.total += row.montant;
      bucket.count += 1;
      if (row.reversee) {
        bucket.idsReversee.push(row.id);
      } else {
        bucket.allReversee = false;
        bucket.idsNotReversee.push(row.id);
        bucket.pendingTotal += row.montant;
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.logementNom.localeCompare(b.logementNom, "fr", { sensitivity: "base" }),
    );
  }, [yearlyRows]);

  const totalAReverser = useMemo(
    () => yearlyRows.filter((r) => !r.reversee).reduce((sum, r) => sum + r.montant, 0),
    [yearlyRows],
  );

  const hasYearlyTaxes = yearlyRows.length > 0;
  const toutReverse =
    hasYearlyTaxes && yearlyRows.every((r) => r.reversee === true);

  async function markReversee(rowIds: string[]) {
    if (rowIds.length === 0) return;
    const { proprietaireId, error: e } = await getCurrentProprietaireId();
    if (e || !proprietaireId) return;
    const { error: uErr } = await supabase
      .from("taxes_sejour")
      .update({ reversee: true, date_reversement: new Date().toISOString().slice(0, 10) })
      .in("id", rowIds)
      .eq("proprietaire_id", proprietaireId);
    if (uErr) {
      setError(formatSubmitError(uErr));
      toast.error("Impossible de mettre à jour le statut.");
      return;
    }
    void load();
    toast.success("Taxes marquées comme reversées.");
  }

  async function markNonReversee(rowIds: string[]) {
    if (rowIds.length === 0) return;
    const { proprietaireId, error: e } = await getCurrentProprietaireId();
    if (e || !proprietaireId) return;
    const { error: uErr } = await supabase
      .from("taxes_sejour")
      .update({ reversee: false, date_reversement: null })
      .in("id", rowIds)
      .eq("proprietaire_id", proprietaireId);
    if (uErr) {
      setError(formatSubmitError(uErr));
      toast.error("Impossible de mettre à jour le statut.");
      return;
    }
    void load();
    toast.success("Statut remis à « à reverser ».");
  }

  async function toggleLogement(group: LogementTaxGroup) {
    const key = group.logementNom;
    setToggleBusyKey(key);
    setError("");
    try {
      if (group.allReversee) {
        await markNonReversee(group.idsReversee);
      } else {
        await markReversee(group.idsNotReversee);
      }
    } finally {
      setToggleBusyKey(null);
    }
  }

  if (loading) {
    return (
      <section className="locavio-page-wrap p-6 text-sm" style={{ color: PC.muted }}>
        Chargement…
      </section>
    );
  }
  if (plan === "free") {
    return <PlanFreeModuleUpsell variant="saisonnier" />;
  }

  return (
    <section className="locavio-page-wrap space-y-6" style={{ color: PC.text }}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="locavio-page-title">Taxe de séjour</h1>
          <p className="locavio-page-subtitle">Récapitulatif et reversement par logement.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BtnNeutral
            type="button"
            size="small"
            disabled={!canGoPreviousYear}
            onClick={() => {
              if (!canGoPreviousYear) return;
              setAnnee(anneesDisponibles[yearIndex + 1] ?? annee);
            }}
          >
            {"<"}
          </BtnNeutral>
          <select
            className="rounded-md px-3 py-1.5 text-sm"
            style={{ backgroundColor: PC.card, border: `1px solid ${PC.border}`, color: PC.text }}
            value={annee}
            onChange={(e) => setAnnee(Number(e.target.value))}
          >
            {anneesDisponibles.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <BtnNeutral
            type="button"
            size="small"
            disabled={!canGoNextYear}
            onClick={() => {
              if (!canGoNextYear) return;
              setAnnee(anneesDisponibles[yearIndex - 1] ?? annee);
            }}
          >
            {">"}
          </BtnNeutral>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: PC.dangerBg10, color: PC.danger }}>
          {error}
        </p>
      ) : null}

      {hasYearlyTaxes ? (
        toutReverse ? (
          <div
            className="rounded-xl border px-4 py-3 text-sm font-medium"
            style={{
              backgroundColor: "rgba(22, 163, 74, 0.1)",
              borderColor: BORDER_GREEN,
              color: GREEN_TEXT,
            }}
          >
            ✓ Tout a été reversé pour {annee}
          </div>
        ) : (
          <div
            className="rounded-xl border px-4 py-3"
            style={{
              backgroundColor: CARD_BG,
              borderColor: BORDER_VIOLET,
            }}
          >
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: PC.muted }}>
              Total à reverser
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color: PC.warning }}>
              {formatEuros(totalAReverser)} €
            </p>
            <p className="mt-1 text-xs" style={{ color: PC.muted }}>
              Somme des lignes non reversées pour {annee}
            </p>
          </div>
        )
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {groupedByLogement.map((group) => {
          const reversed = group.allReversee;
          const busy = toggleBusyKey === group.logementNom;
          return (
            <article
              key={group.logementNom}
              className="flex flex-col rounded-xl border-2 p-4 shadow-sm transition-[border-color] duration-200"
              style={{
                backgroundColor: CARD_BG,
                borderColor: reversed ? BORDER_GREEN : BORDER_VIOLET,
              }}
            >
              <h2 className="text-base font-semibold leading-snug" style={{ color: PC.text }}>
                {group.logementNom}
              </h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide" style={{ color: PC.muted }}>
                    Montant collecté
                  </dt>
                  <dd className="mt-0.5 text-lg font-semibold tabular-nums" style={{ color: PC.text }}>
                    {formatEuros(group.total)} €
                  </dd>
                  {!reversed && group.pendingTotal > 0 && group.pendingTotal < group.total ? (
                    <dd className="mt-1 text-xs" style={{ color: PC.warning }}>
                      Dont {formatEuros(group.pendingTotal)} € à reverser
                    </dd>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-4">
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide" style={{ color: PC.muted }}>
                      Réservations
                    </dt>
                    <dd className="mt-0.5 font-medium tabular-nums" style={{ color: PC.text }}>
                      {group.count}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide" style={{ color: PC.muted }}>
                      Année
                    </dt>
                    <dd className="mt-0.5 font-medium tabular-nums" style={{ color: PC.text }}>
                      {annee}
                    </dd>
                  </div>
                </div>
              </dl>
              <button
                type="button"
                disabled={busy}
                onClick={() => void toggleLogement(group)}
                className="mt-5 w-full rounded-lg px-3 py-2.5 text-sm font-semibold transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                style={
                  reversed
                    ? {
                        backgroundColor: "rgba(22, 163, 74, 0.2)",
                        color: GREEN_TEXT,
                        border: `1px solid ${BORDER_GREEN}`,
                      }
                    : {
                        backgroundColor: "rgba(124, 58, 237, 0.15)",
                        color: "#c4b5fd",
                        border: `1px solid ${BORDER_VIOLET}`,
                      }
                }
              >
                {busy ? "…" : reversed ? "Reversée ✓" : "À reverser"}
              </button>
              <p className="mt-2 text-center text-[11px] leading-relaxed" style={{ color: PC.muted }}>
                {reversed ? "Cliquer pour remettre en attente de reversement" : "Cliquer pour marquer comme reversée"}
              </p>
            </article>
          );
        })}
      </div>

      {!hasYearlyTaxes ? (
        <p className="rounded-xl border px-4 py-8 text-center text-sm" style={{ borderColor: PC.border, color: PC.muted }}>
          Aucune taxe de séjour enregistrée pour {annee}.
        </p>
      ) : null}

      <p className="text-xs leading-relaxed" style={{ color: PC.muted }}>
        La taxe de séjour est généralement déclarée annuellement à votre mairie. Airbnb la reverse automatiquement dans la
        plupart des communes.
      </p>
    </section>
  );
}
