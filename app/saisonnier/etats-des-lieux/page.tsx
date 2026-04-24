"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PlanFreeModuleUpsell } from "@/components/plan-free-module-upsell";
import type { SaisonnierReservationOption } from "@/components/etat-des-lieux-saisonnier/saisonnier-edl-wizard";
import { IconPlus } from "@/components/proplio-icons";
import { BtnDanger, BtnEmail, BtnPdf, BtnPrimary, BtnSecondary, ConfirmModal, StatusBadge } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { getEdlTypeEtatFromRow } from "@/lib/etat-des-lieux/edl-type-etat";
import { getCurrentProprietaireId } from "@/lib/proprietaire-profile";
import {
  canCreateEtatDesLieux,
  getMonthlyCreatedCount,
  getOwnerPlan,
  PLAN_FREE_EDL_BANNER,
  PLAN_UPGRADE_PATH,
  type ProplioPlan,
} from "@/lib/plan-limits";
import { formatSubmitError } from "@/lib/supabase-submit-error";
import { supabase } from "@/lib/supabase";
import { PC } from "@/lib/proplio-colors";
import { panelCard } from "@/lib/proplio-field-styles";

const SaisonnierEdlWizard = dynamic(
  () =>
    import("@/components/etat-des-lieux-saisonnier/saisonnier-edl-wizard").then((m) => ({
      default: m.SaisonnierEdlWizard,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-[80] flex items-center justify-center" style={{ backgroundColor: PC.overlay }}>
        <p className="rounded-lg px-4 py-3 text-sm" style={{ ...panelCard, color: PC.muted }}>
          Chargement de l&apos;éditeur…
        </p>
      </div>
    ),
  },
);

type EdlRow = {
  id: string;
  reservation_id: string | null;
  type_etat?: string | null;
  type?: string | null;
  date_etat: string | null;
  statut: string;
};

export default function EtatsDesLieuxSaisonnierPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPlan, setCurrentPlan] = useState<ProplioPlan | null>(null);
  const [rows, setRows] = useState<EdlRow[]>([]);
  const [reservations, setReservations] = useState<SaisonnierReservationOption[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);
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
        .select("id, reservation_id, type, type_etat, date_etat, statut, created_at")
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
      const voyageursJoin = Array.isArray(vg) ? (vg[0] as Record<string, unknown>) : (vg as Record<string, unknown> | null);
      const logementsJoin = Array.isArray(lg) ? (lg[0] as Record<string, unknown>) : (lg as Record<string, unknown> | null);
      return {
        id: String(rec.id),
        logement_id: rec.logement_id ? String(rec.logement_id) : null,
        voyageur_id: rec.voyageur_id ? String(rec.voyageur_id) : null,
        voyageurLabel: `${String(voyageursJoin?.prenom ?? "")} ${String(voyageursJoin?.nom ?? "")}`.trim() || "Voyageur",
        logementLabel: String(logementsJoin?.nom ?? "Logement"),
        date_arrivee: String(rec.date_arrivee ?? ""),
        date_depart: String(rec.date_depart ?? ""),
      } satisfies SaisonnierReservationOption;
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

  const rowsWithReservation = useMemo(
    () =>
      rows.map((r) => ({
        row: r,
        reservation: reservations.find((res) => res.id === r.reservation_id) ?? null,
      })),
    [rows, reservations],
  );

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
    toast.success("État des lieux supprimé.");
  }

  async function onSendEmail(id: string) {
    setError("");
    const res = await fetch(`/api/etats-des-lieux/${id}/send`, { method: "POST" });
    const j = (await res.json()) as { error?: string; to?: string[] };
    if (!res.ok) setError(j.error ?? "Envoi impossible.");
    else {
      toast.success(`Email envoyé à ${(j.to ?? []).join(", ") || "destinataire"}.`);
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
            Formulaire simplifié (pièces, inventaire, PDF dédié location saisonnière).
          </p>
        </div>
        <BtnPrimary
          icon={<IconPlus className="h-4 w-4" />}
          disabled={isPlanLimitReached}
          style={{ opacity: isPlanLimitReached ? 0.55 : 1, cursor: isPlanLimitReached ? "not-allowed" : "pointer" }}
          onClick={() => {
            setError("");
            setWizardOpen(true);
          }}
        >
          Nouvel état des lieux
        </BtnPrimary>
      </div>

      {isPlanLimitReached ? (
        <div
          className="rounded-lg px-3 py-2 text-sm"
          style={{ backgroundColor: PC.warningBg15, color: PC.warning, border: `1px solid ${PC.border}` }}
        >
          <div className="flex items-center justify-between gap-3">
            <p>⚠️ {planLimitMessage}</p>
            <a
              href={PLAN_UPGRADE_PATH}
              className="rounded-md px-3 py-1 text-xs font-medium"
              style={{ backgroundColor: PC.primary, color: PC.white }}
            >
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
      {loading ? (
        <div className="p-6 text-sm" style={{ ...panelCard, color: PC.muted }}>
          Chargement…
        </div>
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
                      {reservation
                        ? `${reservation.date_arrivee} → ${reservation.date_depart} · ${reservation.logementLabel}`
                        : "Séjour non trouvé"}
                    </p>
                  </td>
                  <td className="px-3 py-2">
                    {getEdlTypeEtatFromRow(row as Record<string, unknown>) === "entree" ? "Entrée" : "Sortie"}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={row.statut === "termine" ? "finalise" : "brouillon"} />
                  </td>
                  <td className="px-3 py-2">
                    {row.date_etat ? new Date(row.date_etat).toLocaleDateString("fr-FR") : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <BtnSecondary size="small" onClick={() => router.push(`/saisonnier/etats-des-lieux/${row.id}`)}>
                        Ouvrir
                      </BtnSecondary>
                      {row.statut === "termine" ? (
                        <BtnPdf
                          size="small"
                          onClick={() => window.open(`/api/etats-des-lieux/${row.id}/pdf`, "_blank", "noopener,noreferrer")}
                        >
                          Télécharger PDF
                        </BtnPdf>
                      ) : (
                        <BtnPdf
                          size="small"
                          disabled
                          title="Finalisez l'EDL pour générer le PDF."
                        >
                          Télécharger PDF
                        </BtnPdf>
                      )}
                      <BtnEmail size="small" disabled={row.statut !== "termine"} onClick={() => void onSendEmail(row.id)}>
                        Envoyer par email
                      </BtnEmail>
                      <BtnDanger size="small" onClick={() => setDeleteTarget({ id: row.id, statut: row.statut })}>
                        Supprimer
                      </BtnDanger>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {wizardOpen ? (
        <SaisonnierEdlWizard
          reservations={reservations}
          initialEdlId={null}
          onClose={() => setWizardOpen(false)}
          onSaved={() => void load()}
        />
      ) : null}

      <ConfirmModal
        open={deleteTarget != null}
        title="Supprimer l'état des lieux"
        description="Êtes-vous sûr de vouloir supprimer cet état des lieux ? Cette action est irréversible."
        loading={deleteSubmitting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void executeDeleteConfirmed()}
      />
    </section>
  );
}
