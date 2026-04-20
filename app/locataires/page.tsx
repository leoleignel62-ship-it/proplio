"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { EntityTable, type EntityColumn } from "@/components/crud/entity-table";
import { IconPlus } from "@/components/proplio-icons";
import { getChambreAt, parseChambresDetails } from "@/lib/colocation";
import { getCurrentProprietaireId } from "@/lib/proprietaire-profile";
import { formatSubmitError, isValidEmail } from "@/lib/supabase-submit-error";
import { supabase } from "@/lib/supabase";

type LogementRow = {
  id: string;
  nom: string | null;
  adresse: string | null;
  est_colocation: boolean | null;
  nombre_chambres?: number | null;
  chambres_details?: unknown;
};

type Locataire = {
  id: string;
  proprietaire_id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  logement_id: string | null;
  colocation_chambre_index: number | null;
};

const defaultValues = {
  nom: "",
  prenom: "",
  email: "",
  telephone: "",
  logement_id: "",
  colocation_chambre_index: "",
};

export default function LocatairesPage() {
  const [rows, setRows] = useState<Locataire[]>([]);
  const [logements, setLogements] = useState<LogementRow[]>([]);
  const [values, setValues] = useState<Record<string, string>>(defaultValues);
  const [editingRow, setEditingRow] = useState<Locataire | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const [proprietaireId, setProprietaireId] = useState<string | null>(null);

  const isEditing = useMemo(() => editingRow !== null, [editingRow]);
  const logementsById = useMemo(() => new Map(logements.map((l) => [l.id, l])), [logements]);

  const selectedLogement = values.logement_id ? logementsById.get(values.logement_id) : undefined;
  const isColocLogement = Boolean(selectedLogement?.est_colocation);
  const nbChambres = Math.max(
    1,
    Math.min(10, Number(selectedLogement?.nombre_chambres) || 1),
  );
  const chambreDetail =
    isColocLogement && values.colocation_chambre_index
      ? getChambreAt(
          parseChambresDetails(selectedLogement?.chambres_details),
          Number(values.colocation_chambre_index),
        )
      : null;

  const columns = useMemo<EntityColumn<Locataire>[]>(
    () => [
      { key: "nom", label: "Nom" },
      { key: "prenom", label: "Prénom" },
      { key: "email", label: "Email" },
      { key: "telephone", label: "Téléphone" },
      {
        key: "id",
        label: "Situation",
        render: (row) => {
          const log = row.logement_id ? logementsById.get(row.logement_id) : undefined;
          const isColoc = Boolean(log?.est_colocation && row.colocation_chambre_index);
          if (!isColoc || !log) return "—";
          const label = log.nom || log.adresse || "Logement";
          return (
            <span className="inline-flex items-center rounded-full bg-proplio-primary/25 px-2.5 py-1 text-xs font-medium text-proplio-secondary">
              Colocataire · {label} · Ch. {row.colocation_chambre_index}
            </span>
          );
        },
      },
    ],
    [logementsById],
  );

  const loadLogements = useCallback(async (ownerId: string) => {
    const { data, error: fetchError } = await supabase
      .from("logements")
      .select("id, nom, adresse, est_colocation, nombre_chambres, chambres_details")
      .eq("proprietaire_id", ownerId)
      .order("nom", { ascending: true });

    if (fetchError) {
      setError((prev) => prev || `Erreur logements : ${formatSubmitError(fetchError)}`);
      setLogements([]);
      return;
    }
    setLogements((data as LogementRow[]) ?? []);
  }, []);

  const loadRows = useCallback(
    async (ownerId?: string | null) => {
      const activeOwnerId = ownerId ?? proprietaireId;
      if (!activeOwnerId) {
        setRows([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError("");

      const { data, error: fetchError } = await supabase
        .from("locataires")
        .select("*")
        .eq("proprietaire_id", activeOwnerId)
        .order("created_at", { ascending: false });

      if (fetchError) {
        setError(`Erreur de chargement : ${formatSubmitError(fetchError)}`);
        setRows([]);
      } else {
        setRows((data as Locataire[]) ?? []);
      }

      setIsLoading(false);
    },
    [proprietaireId],
  );

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

      await loadLogements(ownerId);
      const { data, error: fetchError } = await supabase
        .from("locataires")
        .select("*")
        .eq("proprietaire_id", ownerId)
        .order("created_at", { ascending: false });

      if (!isMounted) return;

      if (fetchError) {
        setError(`Erreur de chargement : ${formatSubmitError(fetchError)}`);
        setRows([]);
      } else {
        setRows((data as Locataire[]) ?? []);
      }

      setIsLoading(false);
    };

    void loadInitialRows();

    return () => {
      isMounted = false;
    };
  }, [loadLogements]);

  function openCreateModal() {
    setEditingRow(null);
    setValues(defaultValues);
    setIsModalOpen(true);
  }

  function openEditModal(row: Locataire) {
    setEditingRow(row);
    setValues({
      nom: row.nom ?? "",
      prenom: row.prenom ?? "",
      email: row.email ?? "",
      telephone: row.telephone ?? "",
      logement_id: row.logement_id ?? "",
      colocation_chambre_index:
        row.colocation_chambre_index != null ? String(row.colocation_chambre_index) : "",
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingRow(null);
    setValues(defaultValues);
  }

  function onFieldChange(name: string, value: string) {
    setValues((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "logement_id") {
        next.colocation_chambre_index = "";
      }
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

      const nom = values.nom.trim();
      const prenom = values.prenom.trim();
      const email = values.email.trim();
      const telephone = values.telephone.trim();
      if (!nom || !prenom) {
        setError("Le nom et le prénom sont obligatoires.");
        return;
      }
      if (!isValidEmail(email)) {
        setError("Indiquez une adresse e-mail valide.");
        return;
      }

      const logementId = values.logement_id.trim() || null;
      const log = logementId ? logementsById.get(logementId) : undefined;
      const colocIdxRaw = values.colocation_chambre_index.trim();

      if (log?.est_colocation) {
        if (!colocIdxRaw || !Number.isFinite(Number(colocIdxRaw))) {
          setError("Pour un logement en colocation, choisissez le numéro de chambre.");
          return;
        }
      }

      const colocation_chambre_index =
        log?.est_colocation && colocIdxRaw
          ? Math.max(1, Math.min(10, Number(colocIdxRaw)))
          : null;

      const payload = {
        proprietaire_id: ownerId,
        nom,
        prenom,
        email,
        telephone: telephone || "",
        logement_id: logementId,
        colocation_chambre_index,
      };

      const query = isEditing
        ? supabase
            .from("locataires")
            .update(payload)
            .eq("id", editingRow!.id)
            .eq("proprietaire_id", ownerId)
        : supabase.from("locataires").insert(payload);

      const { error: submitError } = await query;

      if (submitError) {
        setError(`Erreur d'enregistrement : ${formatSubmitError(submitError)}`);
        return;
      }

      closeModal();
      await loadRows(ownerId);
      await loadLogements(ownerId);
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
        .from("locataires")
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

  return (
    <section className="proplio-page-wrap space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-proplio-text">Locataires</h1>
          <p className="mt-2 text-sm text-proplio-muted">Liste, création et gestion des profils locataires.</p>
        </div>
        <button
          type="button"
          className="proplio-btn-primary inline-flex items-center gap-2 px-5 py-2.5"
          onClick={openCreateModal}
        >
          <IconPlus className="h-4 w-4" />
          Nouveau locataire
        </button>
      </div>

      {error ? <p className="mb-4 rounded-lg bg-proplio-danger/10 px-3 py-2 text-sm text-proplio-danger">{error}</p> : null}

      {isLoading ? (
        <div className="rounded-xl border border-proplio-border bg-proplio-card p-6 text-sm text-proplio-muted">
          Chargement des locataires...
        </div>
      ) : (
        <EntityTable
          columns={columns}
          rows={rows}
          emptyMessage="Aucun locataire enregistré."
          onEdit={openEditModal}
          onDelete={onDelete}
          isDeleting={isDeleting}
        />
      )}

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4">
          <div className="mx-auto max-w-lg rounded-xl border border-proplio-border bg-proplio-card p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <h3 className="text-lg font-semibold text-proplio-text">
                {isEditing ? "Modifier le locataire" : "Créer un locataire"}
              </h3>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-sm text-proplio-muted hover:bg-proplio-bg"
                onClick={closeModal}
              >
                Fermer
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <label className="flex flex-col gap-1.5 text-sm text-proplio-muted">
                <span className="font-medium">Nom</span>
                <input
                  required
                  className="rounded-lg border border-proplio-border px-3 py-2 outline-none ring-proplio-primary/35 focus:ring-2"
                  value={values.nom}
                  onChange={(e) => onFieldChange("nom", e.target.value)}
                  placeholder="Dupont"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm text-proplio-muted">
                <span className="font-medium">Prénom</span>
                <input
                  required
                  className="rounded-lg border border-proplio-border px-3 py-2 outline-none ring-proplio-primary/35 focus:ring-2"
                  value={values.prenom}
                  onChange={(e) => onFieldChange("prenom", e.target.value)}
                  placeholder="Claire"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm text-proplio-muted">
                <span className="font-medium">Email</span>
                <input
                  required
                  type="email"
                  className="rounded-lg border border-proplio-border px-3 py-2 outline-none ring-proplio-primary/35 focus:ring-2"
                  value={values.email}
                  onChange={(e) => onFieldChange("email", e.target.value)}
                  placeholder="claire@email.com"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm text-proplio-muted">
                <span className="font-medium">Téléphone</span>
                <input
                  type="tel"
                  className="rounded-lg border border-proplio-border px-3 py-2 outline-none ring-proplio-primary/35 focus:ring-2"
                  value={values.telephone}
                  onChange={(e) => onFieldChange("telephone", e.target.value)}
                  placeholder="06 12 34 56 78"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm text-proplio-muted">
                <span className="font-medium">Logement lié (optionnel)</span>
                <select
                  className="rounded-lg border border-proplio-border px-3 py-2 outline-none ring-proplio-primary/35 focus:ring-2"
                  value={values.logement_id}
                  onChange={(e) => onFieldChange("logement_id", e.target.value)}
                >
                  <option value="">— Aucun —</option>
                  {logements.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nom || l.adresse || l.id}
                      {l.est_colocation ? " (colocation)" : ""}
                    </option>
                  ))}
                </select>
              </label>

              {isColocLogement ? (
                <>
                  <label className="flex flex-col gap-1.5 text-sm text-proplio-muted">
                    <span className="font-medium">Chambre assignée</span>
                    <select
                      required
                      className="rounded-lg border border-proplio-border px-3 py-2 outline-none ring-proplio-primary/35 focus:ring-2"
                      value={values.colocation_chambre_index}
                      onChange={(e) => onFieldChange("colocation_chambre_index", e.target.value)}
                    >
                      <option value="">Choisir une chambre</option>
                      {Array.from({ length: nbChambres }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={String(n)}>
                          Chambre {n}
                        </option>
                      ))}
                    </select>
                  </label>
                  {chambreDetail ? (
                    <div className="rounded-lg border border-proplio-border bg-proplio-card p-3 text-sm text-proplio-muted">
                      <p className="font-medium text-proplio-text">Loyer de cette chambre</p>
                      <p className="mt-1">
                        Loyer : <strong>{Number(chambreDetail.loyer).toFixed(2)} €</strong> — Charges :{" "}
                        <strong>{Number(chambreDetail.charges).toFixed(2)} €</strong>
                      </p>
                    </div>
                  ) : values.colocation_chambre_index ? (
                    <p className="text-xs text-proplio-warning">Détail de chambre introuvable. Vérifiez le logement.</p>
                  ) : null}
                </>
              ) : null}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="rounded-lg border border-proplio-border px-4 py-2 text-sm text-proplio-muted"
                  onClick={closeModal}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-proplio-primary px-4 py-2 text-sm font-medium text-white hover:bg-proplio-primary-hover disabled:opacity-60"
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
