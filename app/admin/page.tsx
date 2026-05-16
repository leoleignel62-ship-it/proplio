"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Euro, Gift, Loader2, UserPlus, Users } from "lucide-react";
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

const PLANS: LocavioPlan[] = ["free", "starter", "pro", "expert"];

const PLAN_BADGE: Record<LocavioPlan, { bg: string; color: string; label: string }> = {
  free: { bg: "#e5e7eb", color: "#374151", label: "Free" },
  starter: { bg: "#dbeafe", color: "#1d4ed8", label: "Starter" },
  pro: { bg: "rgba(124,58,237,0.15)", color: ACCENT, label: "Pro" },
  expert: { bg: "#fef3c7", color: "#b45309", label: "Expert" },
};

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

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/metrics");
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Impossible de charger les métriques.");
      }
      setMetrics((await res.json()) as AdminMetrics);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur métriques.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-6xl p-6 md:p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: TEXT }}>
          Dashboard
        </h1>
        <p className="mt-1 text-sm" style={{ color: MUTED }}>
          Métriques globales Locavio
        </p>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 text-sm" style={{ color: MUTED }}>
          <Loader2 size={18} className="animate-spin" />
          Chargement…
        </div>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : metrics ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard icon={<Users size={18} />} label="Utilisateurs inscrits" value={metrics.totalUsers} />
          <MetricCard
            icon={<Euro size={18} />}
            label="MRR (Stripe)"
            value={`${metrics.mrr.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`}
          />
          <MetricCard icon={<UserPlus size={18} />} label="Nouveaux (7 jours)" value={metrics.newUsers7d} />
          <MetricCard icon={<UserPlus size={18} />} label="Nouveaux (30 jours)" value={metrics.newUsers30d} />
          <MetricCard icon={<Gift size={18} />} label="Parrainages convertis" value={metrics.parrainagesConvertis} />
          <MetricCard icon={<Users size={18} />} label="Répartition par plan" value="">
            <div className="mt-3 flex flex-wrap gap-2">
              {PLANS.map((plan) => (
                <span
                  key={plan}
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                  style={{ backgroundColor: PLAN_BADGE[plan].bg, color: PLAN_BADGE[plan].color }}
                >
                  {PLAN_BADGE[plan].label}
                  <span className="opacity-80">({metrics.planCounts[plan]})</span>
                </span>
              ))}
            </div>
          </MetricCard>
        </div>
      ) : null}
    </div>
  );
}
