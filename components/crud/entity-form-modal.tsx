"use client";

import { FormEvent } from "react";

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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-safari">
      <div className="proplio-card w-full max-w-xl p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <h3 className="text-lg font-semibold text-proplio-text">{title}</h3>
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-sm text-proplio-muted transition hover:bg-proplio-bg hover:text-proplio-text"
            onClick={onClose}
          >
            Fermer
          </button>
        </div>

        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {fields.map((field) => (
            <label key={field.name} className="proplio-label">
              <span className="font-medium">{field.label}</span>
              {field.type === "select" ? (
                <select
                  className="proplio-select"
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
                  className="proplio-input"
                  placeholder={field.placeholder}
                  value={values[field.name] ?? ""}
                  onChange={(event) => onChange(field.name, event.target.value)}
                  required={field.required}
                  step={field.step}
                />
              )}
            </label>
          ))}

          <div className="mt-1 flex items-center justify-end gap-3 sm:col-span-2">
            <button type="button" className="proplio-btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Annuler
            </button>
            <button type="submit" className="proplio-btn-primary px-6" disabled={isSubmitting}>
              {isSubmitting ? "Enregistrement..." : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export type { EntityField, SelectOption };
