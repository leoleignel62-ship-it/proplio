"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { compressImageForEdl } from "@/lib/etat-des-lieux/compress-image";
import {
  createDefaultSaisonnierPayload,
  parseSaisonnierPayload,
  SAISONNIER_ROOM_META,
  type InventaireStatut,
  type SaisonnierEdlPayload,
  type SaisonnierRoomId,
} from "@/lib/etat-des-lieux/saisonnier-edl-data";
import { getEdlTypeEtatFromRow, normalizeEdlTypeEtatInput } from "@/lib/etat-des-lieux/edl-type-etat";
import { getCurrentProprietaireId } from "@/lib/proprietaire-profile";
import {
  canCreateEtatDesLieux,
  getMonthlyCreatedCount,
  getOwnerPlan,
  PLAN_LIMIT_ERROR_MESSAGE,
} from "@/lib/plan-limits";
import { formatSubmitError } from "@/lib/supabase-submit-error";
import { supabase } from "@/lib/supabase";
import { PC } from "@/lib/proplio-colors";
import { fieldInputStyle, fieldSelectStyle, panelCard } from "@/lib/proplio-field-styles";

export type SaisonnierReservationOption = {
  id: string;
  logement_id: string | null;
  voyageur_id: string | null;
  voyageurLabel: string;
  logementLabel: string;
  date_arrivee: string;
  date_depart: string;
};

type EntreeOpt = { id: string; label: string };

const STEP_LABELS = ["Informations", "Pièces", "Inventaire", "Signatures"];

export function SaisonnierEdlWizard({
  reservations,
  initialEdlId,
  onClose,
  onSaved,
  showLockedBanner = false,
}: {
  reservations: SaisonnierReservationOption[];
  initialEdlId: string | null;
  onClose: () => void;
  onSaved: () => void;
  /** Bandeau « finalisé » rendu sur la page détail — décale le contenu sous le bandeau fixe */
  showLockedBanner?: boolean;
}) {
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [edlId, setEdlId] = useState<string | null>(initialEdlId);
  const [statut, setStatut] = useState<string>("en_cours");
  const [payload, setPayload] = useState<SaisonnierEdlPayload>(() => createDefaultSaisonnierPayload());

  const [reservationId, setReservationId] = useState("");
  const [typeEtat, setTypeEtat] = useState<"entree" | "sortie">("entree");
  const [entreeId, setEntreeId] = useState("");
  const [entreesOptions, setEntreesOptions] = useState<EntreeOpt[]>([]);
  const [dateEtat, setDateEtat] = useState(() => new Date().toISOString().slice(0, 10));

  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [ownerSigUrl, setOwnerSigUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [sendBusy, setSendBusy] = useState(false);
  const [sendToast, setSendToast] = useState("");

  const payloadRef = useRef(payload);
  payloadRef.current = payload;

  const refreshPhotoUrls = useCallback(async (paths: string[]) => {
    if (paths.length === 0) return;
    const settled = await Promise.allSettled(
      paths.map(async (storagePath) => {
        const { data, error: e } = await supabase.storage
          .from("etats-des-lieux")
          .createSignedUrl(storagePath, 3600);
        if (e || !data?.signedUrl) return null;
        return [storagePath, data.signedUrl] as const;
      }),
    );
    const next: Record<string, string> = {};
    for (const s of settled) {
      if (s.status === "fulfilled" && s.value) next[s.value[0]] = s.value[1];
    }
    if (Object.keys(next).length) setPhotoUrls((prev) => ({ ...prev, ...next }));
  }, []);

  const persistPayload = useCallback(
    async (
      id: string,
      p: SaisonnierEdlPayload,
      meta: { dateEtat: string; typeEtat: "entree" | "sortie"; entreeId: string | null },
      extra?: { statut?: string },
    ) => {
      const { proprietaireId, error: pe } = await getCurrentProprietaireId();
      if (pe || !proprietaireId) return;
      const cles = p.general.nb_cles;
      const typeNorm = normalizeEdlTypeEtatInput(meta.typeEtat);
      await supabase
        .from("etats_des_lieux")
        .update({
          pieces: p,
          cles_remises: cles,
          observations: "",
          date_etat: meta.dateEtat,
          type: typeNorm,
          type_etat: typeNorm,
          etat_entree_id: typeNorm === "sortie" && meta.entreeId ? meta.entreeId : null,
          updated_at: new Date().toISOString(),
          ...(extra?.statut ? { statut: extra.statut } : {}),
        })
        .eq("id", id)
        .eq("proprietaire_id", proprietaireId);
    },
    [],
  );

  const loadExisting = useCallback(
    async (id: string) => {
      setError("");
      const { proprietaireId, error: pe } = await getCurrentProprietaireId();
      if (pe || !proprietaireId) {
        setError(pe ? formatSubmitError(pe) : "Session invalide.");
        return;
      }
      const { data: row, error: re } = await supabase
        .from("etats_des_lieux")
        .select(
          "id, statut, reservation_id, pieces, date_etat, type, type_etat, etat_entree_id",
        )
        .eq("id", id)
        .eq("proprietaire_id", proprietaireId)
        .maybeSingle();
      if (re || !row) {
        setError(re ? formatSubmitError(re) : "Introuvable.");
        return;
      }
      setEdlId(String(row.id));
      setStatut(String(row.statut ?? "en_cours"));
      setReservationId(String(row.reservation_id ?? ""));
      const te = getEdlTypeEtatFromRow(row as Record<string, unknown>);
      setTypeEtat(te === "sortie" ? "sortie" : "entree");
      setDateEtat(row.date_etat ? String(row.date_etat).slice(0, 10) : new Date().toISOString().slice(0, 10));
      setEntreeId(row.etat_entree_id ? String(row.etat_entree_id) : "");
      const parsed = parseSaisonnierPayload(row.pieces);
      setPayload(parsed);
      const paths: string[] = [];
      for (const meta of SAISONNIER_ROOM_META) {
        for (const ph of parsed.rooms[meta.id].photoPaths) paths.push(ph);
      }
      await refreshPhotoUrls(paths);

    },
    [refreshPhotoUrls],
  );

  useEffect(() => {
    if (initialEdlId) void loadExisting(initialEdlId);
  }, [initialEdlId, loadExisting]);

  useEffect(() => {
    void (async () => {
      const { proprietaireId, error: pe } = await getCurrentProprietaireId();
      if (pe || !proprietaireId) return;
      const { data: prop } = await supabase
        .from("proprietaires")
        .select("signature_path")
        .eq("id", proprietaireId)
        .maybeSingle();
      const sp = (prop as { signature_path?: string | null } | null)?.signature_path;
      if (sp) {
        const { data: su } = await supabase.storage.from("signatures").createSignedUrl(sp, 3600);
        if (su?.signedUrl) setOwnerSigUrl(su.signedUrl);
      }
    })();
  }, []);

  useEffect(() => {
    if (!reservationId || typeEtat !== "sortie") {
      setEntreesOptions([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { proprietaireId, error: pe } = await getCurrentProprietaireId();
      if (pe || !proprietaireId || cancelled) return;
      const { data } = await supabase
        .from("etats_des_lieux")
        .select("id, date_etat")
        .eq("proprietaire_id", proprietaireId)
        .eq("reservation_id", reservationId)
        .or("type.eq.entree,type_etat.eq.entree")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      const list = (data ?? []).filter((r) => !edlId || String(r.id) !== edlId);
      setEntreesOptions(
        list.map((r) => ({
          id: String(r.id),
          label: `Entrée du ${r.date_etat ? new Date(String(r.date_etat)).toLocaleDateString("fr-FR") : "—"}`,
        })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [reservationId, typeEtat, edlId]);

  const selectedResa = useMemo(
    () => reservations.find((r) => r.id === reservationId) ?? null,
    [reservations, reservationId],
  );

  const isReadOnly = statut === "termine";

  async function onSendPdfEmail() {
    if (!edlId || !isReadOnly) return;
    setSendBusy(true);
    setError("");
    setSendToast("");
    try {
      const res = await fetch(`/api/etats-des-lieux/${edlId}/send`, { method: "POST" });
      const j = (await res.json()) as { error?: string; to?: string[] };
      if (!res.ok) setError(j.error ?? "Envoi impossible.");
      else {
        setSendToast(`Email envoyé à ${(j.to ?? []).join(", ") || "destinataire"}`);
        window.setTimeout(() => setSendToast(""), 4000);
      }
    } catch (e) {
      setError(formatSubmitError(e));
    } finally {
      setSendBusy(false);
    }
  }

  async function ensureCreatedFromStep1(): Promise<string | null> {
    if (edlId) return edlId;
    setSaving(true);
    setError("");
    const { proprietaireId, error: pe } = await getCurrentProprietaireId();
    if (pe || !proprietaireId) {
      setError(pe ? formatSubmitError(pe) : "Session invalide.");
      setSaving(false);
      return null;
    }
    const sel = selectedResa;
    if (!sel?.logement_id) {
      setError("Sélectionnez une réservation valide.");
      setSaving(false);
      return null;
    }
    if (typeEtat === "sortie" && !entreeId) {
      setError("Choisissez l'état des lieux d'entrée à comparer (une entrée doit exister pour cette réservation).");
      setSaving(false);
      return null;
    }
    const plan = await getOwnerPlan(proprietaireId);
    const monthlyCount = await getMonthlyCreatedCount("etats_des_lieux", proprietaireId);
    if (!canCreateEtatDesLieux(plan, monthlyCount)) {
      setError(PLAN_LIMIT_ERROR_MESSAGE);
      setSaving(false);
      return null;
    }
    const typeNorm = normalizeEdlTypeEtatInput(typeEtat);
    const p = createDefaultSaisonnierPayload();
    p.general.nb_cles = payloadRef.current.general.nb_cles;
    p.general.compteur_eau = payloadRef.current.general.compteur_eau;
    p.general.compteur_elec = payloadRef.current.general.compteur_elec;

    const { data: ins, error: insErr } = await supabase
      .from("etats_des_lieux")
      .insert({
        proprietaire_id: proprietaireId,
        reservation_id: sel.id,
        bail_id: null,
        logement_id: sel.logement_id,
        locataire_id: null,
        type: typeNorm,
        type_etat: typeNorm,
        date_etat: dateEtat,
        type_logement: "meuble",
        statut: "en_cours",
        pieces: p,
        compteurs: {},
        observations: "",
        cles_remises: p.general.nb_cles,
        badges_remis: 0,
        etat_entree_id: typeNorm === "sortie" ? entreeId : null,
        email_envoye: false,
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .maybeSingle();
    setSaving(false);
    if (insErr || !ins?.id) {
      setError(insErr ? formatSubmitError(insErr) : "Création impossible.");
      return null;
    }
    const newId = String(ins.id);
    setEdlId(newId);
    setPayload(p);
    onSaved();
    return newId;
  }

  async function onNext() {
    if (isReadOnly) {
      setStep((s) => Math.min(3, s + 1));
      return;
    }
    if (step === 0) {
      const p = payloadRef.current;
      p.general.nb_cles = Math.max(0, Math.floor(Number(p.general.nb_cles) || 0));
      setPayload({ ...p });
      const id = await ensureCreatedFromStep1();
      if (!id) return;
      await persistPayload(id, payloadRef.current, {
        dateEtat,
        typeEtat,
        entreeId: typeEtat === "sortie" ? entreeId : null,
      });
      setStep(1);
      return;
    }
    if (edlId) {
      await persistPayload(edlId, payloadRef.current, {
        dateEtat,
        typeEtat,
        entreeId: typeEtat === "sortie" ? entreeId : null,
      });
    }
    setStep((s) => Math.min(3, s + 1));
  }

  function onPrev() {
    setStep((s) => Math.max(0, s - 1));
  }

  const onUploadRoomPhoto = async (roomId: SaisonnierRoomId, file: File) => {
    if (!edlId || isReadOnly) return;
    const { proprietaireId, error: pe } = await getCurrentProprietaireId();
    if (pe || !proprietaireId) return;
    const key = `${roomId}_up`;
    setUploading((u) => ({ ...u, [key]: true }));
    setError("");
    try {
      const blob = await compressImageForEdl(file);
      const elementKey = `img_${crypto.randomUUID()}`;
      const path = `${proprietaireId}/${edlId}/${roomId}/${elementKey}.jpg`;
      const { error: upErr } = await supabase.storage.from("etats-des-lieux").upload(path, blob, {
        contentType: "image/jpeg",
        upsert: false,
      });
      if (upErr) throw upErr;
      await supabase.from("photos_etat_des_lieux").insert({
        proprietaire_id: proprietaireId,
        etat_des_lieux_id: edlId,
        storage_path: path,
        piece: roomId,
        element_key: elementKey,
        ordre: 0,
      });
      const prev = payloadRef.current;
      const room = prev.rooms[roomId];
      const next: SaisonnierEdlPayload = {
        ...prev,
        rooms: {
          ...prev.rooms,
          [roomId]: { ...room, photoPaths: [...room.photoPaths, path] },
        },
      };
      payloadRef.current = next;
      setPayload(next);
      await refreshPhotoUrls([path]);
      await persistPayload(edlId, next, {
        dateEtat,
        typeEtat,
        entreeId: typeEtat === "sortie" ? entreeId : null,
      });
    } catch (e) {
      setError(formatSubmitError(e));
    } finally {
      setUploading((u) => ({ ...u, [key]: false }));
    }
  };

  const onRemoveRoomPhoto = async (roomId: SaisonnierRoomId, path: string) => {
    if (!edlId || isReadOnly) return;
    await supabase.storage.from("etats-des-lieux").remove([path]);
    await supabase.from("photos_etat_des_lieux").delete().eq("storage_path", path);
    setPhotoUrls((prev) => {
      const n = { ...prev };
      delete n[path];
      return n;
    });
    let nextPayload: SaisonnierEdlPayload | null = null;
    setPayload((prev) => {
      const room = prev.rooms[roomId];
      nextPayload = {
        ...prev,
        rooms: {
          ...prev.rooms,
          [roomId]: { ...room, photoPaths: room.photoPaths.filter((p) => p !== path) },
        },
      };
      payloadRef.current = nextPayload;
      return nextPayload;
    });
    if (nextPayload) {
      await persistPayload(edlId, nextPayload, {
        dateEtat,
        typeEtat,
        entreeId: typeEtat === "sortie" ? entreeId : null,
      });
    }
  };

  async function onFinalize() {
    if (!edlId || isReadOnly) return;
    const p = payloadRef.current;
    if (!p.voyageur_lu_et_approuve) {
      setError("Cochez « Lu et approuvé » pour le voyageur avant de finaliser.");
      return;
    }
    setFinalizing(true);
    setError("");
    await persistPayload(
      edlId,
      p,
      { dateEtat, typeEtat, entreeId: typeEtat === "sortie" ? entreeId : null },
      { statut: "termine" },
    );
    setStatut("termine");
    setFinalizing(false);
    onSaved();
  }

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto p-4"
      style={{
        backgroundColor: PC.overlay,
        paddingTop: showLockedBanner ? "5.5rem" : undefined,
      }}
    >
      <div
        className="my-8 w-full max-w-3xl rounded-2xl p-6 shadow-2xl"
        style={{ ...panelCard, maxHeight: "calc(100vh - 4rem)" }}
      >
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: PC.text }}>
              État des lieux saisonnier
            </h2>
            <p className="text-xs" style={{ color: PC.muted }}>
              Étape {step + 1}/4 — {STEP_LABELS[step]}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isReadOnly && edlId ? (
              <>
                <a
                  href={`/api/etats-des-lieux/${edlId}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg px-3 py-1.5 text-sm pc-outline-primary"
                >
                  PDF
                </a>
                <button
                  type="button"
                  className="rounded-lg px-3 py-1.5 text-sm pc-outline-success"
                  disabled={sendBusy}
                  onClick={() => void onSendPdfEmail()}
                >
                  {sendBusy ? "…" : "Envoyer"}
                </button>
              </>
            ) : null}
            <button
              type="button"
              className="text-sm pc-outline-muted rounded-lg px-3 py-1.5"
              onClick={onClose}
            >
              Fermer
            </button>
          </div>
        </div>

        <div className="mb-6 flex gap-1">
          {STEP_LABELS.map((label, i) => (
            <div
              key={label}
              className="flex-1 rounded-lg px-2 py-2 text-center text-[10px] font-medium sm:text-xs"
              style={{
                backgroundColor: i === step ? PC.primaryBg15 : PC.card,
                color: i === step ? PC.primary : PC.muted,
                border: `1px solid ${PC.border}`,
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {error ? (
          <p className="mb-4 rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: PC.dangerBg10, color: PC.danger }}>
            {error}
          </p>
        ) : null}
        {sendToast ? (
          <p
            className="mb-4 rounded-lg px-3 py-2 text-sm"
            style={{ border: `1px solid rgba(16, 185, 129, 0.3)`, backgroundColor: PC.successBg10, color: PC.success }}
          >
            {sendToast}
          </p>
        ) : null}

        {step === 0 ? (
          <div className="space-y-4">
            <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
              <span>Réservation</span>
              <select
                style={fieldSelectStyle}
                disabled={isReadOnly || Boolean(initialEdlId)}
                value={reservationId}
                onChange={(e) => setReservationId(e.target.value)}
              >
                <option value="">Sélectionner…</option>
                {reservations.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.voyageurLabel} — {r.logementLabel} ({r.date_arrivee} → {r.date_depart})
                  </option>
                ))}
              </select>
            </label>
            <fieldset className="space-y-2">
              <legend className="text-sm" style={{ color: PC.muted }}>Type</legend>
              <label className="flex items-center gap-2 text-sm" style={{ color: PC.text }}>
                <input
                  type="radio"
                  disabled={isReadOnly || Boolean(initialEdlId)}
                  checked={typeEtat === "entree"}
                  onChange={() => setTypeEtat("entree")}
                />
                Entrée
              </label>
              <label className="flex items-center gap-2 text-sm" style={{ color: PC.text }}>
                <input
                  type="radio"
                  disabled={isReadOnly || Boolean(initialEdlId)}
                  checked={typeEtat === "sortie"}
                  onChange={() => setTypeEtat("sortie")}
                />
                Sortie
              </label>
            </fieldset>
            {typeEtat === "sortie" ? (
              <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                <span>État d&apos;entrée à comparer</span>
                <select
                  style={fieldSelectStyle}
                  disabled={isReadOnly}
                  value={entreeId}
                  onChange={(e) => setEntreeId(e.target.value)}
                >
                  <option value="">Sélectionner…</option>
                  {entreesOptions.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
                {entreesOptions.length === 0 ? (
                  <span className="text-xs text-amber-600">
                    Aucune entrée enregistrée pour cette réservation. Créez d&apos;abord un EDL d&apos;entrée.
                  </span>
                ) : null}
              </label>
            ) : null}
            <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
              <span>Date de l&apos;état des lieux</span>
              <input
                type="date"
                style={fieldInputStyle}
                disabled={isReadOnly}
                value={dateEtat}
                onChange={(e) => setDateEtat(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
              <span>Nombre de clés remises</span>
              <input
                type="number"
                min={0}
                style={fieldInputStyle}
                disabled={isReadOnly}
                value={payload.general.nb_cles}
                onChange={(e) =>
                  setPayload((prev) => ({
                    ...prev,
                    general: { ...prev.general, nb_cles: Math.max(0, Number(e.target.value) || 0) },
                  }))
                }
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
              <span>Relevé compteur eau (optionnel)</span>
              <input
                type="text"
                inputMode="decimal"
                style={fieldInputStyle}
                disabled={isReadOnly}
                value={payload.general.compteur_eau}
                onChange={(e) =>
                  setPayload((prev) => ({
                    ...prev,
                    general: { ...prev.general, compteur_eau: e.target.value },
                  }))
                }
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
              <span>Relevé compteur électricité (optionnel)</span>
              <input
                type="text"
                inputMode="decimal"
                style={fieldInputStyle}
                disabled={isReadOnly}
                value={payload.general.compteur_elec}
                onChange={(e) =>
                  setPayload((prev) => ({
                    ...prev,
                    general: { ...prev.general, compteur_elec: e.target.value },
                  }))
                }
              />
            </label>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="max-h-[min(60vh,520px)] space-y-6 overflow-y-auto pr-1">
            {SAISONNIER_ROOM_META.map((meta) => {
              const st = payload.rooms[meta.id];
              const inactiveOptional = meta.optional && !st.enabled;
              return (
                <div
                  key={meta.id}
                  className="rounded-xl p-4"
                  style={{ border: `1px solid ${PC.border}` }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold" style={{ color: PC.text }}>{meta.label}</h3>
                    {meta.optional ? (
                      <label className="flex items-center gap-2 text-sm" style={{ color: PC.muted }}>
                        <input
                          type="checkbox"
                          disabled={isReadOnly}
                          checked={st.enabled}
                          onChange={(e) =>
                            setPayload((prev) => ({
                              ...prev,
                              rooms: {
                                ...prev.rooms,
                                [meta.id]: { ...prev.rooms[meta.id], enabled: e.target.checked },
                              },
                            }))
                          }
                        />
                        Inclure cette pièce
                      </label>
                    ) : null}
                  </div>
                  {inactiveOptional ? (
                    <p className="mt-2 text-sm" style={{ color: PC.muted }}>Pièce non incluse.</p>
                  ) : (
                    <>
                      <p className="mb-2 mt-3 text-xs" style={{ color: PC.muted }}>État général</p>
                      <div className="flex flex-wrap gap-2">
                        {(
                          [
                            { v: "bon" as const, icon: "✅", label: "Bon" },
                            { v: "moyen" as const, icon: "⚠️", label: "Moyen" },
                            { v: "mauvais" as const, icon: "❌", label: "Mauvais" },
                          ] as const
                        ).map((opt) => (
                          <button
                            key={opt.v}
                            type="button"
                            disabled={isReadOnly}
                            className="rounded-xl px-4 py-2.5 text-sm font-medium transition"
                            style={{
                              border: `2px solid ${st.etat === opt.v ? PC.primary : PC.border}`,
                              backgroundColor: st.etat === opt.v ? PC.primaryBg15 : PC.card,
                              color: PC.text,
                              opacity: isReadOnly ? 0.65 : 1,
                            }}
                            onClick={() =>
                              setPayload((prev) => ({
                                ...prev,
                                rooms: {
                                  ...prev.rooms,
                                  [meta.id]: { ...prev.rooms[meta.id], etat: opt.v },
                                },
                              }))
                            }
                          >
                            <span className="mr-1.5">{opt.icon}</span>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <label className="mt-4 flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                        <span>Observations</span>
                        <textarea
                          rows={3}
                          style={{ ...fieldInputStyle, maxWidth: "100%", minHeight: "4.5rem" }}
                          disabled={isReadOnly}
                          value={st.observations}
                          onChange={(e) =>
                            setPayload((prev) => ({
                              ...prev,
                              rooms: {
                                ...prev.rooms,
                                [meta.id]: { ...prev.rooms[meta.id], observations: e.target.value },
                              },
                            }))
                          }
                        />
                      </label>
                      <div className="mt-3">
                        <p className="mb-2 text-xs" style={{ color: PC.muted }}>Photos</p>
                        <input
                          ref={(el) => {
                            fileInputRefs.current[meta.id] = el;
                          }}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={isReadOnly || !edlId}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            const f = e.target.files?.[0];
                            if (f) void onUploadRoomPhoto(meta.id, f);
                            e.target.value = "";
                          }}
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={isReadOnly || !edlId || !!uploading[`${meta.id}_up`]}
                            className="rounded-lg px-3 py-2 text-xs pc-outline-muted"
                            onClick={() => fileInputRefs.current[meta.id]?.click()}
                          >
                            {uploading[`${meta.id}_up`] ? "…" : "📷 Ajouter une photo"}
                          </button>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {st.photoPaths.map((path) => (
                            <div key={path} className="relative">
                              {photoUrls[path] ? (
                                <button
                                  type="button"
                                  className="relative h-16 w-16 overflow-hidden rounded-lg"
                                  style={{ border: `1px solid ${PC.border}` }}
                                  onClick={() => {}}
                                >
                                  <Image
                                    src={photoUrls[path]}
                                    alt=""
                                    fill
                                    className="object-cover"
                                    sizes="64px"
                                    unoptimized
                                  />
                                </button>
                              ) : (
                                <div className="h-16 w-16 rounded-lg" style={{ backgroundColor: PC.inputBg }} />
                              )}
                              {!isReadOnly ? (
                                <button
                                  type="button"
                                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px]"
                                  style={{ backgroundColor: PC.danger, color: PC.white }}
                                  onClick={() => void onRemoveRoomPhoto(meta.id, path)}
                                >
                                  ×
                                </button>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="max-h-[min(60vh,480px)] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr style={{ color: PC.muted }}>
                  <th className="py-2 pr-2">Élément</th>
                  <th className="py-2 pr-2">Zone</th>
                  <th className="py-2">Statut</th>
                </tr>
              </thead>
              <tbody>
                {payload.inventory.map((line) => (
                  <tr key={line.id} style={{ borderTop: `1px solid ${PC.border}` }}>
                    <td className="py-2 pr-2" style={{ color: PC.text }}>{line.label}</td>
                    <td className="py-2 pr-2" style={{ color: PC.muted }}>{line.zone}</td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-2">
                        {(
                          [
                            { s: "present" as InventaireStatut, label: "Présent ✓" },
                            { s: "absent" as InventaireStatut, label: "Absent ✗" },
                            { s: "endommage" as InventaireStatut, label: "Endommagé ⚠" },
                          ] as const
                        ).map((opt) => (
                          <button
                            key={opt.s}
                            type="button"
                            disabled={isReadOnly}
                            className="rounded-lg px-2 py-1 text-[11px] font-medium"
                            style={{
                              border: `1px solid ${line.status === opt.s ? PC.primary : PC.border}`,
                              backgroundColor: line.status === opt.s ? PC.primaryBg15 : "transparent",
                              color: PC.text,
                            }}
                            onClick={() =>
                              setPayload((prev) => ({
                                ...prev,
                                inventory: prev.inventory.map((x) =>
                                  x.id === line.id ? { ...x, status: opt.s } : x,
                                ),
                              }))
                            }
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <p className="text-sm" style={{ color: PC.muted }}>
              Signature du bailleur (enregistrée dans Paramètres) et confirmation du voyageur.
            </p>
            <div className="rounded-xl p-4" style={{ border: `1px solid ${PC.border}` }}>
              <p className="text-sm font-medium" style={{ color: PC.text }}>Bailleur</p>
              {ownerSigUrl ? (
                <div className="relative mt-2 h-24 w-48">
                  <Image src={ownerSigUrl} alt="Signature" fill className="object-contain" unoptimized />
                </div>
              ) : (
                <p className="mt-2 text-sm" style={{ color: PC.muted }}>
                  Aucune signature enregistrée. Ajoutez-la dans{" "}
                  <Link href="/parametres" className="underline" style={{ color: PC.primary }}>
                    Paramètres
                  </Link>
                  .
                </p>
              )}
            </div>
            <label className="flex items-start gap-3 text-sm" style={{ color: PC.text }}>
              <input
                type="checkbox"
                className="mt-1"
                disabled={isReadOnly}
                checked={payload.voyageur_lu_et_approuve}
                onChange={(e) =>
                  setPayload((prev) => ({ ...prev, voyageur_lu_et_approuve: e.target.checked }))
                }
              />
              <span>
                <strong>Lu et approuvé</strong> — Le voyageur reconnaît avoir pris connaissance de l&apos;état des lieux.
              </span>
            </label>
            {isReadOnly ? (
              <p className="text-sm" style={{ color: PC.muted }}>
                Utilisez les boutons <strong>PDF</strong> et <strong>Envoyer</strong> ci-dessus pour partager le document.
              </p>
            ) : (
              <button
                type="button"
                disabled={finalizing}
                className="w-full rounded-xl py-3 text-sm font-semibold pc-solid-primary"
                onClick={() => void onFinalize()}
              >
                {finalizing ? "…" : "Finaliser l'état des lieux"}
              </button>
            )}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-between gap-2">
          <button
            type="button"
            className="rounded-lg px-4 py-2 text-sm pc-outline-muted"
            disabled={step === 0 || saving}
            onClick={onPrev}
          >
            Précédent
          </button>
          {step < 3 ? (
            <button
              type="button"
              className="rounded-lg px-4 py-2 text-sm font-medium pc-solid-primary"
              disabled={saving}
              onClick={() => void onNext()}
            >
              {saving ? "…" : "Suivant"}
            </button>
          ) : (
            <span />
          )}
        </div>
      </div>
    </div>
  );
}
