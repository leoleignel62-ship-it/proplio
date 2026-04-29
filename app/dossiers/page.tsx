"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { IconFolder, IconPlus, IconTrash } from "@/components/locavio-icons";
import { PlanFreeModuleUpsell } from "@/components/plan-free-module-upsell";
import { BtnPrimary, ConfirmModal } from "@/components/ui";
import { PC } from "@/lib/locavio-colors";
import { getOwnerPlan, type LocavioPlan } from "@/lib/plan-limits";
import { getCurrentProprietaireId } from "@/lib/proprietaire-profile";
import { supabase } from "@/lib/supabase";
import { NOTE_COLORS } from "@/lib/candidature";

type DossierRow = {
  id: string;
  logement_concerne: string;
  statut: string;
  created_at: string;
  candidature_tokens?: Array<{ expire_at?: string; prenom_candidat?: string; nom_candidat?: string }>;
  candidature_formulaires?: Array<{ score?: number; note?: string }>;
};

type LogementOption = { id: string; label: string; nom: string; adresse: string };

export default function DossiersPage() {
  const [rows, setRows] = useState<DossierRow[]>([]);
  const [logements, setLogements] = useState<LogementOption[]>([]);
  const [selectedLogementFilter, setSelectedLogementFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<LocavioPlan | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }
      const { proprietaireId: ownerId } = await getCurrentProprietaireId();
      const plan = ownerId ? await getOwnerPlan(ownerId) : "free";
      if (cancelled) return;
      setCurrentPlan(plan);
      if (plan === "free") {
        setLoading(false);
        return;
      }
      const [{ data: dossiersData }, { data: logementsData }] = await Promise.all([
        supabase
          .from("candidature_dossiers")
          .select(
            "id, logement_concerne, statut, created_at, candidature_tokens(expire_at, prenom_candidat, nom_candidat), candidature_formulaires(score, note)",
          )
          .eq("proprietaire_id", user.id)
          .order("created_at", { ascending: false }),
        ownerId
          ? supabase
              .from("logements")
              .select("id, nom, adresse")
              .eq("proprietaire_id", ownerId)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (!cancelled) {
        setRows((dossiersData as DossierRow[]) ?? []);
        setLogements(
          ((logementsData as Array<{ id?: string; nom?: string; adresse?: string }> | null) ?? []).map((row) => ({
            id: String(row.id ?? ""),
            nom: String(row.nom ?? "").trim(),
            adresse: String(row.adresse ?? "").trim(),
            label: String(row.nom ?? "").trim() || String(row.adresse ?? "").trim() || "Logement sans nom",
          })),
        );
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredRows = useMemo(
    () => {
      if (!selectedLogementFilter) return rows;
      const selected = logements.find((item) => item.id === selectedLogementFilter);
      if (!selected) return rows;
      return rows.filter((row) => {
        const logementConcerne = String(row.logement_concerne ?? "").trim().toLowerCase();
        return (
          logementConcerne === selected.label.toLowerCase() ||
          (selected.nom && logementConcerne === selected.nom.toLowerCase()) ||
          (selected.adresse && logementConcerne === selected.adresse.toLowerCase())
        );
      });
    },
    [rows, selectedLogementFilter, logements],
  );

  async function handleDelete() {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    setError("");
    const res = await fetch("/api/candidature/supprimer", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dossier_id: deleteTargetId }),
    });
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(payload.error ?? "Suppression impossible.");
      setIsDeleting(false);
      return;
    }
    setRows((prev) => prev.filter((row) => row.id !== deleteTargetId));
    setDeleteTargetId(null);
    setIsDeleting(false);
  }

  if (!loading && currentPlan === "free") {
    return <PlanFreeModuleUpsell variant="dossiers" />;
  }

  return (
    <section className="locavio-page-wrap space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="locavio-page-title">Dossiers de candidature</h1></div>
        <Link href="/dossiers/nouveau">
          <BtnPrimary icon={<IconPlus className="h-4 w-4" />}>Nouveau dossier</BtnPrimary>
        </Link>
      </div>
      <div className="max-w-sm">
        <label className="text-sm" style={{ color: PC.muted }}>
          Filtrer par logement
          <select
            className="locavio-select mt-1 w-full"
            value={selectedLogementFilter}
            onChange={(e) => setSelectedLogementFilter(e.target.value)}
          >
            <option value="">Tous les logements</option>
            {logements.map((logement) => (
              <option key={logement.id} value={logement.id}>
                {logement.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error ? (
        <div className="rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: PC.dangerBg10, color: PC.danger }}>
          {error}
        </div>
      ) : null}
      {!loading && rows.length === 0 ? (
        <div
          className="locavio-card rounded-2xl p-5"
          style={{
            border: `1px solid ${PC.primaryBorder40}`,
            backgroundColor: PC.glassBg,
            WebkitBackdropFilter: PC.glassBlur,
            backdropFilter: PC.glassBlur,
          }}
        >
          <div className="flex items-start gap-3">
            <div className="text-2xl" aria-hidden>
              🗂️
            </div>
            <div className="flex-1 space-y-3">
              <h2 className="text-lg font-semibold" style={{ color: PC.text }}>
                Comment ça marche ?
              </h2>
              <div className="space-y-2 text-sm" style={{ color: PC.muted }}>
                <p>① Créez un dossier — Renseignez le logement concerné et les coordonnées du candidat</p>
                <p>
                  ② Le candidat reçoit un lien — Il complète son dossier en ligne (situation pro, revenus, garant,
                  documents)
                </p>
                <p>
                  ③ Vous recevez le score — Locavio analyse le dossier et attribue une note de A (excellent) à E
                  (insuffisant)
                </p>
              </div>
              <Link href="/dossiers/nouveau" className="inline-flex">
                <BtnPrimary>Créer mon premier dossier</BtnPrimary>
              </Link>
            </div>
          </div>
        </div>
      ) : null}
      {loading ? <div className="locavio-card rounded-xl p-4">Chargement...</div> : null}
      {!loading && filteredRows.length === 0 ? (
        <div className="locavio-empty-state">
          <IconFolder className="h-10 w-10" />
          <p style={{ color: PC.muted }}>Aucun dossier créé. Envoyez votre premier questionnaire.</p>
        </div>
      ) : null}
      <div className="space-y-3">
        {filteredRows.map((row) => {
          const token = row.candidature_tokens?.[0];
          const form = row.candidature_formulaires?.[0];
          const expired = token?.expire_at ? new Date(token.expire_at).getTime() < Date.now() : false;
          const note = form?.note ?? "";
          const scoreValue = Number(form?.score ?? 0);
          const noteColor = NOTE_COLORS[note] ?? { bg: PC.cardHover, color: PC.text };
          const labelStatut = row.statut === "en_attente" ? "En attente" : row.statut === "recu" ? "Reçu" : "Analysé";
          return (
            <div key={row.id} className="locavio-card rounded-xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold"
                    style={{
                      backgroundColor: noteColor.bg,
                      color: noteColor.color,
                      minWidth: 48,
                    }}
                    aria-label={`Note ${note || "N/A"}`}
                    title={`Note ${note || "N/A"}`}
                  >
                    {note || "-"}
                  </div>
                  <Link href={`/dossiers/${row.id}`} className="min-w-0 flex-1">
                    <p className="font-semibold">{token?.prenom_candidat} {token?.nom_candidat}</p>
                    <p className="text-sm" style={{ color: PC.muted }}>{row.logement_concerne}</p>
                    <p className="mt-2 text-xs" style={{ color: PC.tertiary }}>
                      Créé le {new Date(row.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  </Link>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full px-2 py-1" style={{ backgroundColor: PC.primaryBg15, color: PC.secondary }}>{labelStatut}</span>
                    {form ? (
                      <div className="flex items-baseline gap-0.5">
                        <span className={`text-2xl font-bold ${
                          scoreValue >= 85 ? "text-emerald-400" :
                          scoreValue >= 70 ? "text-green-400" :
                          scoreValue >= 41 ? "text-orange-400" :
                          "text-red-400"
                        }`}>
                          {scoreValue}
                        </span>
                        <span className="text-sm opacity-60 text-white">/100</span>
                      </div>
                    ) : null}
                    <span className="rounded-full px-2 py-1" style={{ backgroundColor: expired ? PC.dangerBg10 : PC.successBg10, color: expired ? PC.danger : PC.success }}>
                      {expired ? "Lien expiré" : "Lien valide"}
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label="Supprimer le dossier"
                    onClick={() => setDeleteTargetId(row.id)}
                    className="rounded-lg p-2 transition-colors"
                    style={{ color: PC.muted }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = PC.danger;
                      e.currentTarget.style.backgroundColor = PC.dangerBg10;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = PC.muted;
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <IconTrash className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <ConfirmModal
        open={deleteTargetId != null}
        title="Supprimer ce dossier ?"
        description="Cette action est irréversible. Les documents associés seront également supprimés."
        confirmLabel="Supprimer"
        variant="danger"
        loading={isDeleting}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={() => void handleDelete()}
      />
    </section>
  );
}
