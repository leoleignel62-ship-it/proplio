"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { IconPlus } from "@/components/proplio-icons";
import {
  defaultChambre,
  parseChambresDetails,
  totalLoyersChambres,
  type ChambreDetail,
} from "@/lib/colocation";
import {
  canCreateLogement,
  FREE_PLAN_EDIT_CONFIRM_MESSAGE,
  FREE_PLAN_EDIT_LIMIT_REACHED_HINT,
  getOwnedCount,
  getLogementsCumulCount,
  getOwnerPlan,
  incrementLogementsCumul,
  PLAN_LIMIT_ERROR_MESSAGE,
  PLAN_UPGRADE_PATH,
} from "@/lib/plan-limits";
import { getCurrentProprietaireId } from "@/lib/proprietaire-profile";
import { formatSubmitError } from "@/lib/supabase-submit-error";
import { supabase } from "@/lib/supabase";
import { PC } from "@/lib/proplio-colors";
import { fieldInputMd, fieldInputStyle, fieldSelectMd, fieldSelectStyle, panelCard } from "@/lib/proplio-field-styles";

const LOGEMENT_MODAL_CARD: CSSProperties = {
  ...panelCard,
  padding: 24,
  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.6)",
};

type Logement = {
  id: string;
  proprietaire_id: string;
  nom: string;
  adresse: string;
  ville: string;
  code_postal: string;
  type: string;
  surface: number;
  loyer: number;
  charges: number;
  est_colocation: boolean;
  nombre_chambres?: number | null;
  chambres_details?: unknown;
  nb_modifications?: number | null;
  verrouille?: boolean | null;
  type_location?: string | null;
  capacite_max?: number | null;
  tarif_nuit_basse?: number | null;
  tarif_nuit_moyenne?: number | null;
  tarif_nuit_haute?: number | null;
  tarif_menage?: number | null;
  tarif_caution?: number | null;
  taxe_sejour_nuit?: number | null;
  equipements_saisonnier?: string[] | null;
  reglement_interieur?: string | null;
  instructions_acces?: string | null;
  ical_airbnb_url?: string | null;
  ical_booking_url?: string | null;
};

const EQUIPEMENTS_SAISONNIER_OPTS = [
  "Wifi",
  "Parking",
  "Piscine",
  "Climatisation",
  "Lave-linge",
  "Lave-vaisselle",
  "Terrasse",
  "Jardin",
  "Barbecue",
  "TV",
] as const;

const baseDefaultValues = {
  nom: "",
  adresse: "",
  ville: "",
  code_postal: "",
  type: "",
  surface: "",
  loyer: "",
  charges: "",
  est_colocation: "non",
};

export default function LogementsSaisonniersPage() {
  /** Espace saisonnier : formulaires et chargements alignés sur l’ancien mode « saisonnier ». */
  const isSaisonnier = true;
  const [rows, setRows] = useState<Logement[]>([]);
  const [values, setValues] = useState<Record<string, string>>(baseDefaultValues);
  const [nombreChambres, setNombreChambres] = useState("1");
  const [chambres, setChambres] = useState<ChambreDetail[]>([defaultChambre()]);
  const [activeChambreTab, setActiveChambreTab] = useState(0);
  const [editingRow, setEditingRow] = useState<Logement | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const [planLimitMessage, setPlanLimitMessage] = useState("");
  const [planWarningMessage, setPlanWarningMessage] = useState("");
  const [currentPlan, setCurrentPlan] = useState<"free" | "starter" | "pro" | "expert">("free");
  const [isDeleteBlockedModalOpen, setIsDeleteBlockedModalOpen] = useState(false);
  const [proprietaireId, setProprietaireId] = useState<string | null>(null);
  const [locatairesByLogement, setLocatairesByLogement] = useState<Record<string, number>>({});
  const [hoveredLogementId, setHoveredLogementId] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<"general" | "saisonnier">("general");
  const [typeLocation, setTypeLocation] = useState("saisonnier");
  const [capaciteMax, setCapaciteMax] = useState("");
  const [tarifNuitBasse, setTarifNuitBasse] = useState("");
  const [tarifNuitMoyenne, setTarifNuitMoyenne] = useState("");
  const [tarifNuitHaute, setTarifNuitHaute] = useState("");
  const [tarifMenage, setTarifMenage] = useState("");
  const [tarifCaution, setTarifCaution] = useState("");
  const [taxeSejourNuit, setTaxeSejourNuit] = useState("");
  const [equipementsSaisonnier, setEquipementsSaisonnier] = useState<string[]>([]);
  const [reglementInterieur, setReglementInterieur] = useState("");
  const [instructionsAcces, setInstructionsAcces] = useState("");
  const [icalAirbnbUrl, setIcalAirbnbUrl] = useState("");
  const [icalBookingUrl, setIcalBookingUrl] = useState("");
  const [icalSyncMessage, setIcalSyncMessage] = useState("");
  const [icalSyncLoading, setIcalSyncLoading] = useState(false);

  const isEditing = useMemo(() => editingRow !== null, [editingRow]);
  const isColocation = values.est_colocation === "oui";
  const nCh = Math.max(1, Math.min(10, Number(nombreChambres) || 1));
  const totalChambresLoyers = useMemo(() => totalLoyersChambres(chambres.slice(0, nCh)), [chambres, nCh]);
  const loyerGlobal = Number(values.loyer || 0);
  const ecartLoyer = totalChambresLoyers - loyerGlobal;
  const isPlanLimitReached = Boolean(planLimitMessage);

  const displayedRows = useMemo(
    () =>
      rows.filter((r) => {
        const t = r.type_location ?? "classique";
        return t === "saisonnier" || t === "les_deux";
      }),
    [rows],
  );

  const refreshPlanLimit = useCallback(async (ownerId: string) => {
    const [plan, totalCree, existingCount] = await Promise.all([
      getOwnerPlan(ownerId),
      getLogementsCumulCount(ownerId),
      getOwnedCount("logements", ownerId),
    ]);
    setCurrentPlan(plan);
    if (!canCreateLogement(plan, totalCree, existingCount)) {
      setPlanLimitMessage("Limite atteinte. Passez au plan supérieur pour créer plus de logements.");
      setPlanWarningMessage("");
      return;
    }
    setPlanLimitMessage("");
    const max = plan === "free" ? 1 : null;
    const remaining = max == null ? null : max - Math.max(totalCree, existingCount);
    setPlanWarningMessage(
      plan === "free" && remaining === 1
        ? "ℹ️ Attention : il s'agit de votre dernière création disponible pour le plan Gratuit."
        : "",
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

    const [{ data, error: fetchError }, { data: locData }] = await Promise.all([
      supabase
      .from("logements")
      .select("*")
      .eq("proprietaire_id", activeOwnerId)
      .order("created_at", { ascending: false }),
      supabase.from("locataires").select("logement_id").eq("proprietaire_id", activeOwnerId),
    ]);

    if (fetchError) {
      setError(`Erreur de chargement : ${formatSubmitError(fetchError)}`);
      setRows([]);
      setPlanLimitMessage("");
    } else {
      const nextRows = (data as Logement[]) ?? [];
      setRows(nextRows);
      const counts: Record<string, number> = {};
      for (const row of locData ?? []) {
        const id = row.logement_id as string | null;
        if (!id) continue;
        counts[id] = (counts[id] ?? 0) + 1;
      }
      setLocatairesByLogement(counts);
      await refreshPlanLimit(activeOwnerId);
    }

    setIsLoading(false);
  }, [proprietaireId, refreshPlanLimit]);

  useEffect(() => {
    let isMounted = true;

    const loadInitialRows = async () => {
      const { proprietaireId: ownerId, error: ownerError } = await getCurrentProprietaireId();
      if (!isMounted) return;

      if (ownerError) {
        setError(`Erreur de chargement propriétaire : ${formatSubmitError(ownerError)}`);
        setIsLoading(false);
        return;
      }

      setProprietaireId(ownerId);

      if (!ownerId) {
        setError("Complétez d'abord votre profil propriétaire dans Paramètres.");
        setIsLoading(false);
        return;
      }

      const [{ data, error: fetchError }, { data: locData }] = await Promise.all([
        supabase
        .from("logements")
        .select("*")
        .eq("proprietaire_id", ownerId)
        .order("created_at", { ascending: false }),
        supabase.from("locataires").select("logement_id").eq("proprietaire_id", ownerId),
      ]);

      if (!isMounted) return;

      if (fetchError) {
        setError(`Erreur de chargement : ${formatSubmitError(fetchError)}`);
        setRows([]);
        setPlanLimitMessage("");
      } else {
        const nextRows = (data as Logement[]) ?? [];
        setRows(nextRows);
        const counts: Record<string, number> = {};
        for (const row of locData ?? []) {
          const id = row.logement_id as string | null;
          if (!id) continue;
          counts[id] = (counts[id] ?? 0) + 1;
        }
        setLocatairesByLogement(counts);
        await refreshPlanLimit(ownerId);
      }

      setIsLoading(false);
    };

    void loadInitialRows();

    return () => {
      isMounted = false;
    };
  }, [refreshPlanLimit]);

  function syncChambresCount(count: number) {
    const c = Math.max(1, Math.min(10, count));
    setChambres((prev) => {
      const next = [...prev];
      while (next.length < c) next.push(defaultChambre());
      return next.slice(0, c);
    });
    setActiveChambreTab((tab) => Math.min(tab, c - 1));
  }

  function resetSaisonnierFields() {
    setModalTab("general");
    setTypeLocation("saisonnier");
    setCapaciteMax("");
    setTarifNuitBasse("");
    setTarifNuitMoyenne("");
    setTarifNuitHaute("");
    setTarifMenage("");
    setTarifCaution("");
    setTaxeSejourNuit("");
    setEquipementsSaisonnier([]);
    setReglementInterieur("");
    setInstructionsAcces("");
    setIcalAirbnbUrl("");
    setIcalBookingUrl("");
    setIcalSyncMessage("");
  }

  function loadSaisonnierFromRow(row: Logement) {
    setTypeLocation(row.type_location === "les_deux" ? "les_deux" : "saisonnier");
    setCapaciteMax(row.capacite_max != null ? String(row.capacite_max) : "");
    setTarifNuitBasse(row.tarif_nuit_basse != null ? String(row.tarif_nuit_basse) : "");
    setTarifNuitMoyenne(row.tarif_nuit_moyenne != null ? String(row.tarif_nuit_moyenne) : "");
    setTarifNuitHaute(row.tarif_nuit_haute != null ? String(row.tarif_nuit_haute) : "");
    setTarifMenage(row.tarif_menage != null ? String(row.tarif_menage) : "");
    setTarifCaution(row.tarif_caution != null ? String(row.tarif_caution) : "");
    setTaxeSejourNuit(row.taxe_sejour_nuit != null ? String(row.taxe_sejour_nuit) : "");
    setEquipementsSaisonnier(Array.isArray(row.equipements_saisonnier) ? [...row.equipements_saisonnier] : []);
    setReglementInterieur(row.reglement_interieur ?? "");
    setInstructionsAcces(row.instructions_acces ?? "");
    setIcalAirbnbUrl(row.ical_airbnb_url ?? "");
    setIcalBookingUrl(row.ical_booking_url ?? "");
  }

  async function openCreateModal() {
    const { proprietaireId: ownerId } = await getCurrentProprietaireId();
    if (ownerId) {
      await refreshPlanLimit(ownerId);
      const [plan, totalCree, existingCount] = await Promise.all([
        getOwnerPlan(ownerId),
        getLogementsCumulCount(ownerId),
        getOwnedCount("logements", ownerId),
      ]);
      if (!canCreateLogement(plan, totalCree, existingCount)) {
        setError(
          "Limite atteinte. Passez au plan supérieur pour créer plus de logements.",
        );
        return;
      }
    }
    setEditingRow(null);
    setValues(baseDefaultValues);
    setNombreChambres("1");
    setChambres([defaultChambre()]);
    setActiveChambreTab(0);
    resetSaisonnierFields();
    setIsModalOpen(true);
  }

  function openEditModal(row: Logement) {
    if (currentPlan === "free" && (row.nb_modifications ?? 0) >= 1) {
      setError(FREE_PLAN_EDIT_LIMIT_REACHED_HINT);
      return;
    }
    if (currentPlan === "free" && (row.nb_modifications ?? 0) === 0) {
      if (typeof window !== "undefined" && !window.confirm(FREE_PLAN_EDIT_CONFIRM_MESSAGE)) {
        return;
      }
    }
    setEditingRow(row);
    setValues({
      nom: row.nom ?? "",
      adresse: row.adresse ?? "",
      ville: row.ville ?? "",
      code_postal: row.code_postal ?? "",
      type: row.type ?? "",
      surface: String(row.surface ?? ""),
      loyer: String(row.loyer ?? ""),
      charges: String(row.charges ?? ""),
      est_colocation: row.est_colocation ? "oui" : "non",
    });
    const nc = row.est_colocation ? Math.max(1, Math.min(10, Number(row.nombre_chambres) || 1)) : 1;
    setNombreChambres(String(nc));
    const parsed = row.est_colocation ? parseChambresDetails(row.chambres_details) : [];
    const filled =
      parsed.length >= nc
        ? parsed.slice(0, nc)
        : [...parsed, ...Array.from({ length: nc - parsed.length }, () => defaultChambre())];
    setChambres(filled.slice(0, nc));
    setActiveChambreTab(0);
    setModalTab("general");
    loadSaisonnierFromRow(row);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingRow(null);
    setValues(baseDefaultValues);
    setNombreChambres("1");
    setChambres([defaultChambre()]);
    setActiveChambreTab(0);
    resetSaisonnierFields();
  }

  function onChange(name: string, value: string) {
    if (name === "est_colocation" && value !== "oui") {
      setNombreChambres("1");
      setChambres([defaultChambre()]);
      setActiveChambreTab(0);
    }
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  function updateChambre(index: number, patch: Partial<ChambreDetail>) {
    setChambres((prev) => {
      const next = [...prev];
      next[index] = { ...next[index]!, ...patch };
      return next;
    });
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
        const [totalCree, existingCount] = await Promise.all([
          getLogementsCumulCount(ownerId),
          getOwnedCount("logements", ownerId),
        ]);
        if (!canCreateLogement(plan, totalCree, existingCount)) {
          setError(PLAN_LIMIT_ERROR_MESSAGE);
          return;
        }
      }

      const nom = values.nom.trim();
      const adresse = values.adresse.trim();
      const ville = values.ville.trim();
      const cp = values.code_postal.trim();
      const type = values.type.trim();
      if (!nom || !adresse || !ville || !cp || !type) {
        setError("Renseignez le nom, l'adresse, la ville, le code postal et le type de logement.");
        return;
      }

      const surface = Number(values.surface);
      const loyer = Number(values.loyer);
      const charges = Number(values.charges);
      if (!Number.isFinite(surface) || surface <= 0) {
        setError("La surface doit être un nombre strictement positif.");
        return;
      }
      if (!Number.isFinite(loyer) || loyer < 0 || !Number.isFinite(charges) || charges < 0) {
        setError("Le loyer et les charges doivent être des nombres positifs ou nuls.");
        return;
      }

      const coloc = values.est_colocation === "oui";
      const nc = coloc ? Math.max(1, Math.min(10, Number(nombreChambres) || 1)) : 0;
      const detailsPayload = coloc ? chambres.slice(0, nc).map((c) => ({ ...c })) : [];

      const payload: Record<string, unknown> = {
        proprietaire_id: ownerId,
        nom,
        adresse,
        ville,
        code_postal: cp,
        type,
        surface,
        loyer,
        charges,
        est_colocation: coloc,
        nombre_chambres: nc,
        chambres_details: detailsPayload,
      };

      if (isSaisonnier) {
        payload.type_location = typeLocation;
        if (typeLocation === "saisonnier" || typeLocation === "les_deux") {
          const cap = Number(capaciteMax);
          if (!Number.isFinite(cap) || cap <= 0) {
            setError("Renseignez une capacité maximum (personnes) valide pour la location saisonnière.");
            return;
          }
          const tm = tarifNuitMoyenne.trim() ? Number(tarifNuitMoyenne) : NaN;
          if (!Number.isFinite(tm) || tm < 0) {
            setError("Renseignez un tarif nuit moyenne saison valide (€).");
            return;
          }
          payload.capacite_max = cap;
          payload.tarif_nuit_basse = tarifNuitBasse.trim() ? Number(tarifNuitBasse) : null;
          payload.tarif_nuit_moyenne = tm;
          payload.tarif_nuit_haute = tarifNuitHaute.trim() ? Number(tarifNuitHaute) : null;
          payload.tarif_menage = tarifMenage.trim() ? Number(tarifMenage) : null;
          payload.tarif_caution = tarifCaution.trim() ? Number(tarifCaution) : null;
          payload.taxe_sejour_nuit = taxeSejourNuit.trim() ? Number(taxeSejourNuit) : null;
          payload.equipements_saisonnier = equipementsSaisonnier;
          payload.reglement_interieur = reglementInterieur.trim() || null;
          payload.instructions_acces = instructionsAcces.trim() || null;
          payload.ical_airbnb_url = icalAirbnbUrl.trim() || null;
          payload.ical_booking_url = icalBookingUrl.trim() || null;
        } else {
          payload.capacite_max = null;
          payload.tarif_nuit_basse = null;
          payload.tarif_nuit_moyenne = null;
          payload.tarif_nuit_haute = null;
          payload.tarif_menage = null;
          payload.tarif_caution = null;
          payload.taxe_sejour_nuit = null;
          payload.equipements_saisonnier = null;
          payload.reglement_interieur = null;
          payload.instructions_acces = null;
          payload.ical_airbnb_url = null;
          payload.ical_booking_url = null;
        }
      }

      const updatePayload =
        plan === "free"
          ? { ...payload, nb_modifications: (editingRow?.nb_modifications ?? 0) + 1 }
          : { ...payload };

      const query = isEditing
        ? supabase.from("logements").update(updatePayload).eq("id", editingRow!.id).eq("proprietaire_id", ownerId)
        : supabase.from("logements").insert(payload);

      const { error: submitError } = await query;

      if (submitError) {
        setError(`Erreur d'enregistrement : ${formatSubmitError(submitError)}`);
        return;
      }
      if (!isEditing) {
        await incrementLogementsCumul(ownerId);
      }

      closeModal();
      await loadRows(ownerId);
    } catch (e) {
      setError(formatSubmitError(e));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onDelete(id: string) {
    setIsDeleting(true);
    setError("");

    try {
      const { proprietaireId: ownerId, error: ownerErr } = await getCurrentProprietaireId();
      if (ownerErr || !ownerId) {
        setError(ownerErr ? formatSubmitError(ownerErr) : "Session propriétaire introuvable.");
        return;
      }

      const { error: deleteError } = await supabase
        .from("logements")
        .delete()
        .eq("id", id)
        .eq("proprietaire_id", ownerId);

      if (deleteError) {
        const isLinkedDataError =
          (deleteError as { code?: string }).code === "23503" ||
          /foreign key|constraint|violat|reference/i.test(deleteError.message ?? "");
        if (isLinkedDataError) {
          setIsDeleteBlockedModalOpen(true);
          return;
        }
        setError(`Erreur de suppression : ${formatSubmitError(deleteError)}`);
        return;
      }

      await loadRows(ownerId);
    } catch (e) {
      setError(formatSubmitError(e));
    } finally {
      setIsDeleting(false);
    }
  }

  async function syncIcalForLogement(logementId: string) {
    setIcalSyncLoading(true);
    setIcalSyncMessage("");
    try {
      const res = await fetch("/api/saisonnier/ical-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logement_id: logementId }),
      });
      const data = (await res.json()) as { error?: string; imported?: number; updated?: number };
      if (!res.ok) {
        setIcalSyncMessage(data.error ?? "Échec synchronisation.");
        return;
      }
      setIcalSyncMessage(
        `Synchronisation : ${data.imported ?? 0} réservation(s) importée(s), ${data.updated ?? 0} mise(s) à jour.`,
      );
    } catch (e) {
      setIcalSyncMessage(formatSubmitError(e));
    } finally {
      setIcalSyncLoading(false);
    }
  }

  const showSaisonnierTab = typeLocation === "saisonnier" || typeLocation === "les_deux";

  return (
    <section className="proplio-page-wrap space-y-8" style={{ color: PC.text }}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="proplio-page-title">Logements saisonniers</h1>
          <p className="proplio-page-subtitle max-w-xl">
            Biens en location saisonnière ou « les deux ». Pour les logements uniquement classiques, utilisez{" "}
            <Link href="/logements" className="underline" style={{ color: PC.primary }}>
              Logements (mode classique)
            </Link>
            .
          </p>
        </div>
        <button
          type="button"
          className="proplio-btn-primary inline-flex items-center gap-2 px-5 py-2.5"
          onClick={() => void openCreateModal()}
          disabled={isPlanLimitReached}
          style={{ opacity: isPlanLimitReached ? 0.55 : 1, cursor: isPlanLimitReached ? "not-allowed" : "pointer" }}
        >
          <IconPlus className="h-4 w-4" />
          Nouveau logement
        </button>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: PC.dangerBg10, color: PC.danger }}>
          <p>{error}</p>
          {error === PLAN_LIMIT_ERROR_MESSAGE ? (
            <p className="mt-2">
              <a href={PLAN_UPGRADE_PATH} className="underline" style={{ color: PC.danger }}>
                Voir les abonnements
              </a>
            </p>
          ) : null}
        </div>
      ) : null}

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
      {planWarningMessage ? (
        <div className="rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: PC.primaryBg10, color: PC.secondary, border: `1px solid ${PC.primaryBorder40}` }}>
          <p>{planWarningMessage}</p>
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-xl p-6 text-sm" style={{ ...panelCard, color: PC.muted }}>
          Chargement des logements...
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl p-6 text-sm" style={{ ...panelCard, color: PC.muted }}>
          Aucun logement enregistré.
        </div>
      ) : displayedRows.length === 0 ? (
        <div className="rounded-xl p-6 text-sm" style={{ ...panelCard, color: PC.muted }}>
          Aucun logement saisonnier pour l’instant. Définissez le type « saisonnier » ou « les deux » depuis{" "}
          <Link href="/logements" className="underline" style={{ color: PC.primary }}>
            les logements en mode classique
          </Link>
          , ou créez un bien ici avec type saisonnier.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {displayedRows.map((row) => {
            const isLocked = Boolean(row.verrouille);
            const activeLocataires = locatairesByLogement[row.id] ?? 0;
            const capacity = row.est_colocation ? Number(row.nombre_chambres || 1) : 1;
            const available = Math.max(0, capacity - activeLocataires);
            const charges = Number(row.charges || 0);
            const loyerMensuelAffiche = row.est_colocation
              ? totalLoyersChambres(parseChambresDetails(row.chambres_details)) + charges
              : Number(row.loyer || 0) + charges;
            const status =
              activeLocataires === 0
                ? { label: "Vacant", bg: PC.border, color: PC.muted }
                : available === 0
                  ? { label: "Complet", bg: PC.successBg20, color: PC.success }
                  : { label: `${available} chambre(s) disponible(s)`, bg: PC.warningBg15, color: PC.warning };
            const isHovered = hoveredLogementId === row.id;
            return (
              <article
                key={row.id}
                className="relative overflow-hidden rounded-xl transition-[box-shadow,border-color] duration-200"
                style={{
                  ...panelCard,
                  opacity: isLocked ? 0.75 : 1,
                  cursor: isLocked ? "default" : "pointer",
                  borderColor: isHovered ? "#ffffff15" : undefined,
                  boxShadow: isHovered ? "0 10px 40px -12px rgba(124, 58, 237, 0.22)" : panelCard.boxShadow,
                }}
                onMouseEnter={() => setHoveredLogementId(row.id)}
                onMouseLeave={() => setHoveredLogementId(null)}
              >
                {!isLocked ? (
                  <Link
                    href={`/logements/${row.id}`}
                    className="absolute inset-0 z-[1] block rounded-xl"
                    aria-label={`Ouvrir le logement ${row.nom}`}
                    tabIndex={-1}
                  />
                ) : null}
                <div className="relative z-[2] space-y-3 p-5 pointer-events-none">
                  <h3 className="text-lg font-semibold">{row.nom}</h3>
                  <p className="mt-1 text-sm" style={{ color: PC.muted }}>
                    {row.adresse}, {row.code_postal} {row.ville}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: PC.primaryBg25, color: PC.secondary }}>
                      {row.type}
                    </span>
                    <span className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: status.bg, color: status.color }}>
                      {status.label}
                    </span>
                    {isLocked ? (
                      <span className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: PC.dangerBg15, color: PC.danger }}>
                        🔒 Verrouillé - Plan insuffisant
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-4 space-y-1 text-sm" style={{ color: PC.muted }}>
                    <p>
                      Locataires: <strong style={{ color: PC.text }}>{activeLocataires} / {capacity}</strong>
                    </p>
                    <p>
                      Loyer mensuel: <strong style={{ color: PC.text }}>{loyerMensuelAffiche.toFixed(2)} €/mois</strong>{" "}
                      (charges comprises)
                    </p>
                  </div>
                </div>
                <div className="relative z-[3] flex flex-wrap items-center gap-2 p-5 pt-0 pointer-events-auto">
                  {isLocked ? (
                    <p className="text-xs" style={{ color: PC.warning }}>
                      Passez à un plan supérieur pour accéder à ce logement
                    </p>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="w-full rounded-md px-3 py-1.5 text-xs pc-outline-muted sm:w-auto"
                        disabled={currentPlan === "free" && (row.nb_modifications ?? 0) >= 1}
                        title={
                          currentPlan === "free" && (row.nb_modifications ?? 0) >= 1
                            ? FREE_PLAN_EDIT_LIMIT_REACHED_HINT
                            : undefined
                        }
                        style={{
                          opacity:
                            currentPlan === "free" && (row.nb_modifications ?? 0) >= 1 ? 0.5 : 1,
                          cursor:
                            currentPlan === "free" && (row.nb_modifications ?? 0) >= 1
                              ? "not-allowed"
                              : "pointer",
                        }}
                        onClick={(event) => {
                          event.stopPropagation();
                          openEditModal(row);
                        }}
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        className="w-full rounded-md px-3 py-1.5 text-xs pc-outline-danger sm:w-auto"
                        disabled={isDeleting}
                        onClick={(event) => {
                          event.stopPropagation();
                          void onDelete(row.id);
                        }}
                      >
                        Supprimer
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4 backdrop-blur-safari">
          <div className="mx-auto max-w-3xl" style={LOGEMENT_MODAL_CARD}>
            <div className="mb-4 flex items-start justify-between">
              <h3 className="text-lg font-semibold">{isEditing ? "Modifier le logement" : "Créer un logement"}</h3>
              <button type="button" className="rounded-lg px-2 py-1 text-sm pc-close-muted" onClick={closeModal}>
                Fermer
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              {isSaisonnier ? (
                <div className="flex gap-1 rounded-lg p-1" style={{ backgroundColor: PC.inputBg, border: `1px solid ${PC.border}` }}>
                  <button
                    type="button"
                    className="flex-1 rounded-md px-3 py-2 text-sm font-medium transition duration-200"
                    style={{
                      backgroundColor: modalTab === "general" ? PC.primary : "transparent",
                      color: modalTab === "general" ? PC.white : PC.muted,
                    }}
                    onClick={() => setModalTab("general")}
                  >
                    Général
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-md px-3 py-2 text-sm font-medium transition duration-200"
                    style={{
                      backgroundColor: modalTab === "saisonnier" ? PC.primary : "transparent",
                      color: modalTab === "saisonnier" ? PC.white : PC.muted,
                    }}
                    onClick={() => setModalTab("saisonnier")}
                  >
                    Paramètres saisonniers
                  </button>
                </div>
              ) : null}

              {modalTab === "general" || !isSaisonnier ? (
              <>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                  <span className="font-medium">Nom du logement</span>
                  <input
                    required
                    style={fieldInputStyle}
                    value={values.nom}
                    onChange={(e) => onChange("nom", e.target.value)}
                    placeholder="Appartement République"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                  <span className="font-medium">Adresse</span>
                  <input
                    required
                    style={fieldInputStyle}
                    value={values.adresse}
                    onChange={(e) => onChange("adresse", e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                  <span className="font-medium">Ville</span>
                  <input
                    required
                    style={fieldInputStyle}
                    value={values.ville}
                    onChange={(e) => onChange("ville", e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                  <span className="font-medium">Code postal</span>
                  <input
                    required
                    style={fieldInputStyle}
                    value={values.code_postal}
                    onChange={(e) => onChange("code_postal", e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                  <span className="font-medium">Type</span>
                  <input
                    required
                    style={fieldInputStyle}
                    value={values.type}
                    onChange={(e) => onChange("type", e.target.value)}
                    placeholder="T2, Studio..."
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                  <span className="font-medium">Surface (m²)</span>
                  <input
                    required
                    type="number"
                    step="0.1"
                    style={fieldInputStyle}
                    value={values.surface}
                    onChange={(e) => onChange("surface", e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                  <span className="font-medium">Loyer global (€)</span>
                  <input
                    required
                    type="number"
                    step="0.01"
                    style={fieldInputStyle}
                    value={values.loyer}
                    onChange={(e) => onChange("loyer", e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                  <span className="font-medium">Charges globales (€)</span>
                  <input
                    required
                    type="number"
                    step="0.01"
                    style={fieldInputStyle}
                    value={values.charges}
                    onChange={(e) => onChange("charges", e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm sm:col-span-2" style={{ color: PC.muted }}>
                  <span className="font-medium">Mode</span>
                  <select
                    required
                    style={fieldSelectStyle}
                    value={values.est_colocation}
                    onChange={(e) => onChange("est_colocation", e.target.value)}
                  >
                    <option value="non">Location classique</option>
                    <option value="oui">Colocation</option>
                  </select>
                </label>
              </div>

              {isColocation ? (
                <div
                  className="rounded-lg p-4"
                  style={{
                    border: `1px solid ${PC.primaryBorder40}`,
                    backgroundColor: PC.primaryBg10,
                  }}
                >
                  <h4 className="text-sm font-semibold">Gestion de la colocation</h4>
                  <label className="mt-3 flex max-w-xs flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                    <span className="font-medium">Nombre de chambres</span>
                    <select
                      style={fieldSelectStyle}
                      value={nombreChambres}
                      onChange={(e) => {
                        const v = e.target.value;
                        setNombreChambres(v);
                        syncChambresCount(Number(v));
                      }}
                    >
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={String(n)}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="mt-4" style={{ borderBottom: `1px solid ${PC.border}` }}>
                    <div className="flex flex-wrap gap-1">
                      {chambres.slice(0, nCh).map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          className={`rounded-t-md px-3 py-2 text-sm font-medium ${
                            activeChambreTab === i ? "pc-tab-log-active" : "pc-tab-log-inactive"
                          }`}
                          onClick={() => setActiveChambreTab(i)}
                        >
                          Chambre {i + 1}
                        </button>
                      ))}
                    </div>
                  </div>

                  {chambres.slice(0, nCh).map((ch, i) =>
                    i === activeChambreTab ? (
                      <div
                        key={i}
                        className="grid gap-3 border border-t-0 p-4 sm:grid-cols-2"
                        style={{ borderColor: PC.border, backgroundColor: PC.card }}
                      >
                        <label className="flex flex-col gap-1 text-xs" style={{ color: PC.muted }}>
                          <span className="font-medium">Loyer de la chambre (€)</span>
                          <input
                            type="number"
                            step="0.01"
                            className="w-full rounded-md px-2 py-1.5 text-sm outline-none pc-field-focus"
                            style={fieldInputMd}
                            value={ch.loyer || ""}
                            onChange={(e) =>
                              updateChambre(i, { loyer: Number(e.target.value) || 0 })
                            }
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-xs" style={{ color: PC.muted }}>
                          <span className="font-medium">Charges de la chambre (€)</span>
                          <input
                            type="number"
                            step="0.01"
                            className="w-full rounded-md px-2 py-1.5 text-sm outline-none pc-field-focus"
                            style={fieldInputMd}
                            value={ch.charges || ""}
                            onChange={(e) =>
                              updateChambre(i, { charges: Number(e.target.value) || 0 })
                            }
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-xs" style={{ color: PC.muted }}>
                          <span className="font-medium">Surface (m²)</span>
                          <input
                            type="number"
                            step="0.1"
                            className="w-full rounded-md px-2 py-1.5 text-sm outline-none pc-field-focus"
                            style={fieldInputMd}
                            value={ch.surface || ""}
                            onChange={(e) =>
                              updateChambre(i, { surface: Number(e.target.value) || 0 })
                            }
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-xs" style={{ color: PC.muted }}>
                          <span className="font-medium">Statut</span>
                          <select
                            className="w-full rounded-md px-2 py-1.5 text-sm outline-none pc-field-focus"
                            style={fieldSelectMd}
                            value={ch.statut}
                            onChange={(e) =>
                              updateChambre(i, {
                                statut: e.target.value === "occupee" ? "occupee" : "libre",
                              })
                            }
                          >
                            <option value="libre">Libre</option>
                            <option value="occupee">Occupée</option>
                          </select>
                        </label>
                        <label className="sm:col-span-2 flex flex-col gap-1 text-xs" style={{ color: PC.muted }}>
                          <span className="font-medium">Description / équipements</span>
                          <textarea
                            className="min-h-16 w-full rounded-md px-2 py-1.5 text-sm outline-none pc-field-focus"
                            style={fieldInputMd}
                            value={ch.description}
                            onChange={(e) => updateChambre(i, { description: e.target.value })}
                            placeholder="Meublée, balcon, salle d'eau privative..."
                          />
                        </label>
                      </div>
                    ) : null,
                  )}

                  <div
                    className="mt-4 rounded-md p-3 text-sm"
                    style={{ border: `1px solid ${PC.border}`, backgroundColor: PC.card }}
                  >
                    <p className="font-medium">Récapitulatif</p>
                    <p className="mt-1" style={{ color: PC.muted }}>
                      Total loyers des chambres :{" "}
                      <strong>{totalChambresLoyers.toFixed(2)} €</strong>
                    </p>
                    <p style={{ color: PC.muted }}>
                      Loyer global du logement : <strong>{loyerGlobal.toFixed(2)} €</strong>
                    </p>
                    <p
                      className="mt-1 text-xs"
                      style={{
                        color: Math.abs(ecartLoyer) < 0.01 ? PC.success : PC.warning,
                      }}
                    >
                      {Math.abs(ecartLoyer) < 0.01
                        ? "Somme des loyers de chambres = loyer global."
                        : `Écart : ${ecartLoyer >= 0 ? "+" : ""}${ecartLoyer.toFixed(2)} € (vérifiez la cohérence des montants).`}
                    </p>
                  </div>
                </div>
              ) : null}
              </>
              ) : (
                <div className="space-y-4">
                  <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                    <span className="font-medium">Type de location</span>
                    <select
                      style={fieldSelectStyle}
                      value={typeLocation === "les_deux" ? "les_deux" : "saisonnier"}
                      onChange={(e) => setTypeLocation(e.target.value)}
                    >
                      <option value="saisonnier">Saisonnier</option>
                      <option value="les_deux">Les deux (classique + saisonnier)</option>
                    </select>
                  </label>

                  {showSaisonnierTab ? (
                    <>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                          <span className="font-medium">Capacité max (personnes)</span>
                          <input
                            type="number"
                            min={1}
                            style={fieldInputStyle}
                            value={capaciteMax}
                            onChange={(e) => setCapaciteMax(e.target.value)}
                          />
                        </label>
                        <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                          <span className="font-medium">Tarif / nuit basse saison (€)</span>
                          <input type="number" step="0.01" style={fieldInputStyle} value={tarifNuitBasse} onChange={(e) => setTarifNuitBasse(e.target.value)} />
                        </label>
                        <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                          <span className="font-medium">Tarif / nuit moyenne saison (€)</span>
                          <input type="number" step="0.01" style={fieldInputStyle} value={tarifNuitMoyenne} onChange={(e) => setTarifNuitMoyenne(e.target.value)} />
                        </label>
                        <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                          <span className="font-medium">Tarif / nuit haute saison (€)</span>
                          <input type="number" step="0.01" style={fieldInputStyle} value={tarifNuitHaute} onChange={(e) => setTarifNuitHaute(e.target.value)} />
                        </label>
                        <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                          <span className="font-medium">Tarif ménage (€)</span>
                          <input type="number" step="0.01" style={fieldInputStyle} value={tarifMenage} onChange={(e) => setTarifMenage(e.target.value)} />
                        </label>
                        <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                          <span className="font-medium">Tarif caution (€)</span>
                          <input type="number" step="0.01" style={fieldInputStyle} value={tarifCaution} onChange={(e) => setTarifCaution(e.target.value)} />
                        </label>
                        <label className="flex flex-col gap-1.5 text-sm sm:col-span-2" style={{ color: PC.muted }}>
                          <span className="font-medium">Taxe de séjour (€ / personne / nuit)</span>
                          <input type="number" step="0.01" style={fieldInputStyle} value={taxeSejourNuit} onChange={(e) => setTaxeSejourNuit(e.target.value)} />
                        </label>
                      </div>

                      <div>
                        <p className="mb-2 text-sm font-medium" style={{ color: PC.text }}>
                          Équipements
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {EQUIPEMENTS_SAISONNIER_OPTS.map((label) => (
                            <label key={label} className="flex items-center gap-2 text-sm" style={{ color: PC.muted }}>
                              <input
                                type="checkbox"
                                checked={equipementsSaisonnier.includes(label)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setEquipementsSaisonnier((prev) => [...prev, label]);
                                  } else {
                                    setEquipementsSaisonnier((prev) => prev.filter((x) => x !== label));
                                  }
                                }}
                              />
                              {label}
                            </label>
                          ))}
                        </div>
                      </div>

                      <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                        <span className="font-medium">Règlement intérieur</span>
                        <textarea className="min-h-24 rounded-lg px-3 py-2 text-sm" style={fieldInputMd} value={reglementInterieur} onChange={(e) => setReglementInterieur(e.target.value)} />
                      </label>
                      <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                        <span className="font-medium">Instructions d&apos;accès</span>
                        <textarea className="min-h-24 rounded-lg px-3 py-2 text-sm" style={fieldInputMd} value={instructionsAcces} onChange={(e) => setInstructionsAcces(e.target.value)} />
                      </label>

                      <div className="rounded-xl p-4" style={{ border: `1px solid ${PC.border}`, backgroundColor: PC.bg }}>
                        <h4 className="text-sm font-semibold" style={{ color: PC.text }}>
                          Synchronisation calendrier
                        </h4>
                        <label className="mt-3 flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                          <span className="font-medium">URL iCal Airbnb</span>
                          <input style={fieldInputStyle} value={icalAirbnbUrl} onChange={(e) => setIcalAirbnbUrl(e.target.value)} placeholder="https://..." />
                        </label>
                        <p className="mt-2 text-xs leading-relaxed" style={{ color: PC.muted }}>
                          📋 Comment récupérer votre lien Airbnb :<br />
                          1. Airbnb → Calendrier → Disponibilités
                          <br />
                          2. Exporter le calendrier
                          <br />
                          3. Copier et coller le lien ici
                        </p>
                        <label className="mt-4 flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                          <span className="font-medium">URL iCal Booking</span>
                          <input style={fieldInputStyle} value={icalBookingUrl} onChange={(e) => setIcalBookingUrl(e.target.value)} placeholder="https://..." />
                        </label>
                        <p className="mt-2 text-xs leading-relaxed" style={{ color: PC.muted }}>
                          Même démarche sur Booking.com : extranet → synchronisation du calendrier → lien iCal.
                        </p>
                        <button
                          type="button"
                          className="mt-4 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
                          style={{ backgroundColor: PC.primary, color: PC.white }}
                          disabled={icalSyncLoading || !isEditing}
                          onClick={() => {
                            if (editingRow) void syncIcalForLogement(editingRow.id);
                          }}
                        >
                          {icalSyncLoading ? "Synchronisation…" : "Synchroniser maintenant"}
                        </button>
                        {!isEditing ? (
                          <p className="mt-2 text-xs" style={{ color: PC.warning }}>
                            Enregistrez le logement avant de synchroniser les calendriers.
                          </p>
                        ) : null}
                        {icalSyncMessage ? (
                          <p className="mt-2 text-xs" style={{ color: PC.muted }}>
                            {icalSyncMessage}
                          </p>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm" style={{ color: PC.muted }}>
                      Passez le type sur « Saisonnier » ou « Les deux » pour afficher tarifs, équipements et iCal.
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" className="proplio-btn-secondary" onClick={closeModal}>
                  Annuler
                </button>
                <button type="submit" disabled={isSubmitting} className="proplio-btn-primary px-6">
                  {isSubmitting ? "Enregistrement..." : isEditing ? "Mettre à jour" : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isDeleteBlockedModalOpen ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4 backdrop-blur-safari">
          <div className="mx-auto mt-16 max-w-xl rounded-xl p-6" style={LOGEMENT_MODAL_CARD}>
            <h3 className="text-xl font-semibold" style={{ color: PC.text }}>
              Impossible de supprimer ce logement
            </h3>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: PC.muted }}>
              Ce logement a des données associées qui doivent être supprimées avant :
              <br />- Locataires assignés
              <br />- Baux actifs ou terminés
              <br />- Quittances générées
              <br />- États des lieux
              <br />
              <br />
              ⚠️ Ce logement compte dans votre quota cumulatif. Même après suppression, vous ne pourrez pas en créer un nouveau si vous avez atteint la limite.
              <br />
              <br />
              Veuillez d&apos;abord supprimer ces éléments depuis leurs sections respectives.
            </p>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="proplio-btn-primary px-5 py-2"
                onClick={() => setIsDeleteBlockedModalOpen(false)}
              >
                Compris
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
