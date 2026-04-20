"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { EdlElementField } from "@/components/etat-des-lieux/EdlElementField";
import { addChambreToPieces, ELEMENT_LABELS, normalizePiecesData } from "@/lib/etat-des-lieux/defaults";
import { ETAT_LABELS, formatEtatLabel, normalizeEtatNiveau } from "@/lib/etat-des-lieux/types";
import { getEdlTypeEtatFromRow } from "@/lib/etat-des-lieux/edl-type-etat";
import { compareRoomElements } from "@/lib/etat-des-lieux/compare";
import { compressImageForEdl } from "@/lib/etat-des-lieux/compress-image";
import type { PiecesEdlData, ElementEdl } from "@/lib/etat-des-lieux/types";
import { getCurrentProprietaireId } from "@/lib/proprietaire-profile";
import { formatSubmitError } from "@/lib/supabase-submit-error";
import { supabase } from "@/lib/supabase";

type EdlRow = Record<string, unknown>;

const EDL_ROW_SELECT =
  "id, proprietaire_id, type_logement, pieces, compteurs, cles_remises, badges_remis, observations, statut, etat_entree_id, date_etat, type, type_etat";

function pathKey(roomId: string, elementKey: string) {
  return `${roomId}::${elementKey}`;
}

function CompteurPhotoInputs({
  uploading,
  onPickFile,
}: {
  uploading: boolean;
  onPickFile: (file: File) => void;
}) {
  const captureInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onPickFile(f);
    e.target.value = "";
  };
  return (
    <>
      <input
        ref={captureInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onChange}
      />
      <input ref={importInputRef} type="file" accept="image/*" className="hidden" onChange={onChange} />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <button
          type="button"
          onClick={() => captureInputRef.current?.click()}
          disabled={uploading}
          className="text-xs text-proplio-muted hover:text-proplio-secondary disabled:opacity-50"
        >
          {uploading ? "…" : "📷 Prendre une photo"}
        </button>
        <button
          type="button"
          onClick={() => importInputRef.current?.click()}
          disabled={uploading}
          className="text-xs text-proplio-muted hover:text-proplio-secondary disabled:opacity-50"
        >
          {uploading ? "…" : "🖼 Importer une photo"}
        </button>
      </div>
    </>
  );
}

export function EdlEditor({ edlId }: { edlId: string }) {
  const [row, setRow] = useState<EdlRow | null>(null);
  const [pieces, setPieces] = useState<PiecesEdlData | null>(null);
  const [entryPieces, setEntryPieces] = useState<PiecesEdlData | null>(null);
  const [activeTab, setActiveTab] = useState<string>("entree");
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [proprietaireId, setProprietaireId] = useState<string | null>(null);
  const piecesRef = useRef<PiecesEdlData | null>(null);
  piecesRef.current = pieces;
  const statutRef = useRef<string | undefined>(undefined);
  statutRef.current = row?.statut as string | undefined;
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const refreshSignedUrls = useCallback(async (pathsList: string[]) => {
    if (pathsList.length === 0) return;
    const settled = await Promise.allSettled(
      pathsList.map(async (storagePath) => {
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
    if (Object.keys(next).length) {
      setPhotoUrls((prev) => ({ ...prev, ...next }));
    }
  }, []);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setError("");
      const { proprietaireId: pid, error: pe } = await getCurrentProprietaireId();
      if (signal?.aborted) return;
      if (pe || !pid) {
        setError(pe ? formatSubmitError(pe) : "Session invalide.");
        return;
      }
      setProprietaireId(pid);

      const { data: edl, error: ee } = await supabase
        .from("etats_des_lieux")
        .select(EDL_ROW_SELECT)
        .eq("id", edlId)
        .eq("proprietaire_id", pid)
        .maybeSingle();

      if (signal?.aborted) return;
      if (ee || !edl) {
        setError(ee ? formatSubmitError(ee) : "État des lieux introuvable.");
        return;
      }

      const r = edl as EdlRow;
      setRow(r);
      const meuble = r.type_logement === "meuble";
      let p = normalizePiecesData(r.pieces, meuble);
      p = {
        ...p,
        compteurs: { ...p.compteurs, ...(typeof r.compteurs === "object" && r.compteurs ? (r.compteurs as object) : {}) },
        clesRemises: Number(r.cles_remises ?? p.clesRemises) || 0,
        badgesRemis: Number(r.badges_remis ?? p.badgesRemis) || 0,
        observationsGenerales: String(r.observations ?? p.observationsGenerales ?? ""),
      };
      setPieces(p);

      const entryId = r.etat_entree_id as string | undefined;
      if (getEdlTypeEtatFromRow(r) === "sortie" && entryId) {
        const { data: ent } = await supabase
          .from("etats_des_lieux")
          .select("pieces, type_logement")
          .eq("id", entryId)
          .maybeSingle();
        if (signal?.aborted) return;
        if (ent?.pieces) {
          setEntryPieces(normalizePiecesData(ent.pieces, ent.type_logement === "meuble"));
        }
      }

      const paths = new Set<string>();
      for (const room of p.rooms) {
        for (const el of Object.values(room.elements)) {
          if (el.photoPath) paths.add(el.photoPath);
        }
      }
      for (const k of Object.keys(p.compteurs) as (keyof typeof p.compteurs)[]) {
        const ph = p.compteurs[k]?.photoPath;
        if (ph) paths.add(ph);
      }
      if (signal?.aborted) return;
      await refreshSignedUrls(Array.from(paths));
    },
    [edlId, refreshSignedUrls],
  );

  useEffect(() => {
    const ac = new AbortController();
    void load(ac.signal);
    return () => ac.abort();
  }, [load]);

  const persist = useCallback(async () => {
    if (statutRef.current === "termine") return;
    const p = piecesRef.current;
    if (!p || !proprietaireId) return;
    setSaving(true);
    const { error: up } = await supabase
      .from("etats_des_lieux")
      .update({
        pieces: p,
        compteurs: p.compteurs,
        observations: p.observationsGenerales,
        cles_remises: p.clesRemises,
        badges_remis: p.badgesRemis,
        updated_at: new Date().toISOString(),
      })
      .eq("id", edlId)
      .eq("proprietaire_id", proprietaireId);
    setSaving(false);
    if (up) setError(formatSubmitError(up));
    else setLastSaved(Date.now());
  }, [edlId, proprietaireId]);

  useEffect(() => {
    if (row?.statut === "termine") return;
    const t = window.setInterval(() => {
      void persist();
    }, 30000);
    return () => window.clearInterval(t);
  }, [persist, row?.statut]);

  const updateRoomElement = (roomId: string, elementKey: string, next: ElementEdl) => {
    if (statutRef.current === "termine") return;
    setPieces((prev) => {
      if (!prev) return prev;
      const rooms = prev.rooms.map((r) => {
        if (r.id !== roomId) return r;
        return { ...r, elements: { ...r.elements, [elementKey]: next } };
      });
      return { ...prev, rooms };
    });
  };

  const setRoomEnabled = (roomId: string, enabled: boolean) => {
    if (statutRef.current === "termine") return;
    setPieces((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        rooms: prev.rooms.map((r) => (r.id === roomId ? { ...r, enabled } : r)),
      };
    });
  };

  const onUpload = async (roomId: string, elementKey: string, file: File) => {
    if (statutRef.current === "termine" || !proprietaireId || !pieces) return;
    const pk = pathKey(roomId, elementKey);
    setUploading((u) => ({ ...u, [pk]: true }));
    setError("");
    try {
      const blob = await compressImageForEdl(file);
      const path = `${proprietaireId}/${edlId}/${roomId}/${elementKey}_${Date.now()}.jpg`;
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

      if (roomId === "__compteurs__") {
        const ck = elementKey as keyof PiecesEdlData["compteurs"];
        setPieces((prev) => {
          if (!prev) return prev;
          const c = { ...prev.compteurs[ck], photoPath: path };
          return { ...prev, compteurs: { ...prev.compteurs, [ck]: c } };
        });
      } else {
        setPieces((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            rooms: prev.rooms.map((r) =>
              r.id !== roomId
                ? r
                : {
                    ...r,
                    elements: {
                      ...r.elements,
                      [elementKey]: {
                        ...r.elements[elementKey]!,
                        photoPath: path,
                      },
                    },
                  },
            ),
          };
        });
      }
      await refreshSignedUrls([path]);
    } catch (e) {
      setError(formatSubmitError(e));
    } finally {
      setUploading((u) => ({ ...u, [pk]: false }));
    }
  };

  const onRemovePhoto = async (roomId: string, elementKey: string, path: string | null) => {
    if (statutRef.current === "termine" || !path || !proprietaireId) return;
    await supabase.storage.from("etats-des-lieux").remove([path]);
    await supabase.from("photos_etat_des_lieux").delete().eq("storage_path", path);
    setPhotoUrls((prev) => {
      const n = { ...prev };
      delete n[path];
      return n;
    });
    if (roomId === "__compteurs__") {
      const ck = elementKey as keyof PiecesEdlData["compteurs"];
      setPieces((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          compteurs: { ...prev.compteurs, [ck]: { ...prev.compteurs[ck], photoPath: null } },
        };
      });
    } else {
      const room = pieces?.rooms.find((r) => r.id === roomId);
      const el = room?.elements[elementKey];
      if (el) updateRoomElement(roomId, elementKey, { ...el, photoPath: null });
    }
  };

  const tabs = useMemo(() => {
    if (!pieces) return [];
    const t: { id: string; label: string }[] = [];
    for (const r of pieces.rooms) {
      const off = r.enabled === false && ["bureau", "cave", "garage", "balcon"].includes(r.id);
      t.push({ id: r.id, label: off ? `${r.label} (off)` : r.label });
    }
    t.push({ id: "__compteurs__", label: "Compteurs" });
    if (row && getEdlTypeEtatFromRow(row) === "sortie" && entryPieces) {
      t.push({ id: "__compare__", label: "Comparaison entrée" });
    }
    return t;
  }, [pieces, row, entryPieces]);

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setTick((x) => x + 1), 1000);
    return () => window.clearInterval(t);
  }, []);
  const secondsSinceSave =
    lastSaved != null ? Math.max(0, Math.round((Date.now() - lastSaved) / 1000)) : null;
  void tick;

  if (!row || !pieces) {
    return (
      <div className="proplio-card p-8 text-sm text-proplio-muted">
        {error || "Chargement…"}
      </div>
    );
  }

  const activeRoom = pieces.rooms.find((r) => r.id === activeTab);
  const meuble = row.type_logement === "meuble";
  const isFinalise = row.statut === "termine";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/etats-des-lieux" className="text-xs text-proplio-secondary hover:underline">
            ← Retour à la liste
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-proplio-text">État des lieux</h1>
          <p className="mt-1 text-sm text-proplio-muted">
            {getEdlTypeEtatFromRow(row) === "sortie" ? "Sortie" : "Entrée"} ·{" "}
            {row.date_etat ? new Date(String(row.date_etat)).toLocaleDateString("fr-FR") : "—"} ·{" "}
            {meuble ? "Meublé" : "Vide"} · Statut :{" "}
            <span
              className={
                isFinalise ? "font-medium text-red-600" : "text-proplio-warning"
              }
            >
              {isFinalise ? "Finalisé" : "En cours"}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isFinalise && secondsSinceSave != null ? (
            <span className="text-xs text-proplio-muted">
              Sauvegardé il y a {secondsSinceSave}s
              {saving ? " · …" : ""}
            </span>
          ) : null}
          {!isFinalise ? (
            <button type="button" className="proplio-btn-secondary text-sm" onClick={() => void persist()}>
              Sauvegarder
            </button>
          ) : null}
          {!isFinalise ? (
            <button
              type="button"
              className="proplio-btn-primary text-sm"
              onClick={() => setFinalizeOpen(true)}
            >
              Finaliser l&apos;état des lieux
            </button>
          ) : null}
          {isFinalise ? (
            <a
              href={`/api/etats-des-lieux/${edlId}/pdf`}
              target="_blank"
              rel="noreferrer"
              className="proplio-btn-secondary inline-flex items-center text-sm"
            >
              Générer le PDF
            </a>
          ) : (
            <span
              className="inline-flex cursor-not-allowed items-center rounded-lg border border-proplio-border px-3 py-2 text-sm text-proplio-muted opacity-60"
              title="Finalisez l'état des lieux pour générer le PDF."
            >
              Générer le PDF
            </span>
          )}
          {isFinalise ? (
            <button
              type="button"
              className="proplio-btn-primary text-sm"
              onClick={async () => {
                const res = await fetch(`/api/etats-des-lieux/${edlId}/send`, { method: "POST" });
                const j = (await res.json()) as { error?: string };
                if (!res.ok) setError(j.error ?? "Envoi impossible");
                else setError("");
              }}
            >
              Envoyer par e-mail
            </button>
          ) : (
            <span
              className="inline-flex cursor-not-allowed items-center rounded-lg bg-proplio-primary/40 px-3 py-2 text-sm text-white opacity-70"
              title="Finalisez l'état des lieux pour envoyer par e-mail."
            >
              Envoyer par e-mail
            </span>
          )}
        </div>
      </div>

      {error ? <p className="proplio-alert-error">{error}</p> : null}

      {isFinalise ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          Document finalisé — lecture seule. Vous pouvez générer le PDF ou l&apos;envoyer par e-mail.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2 border-b border-proplio-border pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={
              activeTab === t.id
                ? "rounded-lg bg-proplio-primary px-3 py-2 text-sm font-medium text-white"
                : "rounded-lg px-3 py-2 text-sm text-proplio-muted hover:bg-proplio-card"
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "__compare__" && entryPieces ? (
        <div className="proplio-card space-y-6 p-4">
          <p className="text-sm text-proplio-muted">
            Éléments dont l&apos;état à la sortie est moins bon qu&apos;à l&apos;entrée.
          </p>
          {pieces.rooms.map((room) => {
            if (room.enabled === false) return null;
            const rows = compareRoomElements(entryPieces, pieces, room.id).filter((x) => x.worse);
            if (rows.length === 0) return null;
            return (
              <div key={room.id}>
                <h3 className="mb-2 font-semibold text-proplio-text">{room.label}</h3>
                <ul className="space-y-1 text-sm">
                  {rows.map((x) => (
                    <li key={x.key} className="flex flex-wrap items-baseline gap-x-1 gap-y-0.5 text-sm">
                      <span className="font-medium text-proplio-text">
                        {ELEMENT_LABELS[x.key] ?? x.key}
                      </span>
                      <span className="text-proplio-muted">:</span>
                      <span style={{ color: ETAT_LABELS[normalizeEtatNiveau(x.entree.state)].color }}>
                        {formatEtatLabel(x.entree.state)}
                      </span>
                      <span className="text-proplio-muted">→</span>
                      <span
                        className="font-medium"
                        style={{ color: ETAT_LABELS[normalizeEtatNiveau(x.sortie.state)].color }}
                      >
                        {formatEtatLabel(x.sortie.state)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      ) : null}

      {activeTab === "__compteurs__" ? (
        <div className="proplio-card space-y-4 p-4">
          {(["electricite", "eauFroide", "eauChaude", "gaz"] as const).map((k) => {
            const label =
              k === "electricite"
                ? "Compteur électrique"
                : k === "eauFroide"
                  ? "Eau froide"
                  : k === "eauChaude"
                    ? "Eau chaude"
                    : "Gaz";
            const c = pieces.compteurs[k];
            const path = c.photoPath;
            const pk = pathKey("__compteurs__", k);
            return (
              <div key={k} className="rounded-xl border border-proplio-border p-4">
                <p className="mb-2 text-sm font-medium text-proplio-text">{label}</p>
                <input
                  className="proplio-input max-w-xs"
                  placeholder="Index relevé"
                  readOnly={isFinalise}
                  disabled={isFinalise}
                  value={c.index}
                  onChange={(e) =>
                    setPieces((prev) =>
                      prev
                        ? {
                            ...prev,
                            compteurs: {
                              ...prev.compteurs,
                              [k]: { ...prev.compteurs[k], index: e.target.value },
                            },
                          }
                        : prev,
                    )
                  }
                />
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  {!isFinalise ? (
                    <CompteurPhotoInputs
                      uploading={!!uploading[pk]}
                      onPickFile={(f) => void onUpload("__compteurs__", k, f)}
                    />
                  ) : null}
                  {path && photoUrls[path] ? (
                    <div className="relative inline-block">
                      <button
                        type="button"
                        onClick={() => setPreview(photoUrls[path])}
                        className="relative h-[60px] w-[60px] overflow-hidden rounded-lg border border-proplio-border"
                      >
                        <Image
                          src={photoUrls[path]}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="60px"
                          unoptimized
                        />
                      </button>
                      {!isFinalise ? (
                        <button
                          type="button"
                          onClick={() => void onRemovePhoto("__compteurs__", k, path)}
                          className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-proplio-danger text-[10px] text-white"
                        >
                          ×
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
          <label className="proplio-label">
            <span>Nombre de clés remises</span>
            <input
              type="number"
              min={0}
              className="proplio-input max-w-xs"
              readOnly={isFinalise}
              disabled={isFinalise}
              value={pieces.clesRemises}
              onChange={(e) =>
                setPieces((prev) =>
                  prev ? { ...prev, clesRemises: Number(e.target.value) || 0 } : prev,
                )
              }
            />
          </label>
          <label className="proplio-label">
            <span>Badges / télécommandes</span>
            <input
              type="number"
              min={0}
              className="proplio-input max-w-xs"
              readOnly={isFinalise}
              disabled={isFinalise}
              value={pieces.badgesRemis}
              onChange={(e) =>
                setPieces((prev) =>
                  prev ? { ...prev, badgesRemis: Number(e.target.value) || 0 } : prev,
                )
              }
            />
          </label>
          <label className="proplio-label">
            <span>Observations générales</span>
            <textarea
              className="proplio-input min-h-[120px]"
              readOnly={isFinalise}
              disabled={isFinalise}
              value={pieces.observationsGenerales}
              onChange={(e) =>
                setPieces((prev) =>
                  prev ? { ...prev, observationsGenerales: e.target.value } : prev,
                )
              }
            />
          </label>
        </div>
      ) : null}

      {activeRoom && activeTab !== "__compteurs__" && activeTab !== "__compare__" ? (
        <div className="space-y-4">
          {["bureau", "cave", "garage", "balcon"].includes(activeRoom.id) && activeRoom.enabled === false ? (
            <div className="proplio-card p-6 text-center">
              <p className="text-sm text-proplio-muted">Cette pièce n&apos;est pas incluse.</p>
              {!isFinalise ? (
                <button
                  type="button"
                  className="proplio-btn-primary mt-3"
                  onClick={() => setRoomEnabled(activeRoom.id, true)}
                >
                  Activer {activeRoom.label}
                </button>
              ) : null}
            </div>
          ) : (
            <>
              {activeRoom.id.startsWith("chambre_") && activeRoom.id === "chambre_1" && !isFinalise ? (
                <button
                  type="button"
                  className="proplio-btn-secondary text-sm"
                  onClick={() =>
                    setPieces((prev) => (prev ? addChambreToPieces(prev, meuble) : prev))
                  }
                >
                  + Ajouter une chambre
                </button>
              ) : null}
              <div className="space-y-3">
                {Object.entries(activeRoom.elements).map(([elementKey, el]) => (
                  <EdlElementField
                    key={elementKey}
                    label={ELEMENT_LABELS[elementKey] ?? elementKey}
                    elementKey={elementKey}
                    el={el}
                    readOnly={isFinalise}
                    onChange={(next) => updateRoomElement(activeRoom.id, elementKey, next)}
                    previewUrl={el.photoPath ? photoUrls[el.photoPath] ?? null : null}
                    uploading={!!uploading[pathKey(activeRoom.id, elementKey)]}
                    onPickFile={(f) => void onUpload(activeRoom.id, elementKey, f)}
                    onRemovePhoto={() => void onRemovePhoto(activeRoom.id, elementKey, el.photoPath)}
                    onPreview={() =>
                      el.photoPath && photoUrls[el.photoPath] && setPreview(photoUrls[el.photoPath])
                    }
                  />
                ))}
              </div>
            </>
          )}
        </div>
      ) : null}

      {finalizeOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 backdrop-blur-safari">
          <div className="proplio-card max-w-md p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-proplio-text">Finaliser l&apos;état des lieux</h2>
            <p className="mt-3 text-sm leading-relaxed text-proplio-muted">
              Attention : une fois finalisé, l&apos;état des lieux ne pourra plus être modifié car il a valeur
              légale. Confirmez-vous la finalisation ?
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="proplio-btn-secondary"
                disabled={finalizing}
                onClick={() => setFinalizeOpen(false)}
              >
                Annuler
              </button>
              <button
                type="button"
                className="proplio-btn-primary bg-red-600 hover:opacity-90"
                disabled={finalizing}
                onClick={() => {
                  void (async () => {
                    if (!proprietaireId) return;
                    setFinalizing(true);
                    setError("");
                    await persist();
                    const { error: upErr } = await supabase
                      .from("etats_des_lieux")
                      .update({ statut: "termine", updated_at: new Date().toISOString() })
                      .eq("id", edlId)
                      .eq("proprietaire_id", proprietaireId);
                    setFinalizing(false);
                    if (upErr) {
                      setError(formatSubmitError(upErr));
                      return;
                    }
                    statutRef.current = "termine";
                    setRow((r) => (r ? { ...r, statut: "termine" } : r));
                    setFinalizeOpen(false);
                  })();
                }}
              >
                {finalizing ? "…" : "Confirmer la finalisation"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {preview ? (
        <button
          type="button"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreview(null)}
        >
          <Image
            src={preview}
            alt=""
            width={1600}
            height={1200}
            className="max-h-[90vh] w-auto max-w-full object-contain"
            unoptimized
          />
        </button>
      ) : null}
    </div>
  );
}
