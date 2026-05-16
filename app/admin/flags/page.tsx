"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { ConfirmModal } from "@/components/ui";
import { useToast } from "@/components/ui/toast";

const ACCENT = "#7c3aed";
const TEXT = "#1a0533";
const MUTED = "#6b7280";

type FlagRow = {
  cle: string;
  description: string | null;
  actif: boolean;
  beta_only: boolean;
};

export default function AdminFlagsPage() {
  const toast = useToast();
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [newCle, setNewCle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newBetaOnly, setNewBetaOnly] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteCle, setDeleteCle] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/flags");
    if (!res.ok) {
      toast.error("Impossible de charger les feature flags.");
      setFlags([]);
      setLoading(false);
      return;
    }
    const body = (await res.json()) as { flags: FlagRow[] };
    setFlags(body.flags ?? []);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleActif(flag: FlagRow) {
    const res = await fetch("/api/admin/flags", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cle: flag.cle, actif: !flag.actif }),
    });
    if (!res.ok) {
      toast.error("Échec de la mise à jour.");
      return;
    }
    toast.success(`Flag « ${flag.cle} » ${!flag.actif ? "activé" : "désactivé"}.`);
    void load();
  }

  async function createFlag() {
    const cle = newCle.trim();
    if (!cle) {
      toast.error("Clé requise.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/admin/flags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cle, description: newDescription, beta_only: newBetaOnly }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(body.error ?? "Échec de la création.");
      return;
    }
    toast.success("Feature flag créé.");
    setFormOpen(false);
    setNewCle("");
    setNewDescription("");
    setNewBetaOnly(false);
    void load();
  }

  async function confirmDelete() {
    if (!deleteCle) return;
    setDeleteBusy(true);
    const res = await fetch(`/api/admin/flags?cle=${encodeURIComponent(deleteCle)}`, { method: "DELETE" });
    setDeleteBusy(false);
    if (!res.ok) {
      toast.error("Échec de la suppression.");
      return;
    }
    toast.success("Feature flag supprimé.");
    setDeleteCle(null);
    void load();
  }

  return (
    <div className="mx-auto max-w-3xl p-6 md:p-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: TEXT }}>
            Feature flags
          </h1>
          <p className="mt-1 text-sm" style={{ color: MUTED }}>
            Activation des fonctionnalités
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white"
          style={{ backgroundColor: ACCENT }}
        >
          <Plus size={16} /> Nouveau flag
        </button>
      </header>

      <div className="rounded-xl border bg-white shadow-sm" style={{ borderColor: "rgba(124,58,237,0.12)" }}>
        {loading ? (
          <p className="flex items-center gap-2 p-6 text-sm" style={{ color: MUTED }}>
            <Loader2 size={16} className="animate-spin" /> Chargement…
          </p>
        ) : flags.length === 0 ? (
          <p className="p-6 text-sm" style={{ color: MUTED }}>
            Aucun feature flag.
          </p>
        ) : (
          <ul className="divide-y" style={{ borderColor: "rgba(124,58,237,0.08)" }}>
            {flags.map((flag) => (
              <li key={flag.cle} className="flex flex-wrap items-center justify-between gap-4 px-4 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="rounded bg-violet-50 px-2 py-0.5 text-sm font-semibold" style={{ color: ACCENT }}>
                      {flag.cle}
                    </code>
                    {flag.beta_only ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        Beta only
                      </span>
                    ) : null}
                  </div>
                  {flag.description ? (
                    <p className="mt-1 text-sm" style={{ color: MUTED }}>
                      {flag.description}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={flag.actif}
                    onClick={() => void toggleActif(flag)}
                    className="relative h-7 w-12 shrink-0 rounded-full"
                    style={{ backgroundColor: flag.actif ? ACCENT : "#d1d5db" }}
                  >
                    <span
                      className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition"
                      style={{ left: flag.actif ? "1.375rem" : "0.125rem" }}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteCle(flag.cle)}
                    className="rounded-lg border border-red-200 p-2 text-red-600"
                    aria-label="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {formOpen ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold" style={{ color: TEXT }}>
              Nouveau feature flag
            </h2>
            <label className="mt-4 block text-sm font-medium">
              Clé
              <input
                value={newCle}
                onChange={(e) => setNewCle(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 font-mono text-sm"
                placeholder="ma_fonctionnalite"
              />
            </label>
            <label className="mt-3 block text-sm font-medium">
              Description
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </label>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={newBetaOnly} onChange={(e) => setNewBetaOnly(e.target.checked)} />
              Beta only
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-lg border px-4 py-2 text-sm"
                style={{ color: ACCENT, borderColor: "rgba(124,58,237,0.25)" }}
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void createFlag()}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: ACCENT }}
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmModal
        open={deleteCle !== null}
        title="Supprimer le feature flag ?"
        description={`La clé « ${deleteCle ?? ""} » sera supprimée définitivement.`}
        confirmLabel="Supprimer"
        loading={deleteBusy}
        onConfirm={confirmDelete}
        onClose={() => setDeleteCle(null)}
      />
    </div>
  );
}
