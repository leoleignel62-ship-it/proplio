"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { PlanFreeModuleUpsell } from "@/components/plan-free-module-upsell";
import { IconPlus } from "@/components/proplio-icons";
import { normalizePiecesData } from "@/lib/etat-des-lieux/defaults";
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
import { PC } from "@/lib/proplio-colors";
import { fieldInputStyle, fieldSelectStyle, panelCard } from "@/lib/proplio-field-styles";

type ReservationOpt = {
  id: string;
  logement_id: string | null;
  voyageur_id: string | null;
  voyageurLabel: string;
  logementLabel: string;
  date_arrivee: string;
  date_depart: string;
};

type EdlRow = {
  id: string;
  reservation_id: string | null;
  bail_id: string | null;
  logement_id: string | null;
  type_etat?: string | null;
  type?: string | null;
  date_etat: string | null;
  statut: string;
  created_at?: string;
};

type EntreeOpt = { id: string; label: string };

function createSaisonnierPiecesData() {
  return normalizePiecesData(
    {
      version: 1,
      rooms: [
        {
          id: "salon",
          label: "Salon / Séjour",
          enabled: true,
          elements: {
            murs: { state: "bon", comment: "", photoPath: null },
            sol: { state: "bon", comment: "", photoPath: null },
            mobilier: { state: "bon", comment: "", photoPath: null },
            fenetres: { state: "bon", comment: "", photoPath: null },
          },
        },
        {
          id: "cuisine",
          label: "Cuisine",
          enabled: true,
          elements: {
            murs: { state: "bon", comment: "", photoPath: null },
            sol: { state: "bon", comment: "", photoPath: null },
            equipements: { state: "bon", comment: "", photoPath: null },
            menuiseries: { state: "bon", comment: "", photoPath: null },
          },
        },
        {
          id: "chambre_1",
          label: "Chambre 1",
          enabled: true,
          elements: {
            murs: { state: "bon", comment: "", photoPath: null },
            sol: { state: "bon", comment: "", photoPath: null },
            mobilier: { state: "bon", comment: "", photoPath: null },
            menuiseries: { state: "bon", comment: "", photoPath: null },
          },
        },
        {
          id: "chambre_2",
          label: "Chambre 2",
          enabled: false,
          elements: {
            murs: { state: "bon", comment: "", photoPath: null },
            sol: { state: "bon", comment: "", photoPath: null },
            mobilier: { state: "bon", comment: "", photoPath: null },
            menuiseries: { state: "bon", comment: "", photoPath: null },
          },
        },
        {
          id: "salle_de_bain",
          label: "Salle de bain",
          enabled: true,
          elements: {
            murs: { state: "bon", comment: "", photoPath: null },
            sol: { state: "bon", comment: "", photoPath: null },
            equipements: { state: "bon", comment: "", photoPath: null },
            menuiseries: { state: "bon", comment: "", photoPath: null },
          },
        },
        {
          id: "wc",
          label: "WC",
          enabled: true,
          elements: {
            murs: { state: "bon", comment: "", photoPath: null },
            sol: { state: "bon", comment: "", photoPath: null },
            equipements: { state: "bon", comment: "", photoPath: null },
            menuiseries: { state: "bon", comment: "", photoPath: null },
          },
        },
        {
          id: "exterieur",
          label: "Extérieur / Terrasse",
          enabled: false,
          elements: {
            murs: { state: "bon", comment: "", photoPath: null },
            sol: { state: "bon", comment: "", photoPath: null },
            equipements: { state: "bon", comment: "", photoPath: null },
            menuiseries: { state: "bon", comment: "", photoPath: null },
          },
        },
      ],
      compteurs: {
        electricite: { index: "", photoPath: null },
        eauFroide: { index: "", photoPath: null },
        eauChaude: { index: "", photoPath: null },
        gaz: { index: "", photoPath: null },
      },
      clesRemises: 0,
      badgesRemis: 0,
      observationsGenerales: "",
    },
    true,
  );
}

export default function EtatsDesLieuxSaisonnierPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPlan, setCurrentPlan] = useState<ProplioPlan | null>(null);
  const [rows, setRows] = useState<EdlRow[]>([]);
  const [reservations, setReservations] = useState<ReservationOpt[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reservationId, setReservationId] = useState("");
  const [typeEtat, setTypeEtat] = useState<"entree" | "sortie">("entree");
  const [entreeId, setEntreeId] = useState("");
  const [entreesOptions, setEntreesOptions] = useState<EntreeOpt[]>([]);
  const [dateEtat, setDateEtat] = useState(() => new Date().toISOString().slice(0, 10));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; statut: string } | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [planLimitMessage, setPlanLimitMessage] = useState("");

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

    const plan = await getOwnerPlan(proprietaireId);
    setCurrentPlan(plan);
    if (plan === "free") {
      setPlanLimitMessage(PLAN_FREE_EDL_BANNER);
      setLoading(false);
      return;
    }

    const [edlRes, resaRes] = await Promise.all([
      supabase
        .from("etats_des_lieux")
        .select("id, reservation_id, bail_id, logement_id, type, type_etat, date_etat, statut, created_at")
        .eq("proprietaire_id", proprietaireId)
        .not("reservation_id", "is", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("reservations")
        .select("id, logement_id, voyageur_id, date_arrivee, date_depart, logements(nom), voyageurs(prenom, nom)")
        .eq("proprietaire_id", proprietaireId)
        .neq("source", "blocage")
        .order("date_arrivee", { ascending: false }),
    ]);

    if (edlRes.error || resaRes.error) {
      if (
        edlRes.error &&
        (edlRes.error.message.includes("reservation_id") || edlRes.error.details?.includes("reservation_id"))
      ) {
        setError(
          "La colonne reservation_id est absente de la table etats_des_lieux. Exécutez la migration SQL fournie puis rechargez la page.",
        );
        setLoading(false);
        return;
      }
      setError(formatSubmitError(edlRes.error ?? resaRes.error));
      setLoading(false);
      return;
    }

    setRows((edlRes.data ?? []) as EdlRow[]);

    const resaList = (resaRes.data ?? []).map((r) => {
      const rec = r as Record<string, unknown>;
      const vg = rec.voyageurs;
      const lg = rec.logements;
      const voyageursJoin = Array.isArray(vg) ? vg[0] as Record<string, unknown> : vg as Record<string, unknown> | null;
      const logementsJoin = Array.isArray(lg) ? lg[0] as Record<string, unknown> : lg as Record<string, unknown> | null;
      return {
        id: String(rec.id),
        logement_id: rec.logement_id ? String(rec.logement_id) : null,
        voyageur_id: rec.voyageur_id ? String(rec.voyageur_id) : null,
        voyageurLabel: `${String(voyageursJoin?.prenom ?? "")} ${String(voyageursJoin?.nom ?? "")}`.trim() || "Voyageur",
        logementLabel: String(logementsJoin?.nom ?? "Logement"),
        date_arrivee: String(rec.date_arrivee ?? ""),
        date_depart: String(rec.date_depart ?? ""),
      } satisfies ReservationOpt;
    });
    setReservations(resaList);

    const monthlyCount = await getMonthlyCreatedCount("etats_des_lieux", proprietaireId);
    if (!canCreateEtatDesLieux(plan, monthlyCount)) {
      setPlanLimitMessage("Limite atteinte. Passez au plan supérieur pour créer plus d'états des lieux.");
    } else {
      setPlanLimitMessage("");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!reservationId || typeEtat !== "sortie") {
      setEntreesOptions([]);
      setEntreeId("");
      return;
    }
    const related = rows
      .filter(
        (r) =>
          r.reservation_id === reservationId && getEdlTypeEtatFromRow(r as Record<string, unknown>) === "entree",
      )
      .map((r) => ({
        id: r.id,
        label: `Entrée du ${r.date_etat ? new Date(r.date_etat).toLocaleDateString("fr-FR") : "—"}`,
      }));
    setEntreesOptions(related);
    if (!related.some((o) => o.id === entreeId)) setEntreeId("");
  }, [reservationId, typeEtat, rows, entreeId]);

  const rowsWithReservation = useMemo(
    () =>
      rows.map((r) => ({
        row: r,
        reservation: reservations.find((res) => res.id === r.reservation_id) ?? null,
      })),
    [rows, reservations],
  );

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    const { proprietaireId, error: pe } = await getCurrentProprietaireId();
    if (pe || !proprietaireId) {
      setError(pe ? formatSubmitError(pe) : "Session invalide.");
      setIsSubmitting(false);
      return;
    }
    const selected = reservations.find((r) => r.id === reservationId);
    if (!selected || !selected.logement_id) {
      setError("Sélectionnez une réservation valide.");
      setIsSubmitting(false);
      return;
    }
    if (typeEtat === "sortie" && !entreeId) {
      setError("Sélectionnez l'état des lieux d'entrée à comparer.");
      setIsSubmitting(false);
      return;
    }

    const plan = await getOwnerPlan(proprietaireId);
    if (plan === "free") {
      setError(PLAN_FREE_EDL_BANNER);
      setIsSubmitting(false);
      return;
    }
    const monthlyCount = await getMonthlyCreatedCount("etats_des_lieux", proprietaireId);
    if (!canCreateEtatDesLieux(plan, monthlyCount)) {
      setError(PLAN_LIMIT_ERROR_MESSAGE);
      setIsSubmitting(false);
      return;
    }

    const typeNormalized = normalizeEdlTypeEtatInput(typeEtat);
    const pieces = createSaisonnierPiecesData();
    const nowIso = new Date().toISOString();
    const payload = {
      proprietaire_id: proprietaireId,
      reservation_id: selected.id,
      bail_id: null,
      logement_id: selected.logement_id,
      locataire_id: null,
      type: typeNormalized,
      type_etat: typeNormalized,
      date_etat: dateEtat,
      type_logement: "meuble",
      statut: "en_cours",
      pieces,
      compteurs: pieces.compteurs,
      observations: pieces.observationsGenerales,
      cles_remises: pieces.clesRemises,
      badges_remis: pieces.badgesRemis,
      etat_entree_id: typeNormalized === "sortie" ? entreeId : null,
      email_envoye: false,
      updated_at: nowIso,
    };

    const { data: inserted, error: insErr } = await supabase
      .from("etats_des_lieux")
      .insert(payload)
      .select("id")
      .maybeSingle();

    setIsSubmitting(false);
    if (insErr || !inserted?.id) {
      setError(insErr ? formatSubmitError(insErr) : "Création impossible.");
      return;
    }
    setIsModalOpen(false);
    window.location.href = `/etats-des-lieux/${inserted.id}`;
  }

  async function executeDeleteConfirmed() {
    if (!deleteTarget) return;
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
      .eq("etat_des_lieux_id", deleteTarget.id);
    if (phErr) {
      setError(formatSubmitError(phErr));
      setDeleteSubmitting(false);
      return;
    }
    const paths = (photos ?? []).map((p) => (p as { storage_path: string }).storage_path).filter(Boolean);
    if (paths.length) {
      await supabase.storage.from("etats-des-lieux").remove(paths);
    }
    await supabase.from("photos_etat_des_lieux").delete().eq("etat_des_lieux_id", deleteTarget.id);
    const { error: delErr } = await supabase
      .from("etats_des_lieux")
      .delete()
      .eq("id", deleteTarget.id)
      .eq("proprietaire_id", proprietaireId);
    setDeleteSubmitting(false);
    if (delErr) {
      setError(formatSubmitError(delErr));
      return;
    }
    setDeleteTarget(null);
    void load();
  }

  async function onSendEmail(id: string) {
    setError("");
    const res = await fetch(`/api/etats-des-lieux/${id}/send`, { method: "POST" });
    const j = (await res.json()) as { error?: string; to?: string[] };
    if (!res.ok) setError(j.error ?? "Envoi impossible.");
    else {
      setSuccessToast(`Email envoyé avec succès à ${(j.to ?? []).join(", ") || "destinataire"}`);
      window.setTimeout(() => setSuccessToast(""), 3000);
    }
  }

  if (!loading && currentPlan === "free") {
    return <PlanFreeModuleUpsell variant="etats-des-lieux" />;
  }

  return (
    <section className="proplio-page-wrap space-y-8" style={{ color: PC.text }}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="proplio-page-title">États des lieux</h1>
          <p className="proplio-page-subtitle max-w-xl">
            Entrée / sortie liés à une réservation saisonnière.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium pc-solid-primary"
          disabled={isPlanLimitReached}
          style={{ opacity: isPlanLimitReached ? 0.55 : 1, cursor: isPlanLimitReached ? "not-allowed" : "pointer" }}
          onClick={() => {
            setReservationId(reservations[0]?.id ?? "");
            setTypeEtat("entree");
            setEntreeId("");
            setDateEtat(new Date().toISOString().slice(0, 10));
            setError("");
            setIsModalOpen(true);
          }}
        >
          <IconPlus className="h-4 w-4" />
          Nouvel état des lieux
        </button>
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
        <div className="rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: PC.dangerBg10, color: PC.danger }}>
          {error}
        </div>
      ) : null}
      {successToast ? (
        <p className="rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: PC.successBg10, color: PC.success }}>
          {successToast}
        </p>
      ) : null}

      {loading ? (
        <div className="p-6 text-sm" style={{ ...panelCard, color: PC.muted }}>Chargement…</div>
      ) : rowsWithReservation.length === 0 ? (
        <div className="p-8 text-center text-sm" style={{ ...panelCard, color: PC.muted }}>
          Aucun état des lieux saisonnier.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${PC.border}` }}>
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead style={{ backgroundColor: PC.card, color: PC.muted }}>
              <tr>
                <th className="px-3 py-2">Réservation</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Statut</th>
                <th className="px-3 py-2">Date EDL</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rowsWithReservation.map(({ row, reservation }) => (
                <tr key={row.id} style={{ borderTop: `1px solid ${PC.border}` }}>
                  <td className="px-3 py-2">
                    <p className="font-medium">{reservation?.voyageurLabel ?? "Voyageur"}</p>
                    <p className="text-xs" style={{ color: PC.muted }}>
                      {reservation ? `${reservation.date_arrivee} → ${reservation.date_depart}` : "Séjour non trouvé"}
                    </p>
                  </td>
                  <td className="px-3 py-2">
                    {getEdlTypeEtatFromRow(row as Record<string, unknown>) === "entree" ? "Entrée" : "Sortie"}
                  </td>
                  <td className="px-3 py-2">{row.statut === "termine" ? "Finalisé" : "Brouillon"}</td>
                  <td className="px-3 py-2">
                    {row.date_etat ? new Date(row.date_etat).toLocaleDateString("fr-FR") : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/etats-des-lieux/${row.id}`} className="rounded-md px-3 py-1.5 text-xs pc-outline-muted">
                        Ouvrir
                      </Link>
                      <a href={`/api/etats-des-lieux/${row.id}/pdf`} target="_blank" rel="noreferrer" className="rounded-md px-3 py-1.5 text-xs pc-outline-primary">
                        PDF
                      </a>
                      <button type="button" className="rounded-md px-3 py-1.5 text-xs pc-outline-success" onClick={() => void onSendEmail(row.id)}>
                        Envoyer
                      </button>
                      <button type="button" className="rounded-md px-3 py-1.5 text-xs pc-outline-danger" onClick={() => setDeleteTarget({ id: row.id, statut: row.statut })}>
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-safari">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto p-6" style={panelCard}>
            <h2 className="text-lg font-semibold">Nouvel état des lieux saisonnier</h2>
            <form onSubmit={onCreate} className="mt-4 space-y-4">
              <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                <span>Réservation</span>
                <select required style={fieldSelectStyle} value={reservationId} onChange={(e) => setReservationId(e.target.value)}>
                  <option value="">Sélectionner…</option>
                  {reservations.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.voyageurLabel} — {r.logementLabel} ({r.date_arrivee} → {r.date_depart})
                    </option>
                  ))}
                </select>
              </label>
              <fieldset className="space-y-2">
                <legend className="text-sm" style={{ color: PC.muted }}>Type</legend>
                <label className="flex items-center gap-2 text-sm" style={{ color: PC.text }}>
                  <input type="radio" name="te" checked={typeEtat === "entree"} onChange={() => setTypeEtat("entree")} />
                  Entrée
                </label>
                <label className="flex items-center gap-2 text-sm" style={{ color: PC.text }}>
                  <input type="radio" name="te" checked={typeEtat === "sortie"} onChange={() => setTypeEtat("sortie")} />
                  Sortie
                </label>
              </fieldset>
              {typeEtat === "sortie" ? (
                <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                  <span>État d&apos;entrée à comparer</span>
                  <select required style={fieldSelectStyle} value={entreeId} onChange={(e) => setEntreeId(e.target.value)}>
                    <option value="">Sélectionner…</option>
                    {entreesOptions.map((o) => (
                      <option key={o.id} value={o.id}>{o.label}</option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                <span>Date</span>
                <input type="date" style={fieldInputStyle} required value={dateEtat} onChange={(e) => setDateEtat(e.target.value)} />
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="rounded-lg px-4 py-2 text-sm pc-outline-muted" onClick={() => setIsModalOpen(false)}>
                  Annuler
                </button>
                <button type="submit" className="rounded-lg px-4 py-2 text-sm font-medium pc-solid-primary" disabled={isSubmitting}>
                  {isSubmitting ? "…" : "Commencer l'état des lieux"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-safari">
          <div className="w-full max-w-md p-6" style={panelCard}>
            <h2 className="text-lg font-semibold">Supprimer l&apos;état des lieux</h2>
            <p className="mt-3 text-sm" style={{ color: PC.muted }}>
              {deleteTarget.statut === "termine"
                ? "Cet état des lieux est finalisé. Confirmez la suppression définitive."
                : "Confirmez la suppression de cet état des lieux."}
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button type="button" className="rounded-lg px-4 py-2 text-sm pc-outline-muted" disabled={deleteSubmitting} onClick={() => setDeleteTarget(null)}>
                Annuler
              </button>
              <button type="button" className="rounded-xl px-4 py-2.5 text-sm font-medium transition disabled:opacity-50 pc-danger-fill" disabled={deleteSubmitting} onClick={() => void executeDeleteConfirmed()}>
                {deleteSubmitting ? "…" : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
