"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Users,
  Euro,
  UserPlus,
  Gift,
  Search,
  Flag,
  Shield,
  X,
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/toast";
import { normalizePlan, type LocavioPlan } from "@/lib/plan-limits";

const ACCENT = "#7c3aed";
const TEXT = "#1a0533";
const MUTED = "#6b7280";
type AdminMetrics = {
  totalUsers: number;
  planCounts: Record<LocavioPlan, number>;
  mrr: number;
  newUsers7d: number;
  newUsers30d: number;
  parrainagesConvertis: number;
};

type ProprietaireRow = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  plan: string;
  is_beta: boolean;
  created_at: string;
};

type FeatureFlagRow = {
  cle: string;
  description: string | null;
  actif: boolean;
  beta_only: boolean;
};

const PLANS: LocavioPlan[] = ["free", "starter", "pro", "expert"];

const PLAN_BADGE: Record<LocavioPlan, { bg: string; color: string; label: string }> = {
  free: { bg: "#e5e7eb", color: "#374151", label: "Free" },
  starter: { bg: "#dbeafe", color: "#1d4ed8", label: "Starter" },
  pro: { bg: "rgba(124,58,237,0.15)", color: ACCENT, label: "Pro" },
  expert: { bg: "#fef3c7", color: "#b45309", label: "Expert" },
};

function PlanBadge({ plan }: { plan: string }) {
  const p = normalizePlan(plan);
  const style = PLAN_BADGE[p];
  return (
    <span
      className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize"
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {style.label}
    </span>
  );
}

function MetricCard({
  icon,
  label,
  value,
  children,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  children?: ReactNode;
}) {
  return (
    <article
      className="rounded-xl border bg-white p-5 shadow-sm"
      style={{ borderColor: "rgba(124,58,237,0.12)" }}
    >
      <div className="mb-2 flex items-center gap-2" style={{ color: ACCENT }}>
        {icon}
        <span className="text-sm font-medium" style={{ color: MUTED }}>
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold" style={{ color: TEXT }}>
        {value}
      </p>
      {children}
    </article>
  );
}

export default function AdminPage() {
  const toast = useToast();
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState("");

  const [users, setUsers] = useState<ProprietaireRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<"" | LocavioPlan>("");

  const [flags, setFlags] = useState<FeatureFlagRow[]>([]);
  const [flagsLoading, setFlagsLoading] = useState(true);

  const [selectedUser, setSelectedUser] = useState<ProprietaireRow | null>(null);
  const [modalPlan, setModalPlan] = useState<LocavioPlan>("free");
  const [modalBeta, setModalBeta] = useState(false);
  const [savingUser, setSavingUser] = useState(false);

  const loadMetrics = useCallback(async () => {
    setMetricsLoading(true);
    setMetricsError("");
    try {
      const res = await fetch("/api/admin/metrics");
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Impossible de charger les métriques.");
      }
      const data = (await res.json()) as AdminMetrics;
      setMetrics(data);
    } catch (e) {
      setMetricsError(e instanceof Error ? e.message : "Erreur métriques.");
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    const { data, error } = await supabase
      .from("proprietaires")
      .select("id, nom, prenom, email, plan, is_beta, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Impossible de charger les utilisateurs.");
      setUsers([]);
    } else {
      setUsers(
        (data ?? []).map((row) => ({
          id: String(row.id),
          nom: String(row.nom ?? ""),
          prenom: String(row.prenom ?? ""),
          email: String(row.email ?? ""),
          plan: String(row.plan ?? "free"),
          is_beta: Boolean(row.is_beta),
          created_at: String(row.created_at ?? ""),
        })),
      );
    }
    setUsersLoading(false);
  }, [toast]);

  const loadFlags = useCallback(async () => {
    setFlagsLoading(true);
    const { data, error } = await supabase
      .from("feature_flags")
      .select("cle, description, actif, beta_only")
      .order("cle", { ascending: true });
    if (error) {
      toast.error("Impossible de charger les feature flags.");
      setFlags([]);
    } else {
      setFlags(
        (data ?? []).map((row) => ({
          cle: String(row.cle),
          description: row.description != null ? String(row.description) : null,
          actif: Boolean(row.actif),
          beta_only: Boolean(row.beta_only),
        })),
      );
    }
    setFlagsLoading(false);
  }, [toast]);

  useEffect(() => {
    void loadMetrics();
    void loadUsers();
    void loadFlags();
  }, [loadMetrics, loadUsers, loadFlags]);

  useEffect(() => {
    if (!selectedUser) return;
    setModalPlan(normalizePlan(selectedUser.plan));
    setModalBeta(selectedUser.is_beta);
  }, [selectedUser]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (planFilter && normalizePlan(u.plan) !== planFilter) return false;
      if (!q) return true;
      const full = `${u.prenom} ${u.nom}`.trim().toLowerCase();
      return full.includes(q) || u.email.toLowerCase().includes(q);
    });
  }, [users, search, planFilter]);

  async function savePlan() {
    if (!selectedUser) return;
    setSavingUser(true);
    const { error } = await supabase.from("proprietaires").update({ plan: modalPlan }).eq("id", selectedUser.id);
    setSavingUser(false);
    if (error) {
      toast.error("Échec de la mise à jour du plan.");
      return;
    }
    toast.success("Plan mis à jour.");
    setUsers((prev) => prev.map((u) => (u.id === selectedUser.id ? { ...u, plan: modalPlan } : u)));
    setSelectedUser((u) => (u ? { ...u, plan: modalPlan } : u));
    void loadMetrics();
  }

  async function saveBeta(next: boolean) {
    if (!selectedUser) return;
    setSavingUser(true);
    const { error } = await supabase.from("proprietaires").update({ is_beta: next }).eq("id", selectedUser.id);
    setSavingUser(false);
    if (error) {
      toast.error("Échec de la mise à jour du statut beta.");
      return;
    }
    toast.success(next ? "Utilisateur marqué beta testeur." : "Statut beta retiré.");
    setModalBeta(next);
    setUsers((prev) => prev.map((u) => (u.id === selectedUser.id ? { ...u, is_beta: next } : u)));
    setSelectedUser((u) => (u ? { ...u, is_beta: next } : u));
  }

  async function toggleFlag(flag: FeatureFlagRow) {
    const next = !flag.actif;
    const { error } = await supabase
      .from("feature_flags")
      .update({ actif: next, updated_at: new Date().toISOString() })
      .eq("cle", flag.cle);
    if (error) {
      toast.error(`Échec pour le flag « ${flag.cle} ».`);
      return;
    }
    toast.success(`Flag « ${flag.cle} » ${next ? "activé" : "désactivé"}.`);
    setFlags((prev) => prev.map((f) => (f.cle === flag.cle ? { ...f, actif: next } : f)));
  }

  function formatDate(iso: string) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl text-white"
            style={{ backgroundColor: ACCENT }}
          >
            <Shield size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: TEXT }}>
              Administration Locavio
            </h1>
            <p className="text-sm" style={{ color: MUTED }}>
              Métriques, utilisateurs et feature flags
            </p>
          </div>
        </div>
        <a
          href="/"
          className="rounded-lg border bg-white px-4 py-2 text-sm font-medium transition hover:opacity-90"
          style={{ borderColor: "rgba(124,58,237,0.2)", color: ACCENT }}
        >
          Retour à l&apos;app
        </a>
      </header>

      {/* Section 1 — Métriques */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold" style={{ color: TEXT }}>
          Métriques globales
        </h2>
        {metricsLoading ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: MUTED }}>
            <Loader2 size={18} className="animate-spin" />
            Chargement des métriques…
          </div>
        ) : metricsError ? (
          <p className="text-sm text-red-600">{metricsError}</p>
        ) : metrics ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard icon={<Users size={18} />} label="Utilisateurs inscrits" value={metrics.totalUsers} />
            <MetricCard
              icon={<Euro size={18} />}
              label="MRR (Stripe)"
              value={`${metrics.mrr.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`}
            />
            <MetricCard
              icon={<UserPlus size={18} />}
              label="Nouveaux (7 jours)"
              value={metrics.newUsers7d}
            />
            <MetricCard
              icon={<UserPlus size={18} />}
              label="Nouveaux (30 jours)"
              value={metrics.newUsers30d}
            />
            <MetricCard
              icon={<Gift size={18} />}
              label="Parrainages convertis"
              value={metrics.parrainagesConvertis}
            />
            <MetricCard icon={<Users size={18} />} label="Répartition par plan" value="">
              <div className="mt-3 flex flex-wrap gap-2">
                {PLANS.map((plan) => (
                  <span
                    key={plan}
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                    style={{
                      backgroundColor: PLAN_BADGE[plan].bg,
                      color: PLAN_BADGE[plan].color,
                    }}
                  >
                    {PLAN_BADGE[plan].label}
                    <span className="opacity-80">({metrics.planCounts[plan]})</span>
                  </span>
                ))}
              </div>
            </MetricCard>
          </div>
        ) : null}
      </section>

      {/* Section 2 — Utilisateurs */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold" style={{ color: TEXT }}>
          Utilisateurs
        </h2>
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: MUTED }}
            />
            <input
              type="search"
              placeholder="Rechercher par nom ou email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2"
              style={{ borderColor: "rgba(124,58,237,0.2)", color: TEXT }}
            />
          </div>
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value as "" | LocavioPlan)}
            className="rounded-lg border bg-white px-3 py-2 text-sm"
            style={{ borderColor: "rgba(124,58,237,0.2)", color: TEXT }}
          >
            <option value="">Tous les plans</option>
            {PLANS.map((p) => (
              <option key={p} value={p}>
                {PLAN_BADGE[p].label}
              </option>
            ))}
          </select>
        </div>
        <div
          className="overflow-hidden rounded-xl border bg-white shadow-sm"
          style={{ borderColor: "rgba(124,58,237,0.12)" }}
        >
          {usersLoading ? (
            <p className="p-6 text-sm" style={{ color: MUTED }}>
              Chargement…
            </p>
          ) : filteredUsers.length === 0 ? (
            <p className="p-6 text-sm" style={{ color: MUTED }}>
              Aucun utilisateur trouvé.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wide" style={{ borderColor: "rgba(124,58,237,0.1)", color: MUTED }}>
                    <th className="px-4 py-3 font-medium">Nom complet</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Plan</th>
                    <th className="px-4 py-3 font-medium">Beta</th>
                    <th className="px-4 py-3 font-medium">Inscription</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((row) => (
                    <tr
                      key={row.id}
                      className="cursor-pointer border-b transition hover:bg-violet-50/50"
                      style={{ borderColor: "rgba(124,58,237,0.06)" }}
                      onClick={() => setSelectedUser(row)}
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
                      <td className="px-4 py-3" style={{ color: TEXT }}>
                        {row.is_beta ? "Oui" : "Non"}
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
      </section>

      {/* Section 4 — Feature flags */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold" style={{ color: TEXT }}>
          <Flag size={20} style={{ color: ACCENT }} />
          Feature flags
        </h2>
        <div
          className="rounded-xl border bg-white shadow-sm"
          style={{ borderColor: "rgba(124,58,237,0.12)" }}
        >
          {flagsLoading ? (
            <p className="p-6 text-sm" style={{ color: MUTED }}>
              Chargement…
            </p>
          ) : flags.length === 0 ? (
            <p className="p-6 text-sm" style={{ color: MUTED }}>
              Aucun feature flag configuré.
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
                        <span
                          className="rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{ backgroundColor: "#fef3c7", color: "#b45309" }}
                        >
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
                  <button
                    type="button"
                    role="switch"
                    aria-checked={flag.actif}
                    onClick={() => void toggleFlag(flag)}
                    className="relative h-7 w-12 shrink-0 rounded-full transition"
                    style={{ backgroundColor: flag.actif ? ACCENT : "#d1d5db" }}
                  >
                    <span
                      className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition"
                      style={{ left: flag.actif ? "1.375rem" : "0.125rem" }}
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Section 3 — Modale fiche utilisateur */}
      {selectedUser ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-user-modal-title"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border bg-white p-6 shadow-xl"
            style={{ borderColor: "rgba(124,58,237,0.15)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-2">
              <h3 id="admin-user-modal-title" className="text-lg font-semibold" style={{ color: TEXT }}>
                Fiche utilisateur
              </h3>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="rounded-lg p-1 hover:bg-gray-100"
                aria-label="Fermer"
              >
                <X size={20} style={{ color: MUTED }} />
              </button>
            </div>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="font-medium" style={{ color: MUTED }}>
                  Nom
                </dt>
                <dd style={{ color: TEXT }}>
                  {`${selectedUser.prenom} ${selectedUser.nom}`.trim() || "—"}
                </dd>
              </div>
              <div>
                <dt className="font-medium" style={{ color: MUTED }}>
                  Email
                </dt>
                <dd style={{ color: TEXT }}>{selectedUser.email || "—"}</dd>
              </div>
              <div>
                <dt className="font-medium" style={{ color: MUTED }}>
                  Plan actuel
                </dt>
                <dd className="mt-0.5">
                  <PlanBadge plan={selectedUser.plan} />
                </dd>
              </div>
              <div>
                <dt className="font-medium" style={{ color: MUTED }}>
                  Inscription
                </dt>
                <dd style={{ color: TEXT }}>{formatDate(selectedUser.created_at)}</dd>
              </div>
              <div>
                <dt className="font-medium" style={{ color: MUTED }}>
                  Beta testeur
                </dt>
                <dd style={{ color: TEXT }}>{selectedUser.is_beta ? "Oui" : "Non"}</dd>
              </div>
            </dl>

            <div className="mt-6 space-y-4 border-t pt-4" style={{ borderColor: "rgba(124,58,237,0.1)" }}>
              <label className="block text-sm font-medium" style={{ color: TEXT }}>
                Changer le plan
                <select
                  value={modalPlan}
                  onChange={(e) => setModalPlan(e.target.value as LocavioPlan)}
                  disabled={savingUser}
                  className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm"
                  style={{ borderColor: "rgba(124,58,237,0.2)" }}
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
                disabled={savingUser}
                onClick={() => void savePlan()}
                className="w-full rounded-lg py-2 text-sm font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: ACCENT }}
              >
                Enregistrer le plan
              </button>

              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium" style={{ color: TEXT }}>
                  Beta testeur
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={modalBeta}
                  disabled={savingUser}
                  onClick={() => void saveBeta(!modalBeta)}
                  className="relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-60"
                  style={{ backgroundColor: modalBeta ? ACCENT : "#d1d5db" }}
                >
                  <span
                    className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition"
                    style={{ left: modalBeta ? "1.375rem" : "0.125rem" }}
                  />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="w-full rounded-lg border py-2 text-sm font-medium"
                style={{ borderColor: "rgba(124,58,237,0.25)", color: ACCENT }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
