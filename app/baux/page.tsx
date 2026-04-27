"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IconHome, IconPlus } from "@/components/locavio-icons";
import { BtnDanger, BtnEmail, BtnNeutral, BtnPdf, BtnPrimary, BtnSecondary, ConfirmModal, StatusBadge } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { montantsPourQuittanceLocataire } from "@/lib/colocation";
import { getIrlPourDate } from "@/lib/irl-historique";
import { PlanFreeModuleUpsell } from "@/components/plan-free-module-upsell";
import {
  canCreateBail,
  getMonthlyCreatedCount,
  getOwnerPlan,
  PLAN_FREE_BAUX_BANNER,
  PLAN_LIMIT_ERROR_MESSAGE,
  PLAN_UPGRADE_PATH,
  type LocavioPlan,
} from "@/lib/plan-limits";
import { getCurrentProprietaireId } from "@/lib/proprietaire-profile";
import { formatSubmitError } from "@/lib/supabase-submit-error";
import { supabase } from "@/lib/supabase";
import { PC } from "@/lib/locavio-colors";
import { fieldInputLg, fieldInputMd, fieldSelectLg, panelCard } from "@/lib/locavio-field-styles";

const BAIL_MODAL_CARD: CSSProperties = {
  ...panelCard,
  padding: 24,
  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)",
};
const BAIL_GROUP_CARD: CSSProperties = { ...panelCard, padding: 16 };

type Bail = {
  id: string;
  proprietaire_id: string;
  logement_id: string;
  locataire_id: string;
  colocataires_ids?: string[] | null;
  type_bail: "vide" | "meuble";
  date_debut: string;
  date_fin: string;
  duree_mois: number;
  loyer: number;
  charges: number;
  depot_garantie: number;
  revision_loyer: string;
  designation_logement: string;
  equipements: string[];
  equipements_details: Record<string, { quantity: number; rooms: string }>;
  autres_meubles: string;
  logement_etage?: string | null;
  interphone_digicode_oui?: boolean | null;
  interphone_digicode_code?: string | null;
  parking_inclus?: boolean | null;
  parking_numero?: string | null;
  cave_incluse?: boolean | null;
  cave_numero?: string | null;
  garage_inclus?: boolean | null;
  garage_numero?: string | null;
  dpe_classe_energie: string;
  dpe_valeur_kwh: number;
  dpe_classe_ges: string;
  mode_paiement_loyer: string;
  jour_paiement: number;
  diagnostics: Record<string, boolean>;
  travaux_realises: string;
  dernier_loyer_precedent: number;
  statut: "actif" | "termine";
  email_envoye?: boolean | null;
  date_envoi_email?: string | null;
  clauses_particulieres?: string | null;
  colocation_chambre_index?: number | null;
  colocation_parties_communes?: string | null;
  irl_reference?: number | null;
  loyer_initial?: number | null;
};

type LogementEntity = {
  id: string;
  label: string;
  loyer?: number;
  charges?: number;
  type?: string;
  surface?: number;
  est_colocation?: boolean;
  chambres_details?: unknown;
  nombre_chambres?: number | null;
};

type LocataireEntity = {
  id: string;
  label: string;
  email?: string | null;
  logement_id?: string | null;
  colocation_chambre_index?: number | null;
};

const ETAGES_OPTIONS = [
  { value: "", label: "Sélectionner..." },
  { value: "RDC", label: "RDC" },
  { value: "1er", label: "1er" },
  { value: "2ème", label: "2ème" },
  { value: "3ème", label: "3ème" },
  { value: "4ème", label: "4ème" },
  { value: "5ème", label: "5ème" },
  { value: "6ème", label: "6ème" },
  { value: "7ème", label: "7ème" },
  { value: "8ème", label: "8ème" },
  { value: "9ème", label: "9ème" },
  { value: "10ème et +", label: "10ème et +" },
];

type DiagnosticFormItem = {
  key: string;
  label: string;
  mandatory?: boolean;
  /** Infobulle : quand le diagnostic devient obligatoire */
  hint?: string;
};

const DIAGNOSTICS_FORM: DiagnosticFormItem[] = [
  { key: "dpe", label: "DPE", mandatory: true },
  { key: "erp", label: "ERP", mandatory: true },
  { key: "plomb", label: "Plomb", hint: "Obligatoire si construction avant 1949" },
  { key: "amiante", label: "Amiante", hint: "Obligatoire si construction avant 1997" },
  {
    key: "electricite",
    label: "Électricité",
    hint: "Obligatoire si installation de plus de 15 ans",
  },
  { key: "gaz", label: "Gaz", hint: "Obligatoire si installation de plus de 15 ans" },
  {
    key: "bruit",
    label: "Nuisances sonores (zone bruit)",
    hint: "Obligatoire selon zone géographique",
  },
];

function buildDefaultDiagnostics(): Record<string, boolean> {
  const next: Record<string, boolean> = {};
  for (const item of DIAGNOSTICS_FORM) {
    next[item.key] = Boolean(item.mandatory);
  }
  return next;
}

function mergeDiagnosticsFromRow(saved?: Record<string, boolean> | null): Record<string, boolean> {
  const merged = { ...buildDefaultDiagnostics(), ...(saved ?? {}) };
  merged.dpe = true;
  merged.erp = true;
  return merged;
}

const EQUIPEMENTS_MEUBLES_ALUR = [
  "Lit avec couette ou couverture",
  "Volets ou rideaux dans la chambre",
  "Plaques de cuisson",
  "Four ou four à micro-ondes",
  "Réfrigérateur avec freezer",
  "Vaisselle",
  "Ustensiles de cuisine",
  "Table",
  "Sièges",
  "Étagères de rangement",
  "Luminaires",
  "Matériel d'entretien ménager",
];

function addMonths(dateString: string, months: number) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

const defaultValues = {
  logement_id: "",
  locataire_id: "",
  type_bail: "vide",
  date_debut: "",
  duree_mois: "36",
  loyer: "",
  charges: "",
  depot_garantie: "",
  revision_loyer: "Révision annuelle selon l'IRL (Indice de Référence des Loyers).",
  designation_logement: "",
  equipements: [] as string[],
  equipements_details: {} as Record<string, { quantity: number; rooms: string }>,
  autres_meubles: "",
  dpe_classe_energie: "",
  dpe_valeur_kwh: "",
  dpe_classe_ges: "",
  mode_paiement_loyer: "virement",
  jour_paiement: "5",
  diagnostics: buildDefaultDiagnostics(),
  travaux_realises: "",
  dernier_loyer_precedent: "",
  colocataires_ids: [] as string[],
  logement_etage: "",
  interphone_digicode_oui: false,
  interphone_digicode_code: "",
  parking_inclus: false,
  parking_numero: "",
  cave_incluse: false,
  cave_numero: "",
  garage_inclus: false,
  garage_numero: "",
  clauses_particulieres: "",
  colocation_parties_communes: "",
  irl_reference_value: "",
  irl_trimestre: "",
  irl_manual_required: false,
  irl_field_unlocked: false,
};

export default function BauxPage() {
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<Bail[]>([]);
  const [values, setValues] = useState(defaultValues);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<Bail | null>(null);
  const [error, setError] = useState("");
  const [planLimitMessage, setPlanLimitMessage] = useState("");
  const [proprietaireId, setProprietaireId] = useState<string | null>(null);
  const [logements, setLogements] = useState<LogementEntity[]>([]);
  const [locataires, setLocataires] = useState<LocataireEntity[]>([]);
  const [nouveauMeubleNom, setNouveauMeubleNom] = useState("");
  const [meubleNomError, setMeubleNomError] = useState("");

  const isEditing = useMemo(() => editingRow !== null, [editingRow]);
  const customEquipements = useMemo(
    () => values.equipements.filter((item) => !EQUIPEMENTS_MEUBLES_ALUR.includes(item)),
    [values.equipements],
  );
  const locatairesMap = useMemo(() => new Map(locataires.map((item) => [item.id, item.label])), [locataires]);
  const logementsDetailsMap = useMemo(() => new Map(logements.map((item) => [item.id, item])), [logements]);
  const selectedLogement = values.logement_id ? logementsDetailsMap.get(values.logement_id) : undefined;
  const isColocationLogement = Boolean(selectedLogement?.est_colocation);
  const locatairesSelectList = useMemo(() => {
    if (!values.logement_id) return locataires;
    return locataires.filter((l) => l.logement_id === values.logement_id);
  }, [values.logement_id, locataires]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<LocavioPlan | null>(null);
  const isPlanLimitReached = Boolean(planLimitMessage);
  const logementFilter = searchParams.get("logement_id") ?? "";
  const prefillLogementId = searchParams.get("logement_id") ?? "";

  const filteredRows = useMemo(
    () => (logementFilter ? rows.filter((row) => row.logement_id === logementFilter) : rows),
    [rows, logementFilter],
  );
  const groupedBaux = useMemo(() => {
    const map = new Map<string, Bail[]>();
    for (const row of filteredRows) {
      const arr = map.get(row.logement_id) ?? [];
      arr.push(row);
      map.set(row.logement_id, arr);
    }
    return logements
      .filter((l) => map.has(l.id))
      .map((l) => ({ logement: l, rows: map.get(l.id) ?? [] }));
  }, [filteredRows, logements]);

  const refreshPlanLimit = useCallback(async (ownerId: string) => {
    const plan = await getOwnerPlan(ownerId);
    setCurrentPlan(plan);
    if (plan === "free") {
      setPlanLimitMessage(PLAN_FREE_BAUX_BANNER);
      return;
    }
    const monthlyCount = await getMonthlyCreatedCount("baux", ownerId);
    if (!canCreateBail(plan)) {
      setPlanLimitMessage("Limite atteinte. Passez au plan supérieur pour créer plus de baux.");
      return;
    }
    setPlanLimitMessage("");
  }, []);

  const loadRelations = useCallback(async (ownerId: string) => {
    const [logementsResponse, locatairesResponse] = await Promise.all([
      supabase
        .from("logements")
        .select("id, nom, adresse, loyer, charges, type, surface, est_colocation, chambres_details, nombre_chambres")
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
        loyer: item.loyer ?? 0,
        charges: item.charges ?? 0,
        type: item.type ?? "",
        surface: item.surface ?? 0,
        est_colocation: Boolean(item.est_colocation),
        chambres_details: item.chambres_details,
        nombre_chambres: item.nombre_chambres ?? null,
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
      .from("baux")
      .select("*")
      .eq("proprietaire_id", activeOwnerId)
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(`Erreur de chargement : ${formatSubmitError(fetchError)}`);
      setRows([]);
    } else {
      setRows((data as Bail[]) ?? []);
    }

    await refreshPlanLimit(activeOwnerId);
    setIsLoading(false);
  }, [proprietaireId, refreshPlanLimit]);

  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      const { proprietaireId: ownerId, error: ownerError } = await getCurrentProprietaireId();
      if (!isMounted) return;

      if (ownerError) {
        setError(`Erreur de chargement propriétaire : ${formatSubmitError(ownerError)}`);
        setIsLoading(false);
        return;
      }

      setProprietaireId(ownerId);
      if (!ownerId) {
        setError("Profil propriétaire introuvable.");
        setIsLoading(false);
        return;
      }

      const plan = await getOwnerPlan(ownerId);
      if (!isMounted) return;
      setCurrentPlan(plan);
      if (plan === "free") {
        setPlanLimitMessage(PLAN_FREE_BAUX_BANNER);
        setIsLoading(false);
        return;
      }

      await Promise.all([loadRows(ownerId), loadRelations(ownerId)]);
    };

    void loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [loadRows, loadRelations]);

  const irlEffectGen = useRef(0);
  const [irlResolving, setIrlResolving] = useState(false);

  useEffect(() => {
    if (!isModalOpen) return;
    const d = values.date_debut?.trim() ?? "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      irlEffectGen.current += 1;
      setIrlResolving(false);
      setValues((v) => ({
        ...v,
        irl_reference_value: "",
        irl_trimestre: "",
        irl_manual_required: false,
        irl_field_unlocked: false,
      }));
      return;
    }
    const myGen = ++irlEffectGen.current;
    setIrlResolving(true);
    const t = window.setTimeout(() => {
      void (async () => {
        const r = await getIrlPourDate(new Date(`${d}T12:00:00`));
        if (myGen !== irlEffectGen.current) return;
        setValues((v) => {
          if (v.date_debut.trim() !== d) return v;
          if (r == null) {
            return {
              ...v,
              irl_manual_required: true,
              irl_reference_value: "",
              irl_trimestre: "",
              irl_field_unlocked: true,
            };
          }
          return {
            ...v,
            irl_manual_required: false,
            irl_reference_value: String(r.valeur),
            irl_trimestre: r.trimestre,
            irl_field_unlocked: false,
          };
        });
        setIrlResolving(false);
      })();
    }, 400);
    return () => {
      window.clearTimeout(t);
      irlEffectGen.current += 1;
    };
  }, [isModalOpen, values.date_debut]);

  function closeModal() {
    irlEffectGen.current += 1;
    setIrlResolving(false);
    setIsModalOpen(false);
    setEditingRow(null);
    setValues(defaultValues);
    setNouveauMeubleNom("");
    setMeubleNomError("");
  }

  async function openCreateModal() {
    if (proprietaireId) {
      const plan = await getOwnerPlan(proprietaireId);
      if (plan === "free") {
        setPlanLimitMessage(PLAN_FREE_BAUX_BANNER);
        return;
      }
      const monthlyCount = await getMonthlyCreatedCount("baux", proprietaireId);
      if (!canCreateBail(plan)) {
        setPlanLimitMessage("Limite atteinte. Passez au plan supérieur pour créer plus de baux.");
        return;
      }
    }
    setEditingRow(null);
    setValues({ ...defaultValues, logement_id: prefillLogementId });
    setNouveauMeubleNom("");
    setMeubleNomError("");
    setIsModalOpen(true);
  }

  function openEditModal(row: Bail) {
    if (currentPlan === "free") {
      setError(PLAN_FREE_BAUX_BANNER);
      return;
    }
    setEditingRow(row);
    const equipements = [...(row.equipements ?? [])];
    const equipements_details = { ...(row.equipements_details ?? {}) };
    let autres_meubles = row.autres_meubles ?? "";

    if (row.type_bail === "meuble" && autres_meubles.trim()) {
      const parts = autres_meubles
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean);
      for (const p of parts) {
        if (!equipements.includes(p)) {
          equipements.push(p);
          equipements_details[p] = { quantity: 1, rooms: "" };
        }
      }
      autres_meubles = "";
    }

    const logementRow = logements.find((item) => item.id === row.logement_id);
    const colocatairesStored =
      !logementRow?.est_colocation && Array.isArray(row.colocataires_ids)
        ? [...row.colocataires_ids]
        : [];

    setValues({
      logement_id: row.logement_id,
      locataire_id: row.locataire_id,
      type_bail: row.type_bail,
      date_debut: row.date_debut?.slice(0, 10) ?? "",
      duree_mois: String(row.duree_mois),
      loyer: String(row.loyer ?? ""),
      charges: String(row.charges ?? ""),
      depot_garantie: String(row.depot_garantie ?? ""),
      revision_loyer: row.revision_loyer ?? "",
      designation_logement: row.designation_logement ?? "",
      equipements,
      equipements_details,
      autres_meubles,
      dpe_classe_energie: row.dpe_classe_energie ?? "",
      dpe_valeur_kwh: String(row.dpe_valeur_kwh ?? ""),
      dpe_classe_ges: row.dpe_classe_ges ?? "",
      mode_paiement_loyer: row.mode_paiement_loyer ?? "virement",
      jour_paiement: String(row.jour_paiement ?? 5),
      diagnostics: mergeDiagnosticsFromRow(row.diagnostics),
      travaux_realises: row.travaux_realises ?? "",
      dernier_loyer_precedent: String(row.dernier_loyer_precedent ?? ""),
      colocataires_ids: colocatairesStored,
      logement_etage: row.logement_etage ?? "",
      interphone_digicode_oui: Boolean(row.interphone_digicode_oui),
      interphone_digicode_code: row.interphone_digicode_code ?? "",
      parking_inclus: Boolean(row.parking_inclus),
      parking_numero: row.parking_numero ?? "",
      cave_incluse: Boolean(row.cave_incluse),
      cave_numero: row.cave_numero ?? "",
      garage_inclus: Boolean(row.garage_inclus),
      garage_numero: row.garage_numero ?? "",
      clauses_particulieres: row.clauses_particulieres ?? "",
      colocation_parties_communes: row.colocation_parties_communes ?? "",
      irl_reference_value:
        row.irl_reference != null && Number(row.irl_reference) > 0 ? String(Number(row.irl_reference)) : "",
      irl_trimestre: "",
      irl_manual_required: false,
      irl_field_unlocked: false,
    });
    setNouveauMeubleNom("");
    setMeubleNomError("");
    setIsModalOpen(true);
  }

  function onChange(name: string, value: string) {
    const nextValues = { ...values, [name]: value };

    if (name === "locataire_id") {
      nextValues.colocataires_ids = nextValues.colocataires_ids.filter((id) => id !== value);
      const logement = logementsDetailsMap.get(nextValues.logement_id);
      if (logement?.est_colocation && nextValues.logement_id) {
        const loc = locataires.find((l) => l.id === value);
        if (loc?.logement_id === nextValues.logement_id && loc.colocation_chambre_index != null) {
          const m = montantsPourQuittanceLocataire(
            {
              id: logement.id,
              loyer: Number(logement.loyer ?? 0),
              charges: Number(logement.charges ?? 0),
              est_colocation: true,
              chambres_details: logement.chambres_details,
            },
            {
              logement_id: loc.logement_id ?? null,
              colocation_chambre_index: loc.colocation_chambre_index,
            },
          );
          nextValues.loyer = String(m.loyer);
          nextValues.charges = String(m.charges);
          const loyerN = Number(nextValues.loyer || 0);
          nextValues.depot_garantie = String(nextValues.type_bail === "meuble" ? loyerN * 2 : loyerN);
        }
      }
    }

    if (name === "type_bail") {
      const duree = value === "meuble" ? "12" : "36";
      nextValues.duree_mois = duree;
      const loyerValue = Number(nextValues.loyer || 0);
      nextValues.depot_garantie = String(value === "meuble" ? loyerValue * 2 : loyerValue);
      if (value !== "meuble") {
        nextValues.equipements = [];
        nextValues.equipements_details = {};
        nextValues.autres_meubles = "";
        setNouveauMeubleNom("");
        setMeubleNomError("");
      }
    }

    if (name === "logement_id") {
      const logement = logementsDetailsMap.get(value);
      if (logement) {
        nextValues.designation_logement = `${logement.type || "Logement"} de ${logement.surface || "—"} m²`;
        nextValues.colocataires_ids = [];
        if (!logement.est_colocation) {
          nextValues.colocation_parties_communes = "";
        }
        if (logement.est_colocation) {
          const loc = locataires.find((l) => l.id === nextValues.locataire_id);
          const ok =
            loc?.logement_id === value &&
            loc.colocation_chambre_index != null &&
            loc.colocation_chambre_index >= 1;
          if (!ok) {
            nextValues.locataire_id = "";
            const loyer = Number(logement.loyer ?? 0);
            const charges = Number(logement.charges ?? 0);
            nextValues.loyer = String(loyer);
            nextValues.charges = String(charges);
            nextValues.depot_garantie = String(nextValues.type_bail === "meuble" ? loyer * 2 : loyer);
          } else {
            const m = montantsPourQuittanceLocataire(
              {
                id: logement.id,
                loyer: Number(logement.loyer ?? 0),
                charges: Number(logement.charges ?? 0),
                est_colocation: true,
                chambres_details: logement.chambres_details,
              },
              {
                logement_id: loc!.logement_id ?? null,
                colocation_chambre_index: loc!.colocation_chambre_index ?? null,
              },
            );
            nextValues.loyer = String(m.loyer);
            nextValues.charges = String(m.charges);
            const loyerN = Number(nextValues.loyer || 0);
            nextValues.depot_garantie = String(nextValues.type_bail === "meuble" ? loyerN * 2 : loyerN);
          }
        } else {
          const loyer = Number(logement.loyer ?? 0);
          const charges = Number(logement.charges ?? 0);
          nextValues.loyer = String(loyer);
          nextValues.charges = String(charges);
          nextValues.depot_garantie = String(nextValues.type_bail === "meuble" ? loyer * 2 : loyer);
        }
      }
    }

    if (name === "loyer") {
      const loyer = Number(value || 0);
      nextValues.depot_garantie = String(nextValues.type_bail === "meuble" ? loyer * 2 : loyer);
    }

    setValues(nextValues);
  }

  function toggleEquipement(label: string) {
    setValues((prev) => {
      const exists = prev.equipements.includes(label);
      const nextDetails = { ...prev.equipements_details };
      if (exists) {
        delete nextDetails[label];
      } else {
        nextDetails[label] = { quantity: 1, rooms: "" };
      }
      return {
        ...prev,
        equipements: exists ? prev.equipements.filter((item) => item !== label) : [...prev.equipements, label],
        equipements_details: nextDetails,
      };
    });
  }

  function addCustomMeuble() {
    const name = nouveauMeubleNom.trim();
    if (!name) return;
    if (EQUIPEMENTS_MEUBLES_ALUR.includes(name)) {
      setMeubleNomError("Ce meuble figure déjà dans la liste réglementaire : cochez la case correspondante.");
      return;
    }

    let added = false;
    setValues((prev) => {
      if (prev.equipements.includes(name)) {
        return prev;
      }
      added = true;
      return {
        ...prev,
        equipements: [...prev.equipements, name],
        equipements_details: {
          ...prev.equipements_details,
          [name]: { quantity: 1, rooms: "" },
        },
      };
    });

    if (added) {
      setMeubleNomError("");
      setNouveauMeubleNom("");
    } else {
      setMeubleNomError("Ce meuble est déjà dans la liste.");
    }
  }

  function removeCustomMeuble(label: string) {
    if (EQUIPEMENTS_MEUBLES_ALUR.includes(label)) return;
    setValues((prev) => {
      const nextDetails = { ...prev.equipements_details };
      delete nextDetails[label];
      return {
        ...prev,
        equipements: prev.equipements.filter((item) => item !== label),
        equipements_details: nextDetails,
      };
    });
  }

  function onEquipementDetailChange(
    equipement: string,
    field: "quantity" | "rooms",
    value: string,
  ) {
    setValues((prev) => ({
      ...prev,
      equipements_details: {
        ...prev.equipements_details,
        [equipement]: {
          quantity:
            field === "quantity"
              ? Math.max(1, Number(value || 1))
              : prev.equipements_details[equipement]?.quantity ?? 1,
          rooms:
            field === "rooms"
              ? value
              : prev.equipements_details[equipement]?.rooms ?? "",
        },
      },
    }));
  }

  function toggleDiagnostic(key: string) {
    if (key === "dpe" || key === "erp") return;
    setValues((prev) => ({
      ...prev,
      diagnostics: {
        ...prev.diagnostics,
        dpe: true,
        erp: true,
        [key]: !prev.diagnostics[key],
      },
    }));
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
        setError("Profil propriétaire introuvable. Complétez d'abord Paramètres.");
        return;
      }
      setProprietaireId(ownerId);
      const plan = await getOwnerPlan(ownerId);
      if (plan === "free") {
        setError(PLAN_FREE_BAUX_BANNER);
        return;
      }
      if (!isEditing) {
        const monthlyCount = await getMonthlyCreatedCount("baux", ownerId);
        if (!canCreateBail(plan)) {
          setError(PLAN_LIMIT_ERROR_MESSAGE);
          return;
        }
      }

      if (!values.logement_id.trim() || !values.locataire_id.trim()) {
        setError("Sélectionnez un logement et un locataire.");
        return;
      }
      if (!values.date_debut.trim()) {
        setError("Indiquez la date de début du bail.");
        return;
      }
      if (irlResolving) {
        setError("Indice IRL en cours de chargement, patientez un instant.");
        return;
      }

      const dureeMois = Number(values.duree_mois);
      if (!Number.isFinite(dureeMois) || dureeMois <= 0) {
        setError("La durée du bail (en mois) doit être un nombre positif.");
        return;
      }

      const dateFin = addMonths(values.date_debut, dureeMois);
      if (!dateFin) {
        setError("Date de début ou durée invalide : impossible de calculer la date de fin.");
        return;
      }

      const loyer = Number(values.loyer);
      const charges = Number(values.charges);
      const depot = Number(values.depot_garantie);
      if (!Number.isFinite(loyer) || loyer < 0 || !Number.isFinite(charges) || charges < 0) {
        setError("Le loyer et les charges doivent être des nombres positifs ou nuls.");
        return;
      }
      if (!Number.isFinite(depot) || depot < 0) {
        setError("Le dépôt de garantie doit être un nombre positif ou nul.");
        return;
      }

      const jourPaiement = Math.min(28, Math.max(1, Math.floor(Number(values.jour_paiement) || 5)));
      const revisionDefault =
        "Révision annuelle selon l'IRL (Indice de Référence des Loyers).";
      const revision = values.revision_loyer.trim() || revisionDefault;

      let colocation_chambre_index: number | null = null;
      if (isColocationLogement) {
        const loc = locataires.find((l) => l.id === values.locataire_id);
        if (
          !loc ||
          loc.logement_id !== values.logement_id ||
          loc.colocation_chambre_index == null ||
          loc.colocation_chambre_index < 1
        ) {
          setError(
            "En colocation, choisissez un locataire lié à ce logement avec une chambre assignée (page Locataires).",
          );
          return;
        }
        colocation_chambre_index = loc.colocation_chambre_index;
      }

      const finTs = new Date(dateFin).getTime();
      const statut: "actif" | "termine" = finTs >= Date.now() ? "actif" : "termine";

      const irlRefNum = Number(values.irl_reference_value);
      if (!Number.isFinite(irlRefNum) || irlRefNum <= 0) {
        setError("Renseignez un IRL de référence valide (nombre > 0).");
        return;
      }

      const loyerInitialPatch: { loyer_initial?: number } = {};
      if (!isEditing) {
        loyerInitialPatch.loyer_initial = loyer;
      } else {
        const prevInit = Number(editingRow?.loyer_initial ?? 0);
        if (!Number.isFinite(prevInit) || prevInit <= 0) {
          loyerInitialPatch.loyer_initial = loyer;
        }
      }

      const payload = {
        proprietaire_id: ownerId,
        logement_id: values.logement_id.trim(),
        locataire_id: values.locataire_id.trim(),
        colocataires_ids: isColocationLogement ? [] : values.colocataires_ids.filter(Boolean),
        colocation_chambre_index: isColocationLogement ? colocation_chambre_index : null,
        colocation_parties_communes: isColocationLogement ? values.colocation_parties_communes.trim() : "",
        type_bail: values.type_bail,
        date_debut: values.date_debut.trim(),
        date_fin: dateFin,
        duree_mois: dureeMois,
        loyer,
        charges,
        depot_garantie: depot,
        revision_loyer: revision,
        designation_logement: values.designation_logement.trim(),
        equipements: [...values.equipements],
        equipements_details: { ...values.equipements_details },
        autres_meubles: values.type_bail === "meuble" ? "" : values.autres_meubles.trim(),
        logement_etage: values.logement_etage.trim(),
        interphone_digicode_oui: values.interphone_digicode_oui,
        interphone_digicode_code: values.interphone_digicode_oui ? values.interphone_digicode_code.trim() : "",
        parking_inclus: values.parking_inclus,
        parking_numero: values.parking_inclus ? values.parking_numero.trim() : "",
        cave_incluse: values.cave_incluse,
        cave_numero: values.cave_incluse ? values.cave_numero.trim() : "",
        garage_inclus: values.garage_inclus,
        garage_numero: values.garage_inclus ? values.garage_numero.trim() : "",
        dpe_classe_energie: values.dpe_classe_energie.trim() || null,
        dpe_valeur_kwh: Number(values.dpe_valeur_kwh || 0),
        dpe_classe_ges: values.dpe_classe_ges.trim() || null,
        mode_paiement_loyer: values.mode_paiement_loyer,
        jour_paiement: jourPaiement,
        diagnostics: { ...values.diagnostics, dpe: true, erp: true },
        travaux_realises: values.travaux_realises.trim(),
        dernier_loyer_precedent: Number(values.dernier_loyer_precedent || 0),
        clauses_particulieres: values.clauses_particulieres.trim(),
        statut,
        irl_reference: irlRefNum,
        ...loyerInitialPatch,
      };

      const query = isEditing
        ? supabase.from("baux").update(payload).eq("id", editingRow!.id).eq("proprietaire_id", ownerId)
        : supabase.from("baux").insert(payload);

      const { error: submitError } = await query;
      if (submitError) {
        setError(`Erreur d'enregistrement : ${formatSubmitError(submitError)}`);
        return;
      }

      closeModal();
      await loadRows(ownerId);
      toast.success(isEditing ? "Bail mis à jour." : "Bail créé.");
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
        setError(PLAN_FREE_BAUX_BANNER);
        return;
      }

      const { error: deleteError } = await supabase
        .from("baux")
        .delete()
        .eq("id", id)
        .eq("proprietaire_id", ownerId);

      if (deleteError) {
        setError(`Erreur de suppression : ${formatSubmitError(deleteError)}`);
        return;
      }

      setDeleteConfirmId(null);
      await loadRows(ownerId);
      toast.success("Bail supprimé.");
    } catch (e) {
      setError(formatSubmitError(e));
    } finally {
      setDeleteSubmitting(false);
    }
  }

  async function onGeneratePdf(id: string) {
    setError("");

    try {
      if (currentPlan === "free") {
        setError(PLAN_FREE_BAUX_BANNER);
        return;
      }
      const response = await fetch(`/api/baux/${id}/pdf`);

      if (!response.ok) {
        let msg = `Génération PDF impossible (${response.status}). Vérifiez la session et les données du bail.`;
        try {
          const j = (await response.json()) as { error?: string };
          if (j.error?.trim()) msg = j.error.trim();
        } catch {
          /* corps non JSON */
        }
        setError(msg);
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `bail-${id.slice(0, 8)}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("PDF téléchargé.");
    } catch (e) {
      setError(`Erreur de génération PDF : ${formatSubmitError(e)}`);
    } finally {
    }
  }

  async function onSendBailEmail(id: string) {
    setError("");

    try {
      if (currentPlan === "free") {
        setError(PLAN_FREE_BAUX_BANNER);
        return;
      }
      const response = await fetch(`/api/baux/${id}/send`, { method: "POST" });
      const payload = (await response.json().catch(() => ({}))) as { error?: string; to?: string[] };

      if (!response.ok) {
        let msg = `Envoi e-mail impossible (${response.status}). Vérifiez Resend et l'e-mail du propriétaire.`;
        if (payload.error?.trim()) msg = payload.error.trim();
        setError(msg);
        return;
      }

      const { proprietaireId: ownerId } = await getCurrentProprietaireId();
      if (ownerId) await loadRows(ownerId);
      const dest = payload.to?.join(", ") || "destinataire";
      toast.success(`Email envoyé à ${dest}.`);
    } catch (e) {
      setError(`Erreur d'envoi de l'e-mail : ${formatSubmitError(e)}`);
    } finally {
    }
  }

  if (!isLoading && currentPlan === "free") {
    return <PlanFreeModuleUpsell variant="baux" />;
  }

  const freeBauxBlock = currentPlan === "free";

  return (
    <section className="locavio-page-wrap space-y-8" style={{ color: PC.text }}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="locavio-page-title">Baux</h1>
          <p className="locavio-page-subtitle max-w-xl">
            Création de baux conformes loi Alur et loi du 6 juillet 1989.
          </p>
        </div>
        <select
          value={logementFilter}
          disabled={freeBauxBlock}
          onChange={(event) => {
            const next = event.target.value;
            router.push(next ? `/baux?logement_id=${encodeURIComponent(next)}` : "/baux");
          }}
          className="rounded-lg px-3 py-2 text-sm"
          style={{
            border: `1px solid ${PC.border}`,
            backgroundColor: PC.card,
            color: PC.text,
            opacity: freeBauxBlock ? 0.55 : 1,
            cursor: freeBauxBlock ? "not-allowed" : undefined,
          }}
        >
          <option value="">Tous les logements</option>
          {logements.map((logement) => (
            <option key={logement.id} value={logement.id}>
              {logement.label}
            </option>
          ))}
        </select>
        <BtnPrimary
          icon={<IconPlus className="h-4 w-4" />}
          onClick={() => void openCreateModal()}
          disabled={isPlanLimitReached}
          style={{ opacity: isPlanLimitReached ? 0.55 : 1, cursor: isPlanLimitReached ? "not-allowed" : "pointer" }}
        >
          Nouveau bail
        </BtnPrimary>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: PC.dangerBg10, color: PC.danger }}>
          <p>{error}</p>
          {error === PLAN_LIMIT_ERROR_MESSAGE || error === PLAN_FREE_BAUX_BANNER ? (
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
        <div
          className="rounded-xl p-6 text-sm"
          style={{ ...panelCard, color: PC.muted }}
        >
          Chargement des baux...
        </div>
      ) : (
        <div className="space-y-8">
          {groupedBaux.length === 0 ? (
            <div className="rounded-xl p-6 text-sm" style={{ ...panelCard, color: PC.muted }}>
              Aucun bail enregistré.
            </div>
          ) : (
            groupedBaux.map(({ logement, rows: groupRows }) => (
              <section key={logement.id} className="space-y-4">
                <header className="pb-3" style={{ borderBottom: `1px solid ${PC.border}` }}>
                  <div className="flex items-center gap-2">
                    <IconHome className="h-4 w-4" style={{ color: PC.secondary }} />
                    <h2 className="text-lg font-semibold">{logement.label}</h2>
                    <span className="text-sm" style={{ color: PC.muted }}>
                      ({groupRows.length} baux)
                    </span>
                  </div>
                </header>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {groupRows.map((row) => (
                    <article key={row.id} className="rounded-xl" style={BAIL_GROUP_CARD}>
                      <h3 className="font-semibold tracking-tight">{locatairesMap.get(row.locataire_id) ?? row.locataire_id}</h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: PC.primaryBg25, color: PC.secondary }}>
                          {row.type_bail === "meuble" ? "Meublé" : "Vide"}
                        </span>
                        {row.colocation_chambre_index ? (
                          <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: PC.warningBg15, color: PC.warning }}>
                            Colocation · Ch. {row.colocation_chambre_index}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm" style={{ color: PC.muted }}>
                        {new Date(row.date_debut).toLocaleDateString("fr-FR")} → {new Date(row.date_fin).toLocaleDateString("fr-FR")}
                      </p>
                      <p className="text-base font-semibold">{Number(row.loyer).toFixed(2)} € / mois</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <StatusBadge
                          status={row.statut === "actif" ? "actif" : "termine"}
                          label={row.statut === "actif" ? "Actif" : "Terminé"}
                        />
                        {row.email_envoye ? (
                          <StatusBadge status="envoye" label="Bail envoyé" />
                        ) : null}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <BtnPdf
                          size="small"
                          disabled={freeBauxBlock}
                          style={{
                            opacity: freeBauxBlock ? 0.5 : 1,
                            cursor: freeBauxBlock ? "not-allowed" : "pointer",
                          }}
                          onClick={() => void onGeneratePdf(row.id)}
                        >
                          Télécharger PDF
                        </BtnPdf>
                        <BtnEmail
                          size="small"
                          disabled={freeBauxBlock}
                          style={{
                            opacity: freeBauxBlock ? 0.5 : 1,
                            cursor: freeBauxBlock ? "not-allowed" : "pointer",
                          }}
                          onClick={() => void onSendBailEmail(row.id)}
                        >
                          Envoyer par email
                        </BtnEmail>
                        <BtnSecondary
                          size="small"
                          disabled={freeBauxBlock}
                          style={{
                            opacity: freeBauxBlock ? 0.5 : 1,
                            cursor: freeBauxBlock ? "not-allowed" : "pointer",
                          }}
                          onClick={() => openEditModal(row)}
                        >
                          Modifier
                        </BtnSecondary>
                        <BtnDanger
                          size="small"
                          disabled={freeBauxBlock}
                          style={{
                            opacity: freeBauxBlock ? 0.5 : 1,
                            cursor: freeBauxBlock ? "not-allowed" : "pointer",
                          }}
                          onClick={() => setDeleteConfirmId(row.id)}
                        >
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

      {isModalOpen ? (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/60 p-4">
          <div className="mx-auto max-w-3xl rounded-xl" style={BAIL_MODAL_CARD}>
            <h3 className="text-lg font-semibold">
              {isEditing ? "Modifier le bail" : "Créer un bail"}
            </h3>
            <form onSubmit={onSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm sm:col-span-2" style={{ color: PC.muted }}>
                <span className="font-medium">Logement</span>
                <select
                  className="w-full rounded-lg px-3 py-2 outline-none pc-field-focus"
                  style={fieldSelectLg}
                  value={values.logement_id}
                  onChange={(event) => onChange("logement_id", event.target.value)}
                  required
                >
                  <option value="">Sélectionner...</option>
                  {logements.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm sm:col-span-2" style={{ color: PC.muted }}>
                <span className="font-medium">
                  {isColocationLogement ? "Locataire (une personne par bail)" : "Locataire"}
                </span>
                <select
                  className="w-full rounded-lg px-3 py-2 outline-none pc-field-focus"
                  style={fieldSelectLg}
                  value={values.locataire_id}
                  onChange={(event) => onChange("locataire_id", event.target.value)}
                  required
                >
                  <option value="">Sélectionner...</option>
                  {locatairesSelectList.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                      {isColocationLogement && item.colocation_chambre_index != null
                        ? ` — Chambre ${item.colocation_chambre_index}`
                        : ""}
                    </option>
                  ))}
                </select>
                {values.logement_id && locatairesSelectList.length === 0 ? (
                  <span className="text-xs" style={{ color: PC.warning }}>
                    Aucun locataire assigné à ce logement
                  </span>
                ) : null}
              </label>
              {isColocationLogement ? (
                <div
                  className="sm:col-span-2 rounded-lg p-4"
                  style={{
                    border: `1px solid ${PC.violet200}`,
                    backgroundColor: "rgba(245, 243, 255, 0.72)",
                  }}
                >
                  <p className="text-sm font-semibold" style={{ color: PC.secondary }}>Bail individuel - Colocation</p>
                  <p className="mt-1 text-xs" style={{ color: PC.muted }}>
                    Un seul locataire par bail. Le loyer et les charges se remplissent selon la chambre assignée sur
                    sa fiche.
                  </p>
                  <label className="mt-3 flex flex-col gap-1.5 text-sm" style={{ color: PC.text }}>
                    <span className="font-medium">Parties communes et équipements partagés (PDF)</span>
                    <textarea
                      className="min-h-20 w-full rounded-lg px-3 py-2 text-sm outline-none pc-field-focus"
                  style={fieldInputLg}
                      value={values.colocation_parties_communes}
                      onChange={(event) => onChange("colocation_parties_communes", event.target.value)}
                      placeholder="Ex. : cuisine, séjour, salle de bain, WC, entrée, buanderie…"
                    />
                  </label>
                </div>
              ) : null}
              <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                <span className="font-medium">Type de bail</span>
                <select
                  className="w-full rounded-lg px-3 py-2 outline-none pc-field-focus"
                  style={fieldSelectLg}
                  value={values.type_bail}
                  onChange={(event) => onChange("type_bail", event.target.value)}
                  required
                >
                  <option value="vide">Vide</option>
                  <option value="meuble">Meublé</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                <span className="font-medium">Date de début</span>
                <input
                  type="date"
                  className="w-full rounded-lg px-3 py-2 outline-none pc-field-focus"
                  style={fieldInputLg}
                  value={values.date_debut}
                  onChange={(event) => onChange("date_debut", event.target.value)}
                  required
                />
              </label>
              <div
                className="sm:col-span-2 flex flex-col gap-2 rounded-lg p-4 text-sm"
                style={{ border: `1px solid ${PC.border}`, backgroundColor: PC.cardAlpha90 }}
              >
                <span className="font-medium" style={{ color: PC.text }}>
                  IRL de référence (à la date de début du bail)
                </span>
                {irlResolving ? (
                  <p style={{ color: PC.muted }}>Chargement de l&apos;indice INSEE…</p>
                ) : values.irl_manual_required ? (
                  <>
                    <p className="text-xs leading-relaxed" style={{ color: PC.warning }}>
                      Date antérieure au 1er janvier 2021 : aucun indice automatique. Saisissez l&apos;IRL de référence
                      figurant sur le bail ou les sources INSEE.
                    </p>
                    <label className="flex flex-col gap-1" style={{ color: PC.muted }}>
                      <span className="text-xs font-medium">Valeur IRL (manuel)</span>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full max-w-xs rounded-lg px-3 py-2 outline-none pc-field-focus"
                        style={fieldInputLg}
                        value={values.irl_reference_value}
                        onChange={(e) => onChange("irl_reference_value", e.target.value)}
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <p style={{ color: PC.muted }}>
                      {values.irl_trimestre
                        ? `IRL de référence : ${values.irl_reference_value || "—"} (${values.irl_trimestre})`
                        : values.irl_reference_value
                          ? `IRL de référence : ${values.irl_reference_value}`
                          : "Indiquez d'abord la date de début pour calculer l'IRL."}
                    </p>
                    <div className="flex flex-wrap items-end gap-2">
                      <label className="flex flex-col gap-1" style={{ color: PC.muted }}>
                        <span className="text-xs font-medium">Valeur (modifiable si besoin)</span>
                        <input
                          type="number"
                          step="0.01"
                          readOnly={!values.irl_field_unlocked}
                          className="w-full max-w-xs rounded-lg px-3 py-2 outline-none pc-field-focus"
                          style={{
                            ...fieldInputLg,
                            opacity: values.irl_field_unlocked ? 1 : 0.85,
                          }}
                          value={values.irl_reference_value}
                          onChange={(e) => onChange("irl_reference_value", e.target.value)}
                        />
                      </label>
                      {!values.irl_field_unlocked ? (
                        <BtnSecondary
                          size="small"
                          onClick={() => setValues((prev) => ({ ...prev, irl_field_unlocked: true }))}
                        >
                          Modifier
                        </BtnSecondary>
                      ) : null}
                    </div>
                  </>
                )}
              </div>
              <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                <span className="font-medium">Durée</span>
                <select
                  className="w-full rounded-lg px-3 py-2 outline-none pc-field-focus"
                  style={fieldSelectLg}
                  value={values.duree_mois}
                  onChange={(event) => onChange("duree_mois", event.target.value)}
                  required
                >
                  <option value="36">36 mois (3 ans)</option>
                  <option value="12">12 mois (1 an)</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                <span className="font-medium">Montant du loyer (€)</span>
                <input
                  type="number"
                  step="0.01"
                  className="w-full rounded-lg px-3 py-2 outline-none pc-field-focus"
                  style={fieldInputLg}
                  value={values.loyer}
                  onChange={(event) => onChange("loyer", event.target.value)}
                  required
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                <span className="font-medium">Montant des charges (€)</span>
                <input
                  type="number"
                  step="0.01"
                  className="w-full rounded-lg px-3 py-2 outline-none pc-field-focus"
                  style={fieldInputLg}
                  value={values.charges}
                  onChange={(event) => onChange("charges", event.target.value)}
                  required
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                <span className="font-medium">Dépôt de garantie (€)</span>
                <input
                  type="number"
                  step="0.01"
                  className="w-full rounded-lg px-3 py-2 outline-none pc-field-focus"
                  style={fieldInputLg}
                  value={values.depot_garantie}
                  onChange={(event) => onChange("depot_garantie", event.target.value)}
                  required
                />
                <span className="text-xs font-normal" style={{ color: PC.muted }}>
                  Proposition automatique : 1× le loyer (bail vide) ou 2× (meublé) lors du choix du logement ou du loyer.
                  Vous pouvez modifier le montant si besoin.
                </span>
              </label>
              <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                <span className="font-medium">Dernier loyer précédent (€)</span>
                <input
                  type="number"
                  step="0.01"
                  className="w-full rounded-lg px-3 py-2 outline-none pc-field-focus"
                  style={fieldInputLg}
                  value={values.dernier_loyer_precedent}
                  onChange={(event) => onChange("dernier_loyer_precedent", event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                <span className="font-medium">Mode de paiement du loyer</span>
                <select
                  className="w-full rounded-lg px-3 py-2 outline-none pc-field-focus"
                  style={fieldSelectLg}
                  value={values.mode_paiement_loyer}
                  onChange={(event) => onChange("mode_paiement_loyer", event.target.value)}
                  required
                >
                  <option value="virement">Virement bancaire</option>
                  <option value="cheque">Chèque</option>
                  <option value="prelevement">Prélèvement</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                <span className="font-medium">Jour de paiement (1 à 28)</span>
                <input
                  type="number"
                  min={1}
                  max={28}
                  className="w-full rounded-lg px-3 py-2 outline-none pc-field-focus"
                  style={fieldInputLg}
                  value={values.jour_paiement}
                  onChange={(event) => onChange("jour_paiement", event.target.value)}
                  required
                />
              </label>
              <label className="sm:col-span-2 flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                <span className="font-medium">Modalités de révision du loyer (IRL)</span>
                <textarea
                  className="min-h-20 w-full rounded-lg px-3 py-2 outline-none pc-field-focus"
                  style={fieldInputLg}
                  value={values.revision_loyer}
                  onChange={(event) => onChange("revision_loyer", event.target.value)}
                />
              </label>
              <label className="sm:col-span-2 flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                <span className="font-medium">Désignation précise du logement</span>
                <textarea
                  className="min-h-20 w-full rounded-lg px-3 py-2 outline-none pc-field-focus"
                  style={fieldInputLg}
                  value={values.designation_logement}
                  onChange={(event) => onChange("designation_logement", event.target.value)}
                />
              </label>
              <div
                className="sm:col-span-2 rounded-lg p-4"
                style={{
                  border: `1px solid ${PC.border}`,
                  backgroundColor: PC.cardAlpha90,
                }}
              >
                <h4 className="text-sm font-semibold">Informations complémentaires du logement</h4>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5 text-sm sm:col-span-2" style={{ color: PC.muted }}>
                    <span className="font-medium">Étage</span>
                    <select
                      className="w-full rounded-lg px-3 py-2 outline-none pc-field-focus"
                  style={fieldInputLg}
                      value={values.logement_etage}
                      onChange={(event) => onChange("logement_etage", event.target.value)}
                    >
                      {ETAGES_OPTIONS.map((opt) => (
                        <option key={opt.value || "empty"} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="sm:col-span-2 space-y-2">
                    <span className="text-sm font-medium" style={{ color: PC.muted }}>Interphone / Digicode</span>
                    <div className="flex flex-wrap gap-4 text-sm" style={{ color: PC.muted }}>
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="radio"
                          name="interphone_digicode"
                          checked={!values.interphone_digicode_oui}
                          onChange={() =>
                            setValues((prev) => ({
                              ...prev,
                              interphone_digicode_oui: false,
                              interphone_digicode_code: "",
                            }))
                          }
                        />
                        Non
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="radio"
                          name="interphone_digicode"
                          checked={values.interphone_digicode_oui}
                          onChange={() => setValues((prev) => ({ ...prev, interphone_digicode_oui: true }))}
                        />
                        Oui
                      </label>
                    </div>
                    {values.interphone_digicode_oui ? (
                      <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                        <span className="font-medium">Code ou indications</span>
                        <input
                          type="text"
                          className="w-full rounded-lg px-3 py-2 outline-none pc-field-focus"
                  style={fieldInputLg}
                          value={values.interphone_digicode_code}
                          onChange={(event) =>
                            setValues((prev) => ({ ...prev, interphone_digicode_code: event.target.value }))
                          }
                          placeholder="Ex : 1234A, Sonnerie Dupont…"
                        />
                      </label>
                    ) : null}
                  </div>
                  <label className="sm:col-span-2 inline-flex items-center gap-2 text-sm font-medium" style={{ color: PC.muted }}>
                    <input
                      type="checkbox"
                      className="rounded" style={{ borderColor: PC.border, borderWidth: 1, borderStyle: "solid" }}
                      checked={values.parking_inclus}
                      onChange={(event) =>
                        setValues((prev) => ({
                          ...prev,
                          parking_inclus: event.target.checked,
                          parking_numero: event.target.checked ? prev.parking_numero : "",
                        }))
                      }
                    />
                    Parking inclus
                  </label>
                  {values.parking_inclus ? (
                    <label className="sm:col-span-2 flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                      <span className="font-medium">Numéro de place</span>
                      <input
                        type="text"
                        className="w-full rounded-lg px-3 py-2 outline-none pc-field-focus"
                  style={fieldInputLg}
                        value={values.parking_numero}
                        onChange={(event) => onChange("parking_numero", event.target.value)}
                      />
                    </label>
                  ) : null}
                  <label className="sm:col-span-2 inline-flex items-center gap-2 text-sm font-medium" style={{ color: PC.muted }}>
                    <input
                      type="checkbox"
                      className="rounded" style={{ borderColor: PC.border, borderWidth: 1, borderStyle: "solid" }}
                      checked={values.cave_incluse}
                      onChange={(event) =>
                        setValues((prev) => ({
                          ...prev,
                          cave_incluse: event.target.checked,
                          cave_numero: event.target.checked ? prev.cave_numero : "",
                        }))
                      }
                    />
                    Cave incluse
                  </label>
                  {values.cave_incluse ? (
                    <label className="sm:col-span-2 flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                      <span className="font-medium">Numéro de cave</span>
                      <input
                        type="text"
                        className="w-full rounded-lg px-3 py-2 outline-none pc-field-focus"
                  style={fieldInputLg}
                        value={values.cave_numero}
                        onChange={(event) => onChange("cave_numero", event.target.value)}
                      />
                    </label>
                  ) : null}
                  <label className="sm:col-span-2 inline-flex items-center gap-2 text-sm font-medium" style={{ color: PC.muted }}>
                    <input
                      type="checkbox"
                      className="rounded" style={{ borderColor: PC.border, borderWidth: 1, borderStyle: "solid" }}
                      checked={values.garage_inclus}
                      onChange={(event) =>
                        setValues((prev) => ({
                          ...prev,
                          garage_inclus: event.target.checked,
                          garage_numero: event.target.checked ? prev.garage_numero : "",
                        }))
                      }
                    />
                    Garage inclus
                  </label>
                  {values.garage_inclus ? (
                    <label className="sm:col-span-2 flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                      <span className="font-medium">Numéro de garage</span>
                      <input
                        type="text"
                        className="w-full rounded-lg px-3 py-2 outline-none pc-field-focus"
                  style={fieldInputLg}
                        value={values.garage_numero}
                        onChange={(event) => onChange("garage_numero", event.target.value)}
                      />
                    </label>
                  ) : null}
                </div>
              </div>
              <label className="sm:col-span-2 flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                <span className="font-medium">Travaux réalisés depuis le dernier bail</span>
                <textarea
                  className="min-h-20 w-full rounded-lg px-3 py-2 outline-none pc-field-focus"
                  style={fieldInputLg}
                  value={values.travaux_realises}
                  onChange={(event) => onChange("travaux_realises", event.target.value)}
                />
              </label>
            <div className="mt-6">
              {values.type_bail === "meuble" ? (
                <>
                  <h4 className="text-sm font-semibold">
                    Équipements inclus (obligatoires meublé - loi Alur)
                  </h4>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {EQUIPEMENTS_MEUBLES_ALUR.map((item) => (
                      <div
                      key={item}
                      className="rounded-lg p-3"
                      style={{
                        border: `1px solid ${PC.border}`,
                        backgroundColor: PC.card,
                      }}
                    >
                        <label className="inline-flex items-center gap-2 text-sm font-medium" style={{ color: PC.muted }}>
                          <input
                            type="checkbox"
                            checked={values.equipements.includes(item)}
                            onChange={() => toggleEquipement(item)}
                          />
                          <span>{item}</span>
                        </label>
                        {values.equipements.includes(item) ? (
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            <label className="flex flex-col gap-1 text-xs" style={{ color: PC.muted }}>
                              <span>Quantité</span>
                              <input
                                type="number"
                                min={1}
                                className="w-full rounded-md px-2 py-1.5 text-sm outline-none pc-field-focus"
                                style={fieldInputMd}
                                value={values.equipements_details[item]?.quantity ?? 1}
                                onChange={(event) =>
                                  onEquipementDetailChange(item, "quantity", event.target.value)
                                }
                              />
                            </label>
                            <label className="flex flex-col gap-1 text-xs" style={{ color: PC.muted }}>
                              <span>Pièce(s)</span>
                              <input
                                className="w-full rounded-md px-2 py-1.5 text-sm outline-none pc-field-focus"
                                style={fieldInputMd}
                                placeholder="Ex: Chambre 1, Salon"
                                value={values.equipements_details[item]?.rooms ?? ""}
                                onChange={(event) =>
                                  onEquipementDetailChange(item, "rooms", event.target.value)
                                }
                              />
                            </label>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 space-y-3">
                    <span className="text-sm font-medium" style={{ color: PC.muted }}>Autres meubles</span>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        className="min-w-[12rem] flex-1 rounded-lg px-3 py-2 text-sm outline-none pc-field-focus"
                  style={fieldInputLg}
                        value={nouveauMeubleNom}
                        onChange={(event) => {
                          setNouveauMeubleNom(event.target.value);
                          setMeubleNomError("");
                        }}
                        placeholder="Nom du meuble"
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            addCustomMeuble();
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="rounded-lg px-4 py-2 text-sm font-medium pc-ghost-card"
                        onClick={() => addCustomMeuble()}
                      >
                        Ajouter
                      </button>
                    </div>
                    {meubleNomError ? <p className="text-xs text-red-600">{meubleNomError}</p> : null}
                    {customEquipements.length > 0 ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {customEquipements.map((item) => (
                          <div
                      key={item}
                      className="rounded-lg p-3"
                      style={{
                        border: `1px solid ${PC.border}`,
                        backgroundColor: PC.card,
                      }}
                    >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-sm font-medium" style={{ color: PC.muted }}>
                                <span aria-hidden>✅ </span>
                                {item}
                              </span>
                              <button
                                type="button"
                                className="shrink-0 rounded p-0.5 text-lg leading-none pc-icon-danger-hover"
                                style={{ color: PC.muted }}
                                onClick={() => removeCustomMeuble(item)}
                                aria-label={`Retirer ${item}`}
                              >
                                ✕
                              </button>
                            </div>
                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                              <label className="flex flex-col gap-1 text-xs" style={{ color: PC.muted }}>
                                <span>Quantité</span>
                                <input
                                  type="number"
                                  min={1}
                                  className="w-full rounded-md px-2 py-1.5 text-sm outline-none pc-field-focus"
                                style={fieldInputMd}
                                  value={values.equipements_details[item]?.quantity ?? 1}
                                  onChange={(event) =>
                                    onEquipementDetailChange(item, "quantity", event.target.value)
                                  }
                                />
                              </label>
                              <label className="flex flex-col gap-1 text-xs" style={{ color: PC.muted }}>
                                <span>Pièce(s)</span>
                                <input
                                  className="w-full rounded-md px-2 py-1.5 text-sm outline-none pc-field-focus"
                                style={fieldInputMd}
                                  placeholder="Ex: Chambre 1, Salon"
                                  value={values.equipements_details[item]?.rooms ?? ""}
                                  onChange={(event) =>
                                    onEquipementDetailChange(item, "rooms", event.target.value)
                                  }
                                />
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>

              <label className="sm:col-span-2 flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                <span className="font-medium">Clauses particulières (libre)</span>
                <textarea
                  className="min-h-24 w-full rounded-lg px-3 py-2 outline-none pc-field-focus"
                  style={fieldInputLg}
                  value={values.clauses_particulieres}
                  onChange={(event) => onChange("clauses_particulieres", event.target.value)}
                  placeholder="Avenants, conditions spécifiques, etc. (reproduites dans le PDF)"
                />
              </label>

            <div className="mt-6">
              <h4 className="text-sm font-semibold">Diagnostics techniques</h4>
              <p className="mt-1 text-xs" style={{ color: PC.muted }}>
                Le DPE et l&apos;ERP sont requis pour toute mise en location et restent cochés.
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {DIAGNOSTICS_FORM.map((item) =>
                  item.mandatory ? (
                    <div
                      key={item.key}
                      className="inline-flex cursor-not-allowed items-center gap-2 text-sm"
                      style={{ color: PC.muted }}
                    >
                      <input
                        type="checkbox"
                        className="rounded" style={{ borderColor: PC.border, borderWidth: 1, borderStyle: "solid" }}
                        checked
                        disabled
                        readOnly
                        aria-readonly="true"
                      />
                      <span>
                        {item.label}{" "}
                        <span className="font-medium" style={{ color: PC.muted }}>(obligatoire)</span>
                      </span>
                    </div>
                  ) : (
                    <label
                      key={item.key}
                      className="inline-flex cursor-help items-start gap-2 text-sm"
                      style={{ color: PC.muted }}
                      title={item.hint}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 rounded" style={{ borderColor: PC.border, borderWidth: 1, borderStyle: "solid" }}
                        checked={Boolean(values.diagnostics[item.key])}
                        onChange={() => toggleDiagnostic(item.key)}
                      />
                      <span>
                        {item.label}
                        {item.hint ? (
                          <span className="ml-1 inline-block text-xs font-normal" style={{ color: PC.muted }} aria-hidden>
                            ⓘ
                          </span>
                        ) : null}
                      </span>
                    </label>
                  ),
                )}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                  <span className="font-medium">Classe énergie (DPE)</span>
                  <select
                    className="w-full rounded-lg px-3 py-2 outline-none pc-field-focus"
                  style={fieldSelectLg}
                    value={values.dpe_classe_energie}
                    onChange={(event) => onChange("dpe_classe_energie", event.target.value)}
                  >
                    <option value="">Sélectionner...</option>
                    {["A", "B", "C", "D", "E", "F", "G"].map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                  <span className="font-medium">Valeur (kWh/m²/an)</span>
                  <input
                    type="number"
                    className="w-full rounded-lg px-3 py-2 outline-none pc-field-focus"
                  style={fieldInputLg}
                    value={values.dpe_valeur_kwh}
                    onChange={(event) => onChange("dpe_valeur_kwh", event.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                  <span className="font-medium">Classe GES</span>
                  <select
                    className="w-full rounded-lg px-3 py-2 outline-none pc-field-focus"
                  style={fieldSelectLg}
                    value={values.dpe_classe_ges}
                    onChange={(event) => onChange("dpe_classe_ges", event.target.value)}
                  >
                    <option value="">Sélectionner...</option>
                    {["A", "B", "C", "D", "E", "F", "G"].map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <BtnNeutral onClick={closeModal}>Fermer</BtnNeutral>
              <BtnPrimary type="submit" disabled={isSubmitting} loading={isSubmitting}>
                {isEditing ? "Mettre à jour" : "Créer"}
              </BtnPrimary>
            </div>
            </form>
          </div>
        </div>
      ) : null}

      <ConfirmModal
        open={deleteConfirmId != null}
        title="Supprimer le bail"
        description="Êtes-vous sûr de vouloir supprimer ce bail ? Cette action est irréversible."
        loading={deleteSubmitting}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) void onDelete(deleteConfirmId);
        }}
      />
    </section>
  );
}
