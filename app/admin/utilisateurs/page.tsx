"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { normalizePlan, type LocavioPlan } from "@/lib/plan-limits";

const ACCENT = "#7c3aed";
const TEXT = "#1a0533";
const MUTED = "#6b7280";
const PLANS: LocavioPlan[] = ["free", "starter", "pro", "expert"];

const PLAN_BADGE: Record<LocavioPlan, { bg: string; color: string; label: string }> = {
  free: { bg: "#e5e7eb", color: "#374151", label: "Free" },
  starter: { bg: "#dbeafe", color: "#1d4ed8", label: "Starter" },
  pro: { bg: "rgba(124,58,237,0.15)", color: ACCENT, label: "Pro" },
  expert: { bg: "#fef3c7", color: "#b45309", label: "Expert" },
};

type UserRow = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  plan: string;
  override_plan: string | null;
  created_at: string;
};

type OverrideSelectValue = "" | LocavioPlan;

function PlanBadge({ plan }: { plan: string }) {
  const p = normalizePlan(plan);
  const s = PLAN_BADGE[p];
  return (
    <span
      className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

function SimulatedBadge({ plan }: { plan: string }) {
  const p = normalizePlan(plan);
  const s = PLAN_BADGE[p];
  return (
    <span
      className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: "#ffedd5", color: "#c2410c" }}
    >
      {s.label}
    </span>
  );
}

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function overrideToSelectValue(override: string | null | undefined): OverrideSelectValue {
  if (override == null || String(override).trim() === "") return "";
  return normalizePlan(override);
}

export default function AdminUtilisateursPage() {
  const toast = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<"" | LocavioPlan>("");
  const [selected, setSelected] = useState<UserRow | null>(null);
  const [modalPlan, setModalPlan] = useState<LocavioPlan>("free");
  const [modalOverride, setModalOverride] = useState<OverrideSelectValue>("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/utilisateurs");
    if (!res.ok) {
      toast.error("Impossible de charger les utilisateurs.");
      setUsers([]);
      setLoading(false);
      return;
    }
    const body = (await res.json()) as { users: UserRow[] };
    setUsers(
      (body.users ?? []).map((u) => ({
        id: String(u.id),
        nom: String(u.nom ?? ""),
        prenom: String(u.prenom ?? ""),
        email: String(u.email ?? ""),
        plan: String(u.plan ?? "free"),
        override_plan:
          u.override_plan != null && String(u.override_plan).trim() !== "" ? String(u.override_plan) : null,
        created_at: String(u.created_at ?? ""),
      })),
    );
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selected) return;
    setModalPlan(normalizePlan(selected.plan));
    setModalOverride(overrideToSelectValue(selected.override_plan));
  }, [selected]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (planFilter && normalizePlan(u.plan) !== planFilter) return false;
      if (!q) return true;
      const full = `${u.prenom} ${u.nom}`.trim().toLowerCase();
      return full.includes(q) || u.email.toLowerCase().includes(q);
    });
  }, [users, search, planFilter]);

  async function patchUser(patch: { plan?: LocavioPlan; override_plan?: OverrideSelectValue }) {
    if (!selected) return;
    setSaving(true);
    const body: { id: string; plan?: LocavioPlan; override_plan?: string | null } = { id: selected.id };
    if (patch.plan !== undefined) body.plan = patch.plan;
    if (patch.override_plan !== undefined) {
      body.override_plan = patch.override_plan === "" ? null : patch.override_plan;
    }
    const res = await fetch("/api/admin/utilisateurs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Échec de la mise à jour.");
      return;
    }
    const data = (await res.json()) as { user: UserRow };
    const updated = {
      ...data.user,
      override_plan:
        data.user.override_plan != null && String(data.user.override_plan).trim() !== ""
          ? String(data.user.override_plan)
          : null,
    };
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)));
    setSelected((u) => (u && u.id === updated.id ? { ...u, ...updated } : u));
    toast.success("Utilisateur mis à jour.");
  }

  async function saveOverrideRow(user: UserRow, value: OverrideSelectValue) {
    const res = await fetch("/api/admin/utilisateurs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: user.id,
        override_plan: value === "" ? null : value,
      }),
    });
    if (!res.ok) {
      toast.error("Échec de la mise à jour du plan simulé.");
      return;
    }
    const data = (await res.json()) as { user: UserRow };
    const updated = {
      ...data.user,
      override_plan:
        data.user.override_plan != null && String(data.user.override_plan).trim() !== ""
          ? String(data.user.override_plan)
          : null,
    };
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...updated } : u)));
    if (selected?.id === user.id) {
      setModalOverride(overrideToSelectValue(updated.override_plan));
    }
    toast.success(value === "" ? "Simulation désactivée." : `Plan simulé : ${value}.`);
  }

  return (
    <div className="mx-auto max-w-6xl p-6 md:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: TEXT }}>
          Utilisateurs
        </h1>
        <p className="mt-1 text-sm" style={{ color: MUTED }}>
          Gestion des comptes propriétaires
        </p>
      </header>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: MUTED }} />
          <input
            type="search"
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-sm outline-none"
            style={{ borderColor: "rgba(124,58,237,0.2)" }}
          />
        </div>
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value as "" | LocavioPlan)}
          className="rounded-lg border bg-white px-3 py-2 text-sm"
          style={{ borderColor: "rgba(124,58,237,0.2)" }}
        >
          <option value="">Tous les plans (Stripe)</option>
          {PLANS.map((p) => (
            <option key={p} value={p}>
              {PLAN_BADGE[p].label}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm" style={{ borderColor: "rgba(124,58,237,0.12)" }}>
        {loading ? (
          <p className="flex items-center gap-2 p-6 text-sm" style={{ color: MUTED }}>
            <Loader2 size={16} className="animate-spin" /> Chargement…
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wide" style={{ color: MUTED, borderColor: "rgba(124,58,237,0.1)" }}>
                  <th className="px-4 py-3">Nom</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Simulé</th>
                  <th className="px-4 py-3">Plan simulé</th>
                  <th className="px-4 py-3">Inscription</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer border-b hover:bg-violet-50/40"
                    style={{ borderColor: "rgba(124,58,237,0.06)" }}
                    onClick={() => setSelected(row)}
                  >
                    <td className="px-4 py-3 font-medium" style={{ color: TEXT }}>
                      {`${row.prenom} ${row.nom}`.trim() || "—"}
                    </td>
                    <td className="px-4 py-3" style={{ color: MUTED }}>
                      {row.email || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <PlanBadge plan={row.plan} />
                    </td>
                    <td className="px-4 py-3">
                      {row.override_plan ? <SimulatedBadge plan={row.override_plan} /> : <span style={{ color: MUTED }}>—</span>}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={overrideToSelectValue(row.override_plan)}
                        onChange={(e) => void saveOverrideRow(row, e.target.value as OverrideSelectValue)}
                        className="rounded-lg border bg-white px-2 py-1.5 text-xs"
                        style={{ borderColor: "rgba(124,58,237,0.2)" }}
                      >
                        <option value="">Aucun</option>
                        {PLANS.map((p) => (
                          <option key={p} value={p}>
                            {PLAN_BADGE[p].label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3" style={{ color: MUTED }}>
                      {formatDate(row.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4" onClick={() => setSelected(null)}>
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            style={{ border: "1px solid rgba(124,58,237,0.15)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <h2 className="text-lg font-semibold" style={{ color: TEXT }}>
                Fiche utilisateur
              </h2>
              <button type="button" onClick={() => setSelected(null)} aria-label="Fermer">
                <X size={20} style={{ color: MUTED }} />
              </button>
            </div>
            <p className="text-sm font-medium" style={{ color: TEXT }}>
              {`${selected.prenom} ${selected.nom}`.trim()}
            </p>
            <p className="text-sm" style={{ color: MUTED }}>
              {selected.email}
            </p>
            <p className="mt-2 text-xs" style={{ color: MUTED }}>
              Inscrit le {formatDate(selected.created_at)}
            </p>

            <label className="mt-6 block text-sm font-medium" style={{ color: TEXT }}>
              Plan Stripe (réel)
              <select
                value={modalPlan}
                onChange={(e) => setModalPlan(e.target.value as LocavioPlan)}
                disabled={saving}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              >
                {PLANS.map((p) => (
                  <option key={p} value={p}>
                    {PLAN_BADGE[p].label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={saving}
              onClick={() => void patchUser({ plan: modalPlan })}
              className="mt-3 w-full rounded-lg py-2 text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: ACCENT }}
            >
              Enregistrer le plan Stripe
            </button>

            <label className="mt-4 block text-sm font-medium" style={{ color: TEXT }}>
              Plan simulé (override)
              <select
                value={modalOverride}
                onChange={(e) => {
                  const v = e.target.value as OverrideSelectValue;
                  setModalOverride(v);
                  void patchUser({ override_plan: v });
                }}
                disabled={saving}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="">Aucun</option>
                {PLANS.map((p) => (
                  <option key={p} value={p}>
                    {PLAN_BADGE[p].label}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() => setSelected(null)}
              className="mt-6 w-full rounded-lg border py-2 text-sm"
              style={{ borderColor: "rgba(124,58,237,0.25)", color: ACCENT }}
            >
              Fermer
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}