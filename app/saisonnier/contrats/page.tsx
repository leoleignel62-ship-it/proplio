"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PlanFreeModuleUpsell } from "@/components/plan-free-module-upsell";
import { IconArrowPath } from "@/components/locavio-icons";
import { BtnEmail, BtnSecondary, StatusBadge } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { getCurrentProprietaireId } from "@/lib/proprietaire-profile";
import { getOwnerPlan, type LocavioPlan } from "@/lib/plan-limits";
import { formatSubmitError } from "@/lib/supabase-submit-error";
import { supabase } from "@/lib/supabase";
import { PC } from "@/lib/locavio-colors";
import { fieldInputStyle, fieldSelectStyle, panelCard } from "@/lib/locavio-field-styles";

type ContratStatut = "Généré" | "Envoyé" | "Signé";

type Row = {
  id: string;
  logement_id: string | null;
  date_arrivee: string;
  date_depart: string;
  contrat_envoye: boolean | null;
  contrat_signe: boolean | null;
  logements: { nom: string } | null;
  voyageurs: { prenom: string; nom: string; email: string | null } | null;
};

function formatDateFR(dateStr: string): string {
  if (!dateStr) return "";
  const base = dateStr.trim().split("T")[0] ?? "";
  const date = new Date(`${base}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function rowContratStatut(row: Row): ContratStatut {
  if (row.contrat_signe) return "Signé";
  if (row.contrat_envoye) return "Envoyé";
  return "Généré";
}

type StatutFiltre = "tous" | "genere" | "envoye" | "signe";

export default function ContratsSejourPage() {
  const toast = useToast();
  const [plan, setPlan] = useState<LocavioPlan>("free");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statutFiltre, setStatutFiltre] = useState<StatutFiltre>("tous");
  const [logementFiltre, setLogementFiltre] = useState("");

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
      .select(
        "id, logement_id, date_arrivee, date_depart, contrat_envoye, contrat_signe, logements(nom), voyageurs(prenom, nom, email)",
      )
      .eq("proprietaire_id", proprietaireId)
      .in("source", ["direct", "autre"])
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
          logement_id: r.logement_id != null ? String(r.logement_id) : null,
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

  const logementsOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) {
      const id = r.logement_id;
      if (!id) continue;
      const nom = r.logements?.nom?.trim() || "Logement";
      if (!m.has(id)) m.set(id, nom);
    }
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], "fr"));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (logementFiltre && row.logement_id !== logementFiltre) return false;
      const st = rowContratStatut(row);
      if (statutFiltre === "genere" && st !== "Généré") return false;
      if (statutFiltre === "envoye" && st !== "Envoyé") return false;
      if (statutFiltre === "signe" && st !== "Signé") return false;
      if (!q) return true;
      const logNom = (row.logements?.nom ?? "").toLowerCase();
      const v = row.voyageurs;
      const voyStr = v ? `${v.prenom} ${v.nom} ${v.email ?? ""}`.toLowerCase() : "";
      return logNom.includes(q) || voyStr.includes(q);
    });
  }, [rows, search, statutFiltre, logementFiltre]);

  async function sendContrat(id: string) {
    setError("");
    const res = await fetch(`/api/saisonnier/reservations/${id}/send-contrat`, { method: "POST" });
    const j = await res.json();
    if (!res.ok) setError(j.error ?? "Erreur");
    else toast.success("Contrat envoyé par email.");
    void load();
  }

  async function downloadContratPdf(id: string): Promise<void> {
    setError("");
    try {
      const res = await fetch(`/api/saisonnier/contrats/${id}/pdf`, { method: "GET" });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "Impossible de télécharger le PDF.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `contrat-sejour-${id.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Erreur réseau lors du téléchargement du PDF.");
    }
  }

  async function toggleSigne(id: string, next: boolean) {
    const { proprietaireId, error: e } = await getCurrentProprietaireId();
    if (e || !proprietaireId) return;
    await supabase.from("reservations").update({ contrat_signe: next }).eq("id", id).eq("proprietaire_id", proprietaireId);
    void load();
    toast.success(next ? "Contrat marqué comme signé." : "Marquage signé retiré.");
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
      <div>
        <h1 className="locavio-page-title">Contrats de séjour</h1>
        <p className="locavio-page-subtitle">
          Réservations directes ou autres sources uniquement (pas Airbnb / Booking : contrats gérés par les plateformes). PDF Locavio et suivi
          d&apos;envoi.
        </p>
      </div>

      <div
        className="flex flex-col gap-4 rounded-xl p-4 sm:flex-row sm:flex-wrap sm:items-end"
        style={{ ...panelCard, border: `1px solid ${PC.border}` }}
      >
        <label className="flex min-w-[200px] flex-1 flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
          <span>Recherche</span>
          <input
            type="search"
            placeholder="Voyageur ou logement…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={fieldInputStyle}
            className="w-full"
          />
        </label>
        <label className="flex min-w-[160px] flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
          <span>Statut contrat</span>
          <select value={statutFiltre} onChange={(e) => setStatutFiltre(e.target.value as StatutFiltre)} style={fieldSelectStyle} className="w-full">
            <option value="tous">Tous</option>
            <option value="genere">Généré</option>
            <option value="envoye">Envoyé</option>
            <option value="signe">Signé</option>
          </select>
        </label>
        <label className="flex min-w-[200px] flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
          <span>Logement</span>
          <select value={logementFiltre} onChange={(e) => setLogementFiltre(e.target.value)} style={fieldSelectStyle} className="w-full">
            <option value="">Tous les logements</option>
            {logementsOptions.map(([id, nom]) => (
              <option key={id} value={id}>
                {nom}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <p className="rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: PC.dangerBg10, color: PC.danger }}>
          {error}
        </p>
      ) : null}

      <div className="space-y-3">
        {rows.length === 0 ? (
          <div className="rounded-xl p-6 text-sm" style={{ ...panelCard, color: PC.muted }}>
            Aucune réservation directe ou « autre » source.
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="rounded-xl p-6 text-sm" style={{ ...panelCard, color: PC.muted }}>
            Aucun résultat pour ces filtres.
          </div>
        ) : (
          filteredRows.map((row) => {
            const statut = rowContratStatut(row);
            const datesAffichees = `${formatDateFR(row.date_arrivee)} → ${formatDateFR(row.date_depart)}`;
            return (
              <article key={row.id} className="rounded-xl p-4" style={{ ...panelCard, border: `1px solid ${PC.border}` }}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{row.logements?.nom ?? "Logement"}</p>
                    <p className="text-sm" style={{ color: PC.muted }}>
                      {row.voyageurs ? `${row.voyageurs.prenom} ${row.voyageurs.nom}` : "Sans voyageur"} · {datesAffichees}
                    </p>
                    <p className="mt-2 flex flex-wrap items-center gap-2 text-xs" style={{ color: PC.secondary }}>
                      <span>Statut :</span>
                      <StatusBadge
                        status={statut === "Généré" ? "brouillon" : statut === "Envoyé" ? "envoye" : "signe"}
                        label={statut}
                      />
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <BtnEmail
                        size="small"
                        className="!flex-1 justify-center"
                        disabled={!row.voyageurs?.email}
                        onClick={() => void sendContrat(row.id)}
                      >
                        Envoyer
                      </BtnEmail>
                      <BtnSecondary
                        size="small"
                        className="!flex-1 justify-center"
                        onClick={() => void downloadContratPdf(row.id)}
                      >
                        Télécharger PDF
                      </BtnSecondary>
                    </div>
                    <BtnSecondary
                      size="small"
                      icon={<IconArrowPath className="h-3 w-3" />}
                      onClick={() => void sendContrat(row.id)}
                    >
                      Renvoyer
                    </BtnSecondary>
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
