"use client";

import { BtnPrimary } from "@/components/ui";
import { PC } from "@/lib/locavio-colors";

export type EdlSignatureStatus = "none" | "pending" | "signed_electronic" | "signed_manual";

type EdlSignatureActionsProps = {
  isActive: boolean;
  signatureStatus: EdlSignatureStatus;
  sendingSignature: boolean;
  onSend: () => void;
  onManualConfirm: () => void;
};

export function EdlSignatureActions({
  isActive,
  signatureStatus,
  sendingSignature,
  onSend,
  onManualConfirm,
}: EdlSignatureActionsProps) {
  if (!isActive) {
    return (
      <BtnPrimary
        size="small"
        disabled
        style={{ opacity: 0.7, cursor: "not-allowed" }}
        title="Finalisez l'état des lieux pour envoyer pour signature."
      >
        Envoyer pour signature
      </BtnPrimary>
    );
  }

  if (signatureStatus === "signed_electronic") {
    return (
      <span
        className="rounded-full px-2 py-1 text-xs font-semibold"
        style={{ backgroundColor: PC.successBg20, color: PC.success }}
      >
        ✓ Signé électroniquement
      </span>
    );
  }

  if (signatureStatus === "signed_manual") {
    return (
      <span
        className="rounded-full px-2 py-1 text-xs font-semibold"
        style={{ backgroundColor: "#fff7ed", color: "#c2410c" }}
      >
        ✓ Signé (retour papier)
      </span>
    );
  }

  if (signatureStatus === "pending") {
    return (
      <div className="flex flex-col items-start gap-1">
        <span
          className="rounded-full px-2 py-1 text-xs font-semibold"
          style={{ backgroundColor: PC.warningBg15, color: PC.warning }}
        >
          ⏳ En attente de signature
        </span>
        <button
          type="button"
          className="text-xs underline"
          style={{ color: PC.muted }}
          onClick={onManualConfirm}
        >
          Marquer comme signé (papier)
        </button>
      </div>
    );
  }

  return (
    <BtnPrimary size="small" disabled={sendingSignature} loading={sendingSignature} onClick={onSend}>
      ✍️ Envoyer pour signature
    </BtnPrimary>
  );
}
