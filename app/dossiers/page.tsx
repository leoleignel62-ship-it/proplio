"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Eye } from "lucide-react";
import { IconBuilding, IconFolder, IconPlus, IconTrash } from "@/components/locavio-icons";
import { PlanFreeModuleUpsell } from "@/components/plan-free-module-upsell";
import { BtnDanger, BtnPrimary, BtnSecondary, ConfirmModal } from "@/components/ui";
import { PC } from "@/lib/locavio-colors";
import { canAccessDocuments, getOwnerPlan, type LocavioPlan } from "@/lib/plan-limits";
import { getCurrentProprietaireId } from "@/lib/proprietaire-profile";
import { supabase } from "@/lib/supabase";

function getDossierScoreAccentColor(score: number | null): string {
  if (score == null || Number.isNaN(score)) return "#9ca3af";
  if (score >= 70) return "#10b981";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
}

function getDossierScoreDisplayColor(score: number): string {
  if (score >= 70) return "#10b981";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
}

function getDossierStatutBadge(statut: string): { label: string; bg: string; color: string } {
  switch (statut) {
    case "en_attente":
      return { label: "En attente", bg: PC.primaryBg15, color: PC.secondary };
    case "recu":
      return { label: "Reçu", bg: PC.primaryBg15, color: PC.secondary };
    case "analyse":
      return { label: "Analysé", bg: PC.primaryBg15, color: PC.secondary };
    case "accepte":
      return { label: "Accepté", bg: PC.successBg20, color: PC.success };
    case "refuse":
      return { label: "Refusé", bg: PC.dangerBg15, color: PC.danger };
    default:
      return { label: "Analysé", bg: PC.primaryBg15, color: PC.secondary };
  }
}

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
  const [hoveredDossierId, setHoveredDossierId] = useState<string | null>(null);

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
      if (!canAccessDocuments(plan)) {
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

  if (!loading && currentPlan && !canAccessDocuments(currentPlan)) {
    return <PlanFreeModuleUpsell variant="dossiers" requiredPlan="pro" />;
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
      {filteredRows.length > 0 ? (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-4 text-xs" style={{ color: PC.muted }}>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: "#10b981" }} aria-hidden />
              <span>Score ≥ 70</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: "#f59e0b" }} aria-hidden />
              <span>Score 40-70</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: "#ef4444" }} aria-hidden />
              <span>Score &lt; 40</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: "#9ca3af" }} aria-hidden />
              <span>En attente</span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredRows.map((row) => {
              const token = row.candidature_tokens?.[0];
              const form = row.candidature_formulaires?.[0];
              const expired = token?.expire_at ? new Date(token.expire_at).getTime() < Date.now() : false;
              const hasScore = form != null && form.score != null && form.score !== undefined;
              const scoreNumber = hasScore ? Number(form.score) : null;
              const accentColor = getDossierScoreAccentColor(scoreNumber);
              const statutBadge = getDossierStatutBadge(row.statut);
              const isHovered = hoveredDossierId === row.id;
              const candidatNom = [token?.prenom_candidat, token?.nom_candidat].filter(Boolean).join(" ").trim() || "Candidat";
              return (
                <article
                  key={row.id}
                  className="flex flex-row overflow-hidden rounded-xl border transition-colors duration-200"
                  style={{
                    backgroundColor: PC.card,
                    border: `1px solid ${isHovered ? PC.primary : PC.border}`,
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
                  }}
                  onMouseEnter={() => setHoveredDossierId(row.id)}
                  onMouseLeave={() => setHoveredDossierId(null)}
                >
                  <div
                    className="shrink-0 self-stretch"
                    style={{ width: 3, backgroundColor: accentColor }}
                    aria-hidden
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="p-4 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="min-w-0 flex-1 text-base font-semibold leading-snug">{candidatNom}</h3>
                        <span
                          className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{ backgroundColor: statutBadge.bg, color: statutBadge.color }}
                        >
                          {statutBadge.label}
                        </span>
                      </div>
                      <p className="mt-2 flex items-center gap-1.5 text-sm" style={{ color: PC.muted }}>
                        <IconBuilding className="h-4 w-4 shrink-0" aria-hidden />
                        <span className="min-w-0 truncate">{row.logement_concerne}</span>
                      </p>
                      <p className="mt-1 text-xs" style={{ color: PC.muted }}>
                        Créé le {new Date(row.created_at).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <div className="px-4 py-2" style={{ borderTop: `1px solid ${PC.border}` }}>
                      {hasScore && scoreNumber != null && !Number.isNaN(scoreNumber) ? (
                        <p className="flex items-baseline gap-1">
                          <span className="text-2xl font-bold" style={{ color: getDossierScoreDisplayColor(scoreNumber) }}>
                            {scoreNumber}
                          </span>
                          <span className="text-sm" style={{ color: PC.muted }}>
                            /100
                          </span>
                        </p>
                      ) : (
                        <p className="text-sm italic" style={{ color: PC.muted }}>
                          En attente de complétion
                        </p>
                      )}
                      <span
                        className="mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                        style={
                          expired
                            ? { backgroundColor: "#f3f4f6", color: "#6b7280" }
                            : { backgroundColor: PC.successBg20, color: PC.success }
                        }
                      >
                        {expired ? "Lien expiré" : "Lien valide"}
                      </span>
                    </div>
                    <div className="px-4 py-3" style={{ borderTop: `1px solid ${PC.border}` }}>
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/dossiers/${row.id}`} className="inline-flex">
                          <BtnSecondary size="small" icon={<Eye className="h-4 w-4" aria-hidden />}>
                            Voir le dossier
                          </BtnSecondary>
                        </Link>
                        <BtnDanger
                          size="small"
                          icon={<IconTrash className="h-4 w-4" />}
                          onClick={() => setDeleteTargetId(row.id)}
                        >
                          Supprimer
                        </BtnDanger>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      ) : null}
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
