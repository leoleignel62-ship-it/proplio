"use client";

import { PC } from "@/lib/proplio-colors";

const MAP: Record<
  string,
  { bg: string; color: string; label?: string }
> = {
  confirmee: { bg: "rgba(16,185,129,0.2)", color: "#10b981", label: "Confirmée" },
  confirmée: { bg: "rgba(16,185,129,0.2)", color: "#10b981" },
  actif: { bg: "rgba(16,185,129,0.2)", color: "#10b981", label: "Actif" },
  active: { bg: "rgba(16,185,129,0.2)", color: "#10b981" },
  en_attente: { bg: "rgba(245,158,11,0.2)", color: "#f59e0b", label: "En attente" },
  en_cours: { bg: "rgba(59,130,246,0.2)", color: "#3b82f6", label: "En cours" },
  terminee: { bg: "rgba(107,114,128,0.25)", color: "#6b7280", label: "Terminée" },
  terminée: { bg: "rgba(107,114,128,0.25)", color: "#6b7280" },
  termine: { bg: "rgba(107,114,128,0.25)", color: "#6b7280", label: "Terminé" },
  terminé: { bg: "rgba(107,114,128,0.25)", color: "#6b7280" },
  annulee: { bg: "rgba(239,68,68,0.2)", color: "#ef4444", label: "Annulée" },
  annulée: { bg: "rgba(239,68,68,0.2)", color: "#ef4444" },
  brouillon: { bg: "rgba(148,148,159,0.2)", color: "#9ca3af", label: "Brouillon" },
  finalise: { bg: "rgba(59,130,246,0.2)", color: "#3b82f6", label: "Finalisé" },
  finalisé: { bg: "rgba(59,130,246,0.2)", color: "#3b82f6" },
  envoye: { bg: "rgba(59,130,246,0.2)", color: "#3b82f6", label: "Envoyé" },
  envoyé: { bg: "rgba(59,130,246,0.2)", color: "#3b82f6" },
  signe: { bg: "rgba(5,150,105,0.25)", color: "#059669", label: "Signé" },
  signé: { bg: "rgba(5,150,105,0.25)", color: "#059669" },
};

function normalizeKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "_");
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const key = normalizeKey(status);
  const cfg = MAP[key] ?? { bg: PC.border, color: PC.muted, label: undefined };
  const text = label ?? cfg.label ?? status;
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: cfg.bg, color: cfg.color }}
    >
      {text}
    </span>
  );
}
