"use client";

import Image from "next/image";
import { useState } from "react";
import type { ElementEdl, EtatNiveau } from "@/lib/etat-des-lieux/types";
import { ETAT_LABELS, ETAT_OPTIONS, normalizeEtatNiveau } from "@/lib/etat-des-lieux/types";
import { SOL_TYPES } from "@/lib/etat-des-lieux/defaults";
import { PC } from "@/lib/proplio-colors";
import { edlFieldCardStyle, fieldInputStyle, fieldSelectStyle } from "@/lib/proplio-field-styles";

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
  const stateCurrent = normalizeEtatNiveau(el.state);
  const stateMeta = ETAT_LABELS[stateCurrent];
  const [hoverEt, setHoverEt] = useState<string | null>(null);

  return (
    <div className="rounded-xl p-4" style={edlFieldCardStyle}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-medium" style={{ color: PC.text }}>
            {label}
          </p>
          {readOnly ? (
            <span
              className="inline-flex rounded-lg border-2 px-2.5 py-1 text-xs font-medium"
              style={{
                borderColor: stateMeta.color,
                backgroundColor: `${stateMeta.color}22`,
                color: PC.text,
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
                    className="rounded-lg px-2.5 py-1 text-xs font-medium"
                    style={
                      on
                        ? {
                            borderWidth: 2,
                            borderStyle: "solid",
                            borderColor: meta.color,
                            backgroundColor: `${meta.color}22`,
                            color: PC.text,
                          }
                        : {
                            borderWidth: 1,
                            borderStyle: "solid",
                            borderColor: hoverEt === opt ? "rgba(124, 58, 237, 0.4)" : PC.border,
                            color: PC.muted,
                          }
                    }
                    onMouseEnter={() => setHoverEt(opt)}
                    onMouseLeave={() => setHoverEt(null)}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
          )}
          {elementKey === "sol" ? (
            <label className="mt-1 block text-xs" style={{ color: PC.muted }}>
              Type de sol
              <select
                className="mt-1 w-full max-w-xs"
                style={{ ...fieldSelectStyle, marginTop: 4 }}
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
            <label className="mt-1 block text-xs" style={{ color: PC.muted }}>
              Code
              <input
                className="mt-1 max-w-xs"
                style={{ ...fieldInputStyle, marginTop: 4 }}
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
            <label className="mt-1 block text-xs" style={{ color: PC.muted }}>
              Type
              <select
                className="mt-1 w-full max-w-xs"
                style={{ ...fieldSelectStyle, marginTop: 4 }}
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
            <label className="mt-1 block text-xs" style={{ color: PC.muted }}>
              Taille du lit
              <select
                className="mt-1 w-full max-w-xs"
                style={{ ...fieldSelectStyle, marginTop: 4 }}
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
            <label className="mt-1 block text-xs" style={{ color: PC.muted }}>
              Type de porte
              <select
                className="mt-1 w-full max-w-xs"
                style={{ ...fieldSelectStyle, marginTop: 4 }}
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
            <label className="mt-1 block text-xs" style={{ color: PC.muted }}>
              Nombre
              <input
                type="number"
                min={0}
                className="mt-1 max-w-[120px]"
                style={{ ...fieldInputStyle, marginTop: 4 }}
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
            <label className="flex items-center gap-2 text-xs" style={{ color: PC.muted }}>
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
            <div className="flex flex-wrap gap-2 text-xs" style={{ color: PC.muted }}>
              {(["assiettes", "verres", "couverts"] as const).map((k) => (
                <label key={k} className="flex items-center gap-1">
                  {k}
                  <input
                    type="number"
                    min={0}
                    className="w-16 py-1"
                    style={{ ...fieldInputStyle, paddingTop: 4, paddingBottom: 4 }}
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
            style={fieldInputStyle}
            placeholder="Commentaire (optionnel)"
            readOnly={readOnly}
            disabled={readOnly}
            value={el.comment}
            onChange={(e) => onChange({ ...el, comment: e.target.value })}
          />
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {!readOnly ? (
            <label className="text-xs" style={{ color: PC.muted }}>
              Ajouter une photo
              <input
                type="file"
                accept="image/*"
                disabled={uploading}
                className="mt-1 block w-full max-w-[220px] rounded-md text-xs"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onPickFile(f);
                  e.target.value = "";
                }}
              />
            </label>
          ) : null}
          {previewUrl ? (
            <div className="relative">
              <button
                type="button"
                onClick={onPreview}
                className="relative h-[60px] w-[60px] overflow-hidden rounded-lg"
                style={{ border: `1px solid ${PC.border}` }}
              >
                <Image
                  src={previewUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="60px"
                  unoptimized
                />
              </button>
              {!readOnly ? (
                <button
                  type="button"
                  onClick={onRemovePhoto}
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px]"
                  style={{ backgroundColor: PC.danger, color: PC.white }}
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
