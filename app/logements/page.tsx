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
  verrouille?: boolean | null;
};

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
  const [isDeleteBlockedModalOpen, setIsDeleteBlockedModalOpen] = useState(false);
  const [proprietaireId, setProprietaireId] = useState<string | null>(null);
  const [locatairesByLogement, setLocatairesByLogement] = useState<Record<string, number>>({});

  const isEditing = useMemo(() => editingRow !== null, [editingRow]);
  const isColocation = values.est_colocation === "oui";
  const nCh = Math.max(1, Math.min(10, Number(nombreChambres) || 1));
  const totalChambresLoyers = useMemo(() => totalLoyersChambres(chambres.slice(0, nCh)), [chambres, nCh]);
  const loyerGlobal = Number(values.loyer || 0);
  const ecartLoyer = totalChambresLoyers - loyerGlobal;
  const isPlanLimitReached = Boolean(planLimitMessage);

  const refreshPlanLimit = useCallback(async (ownerId: string) => {
    const plan = await getOwnerPlan(ownerId);
    const totalCree = await getLogementsCumulCount(ownerId);
    if (!canCreateLogement(plan, totalCree)) {
      setPlanLimitMessage("Limite atteinte. Passez au plan supérieur pour créer plus de logements.");
      return;
    }
    setPlanLimitMessage("");
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

  async function openCreateModal() {
    const { proprietaireId: ownerId } = await getCurrentProprietaireId();
    if (ownerId) {
      await refreshPlanLimit(ownerId);
      const plan = await getOwnerPlan(ownerId);
      const totalCree = await getLogementsCumulCount(ownerId);
      if (!canCreateLogement(plan, totalCree)) return;
    }
    setEditingRow(null);
    setValues(baseDefaultValues);
    setNombreChambres("1");
    setChambres([defaultChambre()]);
    setActiveChambreTab(0);
    setIsModalOpen(true);
  }

  function openEditModal(row: Logement) {
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
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingRow(null);
    setValues(baseDefaultValues);
    setNombreChambres("1");
    setChambres([defaultChambre()]);
    setActiveChambreTab(0);
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
      if (!isEditing) {
        const plan = await getOwnerPlan(ownerId);
        const totalCree = await getLogementsCumulCount(ownerId);
        if (!canCreateLogement(plan, totalCree)) {
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

      const payload = {
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

      const query = isEditing
        ? supabase
            .from("logements")
            .update(payload)
            .eq("id", editingRow!.id)
            .eq("proprietaire_id", ownerId)
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

  return (
    <section className="proplio-page-wrap space-y-8" style={{ color: PC.text }}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Logements</h1>
          <p className="mt-2 text-sm" style={{ color: PC.muted }}>
            Liste, création et gestion de vos biens.
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
            return (
              <article
                key={row.id}
                className="relative rounded-xl p-5"
                style={{ ...panelCard, opacity: isLocked ? 0.75 : 1 }}
              >
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
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {isLocked ? (
                    <p className="text-xs" style={{ color: PC.warning }}>
                      Passez à un plan supérieur pour accéder à ce logement
                    </p>
                  ) : (
                    <>
                      <Link href={`/logements/${row.id}`} className="w-full rounded-md px-3 py-1.5 text-xs pc-outline-primary sm:w-auto">
                        Voir détails
                      </Link>
                      <button
                        type="button"
                        className="w-full rounded-md px-3 py-1.5 text-xs pc-outline-muted sm:w-auto"
                        onClick={(event) => {
                          event.preventDefault();
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
                          event.preventDefault();
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
