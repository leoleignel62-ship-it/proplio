"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { PlanFreeModuleUpsell } from "@/components/plan-free-module-upsell";
import { getCurrentProprietaireId } from "@/lib/proprietaire-profile";
import { getOwnerPlan, type ProplioPlan } from "@/lib/plan-limits";
import { formatSubmitError } from "@/lib/supabase-submit-error";
import { supabase } from "@/lib/supabase";
import { PC } from "@/lib/proplio-colors";
import { fieldInputStyle, fieldSelectStyle, panelCard } from "@/lib/proplio-field-styles";

type MenageRow = {
  id: string;
  statut: string;
  prestataire: string | null;
  notes: string | null;
  checklist: unknown;
  logements: { nom: string } | null;
  reservation_id: string | null;
};

const DEFAULT_CHECK = ["Linge lavé", "Sol nettoyé", "Sanitaires désinfectés", "Poubelles vidées"];

export default function MenageSaisonnierPage() {
  const [plan, setPlan] = useState<ProplioPlan>("free");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<MenageRow[]>([]);
  const [error, setError] = useState("");
  const [edit, setEdit] = useState<MenageRow | null>(null);
  const [prestataire, setPrestataire] = useState("");
  const [checks, setChecks] = useState<string[]>(DEFAULT_CHECK);

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
      .from("menages")
      .select("*, logements(nom)")
      .eq("proprietaire_id", proprietaireId)
      .order("created_at", { ascending: false });
    if (qErr) setError(formatSubmitError(qErr));
    const raw = (data ?? []) as Record<string, unknown>[];
    setRows(
      raw.map((r) => {
        const lg = r.logements as { nom?: string } | { nom?: string }[] | null;
        const logements = Array.isArray(lg) ? lg[0] ?? null : lg;
        return {
          id: String(r.id),
          statut: String(r.statut ?? ""),
          prestataire: (r.prestataire as string | null) ?? null,
          notes: (r.notes as string | null) ?? null,
          checklist: r.checklist,
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

  function openEdit(row: MenageRow) {
    setEdit(row);
    setPrestataire(row.prestataire ?? "");
    const ch = row.checklist;
    if (Array.isArray(ch) && ch.length) {
      setChecks(ch.map((x) => String((x as { label?: string }).label ?? x)));
    } else {
      setChecks([...DEFAULT_CHECK]);
    }
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!edit) return;
    const { proprietaireId, error: e2 } = await getCurrentProprietaireId();
    if (e2 || !proprietaireId) return;
    const checklist = checks.map((label) => ({ label, done: false }));
    const { error: uErr } = await supabase
      .from("menages")
      .update({
        prestataire: prestataire.trim() || null,
        checklist: checklist as unknown as never,
      })
      .eq("id", edit.id)
      .eq("proprietaire_id", proprietaireId);
    if (uErr) setError(formatSubmitError(uErr));
    setEdit(null);
    void load();
  }

  async function setStatut(id: string, statut: string) {
    const { proprietaireId, error: e } = await getCurrentProprietaireId();
    if (e || !proprietaireId) return;
    await supabase.from("menages").update({ statut }).eq("id", id).eq("proprietaire_id", proprietaireId);
    void load();
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
      <div>
        <h1 className="proplio-page-title">Ménage</h1>
        <p className="proplio-page-subtitle">Entre deux réservations — checklist et prestataire.</p>
      </div>
      {error ? (
        <p className="rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: PC.dangerBg10, color: PC.danger }}>
          {error}
        </p>
      ) : null}
      {rows.length === 0 ? (
        <div className="rounded-xl p-6 text-sm" style={{ ...panelCard, color: PC.muted }}>
          Aucune fiche ménage. Créez-en depuis une réservation (action « Ménage fait ») ou ajoutez des lignes dans Supabase.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <article key={row.id} className="rounded-xl p-4" style={{ ...panelCard, border: `1px solid ${PC.border}` }}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{row.logements?.nom ?? "Logement"}</p>
                  <p className="text-xs" style={{ color: PC.muted }}>
                    Statut : {row.statut} {row.prestataire ? `· ${row.prestataire}` : ""}
                  </p>
                </div>
                <div className="flex flex-col gap-1 text-xs">
                  <select style={fieldSelectStyle} value={row.statut} onChange={(e) => void setStatut(row.id, e.target.value)}>
                    <option value="a_faire">À faire</option>
                    <option value="en_cours">En cours</option>
                    <option value="termine">Terminé</option>
                  </select>
                  <button type="button" className="underline" style={{ color: PC.primary }} onClick={() => openEdit(row)}>
                    Checklist / prestataire
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {edit ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form onSubmit={saveEdit} className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: PC.card, border: `1px solid ${PC.border}` }}>
            <h3 className="text-lg font-semibold">Checklist</h3>
            <label className="mt-3 flex flex-col gap-1 text-sm" style={{ color: PC.muted }}>
              Prestataire
              <input style={fieldInputStyle} value={prestataire} onChange={(e) => setPrestataire(e.target.value)} />
            </label>
            <p className="mt-3 text-xs" style={{ color: PC.muted }}>
              Lignes (une par ligne dans la zone suivante — édition simple)
            </p>
            <textarea
              className="mt-1 min-h-32 w-full rounded-lg px-3 py-2 text-sm"
              style={fieldInputStyle}
              value={checks.join("\n")}
              onChange={(e) => setChecks(e.target.value.split("\n").filter(Boolean))}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="proplio-btn-secondary px-4 py-2" onClick={() => setEdit(null)}>
                Fermer
              </button>
              <button type="submit" className="proplio-btn-primary px-4 py-2">
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
