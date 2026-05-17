"use client";

import type { ReactNode } from "react";
import { IconPencil } from "@/components/locavio-icons";
import { BtnPrimary } from "@/components/ui";
import { PC } from "@/lib/locavio-colors";
import { getSignatureStatus, type SignatureRow } from "@/lib/signature-status";

type SignatureDocumentActionsProps = {
  documentId: string;
  signatureStatuses: Record<string, SignatureRow>;
  onSend: () => void;
  onManualConfirm: () => void;
  sending?: boolean;
  sendDisabled?: boolean;
  canSend?: boolean;
  sendIcon?: ReactNode;
};

export function SignatureDocumentActions({
  documentId,
  signatureStatuses,
  onSend,
  onManualConfirm,
  sending = false,
  sendDisabled = false,
  canSend = true,
  sendIcon,
}: SignatureDocumentActionsProps) {
  const status = getSignatureStatus(signatureStatuses[documentId]);

  if (status === "signed_electronic") {
    return (
      <span
        className="rounded-full px-2 py-1 text-xs font-semibold"
        style={{ backgroundColor: PC.successBg20, color: PC.success }}
      >
        ✓ Signé électroniquement
      </span>
    );
  }

  if (status === "signed_manual") {
    return (
      <span
        className="rounded-full px-2 py-1 text-xs font-semibold"
        style={{ backgroundColor: "#fff7ed", color: "#c2410c" }}
      >
        ✓ Signé (retour papier)
      </span>
    );
  }

  if (status === "pending") {
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

  if (!canSend) return null;

  return (
    <BtnPrimary
      size="small"
      icon={sendIcon ?? <IconPencil className="h-4 w-4" aria-hidden />}
      disabled={sendDisabled || sending}
      loading={sending}
      onClick={onSend}
    >
      Envoyer pour signature
    </BtnPrimary>
  );
}
