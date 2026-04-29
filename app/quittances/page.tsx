"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { EntityFormModal, type EntityField } from "@/components/crud/entity-form-modal";
import { IconBuilding, IconPlus } from "@/components/locavio-icons";
import { BtnDanger, BtnEmail, BtnPdf, BtnPrimary, BtnSecondary, ConfirmModal, StatusBadge } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import {
  canCreateQuittance,
  getOwnerPlan,
  getQuittancesTotalCount,
  PLAN_FREE_QUITTANCE_LIMIT_MESSAGE,
  PLAN_LIMIT_ERROR_MESSAGE,
  PLAN_UPGRADE_PATH,
} from "@/lib/plan-limits";
import { ProprietaireProfileCard } from "@/components/proprietaire-profile-card";
import {
  fetchProprietaireProfile,
  getCurrentProprietaireId,
  type ProprietaireProfile,
} from "@/lib/proprietaire-profile";
import { montantsPourQuittanceLocataire } from "@/lib/colocation";
import { formatSubmitError } from "@/lib/supabase-submit-error";
import { supabase } from "@/lib/supabase";
import { PC } from "@/lib/locavio-colors";
import { panelCard } from "@/lib/locavio-field-styles";

type Quittance = {
  id: string;
  proprietaire_id: string;
  logement_id: string;
  locataire_id: string;
  mois: number;
  annee: number;
  loyer: number;
  charges: number;
  total: number;
  nb_modifications?: number | null;
  envoyee: boolean;
  date_envoi: string | null;
};

type LogementEntity = {
  id: string;
  label: string;
  loyer: number;
  charges: number;
  est_colocation: boolean;
  nombre_chambres: number;
  chambres_details: unknown;
};

type LocataireEntity = {
  id: string;
  label: string;
  email: string | null;
  logement_id: string | null;
  colocation_chambre_index: number | null;
};

const currentYear = new Date().getFullYear();
const defaultYear = String(Math.min(2030, Math.max(2020, currentYear)));

const moisOptions = [
  { value: "1", label: "Janvier" },
  { value: "2", label: "Février" },
  { value: "3", label: "Mars" },
  { value: "4", label: "Avril" },
  { value: "5", label: "Mai" },
  { value: "6", label: "Juin" },
  { value: "7", label: "Juillet" },
  { value: "8", label: "Août" },
  { value: "9", label: "Septembre" },
  { value: "10", label: "Octobre" },
  { value: "11", label: "Novembre" },
  { value: "12", label: "Décembre" },
];

const anneeOptions = Array.from({ length: 11 }, (_, index) => {
  const year = String(2020 + index);
  return { value: year, label: year };
});

const defaultValues = {
  logement_id: "",
  locataire_id: "",
  mois: "",
  annee: defaultYear,
  loyer: "",
  charges: "",
  total: "",
};
const GROUP_CARD_STYLE = { ...panelCard, padding: 16 } as const;
const FREE_QUITTANCE_MODIF_LIMIT_MESSAGE =
  "Vous avez atteint la limite de modification du plan Découverte. Passez au plan Starter pour des modifications illimitées.";
const FREE_QUITTANCE_DELETE_LIMIT_MESSAGE =
  "Vous avez atteint la limite de suppression du plan Découverte. Passez au plan Starter pour des suppressions illimitées.";

export default function QuittancesPage() {
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<Quittance[]>([]);
  const [values, setValues] = useState<Record<string, string>>(defaultValues);
  const [editingRow, setEditingRow] = useState<Quittance | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [logements, setLogements] = useState<LogementEntity[]>([]);
  const [locataires, setLocataires] = useState<LocataireEntity[]>([]);
  const [proprietaireId, setProprietaireId] = useState<string | null>(null);
  const [proprietaireProfile, setProprietaireProfile] = useState<ProprietaireProfile | null>(null);
  const [planLimitMessage, setPlanLimitMessage] = useState("");
  const [currentPlan, setCurrentPlan] = useState<"free" | "starter" | "pro" | "expert">("free");

  const isEditing = useMemo(() => editingRow !== null, [editingRow]);
  const logementsDetailsMap = useMemo(() => new Map(logements.map((item) => [item.id, item])), [logements]);
  const locatairesMap = useMemo(() => new Map(locataires.map((item) => [item.id, item.label])), [locataires]);
  const locatairesDetailsMap = useMemo(
    () =>
      new Map(
        locataires.map((item) => [
          item.id,
          {
            logement_id: item.logement_id,
            colocation_chambre_index: item.colocation_chambre_index,
          },
        ]),
      ),
    [locataires],
  );
  const moisMap = useMemo(() => new Map(moisOptions.map((item) => [item.value, item.label])), []);
  const logementFilter = searchParams.get("logement_id") ?? "";
  const prefillLogementId = searchParams.get("logement_id") ?? "";
  const locatairesForSelectedLogement = useMemo(
    () =>
      values.logement_id
        ? locataires.filter((item) => item.logement_id === values.logement_id)
        : locataires,
    [locataires, values.logement_id],
  );

  const fields = useMemo<EntityField[]>(
    () => [
      {
        name: "logement_id",
        label: "Logement",
        type: "select",
        required: true,
        options: logements.map((item) => ({ value: item.id, label: item.label })),
      },
      {
        name: "locataire_id",
        label: "Locataire",
        type: "select",
        required: true,
        options: locatairesForSelectedLogement.map((item) => ({ value: item.id, label: item.label })),
        helperText:
          values.logement_id && locatairesForSelectedLogement.length === 0
            ? "Aucun locataire assigné à ce logement"
            : undefined,
      },
      { name: "mois", label: "Mois", type: "select", required: true, options: moisOptions },
      { name: "annee", label: "Année", type: "select", required: true, options: anneeOptions },
      { name: "loyer", label: "Loyer (€)", type: "number", required: true, step: "0.01" },
      { name: "charges", label: "Charges (€)", type: "number", required: true, step: "0.01" },
      { name: "total", label: "Total (€)", type: "number", required: true, step: "0.01" },
    ],
    [logements, locatairesForSelectedLogement, values.logement_id],
  );
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [freeEditConfirmRow, setFreeEditConfirmRow] = useState<Quittance | null>(null);
  const [freeDeleteConfirmId, setFreeDeleteConfirmId] = useState<string | null>(null);
  const isPlanLimitReached = Boolean(planLimitMessage);

  async function getFreeQuittanceQuotas(ownerId: string): Promise<{
    quittances_modifs_cumul: number;
    quittances_suppressions_cumul: number;
  }> {
    const { data, error: qErr } = await supabase
      .from("proprietaires")
      .select("quittances_modifs_cumul, quittances_suppressions_cumul")
      .eq("id", ownerId)
      .maybeSingle();
    if (qErr || !data) {
      return { quittances_modifs_cumul: 0, quittances_suppressions_cumul: 0 };
    }
    const row = data as {
      quittances_modifs_cumul?: number | null;
      quittances_suppressions_cumul?: number | null;
    };
    return {
      quittances_modifs_cumul: Number(row.quittances_modifs_cumul ?? 0),
      quittances_suppressions_cumul: Number(row.quittances_suppressions_cumul ?? 0),
    };
  }

  const refreshPlanLimit = useCallback(async (ownerId: string) => {
    const [plan, totalCount] = await Promise.all([
      getOwnerPlan(ownerId),
      getQuittancesTotalCount(ownerId),
    ]);
    setCurrentPlan(plan);
    if (!canCreateQuittance(plan, totalCount)) {
      setPlanLimitMessage(
        plan === "free"
          ? PLAN_FREE_QUITTANCE_LIMIT_MESSAGE
          : "Limite atteinte. Passez au plan supérieur pour créer plus de quittances.",
      );
      return;
    }
    setPlanLimitMessage("");
  }, []);

  const filteredRows = useMemo(
    () => (logementFilter ? rows.filter((row) => row.logement_id === logementFilter) : rows),
    [rows, logementFilter],
  );
  const groupedQuittances = useMemo(() => {
    const map = new Map<string, Quittance[]>();
    for (const row of filteredRows) {
      const arr = map.get(row.logement_id) ?? [];
      arr.push(row);
      map.set(row.logement_id, arr);
    }
    return logements
      .filter((l) => map.has(l.id))
      .map((l) => {
        const group = map.get(l.id) ?? [];
        const sent = group.filter((q) => q.envoyee).length;
        return { logement: l, rows: group, sent };
      });
  }, [filteredRows, logements]);

  const loadRelations = useCallback(async (ownerId: string) => {
    const [logementsResponse, locatairesResponse] = await Promise.all([
      supabase
        .from("logements")
        .select("id, nom, adresse, loyer, charges, est_colocation, nombre_chambres, chambres_details")
        .eq("proprietaire_id", ownerId),
      supabase
        .from("locataires")
        .select("id, nom, prenom, email, logement_id, colocation_chambre_index")
        .eq("proprietaire_id", ownerId),
    ]);

    if (logementsResponse.error || locatairesResponse.error) {
      setError(
        `Erreur de chargement des relations : ${formatSubmitError(
          logementsResponse.error ?? locatairesResponse.error,
        )}`,
      );
      return;
    }

    setLogements(
      (logementsResponse.data ?? []).map((item) => ({
        id: item.id,
        label: item.nom || item.adresse,
        loyer: Number(item.loyer ?? 0),
        charges: Number(item.charges ?? 0),
        est_colocation: Boolean(item.est_colocation),
        nombre_chambres: Number(item.nombre_chambres ?? 0),
        chambres_details: item.chambres_details,
      })),
    );
    setLocataires(
      (locatairesResponse.data ?? []).map((item) => ({
        id: item.id,
        label: `${item.prenom} ${item.nom}`,
        email: item.email ?? null,
        logement_id: item.logement_id ?? null,
        colocation_chambre_index:
          item.colocation_chambre_index != null ? Number(item.colocation_chambre_index) : null,
      })),
    );
  }, []);

  const loadRows = useCallback(async (ownerId?: string | null) => {
    const activeOwnerId = ownerId ?? proprietaireId;
    if (!activeOwnerId) {
      setRows([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");

    const { data, error: fetchError } = await supabase
      .from("quittances")
      .select("*")
      .eq("proprietaire_id", activeOwnerId)
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(`Erreur de chargement : ${formatSubmitError(fetchError)}`);
      setRows([]);
    } else {
      setRows((data as Quittance[]) ?? []);
    }

    await refreshPlanLimit(activeOwnerId);
    setIsLoading(false);
  }, [proprietaireId, refreshPlanLimit]);

  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      const [{ proprietaireId: ownerId, error: ownerError }, { profile, error: profileError }] =
        await Promise.all([getCurrentProprietaireId(), fetchProprietaireProfile()]);

      if (!isMounted) return;

      if (ownerError || profileError) {
        setError(
          `Erreur de chargement propriétaire : ${formatSubmitError(ownerError ?? profileError)}`,
        );
        setIsLoading(false);
        return;
      }

      setProprietaireId(ownerId);
      setProprietaireProfile(profile);

      if (!ownerId) {
        setError("Complétez d'abord votre profil propriétaire dans Paramètres.");
        setIsLoading(false);
        return;
      }

      await Promise.all([loadRows(ownerId), loadRelations(ownerId)]);
    };

    void loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [loadRelations, loadRows]);

  async function openCreateModal() {
    if (proprietaireId) {
      const plan = await getOwnerPlan(proprietaireId);
      const totalCount = await getQuittancesTotalCount(proprietaireId);
      if (!canCreateQuittance(plan, totalCount)) {
        setPlanLimitMessage(
          plan === "free"
            ? PLAN_FREE_QUITTANCE_LIMIT_MESSAGE
            : "Limite atteinte. Passez au plan supérieur pour créer plus de quittances.",
        );
        return;
      }
    }
    setEditingRow(null);
    setValues({ ...defaultValues, annee: defaultYear, logement_id: prefillLogementId });
    setIsModalOpen(true);
    if (proprietaireId) void loadRelations(proprietaireId);
  }

  function openEditModal(row: Quittance) {
    setEditingRow(row);
    setValues({
      logement_id: row.logement_id ?? "",
      locataire_id: row.locataire_id ?? "",
      mois: String(row.mois ?? ""),
      annee: String(row.annee ?? ""),
      loyer: String(row.loyer ?? ""),
      charges: String(row.charges ?? ""),
      total: String(row.total ?? ""),
    });
    setIsModalOpen(true);
    if (proprietaireId) void loadRelations(proprietaireId);
  }

  async function handleEditClick(row: Quittance) {
    if (currentPlan !== "free") {
      openEditModal(row);
      return;
    }
    const { proprietaireId: ownerId } = await getCurrentProprietaireId();
    if (!ownerId) {
      toast.error("Session propriétaire introuvable.");
      return;
    }
    const quotas = await getFreeQuittanceQuotas(ownerId);
    if (quotas.quittances_modifs_cumul >= 1) {
      setError(FREE_QUITTANCE_MODIF_LIMIT_MESSAGE);
      toast.error(FREE_QUITTANCE_MODIF_LIMIT_MESSAGE);
      return;
    }
    setFreeEditConfirmRow(row);
  }

  async function handleDeleteClick(quittanceId: string) {
    if (currentPlan !== "free") {
      setDeleteConfirmId(quittanceId);
      return;
    }
    const { proprietaireId: ownerId } = await getCurrentProprietaireId();
    if (!ownerId) {
      toast.error("Session propriétaire introuvable.");
      return;
    }
    const quotas = await getFreeQuittanceQuotas(ownerId);
    if (quotas.quittances_suppressions_cumul >= 1) {
      setError(FREE_QUITTANCE_DELETE_LIMIT_MESSAGE);
      toast.error(FREE_QUITTANCE_DELETE_LIMIT_MESSAGE);
      return;
    }
    setFreeDeleteConfirmId(quittanceId);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingRow(null);
    setValues({ ...defaultValues, annee: defaultYear });
  }

  function onChange(name: string, value: string) {
    const nextValues = { ...values, [name]: value };

    if (name === "locataire_id") {
      const loc = locatairesDetailsMap.get(value);
      if (loc?.logement_id) {
        nextValues.logement_id = loc.logement_id;
        const logement = logementsDetailsMap.get(loc.logement_id);
        if (logement) {
          const { loyer, charges } = montantsPourQuittanceLocataire(
            {
              id: logement.id,
              loyer: logement.loyer,
              charges: logement.charges,
              est_colocation: logement.est_colocation,
              chambres_details: logement.chambres_details,
            },
            loc,
          );
          nextValues.loyer = String(loyer);
          nextValues.charges = String(charges);
          nextValues.total = String(loyer + charges);
        }
      }
    }

    if (name === "logement_id") {
      const logement = logementsDetailsMap.get(value);
      if (logement) {
        const loc = locatairesDetailsMap.get(nextValues.locataire_id);
        const { loyer, charges } = montantsPourQuittanceLocataire(
          {
            id: logement.id,
            loyer: logement.loyer,
            charges: logement.charges,
            est_colocation: logement.est_colocation,
            chambres_details: logement.chambres_details,
          },
          loc,
        );
        nextValues.loyer = String(loyer);
        nextValues.charges = String(charges);
        nextValues.total = String(loyer + charges);
      }
    }

    if (name === "loyer" || name === "charges") {
      const loyer = Number(name === "loyer" ? value : nextValues.loyer || 0);
      const charges = Number(name === "charges" ? value : nextValues.charges || 0);
      nextValues.total = String(loyer + charges);
    }
    setValues(nextValues);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const { proprietaireId: ownerId, error: ownerErr } = await getCurrentProprietaireId();
      if (ownerErr) {
        setError(formatSubmitError(ownerErr));
        return;
      }
      if (!ownerId) {
        setError("Profil propriétaire manquant. Complétez d'abord Paramètres.");
        return;
      }
      setProprietaireId(ownerId);
      const plan = await getOwnerPlan(ownerId);
      if (!isEditing) {
        const totalCount = await getQuittancesTotalCount(ownerId);
        if (!canCreateQuittance(plan, totalCount)) {
          setError(
            plan === "free" ? PLAN_FREE_QUITTANCE_LIMIT_MESSAGE : PLAN_LIMIT_ERROR_MESSAGE,
          );
          return;
        }
      }

      if (!values.logement_id.trim() || !values.locataire_id.trim()) {
        setError("Sélectionnez un logement et un locataire.");
        return;
      }
      if (!values.mois.trim()) {
        setError("Sélectionnez un mois.");
        return;
      }

      const mois = Number(values.mois);
      const annee = Number(values.annee);
      if (!Number.isInteger(mois) || mois < 1 || mois > 12) {
        setError("Le mois doit être compris entre 1 et 12.");
        return;
      }
      if (!Number.isFinite(annee) || annee < 2000 || annee > 2100) {
        setError("L'année n'est pas valide.");
        return;
      }

      const loyer = Number(values.loyer);
      const charges = Number(values.charges);
      let total = Number(values.total);
      if (!Number.isFinite(loyer) || loyer < 0 || !Number.isFinite(charges) || charges < 0) {
        setError("Le loyer et les charges doivent être des nombres positifs ou nuls.");
        return;
      }
      if (!Number.isFinite(total) || total < 0) {
        setError("Le total doit être un nombre positif ou nul.");
        return;
      }
      const expected = Math.round((loyer + charges) * 100) / 100;
      if (Math.abs(total - expected) > 0.02) {
        total = expected;
      }

      const payload = {
        proprietaire_id: ownerId,
        logement_id: values.logement_id.trim(),
        locataire_id: values.locataire_id.trim(),
        mois,
        annee,
        loyer,
        charges,
        total,
      };

      const query = isEditing
        ? supabase.from("quittances").update(payload).eq("id", editingRow!.id).eq("proprietaire_id", ownerId)
        : supabase.from("quittances").insert({ ...payload, envoyee: false, date_envoi: null });

      if (isEditing && currentPlan === "free") {
        const quotas = await getFreeQuittanceQuotas(ownerId);
        if (quotas.quittances_modifs_cumul >= 1) {
          setError(FREE_QUITTANCE_MODIF_LIMIT_MESSAGE);
          toast.error(FREE_QUITTANCE_MODIF_LIMIT_MESSAGE);
          return;
        }
      }

      const { error: submitError } = await query;

      if (submitError) {
        setError(`Erreur d'enregistrement : ${formatSubmitError(submitError)}`);
        return;
      }
      if (isEditing && currentPlan === "free") {
        const quotas = await getFreeQuittanceQuotas(ownerId);
        await supabase
          .from("proprietaires")
          .update({ quittances_modifs_cumul: quotas.quittances_modifs_cumul + 1 })
          .eq("id", ownerId);
      }

      closeModal();
      await loadRows(ownerId);
      toast.success(isEditing ? "Quittance mise à jour." : "Quittance créée.");
      if (!isEditing && currentPlan === "free" && typeof window !== "undefined") {
        window.dispatchEvent(new Event("onboarding:check"));
      }
    } catch (e) {
      setError(formatSubmitError(e));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onDelete(id: string) {
    setError("");
    setDeleteSubmitting(true);

    try {
      const { proprietaireId: ownerId, error: ownerErr } = await getCurrentProprietaireId();
      if (ownerErr || !ownerId) {
        setError(ownerErr ? formatSubmitError(ownerErr) : "Session propriétaire introuvable.");
        return;
      }

      if (currentPlan === "free") {
        const quotas = await getFreeQuittanceQuotas(ownerId);
        if (quotas.quittances_suppressions_cumul >= 1) {
          setError(FREE_QUITTANCE_DELETE_LIMIT_MESSAGE);
          toast.error(FREE_QUITTANCE_DELETE_LIMIT_MESSAGE);
          setDeleteConfirmId(null);
          return;
        }
      }

      const { error: deleteError } = await supabase
        .from("quittances")
        .delete()
        .eq("id", id)
        .eq("proprietaire_id", ownerId);

      if (deleteError) {
        setError(`Erreur de suppression : ${formatSubmitError(deleteError)}`);
        return;
      }

      if (currentPlan === "free") {
        const quotas = await getFreeQuittanceQuotas(ownerId);
        await supabase
          .from("proprietaires")
          .update({ quittances_suppressions_cumul: quotas.quittances_suppressions_cumul + 1 })
          .eq("id", ownerId);
      }

      setDeleteConfirmId(null);
      await loadRows(ownerId);
      toast.success("Quittance supprimée.");
    } catch (e) {
      setError(formatSubmitError(e));
    } finally {
      setDeleteSubmitting(false);
    }
  }

  async function onSendQuittance(row: Quittance) {
    setSendingId(row.id);
    setError("");

    try {
      const response = await fetch(`/api/quittances/${row.id}/send`, {
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string; to?: string };

      if (!response.ok) {
        let msg = `Envoi impossible (${response.status}). Vérifiez la configuration e-mail et les données de la quittance.`;
        if (payload.error?.trim()) msg = payload.error.trim();
        setError(msg);
        return;
      }

      const { proprietaireId: ownerId } = await getCurrentProprietaireId();
      if (ownerId) await loadRows(ownerId);
      const email = payload.to || locataires.find((l) => l.id === row.locataire_id)?.email || "destinataire";
      toast.success(`Email envoyé à ${email}.`);
    } catch (e) {
      setError(`Erreur lors de l'envoi : ${formatSubmitError(e)}`);
    } finally {
      setSendingId(null);
    }
  }

  async function onGeneratePdf(row: Quittance) {
    setError("");
    try {
      const response = await fetch(`/api/quittances/${row.id}/pdf`);
      if (!response.ok) {
        let msg = `Génération PDF impossible (${response.status}).`;
        try {
          const j = (await response.json()) as { error?: string };
          if (j.error?.trim()) msg = j.error.trim();
        } catch {}
        setError(msg);
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `quittance-${row.id.slice(0, 8)}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("PDF téléchargé.");
    } catch (e) {
      setError(`Erreur de génération PDF : ${formatSubmitError(e)}`);
    }
  }

  return (
    <section className="locavio-page-wrap space-y-8" style={{ color: PC.text }}>
      <ProprietaireProfileCard
        profile={proprietaireProfile}
        title="Profil propriétaire utilisé automatiquement pour les quittances"
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="locavio-page-title">Quittances</h1>
          <p className="locavio-page-subtitle max-w-xl">Liste, création et suivi des quittances.</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={logementFilter}
            onChange={(event) => {
              const next = event.target.value;
              router.push(next ? `/quittances?logement_id=${encodeURIComponent(next)}` : "/quittances");
            }}
            className="rounded-lg px-3 py-2 text-sm"
            style={{ border: `1px solid ${PC.border}`, backgroundColor: PC.card, color: PC.text }}
          >
            <option value="">Tous les logements</option>
            {logements.map((logement) => (
              <option key={logement.id} value={logement.id}>
                {logement.label}
              </option>
            ))}
          </select>
        </div>
        <BtnPrimary
          icon={<IconPlus className="h-4 w-4" />}
          onClick={() => void openCreateModal()}
          disabled={isPlanLimitReached}
          style={{ opacity: isPlanLimitReached ? 0.55 : 1, cursor: isPlanLimitReached ? "not-allowed" : "pointer" }}
        >
          Nouvelle quittance
        </BtnPrimary>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: PC.dangerBg10, color: PC.danger }}>
          <p>{error}</p>
          {error === PLAN_LIMIT_ERROR_MESSAGE ||
          error === FREE_QUITTANCE_MODIF_LIMIT_MESSAGE ||
          error === FREE_QUITTANCE_DELETE_LIMIT_MESSAGE ? (
            <p className="mt-2">
              <a href={PLAN_UPGRADE_PATH} className="underline" style={{ color: PC.danger }}>
                Voir les abonnements
              </a>
            </p>
          ) : null}
        </div>
      ) : null}
      {isPlanLimitReached ? (
        <div className="mb-4 rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: PC.warningBg15, color: PC.warning, border: `1px solid ${PC.border}` }}>
          <div className="flex items-center justify-between gap-3">
            <p>⚠️ {planLimitMessage}</p>
            <a href={PLAN_UPGRADE_PATH} className="rounded-md px-3 py-1 text-xs font-medium" style={{ backgroundColor: PC.primary, color: PC.white }}>
              Voir les plans
            </a>
          </div>
        </div>
      ) : null}
      {isLoading ? (
        <div className="rounded-xl p-6 text-sm" style={{ ...panelCard, color: PC.muted }}>
          Chargement des quittances...
        </div>
      ) : (
        <div className="space-y-8">
          {groupedQuittances.length === 0 ? (
            <div className="rounded-xl p-6 text-sm" style={{ ...panelCard, color: PC.muted }}>
              Aucune quittance enregistrée.
            </div>
          ) : (
            groupedQuittances.map(({ logement, rows: groupRows, sent }) => (
              <section key={logement.id} className="space-y-4">
                <header className="pb-3" style={{ borderBottom: `1px solid ${PC.border}` }}>
                  <div className="flex items-center gap-2">
                    <IconBuilding className="h-4 w-4" style={{ color: PC.secondary }} />
                    <h2 className="text-lg font-semibold">{logement.label}</h2>
                    <span className="text-sm" style={{ color: PC.muted }}>
                      ({sent}/{groupRows.length} envoyées)
                    </span>
                  </div>
                </header>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {groupRows.map((row) => (
                    <article key={row.id} className="rounded-xl" style={GROUP_CARD_STYLE}>
                      <h3 className="font-semibold tracking-tight">
                        {moisMap.get(String(row.mois))} {row.annee}
                      </h3>
                      <p className="mt-1 text-sm" style={{ color: PC.muted }}>
                        {locatairesMap.get(row.locataire_id) ?? row.locataire_id}
                      </p>
                      <p className="mt-3 text-sm" style={{ color: PC.muted, lineHeight: 1.35 }}>
                        Loyer {row.loyer.toFixed(2)} € · Charges {row.charges.toFixed(2)} €
                      </p>
                      <p className="text-base font-semibold">Total {row.total.toFixed(2)} €</p>
                      <div className="mt-2">
                        <StatusBadge
                          status={row.envoyee ? "envoye" : "en_attente"}
                          label={
                            row.envoyee
                              ? `Envoyée le ${row.date_envoi ? new Date(row.date_envoi).toLocaleDateString("fr-FR") : "—"}`
                              : "Non envoyée"
                          }
                        />
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <BtnEmail
                          size="small"
                          loading={sendingId === row.id}
                          onClick={() => void onSendQuittance(row)}
                        >
                          Envoyer par email
                        </BtnEmail>
                        <BtnPdf size="small" onClick={() => void onGeneratePdf(row)}>
                          Télécharger PDF
                        </BtnPdf>
                        <BtnSecondary
                          size="small"
                          title="Modifier"
                          onClick={() => void handleEditClick(row)}
                        >
                          Modifier
                        </BtnSecondary>
                        <BtnDanger size="small" onClick={() => void handleDeleteClick(row.id)}>
                          Supprimer
                        </BtnDanger>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      )}

      <EntityFormModal
        title={isEditing ? "Modifier la quittance" : "Créer une quittance"}
        fields={fields}
        values={values}
        isOpen={isModalOpen}
        isSubmitting={isSubmitting}
        submitLabel={isEditing ? "Mettre à jour" : "Créer"}
        onClose={closeModal}
        onChange={onChange}
        onSubmit={onSubmit}
      />

      <ConfirmModal
        open={deleteConfirmId != null}
        title="Supprimer la quittance"
        description="Êtes-vous sûr de vouloir supprimer cette quittance ? Cette action est irréversible."
        loading={deleteSubmitting}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) void onDelete(deleteConfirmId);
        }}
      />

      <ConfirmModal
        open={freeEditConfirmRow != null}
        title="⚠️ Droit à l'erreur — Plan Découverte"
        description="Vous bénéficiez d'une modification gratuite sur cette quittance. Après cela, toute modification nécessitera le plan Starter."
        confirmLabel="Continuer"
        cancelLabel="Annuler"
        variant="primary"
        onClose={() => setFreeEditConfirmRow(null)}
        onConfirm={() => {
          if (freeEditConfirmRow) {
            openEditModal(freeEditConfirmRow);
            setFreeEditConfirmRow(null);
          }
        }}
      />

      <ConfirmModal
        open={freeDeleteConfirmId != null}
        title="⚠️ Droit à l'erreur — Plan Découverte"
        description="Vous bénéficiez d'une suppression gratuite sur cette quittance. Après cela, toute suppression nécessitera le plan Starter."
        confirmLabel="Confirmer la suppression"
        cancelLabel="Annuler"
        variant="danger"
        onClose={() => setFreeDeleteConfirmId(null)}
        onConfirm={() => {
          if (freeDeleteConfirmId) {
            void onDelete(freeDeleteConfirmId);
            setFreeDeleteConfirmId(null);
          }
        }}
      />
    </section>
  );
}
