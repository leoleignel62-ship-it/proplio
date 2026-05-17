export type SignatureRow = {
  signed_at: string | null;
  signed_manually: boolean;
};

export type SignatureStatus = "none" | "pending" | "signed_electronic" | "signed_manual";

export function getSignatureStatus(sig: SignatureRow | undefined): SignatureStatus {
  if (!sig) return "none";
  if (!sig.signed_at) return "pending";
  if (sig.signed_manually) return "signed_manual";
  return "signed_electronic";
}

export function signatureStatusesFromRows(
  rows: Array<{ document_id: string; signed_at: string | null; signed_manually?: boolean | null }>,
): Record<string, SignatureRow> {
  return Object.fromEntries(
    rows.map((s) => [
      String(s.document_id),
      {
        signed_at: s.signed_at,
        signed_manually: Boolean(s.signed_manually),
      },
    ]),
  );
}
