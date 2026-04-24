"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PlanFreeModuleUpsell } from "@/components/plan-free-module-upsell";
import { BtnNeutral, BtnPrimary } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { getCurrentProprietaireId } from "@/lib/proprietaire-profile";
import { getOwnerPlan, type ProplioPlan } from "@/lib/plan-limits";
import { formatSubmitError } from "@/lib/supabase-submit-error";
import { supabase } from "@/lib/supabase";
import { PC } from "@/lib/proplio-colors";
import { panelCard } from "@/lib/proplio-field-styles";

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

export default function TaxesSejourPage() {
  const toast = useToast();
  const [plan, setPlan] = useState<ProplioPlan>("free");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<TaxRow[]>([]);
  const [error, setError] = useState("");
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

  const yearlyRows = useMemo(
    () => rows.filter((r) => r.annee === annee),
    [rows, annee],
  );

  const groupedByLogement = useMemo(() => {
    const map = new Map<
      string,
      {
        logementNom: string;
        total: number;
        count: number;
        allReversee: boolean;
        idsNotReversee: string[];
      }
    >();
    for (const row of yearlyRows) {
      const key = row.logements?.nom?.trim() || "Logement non renseigné";
      if (!map.has(key)) {
        map.set(key, {
          logementNom: key,
          total: 0,
          count: 0,
          allReversee: true,
          idsNotReversee: [],
        });
      }
      const bucket = map.get(key)!;
      bucket.total += row.montant;
      bucket.count += 1;
      if (!row.reversee) {
        bucket.allReversee = false;
        bucket.idsNotReversee.push(row.id);
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

  async function markReversee(rowIds: string[]) {
    if (rowIds.length === 0) return;
    const { proprietaireId, error: e } = await getCurrentProprietaireId();
    if (e || !proprietaireId) return;
    await supabase
      .from("taxes_sejour")
      .update({ reversee: true, date_reversement: new Date().toISOString().slice(0, 10) })
      .in("id", rowIds)
      .eq("proprietaire_id", proprietaireId);
    void load();
    toast.success("Taxes marquées comme reversées.");
  }

  if (loading) {
    return (
      <section className="proplio-page-wrap p-6 text-sm" style={{ color: PC.muted }}>
        Chargement…
      </section>
    );
  }
  if (plan === "free") {
    return <PlanFreeModuleUpsell variant="saisonnier" />;
  }

  return (
    <section className="proplio-page-wrap space-y-6" style={{ color: PC.text }}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="proplio-page-title">Taxe de séjour</h1>
          <p className="proplio-page-subtitle">Récapitulatif et reversement.</p>
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
            style={{ backgroundColor: PC.card, border: `1px solid ${PC.border}` }}
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
      <div className="rounded-xl p-4" style={{ ...panelCard, border: `1px solid ${PC.primaryBorder40}` }}>
        <p className="text-sm" style={{ color: PC.muted }}>Total à reverser en {annee} :</p>
        <p className="text-2xl font-bold" style={{ color: PC.warning }}>
          {totalAReverser.toFixed(2)} €
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${PC.border}` }}>
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead style={{ backgroundColor: PC.card, color: PC.muted }}>
            <tr>
              <th className="px-3 py-2">Logement</th>
              <th className="px-3 py-2">Taxe collectée (année)</th>
              <th className="px-3 py-2">Réservations concernées</th>
              <th className="px-3 py-2">Statut</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {groupedByLogement.map((row) => (
              <tr key={row.logementNom} style={{ borderTop: `1px solid ${PC.border}` }}>
                <td className="px-3 py-2">{row.logementNom}</td>
                <td className="px-3 py-2">{row.total.toFixed(2)} €</td>
                <td className="px-3 py-2">{row.count}</td>
                <td className="px-3 py-2">{row.allReversee ? "Reversée ✓" : "À reverser"}</td>
                <td className="px-3 py-2">
                  {!row.allReversee ? (
                    <BtnPrimary size="small" onClick={() => void markReversee(row.idsNotReversee)}>
                      Marquer comme reversée
                    </BtnPrimary>
                  ) : null}
                </td>
              </tr>
            ))}
            {groupedByLogement.length === 0 ? (
              <tr style={{ borderTop: `1px solid ${PC.border}` }}>
                <td className="px-3 py-4 text-sm" style={{ color: PC.muted }} colSpan={5}>
                  Aucune taxe de séjour enregistrée pour {annee}.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className="text-xs" style={{ color: PC.muted }}>
        La taxe de séjour est généralement déclarée annuellement à votre mairie. Airbnb la reverse automatiquement dans la plupart des communes.
      </p>
    </section>
  );
}
