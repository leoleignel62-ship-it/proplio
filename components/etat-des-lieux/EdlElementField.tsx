"use client";

import { useRef } from "react";
import type { ElementEdl, EtatNiveau } from "@/lib/etat-des-lieux/types";
import { ETAT_LABELS, ETAT_OPTIONS, normalizeEtatNiveau } from "@/lib/etat-des-lieux/types";
import { ELEMENT_LABELS } from "@/lib/etat-des-lieux/defaults";
import { SOL_TYPES } from "@/lib/etat-des-lieux/defaults";

type Props = {
  label: string;
  elementKey: string;
  el: ElementEdl;
  onChange: (next: ElementEdl) => void;
  previewUrl: string | null;
  uploading: boolean;
  onPickFile: (file: File) => void;
  onRemovePhoto: () => void;
  onPreview: () => void;
  /** État des lieux finalisé : aucune modification */
  readOnly?: boolean;
};

export function EdlElementField({
  label,
  elementKey,
  el,
  onChange,
  previewUrl,
  uploading,
  onPickFile,
  onRemovePhoto,
  onPreview,
  readOnly = false,
}: Props) {
  const captureInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const stateCurrent = normalizeEtatNiveau(el.state);
  const stateMeta = ETAT_LABELS[stateCurrent];

  return (
    <div className="rounded-xl border border-proplio-border bg-proplio-bg/40 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-medium text-proplio-text">{label}</p>
          {readOnly ? (
            <span
              className="inline-flex rounded-lg border-2 px-2.5 py-1 text-xs font-medium text-proplio-text"
              style={{
                borderColor: stateMeta.color,
                backgroundColor: `${stateMeta.color}22`,
              }}
            >
              {stateMeta.label}
            </span>
          ) : (
            <div className="flex flex-wrap gap-2">
              {ETAT_OPTIONS.map((opt) => {
                const meta = ETAT_LABELS[opt];
                const on = stateCurrent === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => onChange({ ...el, state: opt as EtatNiveau })}
                    className={
                      on
                        ? "rounded-lg border-2 px-2.5 py-1 text-xs font-medium text-proplio-text"
                        : "rounded-lg border border-proplio-border px-2.5 py-1 text-xs text-proplio-muted hover:border-proplio-primary/40"
                    }
                    style={
                      on
                        ? { borderColor: meta.color, backgroundColor: `${meta.color}22` }
                        : undefined
                    }
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
          )}
          {elementKey === "sol" ? (
            <label className="mt-1 block text-xs text-proplio-muted">
              Type de sol
              <select
                className="proplio-select mt-1 w-full max-w-xs"
                disabled={readOnly}
                value={String(el.extra.sousType ?? "parquet")}
                onChange={(e) =>
                  onChange({ ...el, extra: { ...el.extra, sousType: e.target.value } })
                }
              >
                {SOL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {elementKey === "digicode" ? (
            <label className="mt-1 block text-xs text-proplio-muted">
              Code
              <input
                className="proplio-input mt-1 max-w-xs"
                readOnly={readOnly}
                disabled={readOnly}
                value={String(el.extra.code ?? "")}
                onChange={(e) =>
                  onChange({ ...el, extra: { ...el.extra, code: e.target.value } })
                }
              />
            </label>
          ) : null}
          {elementKey === "baignoire_ou_douche" ? (
            <label className="mt-1 block text-xs text-proplio-muted">
              Type
              <select
                className="proplio-select mt-1 w-full max-w-xs"
                disabled={readOnly}
                value={String(el.extra.type ?? "douche")}
                onChange={(e) =>
                  onChange({ ...el, extra: { ...el.extra, type: e.target.value } })
                }
              >
                <option value="baignoire">Baignoire</option>
                <option value="douche">Douche</option>
              </select>
            </label>
          ) : null}
          {elementKey === "lit" ? (
            <label className="mt-1 block text-xs text-proplio-muted">
              Taille du lit
              <select
                className="proplio-select mt-1 w-full max-w-xs"
                disabled={readOnly}
                value={String(el.extra.taille ?? "double")}
                onChange={(e) =>
                  onChange({ ...el, extra: { ...el.extra, taille: e.target.value } })
                }
              >
                <option value="simple">Simple</option>
                <option value="double">Double</option>
                <option value="queen">Queen</option>
                <option value="king">King</option>
              </select>
            </label>
          ) : null}
          {elementKey === "porte_garage" ? (
            <label className="mt-1 block text-xs text-proplio-muted">
              Type de porte
              <select
                className="proplio-select mt-1 w-full max-w-xs"
                disabled={readOnly}
                value={String(el.extra.type ?? "manuelle")}
                onChange={(e) =>
                  onChange({ ...el, extra: { ...el.extra, type: e.target.value } })
                }
              >
                <option value="manuelle">Manuelle</option>
                <option value="electrique">Électrique</option>
              </select>
            </label>
          ) : null}
          {["canape", "chaises", "telecommandes"].includes(elementKey) ? (
            <label className="mt-1 block text-xs text-proplio-muted">
              Nombre
              <input
                type="number"
                min={0}
                className="proplio-input mt-1 max-w-[120px]"
                readOnly={readOnly}
                disabled={readOnly}
                value={Number(el.extra.nombre ?? 0)}
                onChange={(e) =>
                  onChange({ ...el, extra: { ...el.extra, nombre: Number(e.target.value) || 0 } })
                }
              />
            </label>
          ) : null}
          {elementKey === "humidite" ? (
            <label className="flex items-center gap-2 text-xs text-proplio-muted">
              <input
                type="checkbox"
                disabled={readOnly}
                checked={Boolean(el.extra.presence)}
                onChange={(e) =>
                  onChange({ ...el, extra: { ...el.extra, presence: e.target.checked } })
                }
              />
              Humidité constatée
            </label>
          ) : null}
          {elementKey === "vaisselle" ? (
            <div className="flex flex-wrap gap-2 text-xs text-proplio-muted">
              {(["assiettes", "verres", "couverts"] as const).map((k) => (
                <label key={k} className="flex items-center gap-1">
                  {k}
                  <input
                    type="number"
                    min={0}
                    className="proplio-input w-16 py-1"
                    readOnly={readOnly}
                    disabled={readOnly}
                    value={Number(el.extra[k] ?? 0)}
                    onChange={(e) =>
                      onChange({
                        ...el,
                        extra: { ...el.extra, [k]: Number(e.target.value) || 0 },
                      })
                    }
                  />
                </label>
              ))}
            </div>
          ) : null}
          <input
            className="proplio-input"
            placeholder="Commentaire (optionnel)"
            readOnly={readOnly}
            disabled={readOnly}
            value={el.comment}
            onChange={(e) => onChange({ ...el, comment: e.target.value })}
          />
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {!readOnly ? (
            <>
              <input
                ref={captureInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onPickFile(f);
                  e.target.value = "";
                }}
              />
              <input
                ref={importInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onPickFile(f);
                  e.target.value = "";
                }}
              />
              <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
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
          ) : null}
          {previewUrl ? (
            <div className="relative">
              <button
                type="button"
                onClick={onPreview}
                className="h-[60px] w-[60px] overflow-hidden rounded-lg border border-proplio-border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="" className="h-full w-full object-cover" />
              </button>
              {!readOnly ? (
                <button
                  type="button"
                  onClick={onRemovePhoto}
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-proplio-danger text-[10px] text-white"
                  aria-label="Supprimer la photo"
                >
                  ×
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
