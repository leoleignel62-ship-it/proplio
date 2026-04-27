"use client";

import { PC } from "@/lib/locavio-colors";
import { BtnDanger, BtnNeutral, BtnPrimary } from "@/components/ui/locavio-ui";

export type ConfirmModalProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
};

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Supprimer",
  cancelLabel = "Annuler",
  variant = "danger",
  loading,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div
        className="w-full max-w-md rounded-xl p-6 shadow-2xl"
        style={{
          backgroundColor: "#13131a",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 12,
        }}
      >
        <h2 id="confirm-modal-title" className="text-lg font-bold" style={{ color: PC.text }}>
          {title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: PC.muted }}>
          {description}
        </p>
        <div className="mt-6 flex w-full flex-wrap items-center justify-between gap-3">
          <BtnNeutral type="button" disabled={loading} onClick={onClose}>
            {cancelLabel}
          </BtnNeutral>
          {variant === "danger" ? (
            <BtnDanger type="button" loading={loading} onClick={() => void onConfirm()}>
              {confirmLabel}
            </BtnDanger>
          ) : (
            <BtnPrimary type="button" loading={loading} onClick={() => void onConfirm()}>
              {confirmLabel}
            </BtnPrimary>
          )}
        </div>
      </div>
    </div>
  );
}
