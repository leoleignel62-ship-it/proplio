"use client";

import { useCallback, useEffect, useState } from "react";
import { PlanFreeModuleUpsell } from "@/components/plan-free-module-upsell";
import { IconArrowPath } from "@/components/proplio-icons";
import { getCurrentProprietaireId } from "@/lib/proprietaire-profile";
import { getOwnerPlan, type ProplioPlan } from "@/lib/plan-limits";
import { formatSubmitError } from "@/lib/supabase-submit-error";
import { supabase } from "@/lib/supabase";
import { PC } from "@/lib/proplio-colors";
import { panelCard } from "@/lib/proplio-field-styles";

type Row = {
  id: string;
  date_arrivee: string;
  date_depart: string;
  contrat_envoye: boolean | null;
  contrat_signe: boolean | null;
  logements: { nom: string } | null;
  voyageurs: { prenom: string; nom: string; email: string | null } | null;
};

export default function ContratsSejourPage() {
  const [plan, setPlan] = useState<ProplioPlan>("free");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");

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
      .from("reservations")
      .select("id, date_arrivee, date_depart, contrat_envoye, contrat_signe, logements(nom), voyageurs(prenom, nom, email)")
      .eq("proprietaire_id", proprietaireId)
      .order("date_arrivee", { ascending: false });
    if (qErr) setError(formatSubmitError(qErr));
    const raw = (data ?? []) as Record<string, unknown>[];
    setRows(
      raw.map((r) => {
        const lg = r.logements as { nom?: string } | { nom?: string }[] | null;
        const vg = r.voyageurs as { prenom?: string; nom?: string; email?: string } | { prenom?: string; nom?: string; email?: string }[] | null;
        const logements = Array.isArray(lg) ? lg[0] ?? null : lg;
        const voyageurs = Array.isArray(vg) ? vg[0] ?? null : vg;
        return {
          id: String(r.id),
          date_arrivee: String(r.date_arrivee),
          date_depart: String(r.date_depart),
          contrat_envoye: (r.contrat_envoye as boolean | null) ?? null,
          contrat_signe: (r.contrat_signe as boolean | null) ?? null,
          logements: logements ? { nom: String(logements.nom ?? "") } : null,
          voyageurs: voyageurs
            ? { prenom: String(voyageurs.prenom ?? ""), nom: String(voyageurs.nom ?? ""), email: (voyageurs.email as string | null) ?? null }
            : null,
        };
      }),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function sendContrat(id: string) {
    setError("");
    const res = await fetch(`/api/saisonnier/reservations/${id}/send-contrat`, { method: "POST" });
    const j = await res.json();
    if (!res.ok) setError(j.error ?? "Erreur");
    void load();
  }

  async function toggleSigne(id: string, next: boolean) {
    const { proprietaireId, error: e } = await getCurrentProprietaireId();
    if (e || !proprietaireId) return;
    await supabase.from("reservations").update({ contrat_signe: next }).eq("id", id).eq("proprietaire_id", proprietaireId);
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
        <h1 className="proplio-page-title">Contrats de séjour</h1>
        <p className="proplio-page-subtitle">PDF Proplio et suivi d&apos;envoi.</p>
      </div>
      {error ? (
        <p className="rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: PC.dangerBg10, color: PC.danger }}>
          {error}
        </p>
      ) : null}
      <div className="space-y-3">
        {rows.length === 0 ? (
          <div className="rounded-xl p-6 text-sm" style={{ ...panelCard, color: PC.muted }}>
            Aucune réservation.
          </div>
        ) : (
          rows.map((row) => {
            const statut = row.contrat_signe ? "Signé" : row.contrat_envoye ? "Envoyé" : "Généré";
            return (
              <article key={row.id} className="rounded-xl p-4" style={{ ...panelCard, border: `1px solid ${PC.border}` }}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{row.logements?.nom ?? "Logement"}</p>
                    <p className="text-sm" style={{ color: PC.muted }}>
                      {row.voyageurs ? `${row.voyageurs.prenom} ${row.voyageurs.nom}` : "Sans voyageur"} · {row.date_arrivee} → {row.date_depart}
                    </p>
                    <p className="mt-2 text-xs" style={{ color: PC.secondary }}>
                      Statut : {statut}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      className="rounded-lg px-3 py-2 text-xs font-semibold"
                      style={{ backgroundColor: PC.primary, color: PC.white }}
                      disabled={!row.voyageurs?.email}
                      onClick={() => void sendContrat(row.id)}
                    >
                      Générer PDF + envoyer email
                    </button>
                    <button type="button" className="inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs" style={{ border: `1px solid ${PC.border}`, color: PC.muted }} onClick={() => void sendContrat(row.id)}>
                      <IconArrowPath className="h-3 w-3" />
                      Renvoyer
                    </button>
                    <label className="flex items-center gap-2 text-xs" style={{ color: PC.muted }}>
                      <input type="checkbox" checked={Boolean(row.contrat_signe)} onChange={(e) => void toggleSigne(row.id, e.target.checked)} />
                      Marquer comme signé
                    </label>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
