"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { IconPlus } from "@/components/proplio-icons";
import { createInitialPiecesData } from "@/lib/etat-des-lieux/defaults";
import { getEdlTypeEtatFromRow, normalizeEdlTypeEtatInput } from "@/lib/etat-des-lieux/edl-type-etat";
import { getCurrentProprietaireId } from "@/lib/proprietaire-profile";
import { formatSubmitError } from "@/lib/supabase-submit-error";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
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
  const [emailSendingId, setEmailSendingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; statut: string } | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const { proprietaireId, error: pe } = await getCurrentProprietaireId();
    if (pe || !proprietaireId) {
      setError(pe ? formatSubmitError(pe) : "Session invalide.");
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

    if (logIds.length) {
      const { data: logs } = await supabase.from("logements").select("id, nom, adresse").in("id", logIds);
      for (const l of logs ?? []) {
        const row = l as { id: string; nom: string; adresse: string };
        map[`log:${row.id}`] = row.nom || row.adresse || row.id;
      }
    }
    if (locIds.length) {
      const { data: locs } = await supabase.from("locataires").select("id, prenom, nom").in("id", locIds);
      for (const l of locs ?? []) {
        const row = l as { id: string; prenom: string; nom: string };
        map[`loc:${row.id}`] = `${row.prenom} ${row.nom}`.trim();
      }
    }
    setLabels(map);

    const { data: bauxRows } = await supabase
      .from("baux")
      .select("id, logement_id, locataire_id, statut, type_bail")
      .eq("proprietaire_id", proprietaireId)
      .eq("statut", "actif");

    const bailList: BailOpt[] = [];
    for (const b of bauxRows ?? []) {
      const row = b as {
        id: string;
        logement_id: string | null;
        locataire_id: string | null;
        type_bail?: string | null;
      };
      const { data: log } = row.logement_id
        ? await supabase.from("logements").select("nom, adresse").eq("id", row.logement_id).maybeSingle()
        : { data: null };
      const { data: loc } = row.locataire_id
        ? await supabase.from("locataires").select("prenom, nom").eq("id", row.locataire_id).maybeSingle()
        : { data: null };
      const logL = log as { nom?: string; adresse?: string } | null;
      const locL = loc as { prenom?: string; nom?: string } | null;
      const ln = logL?.nom || logL?.adresse || "Logement";
      const tn = `${locL?.prenom ?? ""} ${locL?.nom ?? ""}`.trim() || "Locataire";
      bailList.push({
        id: row.id,
        logement_id: row.logement_id,
        locataire_id: row.locataire_id,
        type_bail: typeBailToLogement(row.type_bail),
        label: `${tn} — ${ln}`,
      });
    }
    setBauxOptions(bailList);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!bailId || typeEtat !== "sortie") {
      setEntreesOptions([]);
      setEntreeId("");
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("etats_des_lieux")
        .select("id, date_etat")
        .eq("bail_id", bailId)
        .or("type.eq.entree,type_etat.eq.entree")
        .order("created_at", { ascending: false });
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
  }, [bailId, typeEtat]);

  useEffect(() => {
    if (!bailId) return;
    const b = bauxOptions.find((x) => x.id === bailId);
    if (b) setTypeLogement(b.type_bail);
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

    console.log("[etats-des-lieux] INSERT payload (exact object envoyé à Supabase)", insertPayload);
    try {
      console.log(
        "[etats-des-lieux] INSERT payload JSON",
        JSON.stringify(insertPayload, null, 2),
      );
    } catch (jsonErr) {
      console.warn("[etats-des-lieux] INSERT payload — JSON.stringify impossible", jsonErr);
    }

    const { data: inserted, error: insErr } = await supabase
      .from("etats_des_lieux")
      .insert(insertPayload)
      .select("id")
      .maybeSingle();

    setSubmitting(false);
    if (insErr || !inserted?.id) {
      if (insErr) {
        console.log("[etats-des-lieux] INSERT erreur Supabase (objet complet)", insErr);
        console.log("[etats-des-lieux] INSERT erreur champs", {
          message: insErr.message,
          details: insErr.details,
          hint: insErr.hint,
          code: insErr.code,
        });
      }
      setError(
        insErr
          ? formatSupabaseInsertError(insErr)
          : "Création impossible (aucune ligne retournée).",
      );
      return;
    }
    setModal(false);
    router.push(`/etats-des-lieux/${inserted.id}`);
  }

  async function onSendEmail(id: string) {
    setEmailSendingId(id);
    setError("");
    try {
      const res = await fetch(`/api/etats-des-lieux/${id}/send`, { method: "POST" });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) setError(j.error ?? "Envoi impossible.");
    } finally {
      setEmailSendingId(null);
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
  }

  const subtitle = useMemo(() => {
    return (r: EdlRow) => {
      const loc = r.locataire_id ? labels[`loc:${r.locataire_id}`] : "";
      const log = r.logement_id ? labels[`log:${r.logement_id}`] : "";
      return [loc, log].filter(Boolean).join(" · ") || "—";
    };
  }, [labels]);

  return (
    <section className="proplio-page-wrap space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-proplio-text">États des lieux</h1>
          <p className="mt-2 text-sm text-proplio-muted">
            États d&apos;entrée et de sortie, photos, compteurs et PDF Proplio.
          </p>
        </div>
        <button
          type="button"
          className="proplio-btn-primary inline-flex items-center gap-2 px-5 py-2.5"
          onClick={() => {
            setBailId("");
            setTypeEtat("entree");
            setEntreeId("");
            setDateEtat(new Date().toISOString().slice(0, 10));
            setTypeLogement("vide");
            setError("");
            setModal(true);
          }}
        >
          <IconPlus className="h-4 w-4" />
          Nouvel état des lieux
        </button>
      </div>

      {error ? (
        <p className="proplio-alert-error whitespace-pre-wrap break-words">{error}</p>
      ) : null}

      {loading ? (
        <div className="proplio-card p-6 text-sm text-proplio-muted">Chargement…</div>
      ) : rows.length === 0 ? (
        <div className="proplio-card p-8 text-center text-sm text-proplio-muted">
          Aucun état des lieux. Créez-en un pour commencer.
        </div>
      ) : (
        <div className="proplio-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-proplio-border">
              <thead className="bg-proplio-card">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-proplio-secondary">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-proplio-secondary">
                    Locataire / Logement
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-proplio-secondary">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-proplio-secondary">
                    Statut
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-proplio-secondary">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-proplio-border">
                {rows.map((r, i) => (
                  <tr
                    key={r.id}
                    className={
                      i % 2 === 0
                        ? "bg-proplio-bg/40 hover:bg-proplio-primary/10"
                        : "bg-proplio-card/60 hover:bg-proplio-primary/10"
                    }
                  >
                    <td className="px-4 py-3">
                      <span
                        className={
                          getEdlTypeEtatFromRow(r as EdlRow & Record<string, unknown>) === "entree"
                            ? "inline-flex rounded-full bg-proplio-success/20 px-2.5 py-1 text-xs font-medium text-proplio-success"
                            : "inline-flex rounded-full bg-proplio-warning/15 px-2.5 py-1 text-xs font-medium text-proplio-warning"
                        }
                      >
                        {getEdlTypeEtatFromRow(r as EdlRow & Record<string, unknown>) === "entree"
                          ? "Entrée"
                          : "Sortie"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-proplio-text">{subtitle(r)}</td>
                    <td className="px-4 py-3 text-sm text-proplio-muted">
                      {r.date_etat ? new Date(r.date_etat).toLocaleDateString("fr-FR") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          r.statut === "termine"
                            ? "inline-flex rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-medium text-red-600"
                            : "inline-flex rounded-full bg-proplio-warning/15 px-2.5 py-1 text-xs font-medium text-proplio-warning"
                        }
                      >
                        {r.statut === "termine" ? "Finalisé" : "En cours"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        {r.statut !== "termine" ? (
                          <Link href={`/etats-des-lieux/${r.id}`} className="proplio-btn-secondary py-1.5 text-xs">
                            Continuer / Modifier
                          </Link>
                        ) : (
                          <Link href={`/etats-des-lieux/${r.id}`} className="proplio-btn-secondary py-1.5 text-xs">
                            Voir
                          </Link>
                        )}
                        {r.statut === "termine" ? (
                          <>
                            <a
                              href={`/api/etats-des-lieux/${r.id}/pdf`}
                              target="_blank"
                              rel="noreferrer"
                              className="proplio-btn-secondary py-1.5 text-xs"
                            >
                              PDF
                            </a>
                            <button
                              type="button"
                              disabled={emailSendingId === r.id}
                              onClick={() => void onSendEmail(r.id)}
                              className="proplio-btn-primary py-1.5 text-xs disabled:opacity-60"
                            >
                              {emailSendingId === r.id ? "…" : "E-mail"}
                            </button>
                          </>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setDeleteTarget({ id: r.id, statut: r.statut })}
                          className="rounded-lg border border-proplio-danger/40 px-2 py-1.5 text-xs text-proplio-danger hover:bg-proplio-danger/10"
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="proplio-card w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-proplio-text">Supprimer l&apos;état des lieux</h2>
            <p className="mt-3 text-sm text-proplio-muted">
              {deleteTarget.statut === "termine"
                ? "Attention, cet état des lieux est finalisé et a valeur légale. Êtes-vous sûr de vouloir le supprimer définitivement ?"
                : "Êtes-vous sûr de vouloir supprimer cet état des lieux ?"}
            </p>
            <p className="mt-2 text-xs text-proplio-muted">
              Les photos associées seront également supprimées du stockage.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="proplio-btn-secondary"
                disabled={deleteSubmitting}
                onClick={() => setDeleteTarget(null)}
              >
                Annuler
              </button>
              <button
                type="button"
                className="rounded-xl border border-proplio-danger/50 bg-proplio-danger/15 px-4 py-2.5 text-sm font-medium text-proplio-danger transition hover:bg-proplio-danger/25 disabled:opacity-50"
                disabled={deleteSubmitting}
                onClick={() => void executeDeleteConfirmed()}
              >
                {deleteSubmitting
                  ? "…"
                  : deleteTarget.statut === "termine"
                    ? "Supprimer définitivement"
                    : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {modal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="proplio-card max-h-[90vh] w-full max-w-lg overflow-y-auto p-6">
            <h2 className="text-lg font-semibold text-proplio-text">Nouvel état des lieux</h2>
            <form onSubmit={onCreate} className="mt-4 space-y-4">
              <label className="proplio-label">
                <span>Bail</span>
                <select
                  className="proplio-select"
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
                <legend className="text-sm text-proplio-muted">Type</legend>
                <label className="flex items-center gap-2 text-sm text-proplio-text">
                  <input
                    type="radio"
                    name="te"
                    checked={typeEtat === "entree"}
                    onChange={() => setTypeEtat("entree")}
                  />
                  Entrée
                </label>
                <label className="flex items-center gap-2 text-sm text-proplio-text">
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
                <label className="proplio-label">
                  <span>État d&apos;entrée à comparer</span>
                  <select
                    className="proplio-select"
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
              <label className="proplio-label">
                <span>Date</span>
                <input
                  type="date"
                  className="proplio-input"
                  required
                  value={dateEtat}
                  onChange={(e) => setDateEtat(e.target.value)}
                />
              </label>
              <label className="proplio-label">
                <span>Type de logement</span>
                <p className="mb-1 text-xs text-proplio-muted">
                  Pré-rempli automatiquement selon le type de bail ; vous pouvez l&apos;ajuster si besoin.
                </p>
                <select
                  className="proplio-select"
                  value={typeLogement}
                  onChange={(e) => setTypeLogement(e.target.value as "meuble" | "vide")}
                >
                  <option value="vide">Vide</option>
                  <option value="meuble">Meublé</option>
                </select>
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="proplio-btn-secondary" onClick={() => setModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="proplio-btn-primary" disabled={submitting}>
                  {submitting ? "…" : "Commencer l'état des lieux"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
