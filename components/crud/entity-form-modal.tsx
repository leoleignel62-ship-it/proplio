"use client";

import { FormEvent, useState, type CSSProperties } from "react";
import { PC } from "@/lib/proplio-colors";
import { fieldInputStyle, fieldSelectStyle } from "@/lib/proplio-field-styles";

type SelectOption = {
  value: string;
  label: string;
};

type EntityField = {
  name: string;
  label: string;
  type?: "text" | "email" | "tel" | "number" | "date" | "select";
  required?: boolean;
  placeholder?: string;
  step?: string;
  options?: SelectOption[];
  helperText?: string;
};

type EntityFormModalProps = {
  title: string;
  fields: EntityField[];
  values: Record<string, string>;
  isOpen: boolean;
  isSubmitting: boolean;
  submitLabel: string;
  onClose: () => void;
  onChange: (name: string, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

const CARD: CSSProperties = {
  backgroundColor: PC.card,
  border: `1px solid rgba(255, 255, 255, 0.1)`,
  borderRadius: 12,
  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(124, 58, 237, 0.08)",
  padding: 24,
  maxWidth: "36rem",
  width: "100%",
};

export function EntityFormModal({
  title,
  fields,
  values,
  isOpen,
  isSubmitting,
  submitLabel,
  onClose,
  onChange,
  onSubmit,
}: EntityFormModalProps) {
  const [closeHover, setCloseHover] = useState(false);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        backgroundColor: PC.overlay,
        WebkitBackdropFilter: "blur(8px)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="shadow-2xl" style={CARD}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <h3 className="text-lg font-semibold" style={{ color: PC.text }}>
            {title}
          </h3>
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-sm transition"
            style={{
              color: closeHover ? PC.text : PC.muted,
              backgroundColor: closeHover ? PC.bg : "transparent",
            }}
            onMouseEnter={() => setCloseHover(true)}
            onMouseLeave={() => setCloseHover(false)}
            onClick={onClose}
          >
            Fermer
          </button>
        </div>

        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {fields.map((field) => (
            <label key={field.name} className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
              <span className="font-medium">{field.label}</span>
              {field.type === "select" ? (
                <select
                  style={fieldSelectStyle}
                  value={values[field.name] ?? ""}
                  onChange={(event) => onChange(field.name, event.target.value)}
                  required={field.required}
                >
                  <option value="">Sélectionner...</option>
                  {(field.options ?? []).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type ?? "text"}
                  style={fieldInputStyle}
                  placeholder={field.placeholder}
                  value={values[field.name] ?? ""}
                  onChange={(event) => onChange(field.name, event.target.value)}
                  required={field.required}
                  step={field.step}
                />
              )}
              {field.helperText ? (
                <span className="text-xs" style={{ color: PC.warning }}>
                  {field.helperText}
                </span>
              ) : null}
            </label>
          ))}

          <div className="mt-1 flex items-center justify-end gap-3 sm:col-span-2">
            <button
              type="button"
              className="rounded-xl font-medium"
              style={{
                border: `1px solid ${PC.border}`,
                backgroundColor: "transparent",
                color: PC.text,
                padding: "0.625rem 1rem",
                fontSize: "0.875rem",
              }}
              onClick={onClose}
              disabled={isSubmitting}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="rounded-xl px-6 font-medium"
              style={{
                backgroundColor: PC.primary,
                color: PC.white,
                padding: "0.625rem 1.5rem",
                fontSize: "0.875rem",
                boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Enregistrement..." : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export type { EntityField, SelectOption };
