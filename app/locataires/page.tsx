"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { IconHome, IconPlus } from "@/components/proplio-icons";
import { getChambreAt, parseChambresDetails } from "@/lib/colocation";
import {
  canCreateLocataire,
  getOwnedCount,
  getOwnerPlan,
  PLAN_LIMIT_ERROR_MESSAGE,
  PLAN_UPGRADE_PATH,
} from "@/lib/plan-limits";
import { getCurrentProprietaireId } from "@/lib/proprietaire-profile";
import { formatSubmitError, isValidEmail } from "@/lib/supabase-submit-error";
import { supabase } from "@/lib/supabase";
import { PC } from "@/lib/proplio-colors";
import { fieldInputLg, fieldSelectLg, panelCard } from "@/lib/proplio-field-styles";

const LOCA_MODAL_CARD: CSSProperties = {
  ...panelCard,
  padding: 24,
  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)",
};
const GROUP_TITLE_STYLE: CSSProperties = { color: PC.text, fontWeight: 600, letterSpacing: "-0.01em" };
const CARD_STYLE: CSSProperties = { ...panelCard, padding: 16 };

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
  verrouille?: boolean | null;
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
  const [deleteTarget, setDeleteTarget] = useState<Locataire | null>(null);
  const [error, setError] = useState("");
  const [planLimitMessage, setPlanLimitMessage] = useState("");
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
  const isPlanLimitReached = Boolean(planLimitMessage);

  const refreshPlanLimit = useCallback(async (ownerId: string) => {
    const [plan, locatairesCount] = await Promise.all([
      getOwnerPlan(ownerId),
      getOwnedCount("locataires", ownerId),
    ]);
    if (!canCreateLocataire(plan, locatairesCount)) {
      setPlanLimitMessage("Limite atteinte. Passez au plan supérieur pour créer plus de locataires.");
      return;
    }
    setPlanLimitMessage("");
  }, []);

  const groupedLocataires = useMemo(() => {
    const groups: Array<{ key: string; title: string; subtitle: string; rows: Locataire[] }> = [];
    const byLogement = new Map<string, Locataire[]>();
    const without: Locataire[] = [];
    for (const row of rows) {
      if (!row.logement_id) {
        without.push(row);
        continue;
      }
      const arr = byLogement.get(row.logement_id) ?? [];
      arr.push(row);
      byLogement.set(row.logement_id, arr);
    }
    for (const logement of logements) {
      const rowsFor = byLogement.get(logement.id) ?? [];
      if (!rowsFor.length) continue;
      groups.push({
        key: logement.id,
        title: logement.nom || "Logement",
        subtitle: logement.adresse || "",
        rows: rowsFor,
      });
    }
    if (without.length) {
      groups.push({
        key: "without",
        title: "Sans logement assigné",
        subtitle: "Locataires non affectés",
        rows: without,
      });
    }
    return groups;
  }, [logements, rows]);

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
        .select(
          "id, proprietaire_id, nom, prenom, email, telephone, logement_id, colocation_chambre_index, verrouille, created_at",
        )
        .eq("proprietaire_id", activeOwnerId)
        .order("created_at", { ascending: false });

      if (fetchError) {
        setError(`Erreur de chargement : ${formatSubmitError(fetchError)}`);
        setRows([]);
        setPlanLimitMessage("");
      } else {
        const nextRows = (data as Locataire[]) ?? [];
        setRows(nextRows);
        await refreshPlanLimit(activeOwnerId);
      }

      setIsLoading(false);
    },
    [proprietaireId, refreshPlanLimit],
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

      const locataireCols =
        "id, proprietaire_id, nom, prenom, email, telephone, logement_id, colocation_chambre_index, verrouille, created_at";

      const [logRes, locRes] = await Promise.all([
        supabase
          .from("logements")
          .select("id, nom, adresse, est_colocation, nombre_chambres, chambres_details")
          .eq("proprietaire_id", ownerId)
          .order("nom", { ascending: true }),
        supabase
          .from("locataires")
          .select(locataireCols)
          .eq("proprietaire_id", ownerId)
          .order("created_at", { ascending: false }),
      ]);

      if (!isMounted) return;

      if (logRes.error) {
        setError((prev) => prev || `Erreur logements : ${formatSubmitError(logRes.error)}`);
        setLogements([]);
      } else {
        setLogements((logRes.data as LogementRow[]) ?? []);
      }

      if (locRes.error) {
        setError(`Erreur de chargement : ${formatSubmitError(locRes.error)}`);
        setRows([]);
        setPlanLimitMessage("");
      } else {
        const nextRows = (locRes.data as Locataire[]) ?? [];
        setRows(nextRows);
        await refreshPlanLimit(ownerId);
      }

      setIsLoading(false);
    };

    void loadInitialRows();

    return () => {
      isMounted = false;
    };
  }, [loadLogements, refreshPlanLimit]);

  async function openCreateModal() {
    const { proprietaireId: ownerId } = await getCurrentProprietaireId();
    if (ownerId) {
      await refreshPlanLimit(ownerId);
      const [plan, locatairesCount] = await Promise.all([
        getOwnerPlan(ownerId),
        getOwnedCount("locataires", ownerId),
      ]);
      if (!canCreateLocataire(plan, locatairesCount)) return;
    }
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
      if (!isEditing) {
        const [plan, locatairesCount] = await Promise.all([
          getOwnerPlan(ownerId),
          getOwnedCount("locataires", ownerId),
        ]);
        if (!canCreateLocataire(plan, locatairesCount)) {
          setError(PLAN_LIMIT_ERROR_MESSAGE);
          return;
        }
      }

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
      if (!logementId) {
        setError("Veuillez sélectionner un logement");
        return;
      }
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

      if (log?.est_colocation && colocation_chambre_index != null && logementId) {
        const occupant = rows.find(
          (r) =>
            r.logement_id === logementId &&
            r.colocation_chambre_index === colocation_chambre_index &&
            (!isEditing || r.id !== editingRow!.id),
        );
        if (occupant) {
          setError(`Cette chambre est déjà occupée par ${occupant.prenom} ${occupant.nom}`.trim());
          return;
        }
      }

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

      const { data: bailRows, error: bauxFetchError } = await supabase
        .from("baux")
        .select("id")
        .eq("proprietaire_id", ownerId)
        .eq("locataire_id", id);

      if (bauxFetchError) {
        setError(`Erreur de suppression : ${formatSubmitError(bauxFetchError)}`);
        return;
      }

      const bailIds = (bailRows ?? []).map((b) => String((b as { id: string }).id));

      const { error: quittancesDeleteError } = await supabase
        .from("quittances")
        .delete()
        .eq("proprietaire_id", ownerId)
        .eq("locataire_id", id);

      if (quittancesDeleteError) {
        setError(`Erreur de suppression : ${formatSubmitError(quittancesDeleteError)}`);
        return;
      }

      const { error: bauxDeleteError } = await supabase
        .from("baux")
        .delete()
        .eq("proprietaire_id", ownerId)
        .eq("locataire_id", id);

      if (bauxDeleteError) {
        setError(`Erreur de suppression : ${formatSubmitError(bauxDeleteError)}`);
        return;
      }

      const { error: edlDeleteByLocError } = await supabase
        .from("etats_des_lieux")
        .delete()
        .eq("proprietaire_id", ownerId)
        .eq("locataire_id", id);

      if (edlDeleteByLocError) {
        setError(`Erreur de suppression : ${formatSubmitError(edlDeleteByLocError)}`);
        return;
      }

      if (bailIds.length > 0) {
        const { error: edlDeleteByBauxError } = await supabase
          .from("etats_des_lieux")
          .delete()
          .eq("proprietaire_id", ownerId)
          .in("bail_id", bailIds);

        if (edlDeleteByBauxError) {
          setError(`Erreur de suppression : ${formatSubmitError(edlDeleteByBauxError)}`);
          return;
        }
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
      setDeleteTarget(null);
    } catch (e) {
      setError(formatSubmitError(e));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <section className="proplio-page-wrap space-y-8" style={{ color: PC.text }}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Locataires</h1>
          <p className="mt-2 text-sm" style={{ color: PC.muted }}>
            Liste, création et gestion des profils locataires.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium pc-solid-primary"
          onClick={() => void openCreateModal()}
          disabled={isPlanLimitReached}
          style={{ opacity: isPlanLimitReached ? 0.55 : 1, cursor: isPlanLimitReached ? "not-allowed" : "pointer" }}
        >
          <IconPlus className="h-4 w-4" />
          Nouveau locataire
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

      {isLoading ? (
        <div className="rounded-xl p-6 text-sm" style={{ ...panelCard, color: PC.muted }}>
          Chargement des locataires...
        </div>
      ) : (
        <div className="space-y-8">
          {groupedLocataires.length === 0 ? (
            <div className="rounded-xl p-6 text-sm" style={{ ...panelCard, color: PC.muted }}>
              Aucun locataire enregistré.
            </div>
          ) : (
            groupedLocataires.map((group) => (
              <section key={group.key} className="space-y-4">
                <header className="pb-3" style={{ borderBottom: `1px solid ${PC.border}` }}>
                  <div className="flex items-center gap-2">
                    <IconHome className="h-4 w-4" style={{ color: PC.secondary }} />
                    <h2 className="text-lg font-semibold">{group.title}</h2>
                    <span className="text-sm" style={{ color: PC.muted }}>
                      ({group.rows.length} locataire{group.rows.length > 1 ? "s" : ""})
                    </span>
                  </div>
                  <p className="mt-1 text-xs" style={{ color: PC.muted }}>
                    {group.subtitle}
                  </p>
                </header>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {group.rows.map((row) => {
                    const isLocked = Boolean(row.verrouille);
                    const initiales = `${row.prenom?.[0] ?? ""}${row.nom?.[0] ?? ""}`.toUpperCase();
                    const log = row.logement_id ? logementsById.get(row.logement_id) : null;
                    return (
                      <article key={row.id} className="rounded-xl" style={{ ...CARD_STYLE, opacity: isLocked ? 0.75 : 1 }}>
                        <div className="flex items-center gap-3">
                          <span
                            className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold"
                            style={{ backgroundColor: PC.primaryBg25, color: PC.secondary }}
                          >
                            {initiales || "?"}
                          </span>
                          <div>
                            <h3 className="font-semibold tracking-tight" style={GROUP_TITLE_STYLE}>
                              {row.prenom} {row.nom}
                            </h3>
                            <span
                              className="mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                              style={{ backgroundColor: PC.successBg20, color: PC.success }}
                            >
                              Actif
                            </span>
                            {isLocked ? (
                              <span
                                className="ml-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                                style={{ backgroundColor: PC.dangerBg15, color: PC.danger }}
                              >
                                🔒 Verrouillé - Plan insuffisant
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <p className="mt-3 text-sm" style={{ color: PC.muted, lineHeight: 1.35 }}>
                          @ {row.email || "—"}
                        </p>
                        <p className="mt-1 text-sm" style={{ color: PC.muted, lineHeight: 1.35 }}>
                          ☎ {row.telephone || "—"}
                        </p>
                        {log ? (
                          <span
                            className="mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
                            style={{ backgroundColor: PC.primaryBg25, color: PC.secondary }}
                          >
                            {log.nom || log.adresse || "Logement"}
                            {log.est_colocation && row.colocation_chambre_index
                              ? ` · Chambre ${row.colocation_chambre_index}`
                              : ""}
                          </span>
                        ) : null}
                        <div className="mt-4 flex gap-2">
                          {isLocked ? (
                            <p className="text-xs" style={{ color: PC.warning }}>
                              Passez à un plan supérieur pour accéder à ce locataire
                            </p>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="rounded-md px-3 py-1.5 text-xs pc-outline-muted"
                                onClick={() => openEditModal(row)}
                              >
                                Modifier
                              </button>
                              <button
                                type="button"
                                className="rounded-md px-3 py-1.5 text-xs pc-outline-danger"
                                disabled={isDeleting}
                                onClick={() => setDeleteTarget(row)}
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
              </section>
            ))
          )}
        </div>
      )}

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4">
          <div className="mx-auto max-w-lg rounded-xl" style={LOCA_MODAL_CARD}>
            <div className="mb-4 flex items-start justify-between">
              <h3 className="text-lg font-semibold">{isEditing ? "Modifier le locataire" : "Créer un locataire"}</h3>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-sm pc-outline-muted"
                onClick={closeModal}
              >
                Fermer
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                <span className="font-medium">Nom</span>
                <input
                  required
                  className="w-full rounded-lg px-3 py-2 outline-none pc-field-focus"
                  style={fieldInputLg}
                  value={values.nom}
                  onChange={(e) => onFieldChange("nom", e.target.value)}
                  placeholder="Dupont"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                <span className="font-medium">Prénom</span>
                <input
                  required
                  className="w-full rounded-lg px-3 py-2 outline-none pc-field-focus"
                  style={fieldInputLg}
                  value={values.prenom}
                  onChange={(e) => onFieldChange("prenom", e.target.value)}
                  placeholder="Claire"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                <span className="font-medium">Email</span>
                <input
                  required
                  type="email"
                  className="w-full rounded-lg px-3 py-2 outline-none pc-field-focus"
                  style={fieldInputLg}
                  value={values.email}
                  onChange={(e) => onFieldChange("email", e.target.value)}
                  placeholder="claire@email.com"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                <span className="font-medium">Téléphone</span>
                <input
                  type="tel"
                  className="w-full rounded-lg px-3 py-2 outline-none pc-field-focus"
                  style={fieldInputLg}
                  value={values.telephone}
                  onChange={(e) => onFieldChange("telephone", e.target.value)}
                  placeholder="06 12 34 56 78"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                <span className="font-medium">Logement lié</span>
                <select
                  required
                  className="w-full rounded-lg px-3 py-2 outline-none pc-field-focus"
                  style={fieldSelectLg}
                  value={values.logement_id}
                  onChange={(e) => onFieldChange("logement_id", e.target.value)}
                >
                  <option value="">Choisir un logement</option>
                  {logements.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nom || l.adresse || l.id}
                      {l.est_colocation ? " (colocation)" : ""}
                    </option>
                  ))}
                </select>
                {error === "Veuillez sélectionner un logement" ? (
                  <p className="text-xs" style={{ color: PC.danger }}>
                    Veuillez sélectionner un logement
                  </p>
                ) : null}
              </label>

              {isColocLogement ? (
                <>
                  <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                    <span className="font-medium">Chambre assignée</span>
                    <select
                      required
                      className="w-full rounded-lg px-3 py-2 outline-none pc-field-focus"
                      style={fieldSelectLg}
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
                    <div
                      className="rounded-lg p-3 text-sm"
                      style={{ border: `1px solid ${PC.border}`, backgroundColor: PC.card, color: PC.muted }}
                    >
                      <p className="font-medium" style={{ color: PC.text }}>
                        Loyer de cette chambre
                      </p>
                      <p className="mt-1">
                        Loyer : <strong>{Number(chambreDetail.loyer).toFixed(2)} €</strong> — Charges :{" "}
                        <strong>{Number(chambreDetail.charges).toFixed(2)} €</strong>
                      </p>
                    </div>
                  ) : values.colocation_chambre_index ? (
                    <p className="text-xs" style={{ color: PC.warning }}>
                      Détail de chambre introuvable. Vérifiez le logement.
                    </p>
                  ) : null}
                </>
              ) : null}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="rounded-lg px-4 py-2 text-sm pc-outline-muted" onClick={closeModal}>
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg px-4 py-2 text-sm font-medium pc-solid-primary disabled:opacity-60"
                >
                  {isSubmitting ? "Enregistrement..." : isEditing ? "Mettre à jour" : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4">
          <div className="mx-auto mt-20 max-w-lg rounded-xl p-6" style={LOCA_MODAL_CARD}>
            <h3 className="text-lg font-semibold">Confirmer la suppression</h3>
            <p className="mt-3 whitespace-pre-line text-sm" style={{ color: PC.muted }}>
              {"Êtes-vous sûr de vouloir supprimer ce locataire ?\nCette action supprimera également tous les documents liés : quittances, baux et états des lieux associés.\nCette action est irréversible."}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg px-4 py-2 text-sm pc-outline-muted"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
              >
                Annuler
              </button>
              <button
                type="button"
                className="rounded-lg px-4 py-2 text-sm font-medium pc-outline-danger"
                disabled={isDeleting}
                onClick={() => void onDelete(deleteTarget.id)}
              >
                {isDeleting ? "Suppression..." : "Supprimer définitivement"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
