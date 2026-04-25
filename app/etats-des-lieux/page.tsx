"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { PlanFreeModuleUpsell } from "@/components/plan-free-module-upsell";
import { IconHome, IconPlus } from "@/components/proplio-icons";
import { BtnDanger, BtnEmail, BtnNeutral, BtnPdf, BtnPrimary, BtnSecondary, ConfirmModal, StatusBadge } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { createInitialPiecesData } from "@/lib/etat-des-lieux/defaults";
import { getEdlTypeEtatFromRow, normalizeEdlTypeEtatInput } from "@/lib/etat-des-lieux/edl-type-etat";
import { getCurrentProprietaireId } from "@/lib/proprietaire-profile";
import {
  canCreateEtatDesLieux,
  getMonthlyCreatedCount,
  getOwnerPlan,
  PLAN_FREE_EDL_BANNER,
  PLAN_LIMIT_ERROR_MESSAGE,
  PLAN_UPGRADE_PATH,
  type ProplioPlan,
} from "@/lib/plan-limits";
import { formatSubmitError } from "@/lib/supabase-submit-error";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { PC } from "@/lib/proplio-colors";
import { fieldInputStyle, fieldSelectStyle, panelCard } from "@/lib/proplio-field-styles";
import type { CSSProperties } from "react";
const EDL_GROUP_CARD: CSSProperties = { ...panelCard, padding: 16 };

type EdlRow = {
  id: string;
  bail_id: string | null;
  logement_id: string | null;
  locataire_id: string | null;
  /** Colonne historique */
  type_etat?: string | null;
  /** Colonne attendue par certains schémas SQL (entree | sortie) */
  type?: string | null;
  date_etat: string | null;
  statut: string;
  created_at?: string;
};

type BailOpt = {
  id: string;
  label: string;
  logement_id: string | null;
  locataire_id: string | null;
  type_bail: "meuble" | "vide";
};
type EntreeOpt = { id: string; label: string };

function typeBailToLogement(tb: string | null | undefined): "meuble" | "vide" {
  return tb === "meuble" ? "meuble" : "vide";
}

/** Erreur PostgREST / Supabase telle quelle pour le débogage (évite le message générique « champ obligatoire »). */
function formatSupabaseInsertError(e: {
  message?: string;
  details?: string | null;
  hint?: string | null;
  code?: string;
}): string {
  const lines: string[] = [];
  if (e.message?.trim()) lines.push(e.message.trim());
  if (e.details != null && String(e.details).trim()) {
    lines.push(`Détails : ${String(e.details).trim()}`);
  }
  if (e.hint != null && String(e.hint).trim()) {
    lines.push(`Indice : ${String(e.hint).trim()}`);
  }
  if (e.code?.trim()) lines.push(`Code : ${e.code.trim()}`);
  return lines.length > 0 ? lines.join("\n") : "Erreur Supabase sans message détaillé.";
}

export default function EtatsDesLieuxPage() {
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<EdlRow[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(false);
  const [bauxOptions, setBauxOptions] = useState<BailOpt[]>([]);
  const [entreesOptions, setEntreesOptions] = useState<EntreeOpt[]>([]);
  const [bailId, setBailId] = useState("");
  const [typeEtat, setTypeEtat] = useState<"entree" | "sortie">("entree");
  const [entreeId, setEntreeId] = useState("");
  const [dateEtat, setDateEtat] = useState(() => new Date().toISOString().slice(0, 10));
  const [typeLogement, setTypeLogement] = useState<"meuble" | "vide">("vide");
  const [submitting, setSubmitting] = useState(false);
  const [planLimitMessage, setPlanLimitMessage] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; statut: string } | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<ProplioPlan | null>(null);
  const logementFilter = searchParams.get("logement_id") ?? "";
  const prefillLogementId = searchParams.get("bail_logement_id") ?? "";
  const isPlanLimitReached = Boolean(planLimitMessage);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const { proprietaireId, error: pe } = await getCurrentProprietaireId();
    if (pe || !proprietaireId) {
      setError(pe ? formatSubmitError(pe) : "Session invalide.");
      setLoading(false);
      return;
    }

    const planEarly = await getOwnerPlan(proprietaireId);
    setCurrentPlan(planEarly);
    if (planEarly === "free") {
      setPlanLimitMessage(PLAN_FREE_EDL_BANNER);
      setRows([]);
      setLabels({});
      setBauxOptions([]);
      setLoading(false);
      return;
    }

    const { data: edlList, error: e1 } = await supabase
      .from("etats_des_lieux")
      .select("id, bail_id, logement_id, locataire_id, type, type_etat, date_etat, statut, created_at")
      .eq("proprietaire_id", proprietaireId)
      .order("created_at", { ascending: false });

    if (e1) {
      setError(formatSubmitError(e1));
      setRows([]);
      setLoading(false);
      return;
    }

    const list = (edlList ?? []) as EdlRow[];
    setRows(list);

    const logIds = [...new Set(list.map((r) => r.logement_id).filter(Boolean))] as string[];
    const locIds = [...new Set(list.map((r) => r.locataire_id).filter(Boolean))] as string[];
    const map: Record<string, string> = {};

    /** Tous les baux du propriétaire : ne pas filtrer sur `statut` seul à `actif`
     *  (données legacy, variante de casse, ou valeurs hors enum excluaient toute la liste). */
    const bauxQuery = supabase
      .from("baux")
      .select("id, logement_id, locataire_id, statut, type_bail")
      .eq("proprietaire_id", proprietaireId);

    const [logsRes, locsRes, bauxRes] = await Promise.all([
      logIds.length
        ? supabase.from("logements").select("id, nom, adresse").in("id", logIds)
        : Promise.resolve({ data: [] as { id: string; nom: string; adresse: string }[] }),
      locIds.length
        ? supabase.from("locataires").select("id, prenom, nom").in("id", locIds)
        : Promise.resolve({ data: [] as { id: string; prenom: string; nom: string }[] }),
      bauxQuery,
    ]);

    for (const l of logsRes.data ?? []) {
      map[`log:${l.id}`] = l.nom || l.adresse || l.id;
    }
    for (const l of locsRes.data ?? []) {
      map[`loc:${l.id}`] = `${l.prenom} ${l.nom}`.trim();
    }
    setLabels(map);

    const bauxRows = (bauxRes.data ?? []) as {
      id: string;
      logement_id: string | null;
      locataire_id: string | null;
      type_bail?: string | null;
    }[];
    const bailLogIds = [...new Set(bauxRows.map((b) => b.logement_id).filter(Boolean))] as string[];
    const bailLocIds = [...new Set(bauxRows.map((b) => b.locataire_id).filter(Boolean))] as string[];

    const [bailLogsRes, bailLocsRes] = await Promise.all([
      bailLogIds.length
        ? supabase.from("logements").select("id, nom, adresse").in("id", bailLogIds)
        : Promise.resolve({ data: [] as { id: string; nom: string; adresse: string }[] }),
      bailLocIds.length
        ? supabase.from("locataires").select("id, prenom, nom").in("id", bailLocIds)
        : Promise.resolve({ data: [] as { id: string; prenom: string; nom: string }[] }),
    ]);

    const logById = new Map((bailLogsRes.data ?? []).map((l) => [l.id, l]));
    const locById = new Map((bailLocsRes.data ?? []).map((l) => [l.id, l]));

    const bailList: BailOpt[] = bauxRows.map((row) => {
      const logL = row.logement_id ? logById.get(row.logement_id) : undefined;
      const locL = row.locataire_id ? locById.get(row.locataire_id) : undefined;
      const ln = logL?.nom || logL?.adresse || "Logement";
      const tn = `${locL?.prenom ?? ""} ${locL?.nom ?? ""}`.trim() || "Locataire";
      return {
        id: row.id,
        logement_id: row.logement_id,
        locataire_id: row.locataire_id,
        type_bail: typeBailToLogement(row.type_bail),
        label: `${tn} — ${ln}`,
      };
    });
    setBauxOptions(bailList);
    const monthlyCount = await getMonthlyCreatedCount("etats_des_lieux", proprietaireId);
    if (!canCreateEtatDesLieux(planEarly)) {
      setPlanLimitMessage("Limite atteinte. Passez au plan supérieur pour créer plus d'états des lieux.");
    } else {
      setPlanLimitMessage("");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    if (!bailId || typeEtat !== "sortie") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEntreesOptions([]);
      setEntreeId("");
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("etats_des_lieux")
        .select("id, date_etat")
        .eq("bail_id", bailId)
        .or("type.eq.entree,type_etat.eq.entree")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      setEntreesOptions(
        (data ?? []).map((r) => {
          const row = r as { id: string; date_etat: string | null };
          return {
            id: row.id,
            label: `Entrée du ${row.date_etat ? new Date(row.date_etat).toLocaleDateString("fr-FR") : "—"}`,
          };
        }),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [bailId, typeEtat]);

  useEffect(() => {
    if (!bailId) return;
    const b = bauxOptions.find((x) => x.id === bailId);
    if (b) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTypeLogement(b.type_bail);
    }
  }, [bailId, bauxOptions]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const { proprietaireId, error: pe } = await getCurrentProprietaireId();
    if (pe || !proprietaireId) {
      setError("Session invalide.");
      setSubmitting(false);
      return;
    }
    const bail = bauxOptions.find((b) => b.id === bailId);
    if (!bail) {
      setError("Sélectionnez un bail.");
      setSubmitting(false);
      return;
    }
    if (!bail.logement_id || !bail.locataire_id) {
      setError("Ce bail doit avoir un logement et un locataire renseignés.");
      setSubmitting(false);
      return;
    }
    if (typeEtat === "sortie" && !entreeId) {
      setError("Sélectionnez l'état des lieux d'entrée à comparer.");
      setSubmitting(false);
      return;
    }
    const plan = await getOwnerPlan(proprietaireId);
    if (plan === "free") {
      setError(PLAN_FREE_EDL_BANNER);
      setSubmitting(false);
      return;
    }
    const monthlyCount = await getMonthlyCreatedCount("etats_des_lieux", proprietaireId);
    if (!canCreateEtatDesLieux(plan)) {
      setError(PLAN_LIMIT_ERROR_MESSAGE);
      setSubmitting(false);
      return;
    }

    const typeLogementResolved: "meuble" | "vide" = typeLogement;
    const pieces = createInitialPiecesData(typeLogementResolved === "meuble", 1);
    const nowIso = new Date().toISOString();
    const typeNormalized = normalizeEdlTypeEtatInput(typeEtat);

    const insertPayload = {
      proprietaire_id: proprietaireId,
      bail_id: bail.id,
      logement_id: bail.logement_id,
      locataire_id: bail.locataire_id,
      type: typeNormalized,
      type_etat: typeNormalized,
      date_etat: dateEtat,
      type_logement: typeLogementResolved,
      statut: "en_cours",
      pieces,
      compteurs: pieces.compteurs ?? {},
      observations: pieces.observationsGenerales ?? "",
      cles_remises: pieces.clesRemises ?? 0,
      badges_remis: pieces.badgesRemis ?? 0,
      etat_entree_id: typeNormalized === "sortie" ? entreeId : null,
      email_envoye: false,
      updated_at: nowIso,
    };

    const { data: inserted, error: insErr } = await supabase
      .from("etats_des_lieux")
      .insert(insertPayload)
      .select("id")
      .maybeSingle();

    setSubmitting(false);
    if (insErr || !inserted?.id) {
      setError(
        insErr
          ? formatSupabaseInsertError(insErr)
          : "Création impossible (aucune ligne retournée).",
      );
      return;
    }
    setModal(false);
    toast.success("État des lieux créé.");
    router.push(`/etats-des-lieux/${inserted.id}`);
  }

  async function onSendEmail(id: string) {
    setError("");
    try {
      if (currentPlan === "free") {
        setError(PLAN_FREE_EDL_BANNER);
        return;
      }
      const res = await fetch(`/api/etats-des-lieux/${id}/send`, { method: "POST" });
      const j = (await res.json()) as { error?: string; to?: string[] };
      if (!res.ok) setError(j.error ?? "Envoi impossible.");
      else {
        toast.success(`Email envoyé à ${(j.to ?? []).join(", ") || "destinataire"}.`);
      }
    } catch (e) {
      setError(formatSubmitError(e));
    } finally {
      // no-op
    }
  }

  async function executeDeleteConfirmed() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteSubmitting(true);
    setError("");
    const { proprietaireId, error: pe } = await getCurrentProprietaireId();
    if (pe || !proprietaireId) {
      setError(pe ? formatSubmitError(pe) : "Session invalide.");
      setDeleteSubmitting(false);
      return;
    }
    if (currentPlan === "free") {
      setError(PLAN_FREE_EDL_BANNER);
      setDeleteSubmitting(false);
      return;
    }

    const { data: photos, error: phErr } = await supabase
      .from("photos_etat_des_lieux")
      .select("storage_path")
      .eq("etat_des_lieux_id", id);

    if (phErr) {
      setError(formatSubmitError(phErr));
      setDeleteSubmitting(false);
      return;
    }

    const paths = (photos ?? []).map((p) => (p as { storage_path: string }).storage_path).filter(Boolean);
    if (paths.length) {
      const { error: stErr } = await supabase.storage.from("etats-des-lieux").remove(paths);
      if (stErr) {
        setError(formatSubmitError(stErr));
        setDeleteSubmitting(false);
        return;
      }
    }

    const { error: delPhotosErr } = await supabase
      .from("photos_etat_des_lieux")
      .delete()
      .eq("etat_des_lieux_id", id);
    if (delPhotosErr) {
      setError(formatSubmitError(delPhotosErr));
      setDeleteSubmitting(false);
      return;
    }

    const { error: delEdlErr } = await supabase
      .from("etats_des_lieux")
      .delete()
      .eq("id", id)
      .eq("proprietaire_id", proprietaireId);

    setDeleteSubmitting(false);
    if (delEdlErr) {
      setError(formatSubmitError(delEdlErr));
      return;
    }

    setDeleteTarget(null);
    void load();
    toast.success("État des lieux supprimé.");
  }

  const filteredRows = useMemo(
    () => (logementFilter ? rows.filter((row) => row.logement_id === logementFilter) : rows),
    [rows, logementFilter],
  );

  if (!loading && currentPlan === "free") {
    return <PlanFreeModuleUpsell variant="etats-des-lieux" />;
  }

  const edlFreeBlocked = currentPlan === "free";

  return (
    <section className="proplio-page-wrap space-y-8" style={{ color: PC.text }}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="proplio-page-title">États des lieux</h1>
          <p className="proplio-page-subtitle max-w-xl">
            États d&apos;entrée et de sortie, photos, compteurs et PDF Proplio.
          </p>
        </div>
        <select
          value={logementFilter}
          disabled={edlFreeBlocked}
          onChange={(event) => {
            const next = event.target.value;
            router.push(next ? `/etats-des-lieux?logement_id=${encodeURIComponent(next)}` : "/etats-des-lieux");
          }}
          className="rounded-lg px-3 py-2 text-sm"
          style={{
            border: `1px solid ${PC.border}`,
            backgroundColor: PC.card,
            color: PC.text,
            opacity: edlFreeBlocked ? 0.55 : 1,
            cursor: edlFreeBlocked ? "not-allowed" : undefined,
          }}
        >
          <option value="">Tous les logements</option>
          {bauxOptions
            .map((b) => ({ id: b.logement_id ?? "", label: b.label.split(" — ").slice(1).join(" — ") || "Logement" }))
            .filter((item, index, arr) => item.id && arr.findIndex((x) => x.id === item.id) === index)
            .map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
        </select>
        <BtnPrimary
          icon={<IconPlus className="h-4 w-4" />}
          disabled={isPlanLimitReached}
          style={{ opacity: isPlanLimitReached ? 0.55 : 1, cursor: isPlanLimitReached ? "not-allowed" : "pointer" }}
          onClick={() => {
            if (isPlanLimitReached) return;
            const preselected = bauxOptions.find((b) => b.logement_id === prefillLogementId)?.id ?? "";
            setBailId(preselected);
            setTypeEtat("entree");
            setEntreeId("");
            setDateEtat(new Date().toISOString().slice(0, 10));
            setTypeLogement("vide");
            setError("");
            setModal(true);
          }}
        >
          Nouvel état des lieux
        </BtnPrimary>
      </div>

      {isPlanLimitReached ? (
        <div className="rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: PC.warningBg15, color: PC.warning, border: `1px solid ${PC.border}` }}>
          <div className="flex items-center justify-between gap-3">
            <p>⚠️ {planLimitMessage}</p>
            <a href={PLAN_UPGRADE_PATH} className="rounded-md px-3 py-1 text-xs font-medium" style={{ backgroundColor: PC.primary, color: PC.white }}>
              Voir les plans
            </a>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: PC.dangerBg10, color: PC.danger }}>
          <p>{error}</p>
          {error === PLAN_LIMIT_ERROR_MESSAGE || error === PLAN_FREE_EDL_BANNER ? (
            <p className="mt-2">
              <a href={PLAN_UPGRADE_PATH} className="underline" style={{ color: PC.danger }}>
                Voir les abonnements
              </a>
            </p>
          ) : null}
        </div>
      ) : null}
      {loading ? (
        <div className="p-6 text-sm" style={{ ...panelCard, color: PC.muted }}>
          Chargement…
        </div>
      ) : rows.length === 0 ? (
        <div className="p-8 text-center text-sm" style={{ ...panelCard, color: PC.muted }}>
          Aucun état des lieux. Créez-en un pour commencer.
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(new Set(filteredRows.map((r) => r.logement_id).filter(Boolean))).map((logementId) => {
            const groupRows = filteredRows.filter((r) => r.logement_id === logementId);
            if (!groupRows.length) return null;
            const first = groupRows[0]!;
            return (
              <section key={logementId} className="space-y-4">
                <header className="pb-3" style={{ borderBottom: `1px solid ${PC.border}` }}>
                  <div className="flex items-center gap-2">
                    <IconHome className="h-4 w-4" style={{ color: PC.secondary }} />
                    <h2 className="text-lg font-semibold">{labels[`log:${logementId}`] || "Logement"}</h2>
                    <span className="text-sm" style={{ color: PC.muted }}>
                      ({groupRows.length} états des lieux)
                    </span>
                  </div>
                  <p className="mt-1 text-xs" style={{ color: PC.muted }}>
                    {first.logement_id ? labels[`log:${first.logement_id}`] : ""}
                  </p>
                </header>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {groupRows.map((r) => (
                    <article key={r.id} className="rounded-xl" style={EDL_GROUP_CARD}>
                      <span
                        className="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
                        style={
                          getEdlTypeEtatFromRow(r as EdlRow & Record<string, unknown>) === "entree"
                            ? { backgroundColor: PC.successBg20, color: PC.success }
                            : { backgroundColor: PC.warningBg15, color: PC.warning }
                        }
                      >
                        {getEdlTypeEtatFromRow(r as EdlRow & Record<string, unknown>) === "entree" ? "Entrée" : "Sortie"}
                      </span>
                      <p className="mt-2 font-medium tracking-tight">{r.locataire_id ? labels[`loc:${r.locataire_id}`] : "—"}</p>
                      <p className="mt-1 text-sm" style={{ color: PC.muted }}>
                        {r.date_etat ? new Date(r.date_etat).toLocaleDateString("fr-FR") : "—"}
                      </p>
                      <div className="mt-2">
                        <StatusBadge
                          status={r.statut === "termine" ? "finalise" : "en_cours"}
                          label={r.statut === "termine" ? "Finalisé" : "En cours"}
                        />
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {edlFreeBlocked ? (
                          <BtnNeutral size="small" disabled style={{ opacity: 0.5 }}>
                            Ouvrir
                          </BtnNeutral>
                        ) : (
                          <BtnSecondary size="small" onClick={() => router.push(`/etats-des-lieux/${r.id}`)}>
                            Ouvrir
                          </BtnSecondary>
                        )}
                        {edlFreeBlocked ? (
                          <BtnPdf size="small" disabled style={{ opacity: 0.5 }}>
                            Télécharger PDF
                          </BtnPdf>
                        ) : (
                          <BtnPdf
                            size="small"
                            onClick={() => window.open(`/api/etats-des-lieux/${r.id}/pdf`, "_blank", "noopener,noreferrer")}
                          >
                            Télécharger PDF
                          </BtnPdf>
                        )}
                        <BtnEmail
                          size="small"
                          disabled={edlFreeBlocked}
                          style={{
                            opacity: edlFreeBlocked ? 0.5 : 1,
                            cursor: edlFreeBlocked ? "not-allowed" : "pointer",
                          }}
                          onClick={() => void onSendEmail(r.id)}
                        >
                          Envoyer par email
                        </BtnEmail>
                        <BtnDanger
                          size="small"
                          disabled={edlFreeBlocked}
                          style={{
                            opacity: edlFreeBlocked ? 0.5 : 1,
                            cursor: edlFreeBlocked ? "not-allowed" : "pointer",
                          }}
                          onClick={() => setDeleteTarget({ id: r.id, statut: r.statut })}
                        >
                          Supprimer
                        </BtnDanger>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <ConfirmModal
        open={deleteTarget != null}
        title="Supprimer l'état des lieux"
        description={
          (deleteTarget?.statut === "termine"
            ? "Attention, cet état des lieux est finalisé et a valeur légale. "
            : "") +
          "Êtes-vous sûr de vouloir supprimer cet état des lieux ? Les photos associées seront également supprimées du stockage. Cette action est irréversible."
        }
        loading={deleteSubmitting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void executeDeleteConfirmed()}
      />

      {modal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-safari">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto p-6" style={panelCard}>
            <h2 className="text-lg font-semibold">Nouvel état des lieux</h2>
            <form onSubmit={onCreate} className="mt-4 space-y-4">
              <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                <span>Bail</span>
                <select
                  style={fieldSelectStyle}
                  required
                  value={bailId}
                  onChange={(e) => setBailId(e.target.value)}
                >
                  <option value="">Sélectionner…</option>
                  {bauxOptions.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </label>
              <fieldset className="space-y-2">
                <legend className="text-sm" style={{ color: PC.muted }}>
                  Type
                </legend>
                <label className="flex items-center gap-2 text-sm" style={{ color: PC.text }}>
                  <input
                    type="radio"
                    name="te"
                    checked={typeEtat === "entree"}
                    onChange={() => setTypeEtat("entree")}
                  />
                  Entrée
                </label>
                <label className="flex items-center gap-2 text-sm" style={{ color: PC.text }}>
                  <input
                    type="radio"
                    name="te"
                    checked={typeEtat === "sortie"}
                    onChange={() => setTypeEtat("sortie")}
                  />
                  Sortie
                </label>
              </fieldset>
              {typeEtat === "sortie" ? (
                <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                  <span>État d&apos;entrée à comparer</span>
                  <select
                    style={fieldSelectStyle}
                    required
                    value={entreeId}
                    onChange={(e) => setEntreeId(e.target.value)}
                  >
                    <option value="">Sélectionner…</option>
                    {entreesOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                <span>Date</span>
                <input
                  type="date"
                  style={fieldInputStyle}
                  required
                  value={dateEtat}
                  onChange={(e) => setDateEtat(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                <span>Type de logement</span>
                <p className="mb-1 text-xs" style={{ color: PC.muted }}>
                  Pré-rempli automatiquement selon le type de bail ; vous pouvez l&apos;ajuster si besoin.
                </p>
                <select
                  style={fieldSelectStyle}
                  value={typeLogement}
                  onChange={(e) => setTypeLogement(e.target.value as "meuble" | "vide")}
                >
                  <option value="vide">Vide</option>
                  <option value="meuble">Meublé</option>
                </select>
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <BtnNeutral onClick={() => setModal(false)}>Annuler</BtnNeutral>
                <BtnPrimary type="submit" disabled={submitting} loading={submitting}>
                  Commencer l&apos;état des lieux
                </BtnPrimary>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
