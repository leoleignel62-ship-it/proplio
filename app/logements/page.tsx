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
import { type TarifCreneau, parseTarifsCreneauxJson } from "@/lib/saisonnier-tarifs";

const LOGEMENT_MODAL_CARD: CSSProperties = {
  ...panelCard,
  padding: 24,
  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.6)",
};

type TypeLocation = "classique" | "saisonnier" | "les_deux";

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
  tarifs_creneaux?: unknown;
  tarif_nuit_defaut?: number | null;
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

const EXPLOITATION_CARD_BG = "#13131a";

const MOIS_FR = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
] as const;
const MOIS_OPTIONS = MOIS_FR.map((label, i) => ({
  value: String(i + 1).padStart(2, "0"),
  label,
}));
const JOUR_OPTIONS = Array.from({ length: 31 }, (_, i) => {
  const v = String(i + 1).padStart(2, "0");
  return { value: v, label: `${i + 1}` };
});

function mmDdFromParts(m: string, d: string): string {
  const mm = String(Math.max(1, Math.min(12, Number(m) || 1))).padStart(2, "0");
  const dd = String(Math.max(1, Math.min(31, Number(d) || 1))).padStart(2, "0");
  return `${mm}-${dd}`;
}

function formatMmDdFr(md: string): string {
  const [mm, dd] = md.split("-");
  if (!mm || !dd) return md;
  return `${dd}/${mm}`;
}

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

function normalizeTypeLocation(raw: string | null | undefined): TypeLocation {
  if (raw === "saisonnier" || raw === "les_deux") return raw;
  return "classique";
}

function getExploitationBadge(typeLoc: string | null | undefined): { label: string; bg: string; color: string } {
  const t = typeLoc ?? "classique";
  if (t === "saisonnier") {
    return { label: "Saisonnier", bg: "rgba(34, 211, 238, 0.18)", color: "#22d3ee" };
  }
  if (t === "les_deux") {
    return { label: "Les deux", bg: PC.primaryBg15, color: PC.secondary };
  }
  return { label: "Classique", bg: "rgba(148, 163, 184, 0.22)", color: "#94a3b8" };
}

export default function LogementsPage() {
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
  const [typeLocation, setTypeLocation] = useState<TypeLocation>("classique");
  const [capaciteMax, setCapaciteMax] = useState("");
  const [tarifNuitDefaut, setTarifNuitDefaut] = useState("");
  const [tarifsCreneaux, setTarifsCreneaux] = useState<TarifCreneau[]>([]);
  const [creneauFormOpen, setCreneauFormOpen] = useState(false);
  const [creneauEditingId, setCreneauEditingId] = useState<string | null>(null);
  const [creneauNom, setCreneauNom] = useState("");
  const [creneauDm, setCreneauDm] = useState("07");
  const [creneauDd, setCreneauDd] = useState("01");
  const [creneauFm, setCreneauFm] = useState("08");
  const [creneauFd, setCreneauFd] = useState("31");
  const [creneauTarif, setCreneauTarif] = useState("");
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
  const [csvImportFile, setCsvImportFile] = useState<File | null>(null);
  const [csvImportLoading, setCsvImportLoading] = useState(false);
  const [csvImportResult, setCsvImportResult] = useState<{
    imported: number;
    skipped: number;
    unmatchedNames: string[];
  } | null>(null);

  const isEditing = useMemo(() => editingRow !== null, [editingRow]);
  const showClassicFields = typeLocation === "classique" || typeLocation === "les_deux";
  const showSaisonnierFields = typeLocation === "saisonnier" || typeLocation === "les_deux";
  const isColocation = showClassicFields && values.est_colocation === "oui";
  const nCh = Math.max(1, Math.min(10, Number(nombreChambres) || 1));
  const totalChambresLoyers = useMemo(() => totalLoyersChambres(chambres.slice(0, nCh)), [chambres, nCh]);
  const loyerGlobal = Number(values.loyer || 0);
  const ecartLoyer = totalChambresLoyers - loyerGlobal;
  const isPlanLimitReached = Boolean(planLimitMessage);

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
    setTypeLocation("classique");
    setCapaciteMax("");
    setTarifNuitDefaut("");
    setTarifsCreneaux([]);
    setCreneauFormOpen(false);
    setCreneauEditingId(null);
    setCreneauNom("");
    setCreneauDm("07");
    setCreneauDd("01");
    setCreneauFm("08");
    setCreneauFd("31");
    setCreneauTarif("");
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
    setTypeLocation(normalizeTypeLocation(row.type_location));
    setCapaciteMax(row.capacite_max != null ? String(row.capacite_max) : "");
    const parsed = parseTarifsCreneauxJson(row.tarifs_creneaux);
    setTarifsCreneaux(parsed);
    const def =
      row.tarif_nuit_defaut != null
        ? String(row.tarif_nuit_defaut)
        : row.tarif_nuit_moyenne != null
          ? String(row.tarif_nuit_moyenne)
          : "";
    setTarifNuitDefaut(def);
    setCreneauFormOpen(false);
    setCreneauEditingId(null);
    setTarifMenage(row.tarif_menage != null ? String(row.tarif_menage) : "");
    setTarifCaution(row.tarif_caution != null ? String(row.tarif_caution) : "");
    setTaxeSejourNuit(row.taxe_sejour_nuit != null ? String(row.taxe_sejour_nuit) : "");
    setEquipementsSaisonnier(Array.isArray(row.equipements_saisonnier) ? [...row.equipements_saisonnier] : []);
    setReglementInterieur(row.reglement_interieur ?? "");
    setInstructionsAcces(row.instructions_acces ?? "");
    setIcalAirbnbUrl(row.ical_airbnb_url ?? "");
    setIcalBookingUrl(row.ical_booking_url ?? "");
    setIcalSyncMessage("");
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

  function openCreneauAdd() {
    setCreneauEditingId(null);
    setCreneauNom("");
    setCreneauDm("07");
    setCreneauDd("01");
    setCreneauFm("08");
    setCreneauFd("31");
    setCreneauTarif("");
    setCreneauFormOpen(true);
  }

  function openCreneauEdit(c: TarifCreneau) {
    const [dm, dd] = c.date_debut.split("-");
    const [fm, fd] = c.date_fin.split("-");
    setCreneauEditingId(c.id);
    setCreneauNom(c.nom);
    setCreneauDm(dm ?? "07");
    setCreneauDd(dd ?? "01");
    setCreneauFm(fm ?? "08");
    setCreneauFd(fd ?? "31");
    setCreneauTarif(String(c.tarif));
    setCreneauFormOpen(true);
  }

  function saveCreneauDraft() {
    const price = Number(creneauTarif);
    if (!creneauNom.trim() || !Number.isFinite(price) || price < 0) return;
    const dDeb = mmDdFromParts(creneauDm, creneauDd);
    const dFin = mmDdFromParts(creneauFm, creneauFd);
    const item: TarifCreneau = {
      id: creneauEditingId ?? crypto.randomUUID(),
      nom: creneauNom.trim(),
      date_debut: dDeb,
      date_fin: dFin,
      tarif: price,
    };
    if (creneauEditingId) {
      setTarifsCreneaux((prev) => prev.map((x) => (x.id === creneauEditingId ? item : x)));
    } else {
      setTarifsCreneaux((prev) => [...prev, item]);
    }
    setCreneauFormOpen(false);
    setCreneauEditingId(null);
  }

  function removeCreneau(id: string) {
    setTarifsCreneaux((prev) => prev.filter((x) => x.id !== id));
    if (creneauEditingId === id) {
      setCreneauFormOpen(false);
      setCreneauEditingId(null);
    }
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
      if (!Number.isFinite(surface) || surface <= 0) {
        setError("La surface doit être un nombre strictement positif.");
        return;
      }

      const showClassic = typeLocation === "classique" || typeLocation === "les_deux";
      const showS = typeLocation === "saisonnier" || typeLocation === "les_deux";

      let loyer = 0;
      let charges = 0;
      let coloc = false;
      let nc = 0;
      let detailsPayload: unknown[] = [];

      if (showClassic) {
        loyer = Number(values.loyer);
        charges = Number(values.charges);
        if (!Number.isFinite(loyer) || loyer < 0 || !Number.isFinite(charges) || charges < 0) {
          setError("Le loyer et les charges doivent être des nombres positifs ou nuls.");
          return;
        }
        coloc = values.est_colocation === "oui";
        nc = coloc ? Math.max(1, Math.min(10, Number(nombreChambres) || 1)) : 0;
        detailsPayload = coloc ? chambres.slice(0, nc).map((c) => ({ ...c })) : [];
      }

      let capacite_max: number | null = null;
      let tarif_menage: number | null = null;
      let tarif_caution: number | null = null;
      let taxe_sejour_nuit: number | null = null;
      let equipements: string[] | null = null;
      let reglement: string | null = null;
      let instructions: string | null = null;
      let icalA: string | null = null;
      let icalB: string | null = null;

      let tarif_nuit_defaut: number | null = null;
      let tarifs_creneaux_payload: TarifCreneau[] = [];

      if (showS) {
        const cap = Number(capaciteMax);
        if (!Number.isFinite(cap) || cap <= 0) {
          setError("Renseignez une capacité maximum (personnes) valide pour la location saisonnière.");
          return;
        }
        const tdef = tarifNuitDefaut.trim() ? Number(tarifNuitDefaut) : NaN;
        if (!Number.isFinite(tdef) || tdef < 0) {
          setError("Renseignez un tarif par défaut (€/nuit) valide.");
          return;
        }
        capacite_max = cap;
        tarif_nuit_defaut = tdef;
        tarifs_creneaux_payload = tarifsCreneaux.map((c) => ({
          id: c.id,
          nom: c.nom.trim() || "Période",
          date_debut: c.date_debut,
          date_fin: c.date_fin,
          tarif: c.tarif,
        }));
        tarif_menage = tarifMenage.trim() ? Number(tarifMenage) : null;
        tarif_caution = tarifCaution.trim() ? Number(tarifCaution) : null;
        taxe_sejour_nuit = taxeSejourNuit.trim() ? Number(taxeSejourNuit) : null;
        equipements = equipementsSaisonnier;
        reglement = reglementInterieur.trim() || null;
        instructions = instructionsAcces.trim() || null;
        icalA = icalAirbnbUrl.trim() || null;
        icalB = icalBookingUrl.trim() || null;
      }

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
        type_location: typeLocation,
        capacite_max,
        tarifs_creneaux: showS ? tarifs_creneaux_payload : null,
        tarif_nuit_defaut: showS ? tarif_nuit_defaut : null,
        tarif_nuit_basse: null,
        tarif_nuit_moyenne: showS ? tarif_nuit_defaut : null,
        tarif_nuit_haute: null,
        tarif_menage,
        tarif_caution,
        taxe_sejour_nuit,
        equipements_saisonnier: equipements,
        reglement_interieur: reglement,
        instructions_acces: instructions,
        ical_airbnb_url: icalA,
        ical_booking_url: icalB,
      };

      if (!showS) {
        payload.capacite_max = null;
        payload.tarifs_creneaux = null;
        payload.tarif_nuit_defaut = null;
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

  async function syncIcalForLogement(logementId: string, syncFullHistory = false) {
    setIcalSyncLoading(true);
    setIcalSyncMessage("");
    try {
      const res = await fetch("/api/saisonnier/ical-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logement_id: logementId, sync_full_history: syncFullHistory }),
      });
      const data = (await res.json()) as {
        error?: string;
        imported?: number;
        updated?: number;
        infoMessage?: string | null;
      };
      if (!res.ok) {
        setIcalSyncMessage(data.error ?? "Échec synchronisation.");
        return;
      }
      const baseMessage = `${syncFullHistory ? "Import historique" : "Synchronisation"} : ${data.imported ?? 0} réservation(s) importée(s), ${data.updated ?? 0} mise(s) à jour.`;
      setIcalSyncMessage(data.infoMessage ? `${baseMessage} ${data.infoMessage}` : baseMessage);
    } catch (e) {
      setIcalSyncMessage(formatSubmitError(e));
    } finally {
      setIcalSyncLoading(false);
    }
  }

  async function importAirbnbCsvHistory() {
    if (!csvImportFile) {
      setIcalSyncMessage("Sélectionnez d'abord un fichier CSV Airbnb.");
      return;
    }
    setCsvImportLoading(true);
    setIcalSyncMessage("");
    setCsvImportResult(null);
    try {
      const form = new FormData();
      form.append("file", csvImportFile);
      const res = await fetch("/api/saisonnier/import-csv-airbnb", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as {
        error?: string;
        imported?: number;
        skipped?: number;
        unmatched?: Array<{ code: string; logement_nom: string; dates: string }>;
      };
      if (!res.ok) {
        setIcalSyncMessage(data.error ?? "Échec import CSV.");
        return;
      }
      const unmatchedNames = Array.from(
        new Set((data.unmatched ?? []).map((x) => x.logement_nom).filter(Boolean)),
      );
      setCsvImportResult({
        imported: data.imported ?? 0,
        skipped: data.skipped ?? 0,
        unmatchedNames,
      });
      if (editingRow?.id) {
        await loadRows(proprietaireId);
      }
    } catch (e) {
      setIcalSyncMessage(formatSubmitError(e));
    } finally {
      setCsvImportLoading(false);
    }
  }

  return (
    <section className="proplio-page-wrap space-y-8" style={{ color: PC.text }}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="proplio-page-title">Logements</h1>
          <p className="proplio-page-subtitle max-w-xl">Liste, création et gestion de vos biens.</p>
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
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => {
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
            const exploitationBadge = getExploitationBadge(row.type_location);
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
                    <span className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: exploitationBadge.bg, color: exploitationBadge.color }}>
                      {exploitationBadge.label}
                    </span>
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
                <label className="flex flex-col gap-1.5 text-sm sm:col-span-2" style={{ color: PC.muted }}>
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
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold" style={{ color: PC.text }}>
                  Mode d&apos;exploitation
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {(
                    [
                      {
                        id: "classique" as const,
                        icon: "🏠",
                        title: "Location classique",
                        desc: "Bail annuel, quittances mensuelles",
                      },
                      {
                        id: "saisonnier" as const,
                        icon: "🌴",
                        title: "Location saisonnière",
                        desc: "Nuitées, réservations courte durée",
                      },
                      {
                        id: "les_deux" as const,
                        icon: "🔄",
                        title: "Les deux",
                        desc: "Exploitation mixte selon les périodes",
                      },
                    ] as const
                  ).map((opt) => {
                    const active = typeLocation === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        className="flex flex-col items-start gap-1 rounded-xl p-4 text-left transition duration-200"
                        style={{
                          backgroundColor: EXPLOITATION_CARD_BG,
                          border: `2px solid ${active ? PC.primary : PC.border}`,
                          boxShadow: active ? PC.activeRing : "none",
                        }}
                        onClick={() => setTypeLocation(opt.id)}
                      >
                        <span className="text-xl" aria-hidden>
                          {opt.icon}
                        </span>
                        <span className="text-sm font-semibold" style={{ color: PC.text }}>
                          {opt.title}
                        </span>
                        <span className="text-xs leading-snug" style={{ color: PC.muted }}>
                          {opt.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {showClassicFields ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                    <span className="font-medium">Loyer global (€)</span>
                    <input
                      required={showClassicFields}
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
                      required={showClassicFields}
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
              ) : null}

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

              {showSaisonnierFields ? (
                <div className="space-y-4 rounded-xl p-4" style={{ border: `1px solid ${PC.primaryBorder40}`, backgroundColor: PC.primaryBg10 }}>
                  <h4 className="text-sm font-semibold" style={{ color: PC.text }}>
                    Paramètres saisonniers
                  </h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-1.5 text-sm sm:col-span-2" style={{ color: PC.muted }}>
                      <span className="font-medium">Capacité max (personnes)</span>
                      <input
                        required={showSaisonnierFields}
                        type="number"
                        min={1}
                        style={fieldInputStyle}
                        value={capaciteMax}
                        onChange={(e) => setCapaciteMax(e.target.value)}
                      />
                    </label>
                    <div className="space-y-3 sm:col-span-2">
                      <div>
                        <h5 className="text-sm font-semibold" style={{ color: PC.text }}>
                          Tarifs par période
                        </h5>
                        <p className="mt-1 text-xs leading-relaxed" style={{ color: PC.muted }}>
                          Définissez vos tarifs selon les périodes de l&apos;année. Ces tarifs se répètent chaque année automatiquement.
                        </p>
                      </div>
                      <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                        <span className="font-medium">Tarif par défaut (€/nuit)</span>
                        <input
                          required={showSaisonnierFields}
                          type="number"
                          step="0.01"
                          min={0}
                          style={fieldInputStyle}
                          value={tarifNuitDefaut}
                          onChange={(e) => setTarifNuitDefaut(e.target.value)}
                          placeholder="Hors créneau défini"
                        />
                      </label>
                      <ul className="space-y-2">
                        {tarifsCreneaux.map((c) => (
                          <li
                            key={c.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm"
                            style={{ border: `1px solid ${PC.border}`, backgroundColor: PC.bg }}
                          >
                            <div className="min-w-0">
                              <p className="font-medium" style={{ color: PC.text }}>
                                {c.nom}
                              </p>
                              <p className="text-xs" style={{ color: PC.muted }}>
                                Du {formatMmDdFr(c.date_debut)} au {formatMmDdFr(c.date_fin)} · {c.tarif} €/nuit
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                className="rounded-lg px-2 py-1 text-xs font-medium"
                                style={{ color: PC.primary, border: `1px solid ${PC.border}` }}
                                title="Modifier"
                                onClick={() => openCreneauEdit(c)}
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                className="rounded-lg px-2 py-1 text-xs font-medium"
                                style={{ color: "#f87171" }}
                                title="Supprimer"
                                onClick={() => removeCreneau(c.id)}
                              >
                                ✕
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                      {!creneauFormOpen ? (
                        <button type="button" className="proplio-btn-secondary w-full py-2 text-sm" onClick={openCreneauAdd}>
                          Ajouter une période
                        </button>
                      ) : (
                        <div className="space-y-3 rounded-lg p-3" style={{ border: `1px solid ${PC.primaryBorder40}`, backgroundColor: PC.primaryBg10 }}>
                          <p className="text-xs font-medium" style={{ color: PC.text }}>
                            {creneauEditingId ? "Modifier la période" : "Nouvelle période"}
                          </p>
                          <label className="flex flex-col gap-1 text-xs" style={{ color: PC.muted }}>
                            Nom de la période
                            <input style={fieldInputStyle} value={creneauNom} onChange={(e) => setCreneauNom(e.target.value)} placeholder="Été, Noël…" />
                          </label>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div>
                              <p className="mb-1 text-xs font-medium" style={{ color: PC.muted }}>
                                Début
                              </p>
                              <div className="flex gap-2">
                                <select style={fieldSelectStyle} className="min-w-0 flex-1" aria-label="Jour de début" value={creneauDd} onChange={(e) => setCreneauDd(e.target.value)}>
                                  {JOUR_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>
                                      {o.label}
                                    </option>
                                  ))}
                                </select>
                                <select style={fieldSelectStyle} className="min-w-0 flex-1" aria-label="Mois de début" value={creneauDm} onChange={(e) => setCreneauDm(e.target.value)}>
                                  {MOIS_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>
                                      {o.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div>
                              <p className="mb-1 text-xs font-medium" style={{ color: PC.muted }}>
                                Fin
                              </p>
                              <div className="flex gap-2">
                                <select style={fieldSelectStyle} className="min-w-0 flex-1" aria-label="Jour de fin" value={creneauFd} onChange={(e) => setCreneauFd(e.target.value)}>
                                  {JOUR_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>
                                      {o.label}
                                    </option>
                                  ))}
                                </select>
                                <select style={fieldSelectStyle} className="min-w-0 flex-1" aria-label="Mois de fin" value={creneauFm} onChange={(e) => setCreneauFm(e.target.value)}>
                                  {MOIS_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>
                                      {o.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                          <label className="flex flex-col gap-1 text-xs" style={{ color: PC.muted }}>
                            Tarif (€/nuit)
                            <input type="number" step="0.01" min={0} style={fieldInputStyle} value={creneauTarif} onChange={(e) => setCreneauTarif(e.target.value)} />
                          </label>
                          <div className="flex flex-wrap gap-2">
                            <button type="button" className="proplio-btn-primary px-3 py-1.5 text-sm" onClick={saveCreneauDraft}>
                              {creneauEditingId ? "Enregistrer" : "Ajouter"}
                            </button>
                            <button
                              type="button"
                              className="proplio-btn-secondary px-3 py-1.5 text-sm"
                              onClick={() => {
                                setCreneauFormOpen(false);
                                setCreneauEditingId(null);
                              }}
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
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
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
                        style={{ backgroundColor: PC.primary, color: PC.white }}
                        disabled={icalSyncLoading || !isEditing}
                        onClick={() => {
                          if (editingRow) void syncIcalForLogement(editingRow.id);
                        }}
                      >
                        {icalSyncLoading ? "Synchronisation…" : "Synchroniser maintenant"}
                      </button>
                      <button
                        type="button"
                        className="rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
                        style={{ backgroundColor: PC.secondary, color: PC.white }}
                        disabled={icalSyncLoading || !isEditing}
                        title="Importe toutes les réservations disponibles depuis 2010. À utiliser une seule fois au démarrage."
                        onClick={() => {
                          if (editingRow) void syncIcalForLogement(editingRow.id, true);
                        }}
                      >
                        {icalSyncLoading ? "Import en cours…" : "Importer tout l'historique"}
                      </button>
                    </div>
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
                  <div className="rounded-xl p-4" style={{ border: `1px solid ${PC.border}`, backgroundColor: PC.bg }}>
                    <h4 className="text-sm font-semibold" style={{ color: PC.text }}>
                      Importer l&apos;historique Airbnb (CSV)
                    </h4>
                    <p className="mt-2 text-xs leading-relaxed" style={{ color: PC.muted }}>
                      1. Airbnb → Revenus → Montant payé
                      <br />
                      2. Cliquer Exporter au format CSV
                      <br />
                      3. Importer le fichier ici
                    </p>
                    <label className="mt-3 flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                      <span className="font-medium">Fichier CSV Airbnb</span>
                      <input
                        type="file"
                        accept=".csv"
                        style={fieldInputStyle}
                        onChange={(e) => setCsvImportFile(e.target.files?.[0] ?? null)}
                      />
                    </label>
                    <button
                      type="button"
                      className="mt-3 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
                      style={{ backgroundColor: PC.primary, color: PC.white }}
                      disabled={csvImportLoading || !csvImportFile}
                      onClick={() => {
                        void importAirbnbCsvHistory();
                      }}
                    >
                      {csvImportLoading ? "Import..." : "Importer"}
                    </button>
                    {csvImportResult ? (
                      <div className="mt-3 space-y-1 text-xs" style={{ color: PC.muted }}>
                        <p style={{ color: PC.success }}>
                          ✅ {csvImportResult.imported} réservations importées
                        </p>
                        <p>⏭️ {csvImportResult.skipped} déjà existantes (ignorées)</p>
                        <p>
                          ⚠️ {csvImportResult.unmatchedNames.length} non associées à un logement :
                          {csvImportResult.unmatchedNames.length > 0
                            ? ` ${csvImportResult.unmatchedNames.join(", ")}`
                            : " aucune"}
                        </p>
                        {csvImportResult.unmatchedNames.length > 0 ? (
                          <p>
                            Ces réservations ont été importées sans logement. Associez-les manuellement depuis la page Réservations.
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

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
