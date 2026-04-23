"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PlanFreeModuleUpsell } from "@/components/plan-free-module-upsell";
import { getCurrentProprietaireId } from "@/lib/proprietaire-profile";
import { getOwnerPlan, type ProplioPlan } from "@/lib/plan-limits";
import { formatSubmitError } from "@/lib/supabase-submit-error";
import { supabase } from "@/lib/supabase";
import { PC } from "@/lib/proplio-colors";
import { fieldSelectStyle, panelCard } from "@/lib/proplio-field-styles";

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
  const [plan, setPlan] = useState<ProplioPlan>("free");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<TaxRow[]>([]);
  const [error, setError] = useState("");
  const [periode, setPeriode] = useState<"mois" | "trimestre" | "annee">("mois");
  const now = new Date();
  const [mois, setMois] = useState(now.getMonth() + 1);
  const [annee, setAnnee] = useState(now.getFullYear());

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

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (periode === "mois") return r.mois === mois && r.annee === annee;
      if (periode === "annee") return r.annee === annee;
      const q = Math.ceil(mois / 3);
      const rm = r.mois;
      const rq = Math.ceil(rm / 3);
      return r.annee === annee && rq === q;
    });
  }, [rows, periode, mois, annee]);

  const total = useMemo(() => filtered.filter((r) => !r.reversee).reduce((s, r) => s + r.montant, 0), [filtered]);

  async function markReversee(id: string) {
    const { proprietaireId, error: e } = await getCurrentProprietaireId();
    if (e || !proprietaireId) return;
    await supabase
      .from("taxes_sejour")
      .update({ reversee: true, date_reversement: new Date().toISOString().slice(0, 10) })
      .eq("id", id)
      .eq("proprietaire_id", proprietaireId);
    void load();
  }

  async function exportPdf() {
    setError("");
    const res = await fetch("/api/saisonnier/taxes-sejour/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ periode, mois, annee, row_ids: filtered.map((r) => r.id) }),
    });
    if (!res.ok) {
      const j = await res.json();
      setError(j.error ?? "Export impossible");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `taxe-sejour-${annee}-${mois}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
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
        <div className="flex flex-wrap gap-2">
          <select style={fieldSelectStyle} value={periode} onChange={(e) => setPeriode(e.target.value as typeof periode)}>
            <option value="mois">Mois</option>
            <option value="trimestre">Trimestre</option>
            <option value="annee">Année</option>
          </select>
          <input type="number" className="rounded-lg px-2 py-2 text-sm" style={{ backgroundColor: PC.inputBg, border: `1px solid ${PC.border}`, color: PC.text, width: 88 }} value={mois} min={1} max={12} onChange={(e) => setMois(Number(e.target.value))} />
          <input type="number" className="rounded-lg px-2 py-2 text-sm" style={{ backgroundColor: PC.inputBg, border: `1px solid ${PC.border}`, color: PC.text, width: 96 }} value={annee} onChange={(e) => setAnnee(Number(e.target.value))} />
          <button type="button" className="proplio-btn-primary px-4 py-2 text-sm" onClick={() => void exportPdf()}>
            Export PDF
          </button>
        </div>
      </div>
      {error ? (
        <p className="rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: PC.dangerBg10, color: PC.danger }}>
          {error}
        </p>
      ) : null}
      <div className="rounded-xl p-4" style={{ ...panelCard, border: `1px solid ${PC.primaryBorder40}` }}>
        <p className="text-sm" style={{ color: PC.muted }}>
          Total à reverser (non marqué) sur la période filtrée :
        </p>
        <p className="text-2xl font-bold" style={{ color: PC.warning }}>
          {total.toFixed(2)} €
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${PC.border}` }}>
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead style={{ backgroundColor: PC.card, color: PC.muted }}>
            <tr>
              <th className="px-3 py-2">Logement</th>
              <th className="px-3 py-2">Période</th>
              <th className="px-3 py-2">Montant</th>
              <th className="px-3 py-2">Reversé</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} style={{ borderTop: `1px solid ${PC.border}` }}>
                <td className="px-3 py-2">{r.logements?.nom ?? "—"}</td>
                <td className="px-3 py-2">
                  {r.mois}/{r.annee}
                </td>
                <td className="px-3 py-2">{r.montant.toFixed(2)} €</td>
                <td className="px-3 py-2">{r.reversee ? `Oui ${r.date_reversement ?? ""}` : "Non"}</td>
                <td className="px-3 py-2">
                  {!r.reversee ? (
                    <button type="button" className="text-xs underline" style={{ color: PC.primary }} onClick={() => void markReversee(r.id)}>
                      Marquer reversé
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs" style={{ color: PC.muted }}>
        Les lignes sont créées lors des réservations (calcul taxe). Vous pouvez aussi les saisir manuellement via Supabase si besoin.
      </p>
    </section>
  );
}
