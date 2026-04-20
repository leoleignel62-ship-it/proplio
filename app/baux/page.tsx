"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { EntityTable, type EntityColumn } from "@/components/crud/entity-table";
import { IconPlus } from "@/components/proplio-icons";
import { montantsPourQuittanceLocataire } from "@/lib/colocation";
import { getCurrentProprietaireId } from "@/lib/proprietaire-profile";
import { formatSubmitError } from "@/lib/supabase-submit-error";
import { supabase } from "@/lib/supabase";
import { PC } from "@/lib/proplio-colors";
import { fieldInputLg, fieldInputMd, fieldSelectLg, panelCard } from "@/lib/proplio-field-styles";

const BAIL_MODAL_CARD: CSSProperties = {
  ...panelCard,
  padding: 24,
  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)",
};

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
};

export default function BauxPage() {
  const [rows, setRows] = useState<Bail[]>([]);
  const [values, setValues] = useState(defaultValues);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGeneratingPdfId, setIsGeneratingPdfId] = useState<string | null>(null);
  const [isSendingEmailId, setIsSendingEmailId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<Bail | null>(null);
  const [error, setError] = useState("");
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
  const logementsMap = useMemo(() => new Map(logements.map((item) => [item.id, item.label])), [logements]);
  const locatairesMap = useMemo(() => new Map(locataires.map((item) => [item.id, item.label])), [locataires]);
  const logementsDetailsMap = useMemo(() => new Map(logements.map((item) => [item.id, item])), [logements]);
  const selectedLogement = values.logement_id ? logementsDetailsMap.get(values.logement_id) : undefined;
  const isColocationLogement = Boolean(selectedLogement?.est_colocation);
  const locatairesSelectList = useMemo(() => {
    if (!isColocationLogement || !values.logement_id) return locataires;
    return locataires.filter(
      (l) =>
        l.logement_id === values.logement_id &&
        l.colocation_chambre_index != null &&
        l.colocation_chambre_index >= 1,
    );
  }, [isColocationLogement, values.logement_id, locataires]);

  const columns = useMemo<EntityColumn<Bail>[]>(
    () => [
      {
        key: "locataire_id",
        label: "Locataire",
        render: (row) => {
          const main = locatairesMap.get(row.locataire_id) ?? row.locataire_id;
          const extra = Array.isArray(row.colocataires_ids) ? row.colocataires_ids.length : 0;
          const legacyColocs = extra > 0 && !row.colocation_chambre_index;
          return legacyColocs ? `${main} (+${extra})` : main;
        },
      },
      {
        key: "logement_id",
        label: "Logement",
        render: (row) => {
          const label = logementsMap.get(row.logement_id) ?? row.logement_id;
          const log = logementsDetailsMap.get(row.logement_id);
          if (log?.est_colocation && row.colocation_chambre_index != null) {
            return (
              <span className="flex flex-col gap-1">
                <span>{label}</span>
                <span
                  className="inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: PC.primaryBg25, color: PC.secondary }}
                >
                  Colocation — Chambre {row.colocation_chambre_index}
                </span>
              </span>
            );
          }
          return label;
        },
      },
      { key: "type_bail", label: "Type", render: (row) => (row.type_bail === "meuble" ? "Meublé" : "Vide") },
      {
        key: "date_debut",
        label: "Début",
        render: (row) => new Date(row.date_debut).toLocaleDateString("fr-FR"),
      },
      {
        key: "date_fin",
        label: "Fin",
        render: (row) => new Date(row.date_fin).toLocaleDateString("fr-FR"),
      },
    ],
    [locatairesMap, logementsDetailsMap, logementsMap],
  );

  const loadRelations = useCallback(async (ownerId: string) => {
    const [logementsResponse, locatairesResponse] = await Promise.all([
      supabase
        .from("logements")
        .select("id, nom, adresse, loyer, charges, type, surface, est_colocation, chambres_details, nombre_chambres")
        .eq("proprietaire_id", ownerId),
      supabase
        .from("locataires")
        .select("id, nom, prenom, logement_id, colocation_chambre_index")
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

    setIsLoading(false);
  }, [proprietaireId]);

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

      await Promise.all([loadRows(ownerId), loadRelations(ownerId)]);
    };

    void loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [loadRows, loadRelations]);

  function closeModal() {
    setIsModalOpen(false);
    setEditingRow(null);
    setValues(defaultValues);
    setNouveauMeubleNom("");
    setMeubleNomError("");
  }

  function openCreateModal() {
    setEditingRow(null);
    setValues(defaultValues);
    setNouveauMeubleNom("");
    setMeubleNomError("");
    setIsModalOpen(true);
  }

  function openEditModal(row: Bail) {
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

      if (!values.logement_id.trim() || !values.locataire_id.trim()) {
        setError("Sélectionnez un logement et un locataire.");
        return;
      }
      if (!values.date_debut.trim()) {
        setError("Indiquez la date de début du bail.");
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
        .from("baux")
        .delete()
        .eq("id", id)
        .eq("proprietaire_id", ownerId);

      if (deleteError) {
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

  async function onGeneratePdf(id: string) {
    setIsGeneratingPdfId(id);
    setError("");

    try {
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
    } catch (e) {
      setError(`Erreur de génération PDF : ${formatSubmitError(e)}`);
    } finally {
      setIsGeneratingPdfId(null);
    }
  }

  async function onSendBailEmail(id: string) {
    setIsSendingEmailId(id);
    setError("");

    try {
      const response = await fetch(`/api/baux/${id}/send`, { method: "POST" });

      if (!response.ok) {
        let msg = `Envoi e-mail impossible (${response.status}). Vérifiez Resend et l'e-mail du propriétaire.`;
        try {
          const j = (await response.json()) as { error?: string };
          if (j.error?.trim()) msg = j.error.trim();
        } catch {
          /* corps non JSON */
        }
        setError(msg);
        return;
      }

      const { proprietaireId: ownerId } = await getCurrentProprietaireId();
      if (ownerId) await loadRows(ownerId);
    } catch (e) {
      setError(`Erreur d'envoi de l'e-mail : ${formatSubmitError(e)}`);
    } finally {
      setIsSendingEmailId(null);
    }
  }

  return (
    <section className="proplio-page-wrap space-y-8" style={{ color: PC.text }}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Baux</h1>
          <p className="mt-2 text-sm" style={{ color: PC.muted }}>
            Création de baux conformes loi Alur et loi du 6 juillet 1989.
          </p>
        </div>
        <button
          type="button"
          className="proplio-btn-primary inline-flex items-center gap-2 px-5 py-2.5"
          onClick={openCreateModal}
        >
          <IconPlus className="h-4 w-4" />
          Nouveau bail
        </button>
      </div>

      {error ? (
        <p
          className="mb-4 rounded-lg px-3 py-2 text-sm"
          style={{ backgroundColor: PC.dangerBg10, color: PC.danger }}
        >
          {error}
        </p>
      ) : null}

      {isLoading ? (
        <div
          className="rounded-xl p-6 text-sm"
          style={{ ...panelCard, color: PC.muted }}
        >
          Chargement des baux...
        </div>
      ) : (
        <EntityTable
          columns={columns}
          rows={rows}
          emptyMessage="Aucun bail enregistré."
          onEdit={openEditModal}
          onDelete={onDelete}
          isDeleting={isDeleting}
          statusRenderer={(row) => (
            <div className="flex flex-col items-end gap-1">
              {row.statut === "actif" ? (
                <span
                  className="rounded-full px-2.5 py-1 text-xs font-medium"
                  style={{ backgroundColor: PC.successBg20, color: PC.success }}
                >
                  Actif
                </span>
              ) : (
                <span
                  className="rounded-full px-2.5 py-1 text-xs font-medium"
                  style={{ backgroundColor: PC.border, color: PC.muted }}
                >
                  Terminé
                </span>
              )}
              {row.email_envoye ? (
                <span
                  className="rounded-full px-2.5 py-1 text-xs font-medium"
                  style={{ backgroundColor: PC.primaryBg20, color: PC.secondary }}
                >
                  Bail envoyé
                </span>
              ) : null}
            </div>
          )}
          actionsRenderer={(row) => (
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded-md px-3 py-1.5 text-xs font-medium pc-outline-primary disabled:opacity-60"
                onClick={() => onGeneratePdf(row.id)}
                disabled={isGeneratingPdfId === row.id}
              >
                {isGeneratingPdfId === row.id ? "Génération..." : "Générer PDF"}
              </button>
              <button
                type="button"
                className="rounded-md px-3 py-1.5 text-xs font-medium pc-outline-success disabled:opacity-60"
                onClick={() => onSendBailEmail(row.id)}
                disabled={isSendingEmailId === row.id}
              >
                {isSendingEmailId === row.id ? "Envoi..." : "Envoyer par e-mail"}
              </button>
            </div>
          )}
        />
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
                {isColocationLogement && values.logement_id && locatairesSelectList.length === 0 ? (
                  <span className="text-xs" style={{ color: PC.warning }}>
                    Aucun colocataire lié à ce logement avec une chambre : configurez d&apos;abord les fiches dans
                    Locataires.
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
              <button
                type="button"
                className="rounded-lg px-4 py-2 text-sm font-medium pc-outline-muted"
                onClick={closeModal}
              >
                Fermer
              </button>
              <button
                type="submit"
                className="rounded-lg px-4 py-2 text-sm font-medium pc-solid-primary disabled:opacity-60"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Enregistrement..." : isEditing ? "Mettre à jour" : "Créer"}
              </button>
            </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
