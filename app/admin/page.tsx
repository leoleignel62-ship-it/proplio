"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Euro, FileText, Gift, Loader2, UserPlus, Users } from "lucide-react";
import type { LocavioPlan } from "@/lib/plan-limits";

const ACCENT = "#7c3aed";
const TEXT = "#1a0533";
const MUTED = "#6b7280";

type AdminMetrics = {
  totalUsers: number;
  planCounts: Record<LocavioPlan, number>;
  mrr: number;
  mrrStarter: number;
  mrrPro: number;
  mrrExpert: number;
  newUsers7d: number;
  newUsers30d: number;
  parrainagesConvertis: number;
  activeUsers7d: number;
  activeUsers30d: number;
  churned: number;
  weeklyGrowth: { week: string; count: number }[];
  documentsTotal: number;
  documentsQuittances: number;
  documentsBaux: number;
  documentsEdl: number;
};

const PLANS: LocavioPlan[] = ["free", "starter", "pro", "expert"];

const PLAN_BADGE: Record<LocavioPlan, { bg: string; color: string; label: string }> = {
  free: { bg: "#e5e7eb", color: "#374151", label: "Free" },
  starter: { bg: "#dbeafe", color: "#1d4ed8", label: "Starter" },
  pro: { bg: "rgba(124,58,237,0.15)", color: ACCENT, label: "Pro" },
  expert: { bg: "#fef3c7", color: "#b45309", label: "Expert" },
};

function formatEur(value: number): string {
  return value.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatWeekLabel(week: string): string {
  return new Date(week).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
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

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide" style={{ color: MUTED }}>
      {children}
    </h2>
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

  const chartData = useMemo(
    () =>
      (metrics?.weeklyGrowth ?? []).map((row) => ({
        week: formatWeekLabel(row.week),
        count: row.count,
      })),
    [metrics?.weeklyGrowth],
  );

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
        <div className="space-y-10">
          <section>
            <SectionTitle>KPIs principaux</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <MetricCard icon={<Users size={18} />} label="Utilisateurs inscrits" value={metrics.totalUsers} />
              <MetricCard
                icon={<Euro size={18} />}
                label="MRR réel Stripe"
                value={`${metrics.mrr.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`}
              >
                <p className="mt-2 text-xs" style={{ color: MUTED }}>
                  Starter: {formatEur(metrics.mrrStarter)}€ · Pro: {formatEur(metrics.mrrPro)}€ · Expert:{" "}
                  {formatEur(metrics.mrrExpert)}€
                </p>
              </MetricCard>
              <MetricCard icon={<UserPlus size={18} />} label="Nouveaux (7 jours)" value={metrics.newUsers7d} />
              <MetricCard icon={<UserPlus size={18} />} label="Nouveaux (30 jours)" value={metrics.newUsers30d} />
              <MetricCard
                icon={<Gift size={18} />}
                label="Parrainages convertis"
                value={metrics.parrainagesConvertis}
              />
              <MetricCard
                icon={<FileText size={18} />}
                label="Documents générés"
                value={metrics.documentsTotal}
              >
                <p className="mt-2 text-xs" style={{ color: MUTED }}>
                  Quittances: {metrics.documentsQuittances} · Baux: {metrics.documentsBaux} · EDL:{" "}
                  {metrics.documentsEdl}
                </p>
              </MetricCard>
            </div>
          </section>

          <section>
            <SectionTitle>Répartition par plan</SectionTitle>
            <article
              className="rounded-xl border bg-white p-5 shadow-sm"
              style={{ borderColor: "rgba(124,58,237,0.12)" }}
            >
              <div className="flex flex-wrap gap-2">
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
              <div className="mt-5 space-y-3">
                {PLANS.map((plan) => {
                  const count = metrics.planCounts[plan];
                  const pct =
                    metrics.totalUsers > 0 ? Math.round((count / metrics.totalUsers) * 1000) / 10 : 0;
                  return (
                    <div key={plan}>
                      <div className="mb-1 flex items-center justify-between text-xs" style={{ color: MUTED }}>
                        <span className="font-medium" style={{ color: PLAN_BADGE[plan].color }}>
                          {PLAN_BADGE[plan].label}
                        </span>
                        <span>
                          {count} · {pct}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${metrics.totalUsers > 0 ? (count / metrics.totalUsers) * 100 : 0}%`,
                            backgroundColor: PLAN_BADGE[plan].color,
                            opacity: plan === "free" ? 0.35 : 0.85,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          </section>

          <section>
            <SectionTitle>Croissance utilisateurs (8 semaines)</SectionTitle>
            <article
              className="rounded-xl border bg-white p-5 shadow-sm"
              style={{ borderColor: "rgba(124,58,237,0.12)" }}
            >
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <XAxis
                      dataKey="week"
                      tick={{ fontSize: 11, fill: MUTED }}
                      axisLine={{ stroke: "rgba(124,58,237,0.15)" }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: MUTED }}
                      axisLine={false}
                      tickLine={false}
                      width={32}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${value} inscription${value > 1 ? "s" : ""}`, "Inscrits"]}
                      labelFormatter={(label) => `Semaine du ${label}`}
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid rgba(124,58,237,0.12)",
                        fontSize: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#7c3aed"
                      fill="rgba(124,58,237,0.15)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </article>
          </section>

          <section>
            <SectionTitle>Engagement et santé</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <MetricCard
                icon={<Users size={18} />}
                label="Utilisateurs actifs (7 jours)"
                value={
                  <>
                    {metrics.activeUsers7d} / {metrics.totalUsers}
                  </>
                }
              >
                <p className="mt-2 text-xs" style={{ color: MUTED }}>
                  utilisateurs actifs
                </p>
              </MetricCard>
              <MetricCard
                icon={<Users size={18} />}
                label="Churn (downgrade vers Free)"
                value={metrics.churned}
              >
                <p className="mt-2 text-xs" style={{ color: MUTED }}>
                  anciens clients payants (stripe_customer_id)
                </p>
              </MetricCard>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
