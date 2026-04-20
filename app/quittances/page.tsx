"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { EntityFormModal, type EntityField } from "@/components/crud/entity-form-modal";
import { EntityTable, type EntityColumn } from "@/components/crud/entity-table";
import { IconPlus } from "@/components/proplio-icons";
import { ProprietaireProfileCard } from "@/components/proprietaire-profile-card";
import {
  fetchProprietaireProfile,
  getCurrentProprietaireId,
  type ProprietaireProfile,
} from "@/lib/proprietaire-profile";
import { montantsPourQuittanceLocataire } from "@/lib/colocation";
import { formatSubmitError } from "@/lib/supabase-submit-error";
import { supabase } from "@/lib/supabase";
import { PC } from "@/lib/proplio-colors";
import { panelCard } from "@/lib/proplio-field-styles";

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
  envoyee: "non",
  date_envoi: "",
};

export default function QuittancesPage() {
  const [rows, setRows] = useState<Quittance[]>([]);
  const [values, setValues] = useState<Record<string, string>>(defaultValues);
  const [editingRow, setEditingRow] = useState<Quittance | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [logements, setLogements] = useState<LogementEntity[]>([]);
  const [locataires, setLocataires] = useState<LocataireEntity[]>([]);
  const [proprietaireId, setProprietaireId] = useState<string | null>(null);
  const [proprietaireProfile, setProprietaireProfile] = useState<ProprietaireProfile | null>(null);

  const isEditing = useMemo(() => editingRow !== null, [editingRow]);
  const logementsMap = useMemo(() => new Map(logements.map((item) => [item.id, item.label])), [logements]);
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
        options: locataires.map((item) => ({ value: item.id, label: item.label })),
      },
      { name: "mois", label: "Mois", type: "select", required: true, options: moisOptions },
      { name: "annee", label: "Année", type: "select", required: true, options: anneeOptions },
      { name: "loyer", label: "Loyer (€)", type: "number", required: true, step: "0.01" },
      { name: "charges", label: "Charges (€)", type: "number", required: true, step: "0.01" },
      { name: "total", label: "Total (€)", type: "number", required: true, step: "0.01" },
      {
        name: "envoyee",
        label: "Quittance envoyée",
        type: "select",
        required: true,
        options: [
          { value: "non", label: "Non" },
          { value: "oui", label: "Oui" },
        ],
      },
      { name: "date_envoi", label: "Date d'envoi", type: "date" },
    ],
    [logements, locataires],
  );

  const columns = useMemo<EntityColumn<Quittance>[]>(
    () => [
      {
        key: "logement_id",
        label: "Logement",
        render: (row) => logementsMap.get(row.logement_id) ?? row.logement_id,
      },
      {
        key: "locataire_id",
        label: "Locataire",
        render: (row) => locatairesMap.get(row.locataire_id) ?? row.locataire_id,
      },
      { key: "mois", label: "Mois", render: (row) => moisMap.get(String(row.mois)) ?? String(row.mois) },
      { key: "annee", label: "Année" },
      { key: "loyer", label: "Loyer", render: (row) => `${row.loyer} €` },
      { key: "charges", label: "Charges", render: (row) => `${row.charges} €` },
      { key: "total", label: "Total", render: (row) => `${row.total} €` },
      { key: "envoyee", label: "Envoyée", render: (row) => (row.envoyee ? "Oui" : "Non") },
      { key: "date_envoi", label: "Date d'envoi", render: (row) => row.date_envoi ?? "—" },
    ],
    [locatairesMap, logementsMap, moisMap],
  );

  const loadRelations = useCallback(async (ownerId: string) => {
    const [logementsResponse, locatairesResponse] = await Promise.all([
      supabase
        .from("logements")
        .select("id, nom, adresse, loyer, charges, est_colocation, nombre_chambres, chambres_details")
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

    setIsLoading(false);
  }, [proprietaireId]);

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

  function openCreateModal() {
    setEditingRow(null);
    setValues({ ...defaultValues, annee: defaultYear });
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
      envoyee: row.envoyee ? "oui" : "non",
      date_envoi: row.date_envoi ? row.date_envoi.slice(0, 10) : "",
    });
    setIsModalOpen(true);
    if (proprietaireId) void loadRelations(proprietaireId);
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

      const envoyee = values.envoyee === "oui";
      const dateEnvoi = values.date_envoi?.trim() || null;
      if (envoyee && !dateEnvoi) {
        setError("Si la quittance est marquée comme envoyée, indiquez la date d'envoi.");
        return;
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
        envoyee,
        date_envoi: dateEnvoi,
      };

      const query = isEditing
        ? supabase
            .from("quittances")
            .update(payload)
            .eq("id", editingRow!.id)
            .eq("proprietaire_id", ownerId)
        : supabase.from("quittances").insert(payload);

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
        .from("quittances")
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

  async function onSendQuittance(row: Quittance) {
    setSendingId(row.id);
    setError("");

    try {
      const response = await fetch(`/api/quittances/${row.id}/send`, {
        method: "POST",
      });

      if (!response.ok) {
        let msg = `Envoi impossible (${response.status}). Vérifiez la configuration e-mail et les données de la quittance.`;
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
      setError(`Erreur lors de l'envoi : ${formatSubmitError(e)}`);
    } finally {
      setSendingId(null);
    }
  }

  return (
    <section className="proplio-page-wrap space-y-8" style={{ color: PC.text }}>
      <ProprietaireProfileCard
        profile={proprietaireProfile}
        title="Profil propriétaire utilisé automatiquement pour les quittances"
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Quittances</h1>
          <p className="mt-2 text-sm" style={{ color: PC.muted }}>
            Liste, création et suivi des quittances.
          </p>
        </div>
        <button
          type="button"
          className="proplio-btn-primary inline-flex items-center gap-2 px-5 py-2.5"
          onClick={openCreateModal}
        >
          <IconPlus className="h-4 w-4" />
          Nouvelle quittance
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
        <div className="rounded-xl p-6 text-sm" style={{ ...panelCard, color: PC.muted }}>
          Chargement des quittances...
        </div>
      ) : (
        <EntityTable
          columns={columns}
          rows={rows}
          emptyMessage="Aucune quittance enregistrée."
          onEdit={openEditModal}
          onDelete={onDelete}
          isDeleting={isDeleting}
          statusRenderer={(row) =>
            row.envoyee ? (
              <span
                className="rounded-full px-2.5 py-1 text-xs font-medium"
                style={{ backgroundColor: PC.successBg20, color: PC.success }}
              >
                Envoyée le {row.date_envoi ? new Date(row.date_envoi).toLocaleDateString("fr-FR") : "—"}
              </span>
            ) : (
              <span
                className="rounded-full px-2.5 py-1 text-xs font-medium"
                style={{ backgroundColor: PC.warningBg15, color: PC.warning }}
              >
                Non envoyée
              </span>
            )
          }
          actionsRenderer={(row) => (
            <button
              type="button"
              className="rounded-md px-3 py-1.5 text-xs font-medium pc-outline-success disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => onSendQuittance(row)}
              disabled={sendingId === row.id}
            >
              {sendingId === row.id ? "Envoi..." : "Envoyer la quittance"}
            </button>
          )}
        />
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
    </section>
  );
}
