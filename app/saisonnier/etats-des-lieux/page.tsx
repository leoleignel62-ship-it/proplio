"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PlanFreeModuleUpsell } from "@/components/plan-free-module-upsell";
import type { SaisonnierReservationOption } from "@/components/etat-des-lieux-saisonnier/saisonnier-edl-wizard";
import { Download, Eye, Mail } from "lucide-react";
import { IconBuilding, IconCalendar, IconPencil, IconPlus, IconTrash } from "@/components/locavio-icons";
import { BtnDanger, BtnPrimary, BtnSecondary, ConfirmModal } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { getEdlTypeEtatFromRow } from "@/lib/etat-des-lieux/edl-type-etat";
import { getCurrentProprietaireId } from "@/lib/proprietaire-profile";
import {
  canAccessSaisonnier,
  canCreateEtatDesLieux,
  getMonthlyCreatedCount,
  getOwnerPlan,
  PLAN_UPGRADE_PATH,
  type LocavioPlan,
} from "@/lib/plan-limits";
import { formatSubmitError } from "@/lib/supabase-submit-error";
import { supabase } from "@/lib/supabase";
import { PC } from "@/lib/locavio-colors";
import { panelCard } from "@/lib/locavio-field-styles";

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
  logement_id: string | null;
  type_etat?: string | null;
  type?: string | null;
  date_etat: string | null;
  statut: string;
};

type LogementOption = {
  id: string;
  nom: string;
};

function getSaisonnierEdlAccentColor(statut: string): string {
  return statut === "termine" ? "#10b981" : "#f59e0b";
}

export default function EtatsDesLieuxSaisonnierPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const logementFilter = searchParams.get("logement_id") ?? "";
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPlan, setCurrentPlan] = useState<LocavioPlan | null>(null);
  const [rows, setRows] = useState<EdlRow[]>([]);
  const [logements, setLogements] = useState<LogementOption[]>([]);
  const [reservations, setReservations] = useState<SaisonnierReservationOption[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; statut: string } | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [planLimitMessage, setPlanLimitMessage] = useState("");
  const [hoveredEdlId, setHoveredEdlId] = useState<string | null>(null);
  const [proprietaireId, setProprietaireId] = useState<string | null>(null);
  const [edlSignatureStatuses, setEdlSignatureStatuses] = useState<Record<string, boolean>>({});
  const [sendingEdlSignature, setSendingEdlSignature] = useState<string | null>(null);

  const isPlanLimitReached = Boolean(planLimitMessage);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const { proprietaireId, error: pe } = await getCurrentProprietaireId();
    if (pe || !proprietaireId) {
      setProprietaireId(null);
      setError(pe ? formatSubmitError(pe) : "Session invalide.");
      setLoading(false);
      return;
    }
    setProprietaireId(proprietaireId);

    const plan = await getOwnerPlan(proprietaireId);
    setCurrentPlan(plan);
    if (!canAccessSaisonnier(plan)) {
      setLoading(false);
      return;
    }

    const { data: logsData } = await supabase
      .from("logements")
      .select("id, nom, type_location")
      .eq("proprietaire_id", proprietaireId)
      .in("type_location", ["saisonnier", "les_deux"])
      .order("nom", { ascending: true });
    const saisonnierIds = (logsData ?? []).map((l) => String(l.id));
    const logementsRes = { data: logsData, error: null };

    const [edlRes, resaRes] =
      saisonnierIds.length === 0
        ? await Promise.all([
            Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
            Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
          ])
        : await Promise.all([
            supabase
              .from("etats_des_lieux")
              .select("id, reservation_id, logement_id, type, type_etat, date_etat, statut, created_at")
              .eq("proprietaire_id", proprietaireId)
              .in("logement_id", saisonnierIds)
              .not("reservation_id", "is", null)
              .order("created_at", { ascending: false }),
            supabase
              .from("reservations")
              .select("id, logement_id, voyageur_id, date_arrivee, date_depart, logements(nom), voyageurs(prenom, nom)")
              .eq("proprietaire_id", proprietaireId)
              .in("logement_id", saisonnierIds)
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

    const edlRows = ((edlRes.data ?? []) as Array<Record<string, unknown>>).map((r) => ({
      id: String(r.id),
      reservation_id: r.reservation_id ? String(r.reservation_id) : null,
      logement_id: r.logement_id ? String(r.logement_id) : null,
      type_etat: (r.type_etat as string | null | undefined) ?? null,
      type: (r.type as string | null | undefined) ?? null,
      date_etat: (r.date_etat as string | null) ?? null,
      statut: String(r.statut ?? ""),
    }));
    setRows(edlRows);

    const { data: sigs } = await supabase
      .from("document_signatures")
      .select("document_id, signed_at")
      .eq("document_type", "edl")
      .eq("proprietaire_id", proprietaireId);
    setEdlSignatureStatuses(
      Object.fromEntries(
        (sigs ?? [])
          .filter((s) => s.signed_at)
          .map((s) => [String(s.document_id), true]),
      ),
    );
    setLogements(
      ((logementsRes.data ?? []) as Array<{ id?: string; nom?: string }>).map((row) => ({
        id: String(row.id ?? ""),
        nom: String(row.nom ?? "").trim() || "Logement",
      })),
    );

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
    if (!canCreateEtatDesLieux(plan)) {
      setPlanLimitMessage("Limite atteinte. Passez au plan supérieur pour créer plus d'états des lieux.");
    } else {
      setPlanLimitMessage("");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rowsWithReservation = useMemo(() => {
    const list = rows.map((r) => ({
      row: r,
      reservation: reservations.find((res) => res.id === r.reservation_id) ?? null,
    }));
    if (!logementFilter) return list;
    return list.filter(({ row, reservation }) => {
      const logementId = row.logement_id ?? reservation?.logement_id ?? null;
      return logementId === logementFilter;
    });
  }, [rows, reservations, logementFilter]);

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

  async function handleSendEdlForSignature(edl: EdlRow) {
    if (!proprietaireId) return;
    setSendingEdlSignature(edl.id);
    try {
      if (!edl.reservation_id) {
        toast.error("Aucune réservation liée à cet état des lieux.");
        return;
      }

      const { data: reservation } = await supabase
        .from("reservations")
        .select("voyageur_id")
        .eq("id", edl.reservation_id)
        .maybeSingle();

      if (!reservation?.voyageur_id) {
        toast.error("Aucun voyageur lié à la réservation.");
        return;
      }

      const { data: voyageur } = await supabase
        .from("voyageurs")
        .select("nom, prenom, email")
        .eq("id", reservation.voyageur_id)
        .maybeSingle();

      if (!voyageur?.email) {
        toast.error("Aucun email voyageur trouvé.");
        return;
      }

      const res = await fetch("/api/signature/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_type: "edl",
          document_id: edl.id,
          signer_name: `${String(voyageur.prenom ?? "").trim()} ${String(voyageur.nom ?? "").trim()}`.trim(),
          signer_email: voyageur.email,
          proprietaire_id: proprietaireId,
        }),
      });

      if (res.ok) {
        toast.success(`Email de signature envoyé à ${voyageur.email}`);
      } else {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(payload.error?.trim() || "Erreur lors de l'envoi.");
      }
    } catch (e) {
      toast.error(formatSubmitError(e));
    } finally {
      setSendingEdlSignature(null);
    }
  }

  if (!loading && currentPlan && !canAccessSaisonnier(currentPlan)) {
    return <PlanFreeModuleUpsell variant="saisonnier" requiredPlan="pro" />;
  }

  return (
    <section className="locavio-page-wrap space-y-8" style={{ color: PC.text }}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="locavio-page-title">États des lieux</h1>
          <p className="locavio-page-subtitle max-w-xl">
            Formulaire simplifié (pièces, inventaire, PDF dédié location saisonnière).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={logementFilter}
            onChange={(event) => {
              const next = event.target.value;
              const base = "/saisonnier/etats-des-lieux";
              router.push(next ? `${base}?logement_id=${encodeURIComponent(next)}` : base);
            }}
            className="rounded-lg px-3 py-2 text-sm"
            style={{ border: `1px solid ${PC.border}`, backgroundColor: PC.card, color: PC.text }}
          >
            <option value="">Tous les logements</option>
            {logements.map((logement) => (
              <option key={logement.id} value={logement.id}>
                {logement.nom}
              </option>
            ))}
          </select>
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
        <>
          <div className="mb-4 flex flex-wrap items-center gap-4 text-xs" style={{ color: PC.muted }}>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: "#10b981" }} aria-hidden />
              <span>Finalisé</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: "#f59e0b" }} aria-hidden />
              <span>En cours</span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rowsWithReservation.map(({ row, reservation }) => {
              const isFinalise = row.statut === "termine";
              const accentColor = getSaisonnierEdlAccentColor(row.statut);
              const isHovered = hoveredEdlId === row.id;
              const typeEtat = getEdlTypeEtatFromRow(row as Record<string, unknown>);
              const isEntree = typeEtat === "entree";
              const dateLabel = row.date_etat ? new Date(row.date_etat).toLocaleDateString("fr-FR") : "—";
              return (
                <article
                  key={row.id}
                  className="flex flex-row overflow-hidden rounded-xl border transition-colors duration-200"
                  style={{
                    backgroundColor: PC.card,
                    border: `1px solid ${isHovered ? PC.primary : PC.border}`,
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
                  }}
                  onMouseEnter={() => setHoveredEdlId(row.id)}
                  onMouseLeave={() => setHoveredEdlId(null)}
                >
                  <div className="shrink-0 self-stretch" style={{ width: 3, backgroundColor: accentColor }} aria-hidden />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="p-4 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="min-w-0 flex-1 text-base font-semibold leading-snug">
                          {reservation?.voyageurLabel ?? "Voyageur"}
                        </h3>
                        <span
                          className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                          style={
                            isEntree
                              ? { backgroundColor: PC.successBg20, color: PC.success }
                              : { backgroundColor: PC.warningBg15, color: PC.warning }
                          }
                        >
                          {isEntree ? "Entrée" : "Sortie"}
                        </span>
                      </div>
                      <p className="mt-2 flex items-center gap-1.5 text-sm" style={{ color: PC.muted }}>
                        <IconBuilding className="h-4 w-4 shrink-0" aria-hidden />
                        <span className="min-w-0 truncate">
                          {reservation?.logementLabel ?? "Logement"}
                        </span>
                      </p>
                    </div>
                    <div className="px-4 py-2" style={{ borderTop: `1px solid ${PC.border}` }}>
                      <div className="flex flex-wrap items-center gap-2">
                        {isFinalise ? (
                          <span
                            className="rounded-full px-2 py-0.5 text-xs font-medium"
                            style={{ backgroundColor: PC.successBg20, color: PC.success }}
                          >
                            Finalisé
                          </span>
                        ) : (
                          <span
                            className="rounded-full px-2 py-0.5 text-xs font-medium"
                            style={{ backgroundColor: PC.warningBg15, color: PC.warning }}
                          >
                            Brouillon
                          </span>
                        )}
                        <p className="flex items-center gap-1.5 text-sm" style={{ color: PC.muted }}>
                          <IconCalendar className="h-4 w-4 shrink-0" aria-hidden />
                          <span>{dateLabel}</span>
                        </p>
                      </div>
                    </div>
                    <div className="px-4 py-3" style={{ borderTop: `1px solid ${PC.border}` }}>
                      <div className="flex flex-wrap gap-2">
                        <BtnSecondary size="small" icon={<Eye className="h-4 w-4" aria-hidden />} onClick={() => router.push(`/saisonnier/etats-des-lieux/${row.id}`)}>
                          Ouvrir
                        </BtnSecondary>
                        <BtnSecondary
                          size="small"
                          icon={<Download className="h-4 w-4" aria-hidden />}
                          disabled={!isFinalise}
                          title={isFinalise ? undefined : "Finalisez l'EDL pour générer le PDF."}
                          onClick={() => window.open(`/api/etats-des-lieux/${row.id}/pdf`, "_blank", "noopener,noreferrer")}
                        >
                          PDF
                        </BtnSecondary>
                        <BtnSecondary
                          size="small"
                          icon={<Mail className="h-4 w-4" aria-hidden />}
                          disabled={!isFinalise}
                          onClick={() => void onSendEmail(row.id)}
                        >
                          Envoyer
                        </BtnSecondary>
                        {edlSignatureStatuses[row.id] ? (
                          <span
                            className="rounded-full px-2 py-1 text-xs font-semibold"
                            style={{ backgroundColor: PC.successBg20, color: PC.success }}
                          >
                            ✓ Signé électroniquement
                          </span>
                        ) : isFinalise ? (
                          <BtnPrimary
                            size="small"
                            icon={<IconPencil className="h-4 w-4" aria-hidden />}
                            disabled={sendingEdlSignature === row.id}
                            loading={sendingEdlSignature === row.id}
                            onClick={() => void handleSendEdlForSignature(row)}
                          >
                            Envoyer pour signature
                          </BtnPrimary>
                        ) : null}
                        <BtnDanger size="small" icon={<IconTrash className="h-4 w-4" />} onClick={() => setDeleteTarget({ id: row.id, statut: row.statut })}>
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
