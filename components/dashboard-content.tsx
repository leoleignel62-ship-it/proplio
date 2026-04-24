"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { IconBuilding, IconContract, IconDocument, IconUsers } from "@/components/proplio-icons";
import { isProprietaireOnboardingIncomplete } from "@/lib/proprietaire-profile";
import { BtnPrimary } from "@/components/ui";
import { PC } from "@/lib/proplio-colors";
import type { SupabaseClient } from "@supabase/supabase-js";

type DashboardStats = {
  logements: number;
  locataires: number;
  quittancesEnvoyeesCeMois: number;
  bauxActifs: number;
};

type FinancialMetrics = {
  potentielTotal: number;
  encaisseMois: number;
  manque: number;
  totalLogements: number;
  logementsLouesCeMois: number;
  chambresLouees: number;
  logementsVacants: number;
  chambresDisponibles: number;
  tauxRemplissage: number;
};

type AnnualChartData = {
  labels: string[];
  encaisses: number[];
  manque: number[];
  potentiel: number[];
};

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Avr", "Mai", "Jun", "Jul", "Aou", "Sep", "Oct", "Nov", "Dec"];

function emptyDashboardStats(): DashboardStats {
  return { logements: 0, locataires: 0, quittancesEnvoyeesCeMois: 0, bauxActifs: 0 };
}

function emptyFinancialMetrics(): FinancialMetrics {
  return {
    potentielTotal: 0,
    encaisseMois: 0,
    manque: 0,
    totalLogements: 0,
    logementsLouesCeMois: 0,
    chambresLouees: 0,
    logementsVacants: 0,
    chambresDisponibles: 0,
    tauxRemplissage: 0,
  };
}

function emptyAnnualChart(): AnnualChartData {
  const zeros = Array.from({ length: 12 }, () => 0);
  return { labels: [...MONTH_LABELS], encaisses: zeros, manque: zeros, potentiel: zeros };
}

async function getCount(supabase: SupabaseClient, table: string, ownerId: string) {
  try {
    const { count, error } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("proprietaire_id", ownerId);

    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

async function getBauxActifsCount(supabase: SupabaseClient, ownerId: string) {
  try {
    const { count, error } = await supabase
      .from("baux")
      .select("id", { count: "exact", head: true })
      .eq("proprietaire_id", ownerId)
      .eq("statut", "actif");

    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

async function getQuittancesEnvoyeesCeMois(supabase: SupabaseClient, ownerId: string) {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from("quittances")
      .select("id", { count: "exact", head: true })
      .eq("proprietaire_id", ownerId)
      .eq("envoyee", true)
      .gte("created_at", startOfMonth.toISOString());

    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

async function getDashboardStats(supabase: SupabaseClient, ownerId: string): Promise<DashboardStats> {
  try {
    const [logements, locataires, quittancesEnvoyeesCeMois, bauxActifs] = await Promise.all([
      getCount(supabase, "logements", ownerId),
      getCount(supabase, "locataires", ownerId),
      getQuittancesEnvoyeesCeMois(supabase, ownerId),
      getBauxActifsCount(supabase, ownerId),
    ]);

    return {
      logements,
      locataires,
      quittancesEnvoyeesCeMois,
      bauxActifs,
    };
  } catch {
    return emptyDashboardStats();
  }
}

async function getFinancialAndAnnual(
  supabase: SupabaseClient,
  ownerId: string,
): Promise<{ financial: FinancialMetrics; annual: AnnualChartData }> {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const [logRes, locRes, quitRes] = await Promise.all([
      supabase
        .from("logements")
        .select("id, loyer, charges, est_colocation, nombre_chambres, chambres_details")
        .eq("proprietaire_id", ownerId),
      supabase
        .from("locataires")
        .select("logement_id, colocation_chambre_index")
        .eq("proprietaire_id", ownerId),
      supabase
        .from("quittances")
        .select("total, envoyee, mois, annee, logement_id")
        .eq("proprietaire_id", ownerId),
    ]);

    const logements = logRes.data ?? [];
    const locataires = locRes.data ?? [];
    const quittances = quitRes.data ?? [];

    const locatairesByLogement = new Map<string, Array<{ colocation_chambre_index: number | null }>>();
    for (const loc of locataires) {
      const logementId = loc.logement_id as string | null;
      if (!logementId) continue;
      const arr = locatairesByLogement.get(logementId) ?? [];
      arr.push({ colocation_chambre_index: (loc.colocation_chambre_index as number | null) ?? null });
      locatairesByLogement.set(logementId, arr);
    }

    const potentielTotal = logements.reduce((sum, row) => {
      const isColocation = Boolean(row.est_colocation);
      const charges = Number(row.charges ?? 0);
      if (!isColocation) return sum + Number(row.loyer ?? 0) + charges;
      const chambres = Array.isArray(row.chambres_details) ? row.chambres_details : [];
      const loyerChambres = chambres.reduce((acc, ch) => acc + Number((ch as { loyer?: number }).loyer ?? 0), 0);
      const loyerFallback = Number(row.loyer ?? 0);
      const totalColocation = loyerChambres > 0 ? loyerChambres : loyerFallback;
      return sum + totalColocation + charges;
    }, 0);

    const quittancesCeMois = quittances.filter(
      (q) => q.envoyee && Number(q.mois) === currentMonth && Number(q.annee) === currentYear,
    );
    const encaisseMois = quittancesCeMois.reduce((sum, q) => sum + Number(q.total ?? 0), 0);

    const logementsLouesCeMois = new Set(
      quittancesCeMois.map((q) => (q as { logement_id?: string | null }).logement_id).filter(Boolean),
    ).size;

    let chambresDisponibles = 0;
    for (const row of logements) {
      if (!row.est_colocation) continue;
      const declaredRooms = Math.max(1, Number(row.nombre_chambres ?? 0));
      const detailRooms = Array.isArray(row.chambres_details) ? row.chambres_details.length : 0;
      const totalRooms = Math.max(declaredRooms, detailRooms || 1);
      const occupied = (locatairesByLogement.get(String(row.id)) ?? []).filter(
        (l) => l.colocation_chambre_index != null && l.colocation_chambre_index >= 1,
      ).length;
      chambresDisponibles += Math.max(0, totalRooms - occupied);
    }
    const chambresLouees = (locataires as Array<{ colocation_chambre_index: number | null }>).filter(
      (l) => l.colocation_chambre_index != null && l.colocation_chambre_index >= 1,
    ).length;

    const totalLogements = logements.length;
    const logementsVacants = logements.filter((logement) => {
      const logementId = String(logement.id);
      const assigned = locatairesByLogement.get(logementId) ?? [];
      return assigned.length === 0;
    }).length;
    const manque = potentielTotal - encaisseMois;
    const tauxRemplissage = potentielTotal > 0 ? Math.min(100, (encaisseMois / potentielTotal) * 100) : 0;

    const encaissesByMonth = Array.from({ length: 12 }, () => 0);
    for (const q of quittances) {
      if (!q.envoyee || Number(q.annee) !== currentYear) continue;
      const idx = Number(q.mois) - 1;
      if (idx >= 0 && idx < 12) encaissesByMonth[idx] += Number(q.total ?? 0);
    }
    const potentielByMonth = Array.from({ length: 12 }, () => potentielTotal);
    const manqueByMonth = encaissesByMonth.map((v) => Math.max(0, potentielTotal - v));

    return {
      financial: {
        potentielTotal,
        encaisseMois,
        manque,
        totalLogements,
        logementsLouesCeMois,
        chambresLouees,
        logementsVacants,
        chambresDisponibles,
        tauxRemplissage,
      },
      annual: {
        labels: [...MONTH_LABELS],
        encaisses: encaissesByMonth,
        manque: manqueByMonth,
        potentiel: potentielByMonth,
      },
    };
  } catch {
    return {
      financial: emptyFinancialMetrics(),
      annual: emptyAnnualChart(),
    };
  }
}

function StatCard({
  titre,
  valeur,
  description,
  icon: Icon,
  iconTint,
}: {
  titre: string;
  valeur: number;
  description: string;
  icon: typeof IconBuilding;
  iconTint: string;
}) {
  return (
    <article
      className="relative overflow-hidden p-5 transition-shadow duration-200 ease-out"
      style={{
        backgroundColor: PC.card,
        border: `1px solid ${PC.border}`,
        borderRadius: 12,
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.25)",
      }}
    >
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 pr-2">
          <p className="text-[13px] font-medium leading-snug" style={{ color: PC.muted }}>
            {titre}
          </p>
          <p className="mt-2 text-3xl font-extrabold tabular-nums tracking-[-0.03em] sm:text-[34px]" style={{ color: PC.text }}>
            {valeur}
          </p>
          <p className="mt-2 text-sm font-normal leading-[1.6]" style={{ color: PC.muted }}>
            {description}
          </p>
        </div>
        <span
          className="flex shrink-0 items-center justify-center"
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: `${iconTint}22`,
            color: iconTint,
            border: `1px solid rgba(255,255,255,0.08)`,
          }}
        >
          <Icon className="!h-5 !w-5 shrink-0" aria-hidden />
        </span>
      </div>
    </article>
  );
}

export function DashboardContent() {
  const router = useRouter();
  const [prenom, setPrenom] = useState("");
  const [showProfileOnboardingBanner, setShowProfileOnboardingBanner] = useState(false);
  const [stats, setStats] = useState<DashboardStats>(emptyDashboardStats);
  const [financial, setFinancial] = useState<FinancialMetrics>(emptyFinancialMetrics);
  const [annual, setAnnual] = useState<AnnualChartData>(emptyAnnualChart);

  const annualChartRows = useMemo(
    () =>
      annual.labels.map((label, i) => ({
        mois: label,
        encaisses: annual.encaisses[i] ?? 0,
        manque: annual.manque[i] ?? 0,
        potentiel: annual.potentiel[i] ?? 0,
      })),
    [annual],
  );

  useEffect(() => {
    let cancelled = false;

    function resetToZeros() {
      setStats(emptyDashboardStats());
      setFinancial(emptyFinancialMetrics());
      setAnnual(emptyAnnualChart());
    }

    async function load() {
      try {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user || cancelled) {
          if (!cancelled) resetToZeros();
          return;
        }

        const { data: proprietaire, error: propError } = await supabase
          .from("proprietaires")
          .select("id, prenom, nom, adresse")
          .eq("user_id", user.id)
          .maybeSingle();

        if (propError || cancelled) {
          if (!cancelled) resetToZeros();
          return;
        }

        const name = (proprietaire?.prenom as string | undefined)?.trim() ?? "";
        if (!cancelled) setPrenom(name);

        const incomplete = isProprietaireOnboardingIncomplete({
          nom: String(proprietaire?.nom ?? ""),
          prenom: String(proprietaire?.prenom ?? ""),
          adresse: String(proprietaire?.adresse ?? ""),
        });
        if (!cancelled) setShowProfileOnboardingBanner(incomplete);

        const ownerId = proprietaire?.id as string | undefined;
        if (!ownerId || cancelled) {
          if (!cancelled) resetToZeros();
          return;
        }

        const [dashboardStats, derived] = await Promise.all([
          getDashboardStats(supabase, ownerId),
          getFinancialAndAnnual(supabase, ownerId),
        ]);

        if (cancelled) return;
        setStats(dashboardStats);
        setFinancial(derived.financial);
        setAnnual(derived.annual);
      } catch {
        if (!cancelled) resetToZeros();
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const dateLong = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <>
      {showProfileOnboardingBanner ? (
        <div
          className="flex flex-col gap-4 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between"
          style={{
            backgroundColor: PC.primaryBg10,
            border: `1px solid ${PC.primaryBorder40}`,
            boxShadow: PC.cardShadow,
          }}
        >
          <p className="text-sm leading-relaxed" style={{ color: PC.text }}>
            👤 Complétez votre profil propriétaire pour que vos quittances et baux soient générés correctement.
          </p>
          <BtnPrimary className="shrink-0" onClick={() => router.push("/parametres")}>
            Compléter mon profil
          </BtnPrimary>
        </div>
      ) : null}

      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="proplio-page-title">{`Bonjour${prenom ? ` ${prenom}` : ""}`}</h1>
          <p className="proplio-page-subtitle capitalize">{dateLong}</p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          titre="Logements actifs"
          valeur={stats.logements}
          description="Biens enregistrés sur Proplio."
          icon={IconBuilding}
          iconTint={PC.primaryLight}
        />
        <StatCard
          titre="Locataires actifs"
          valeur={stats.locataires}
          description="Profils locataires suivis."
          icon={IconUsers}
          iconTint={PC.secondary}
        />
        <StatCard
          titre="Quittances ce mois"
          valeur={stats.quittancesEnvoyeesCeMois}
          description="Marquées comme envoyées."
          icon={IconDocument}
          iconTint={PC.success}
        />
        <StatCard
          titre="Baux actifs"
          valeur={stats.bauxActifs}
          description="Contrats au statut actif."
          icon={IconContract}
          iconTint={PC.primary}
        />
      </div>

      <section
        className="space-y-4 p-5 sm:p-6"
        style={{ backgroundColor: PC.card, border: `1px solid ${PC.border}`, borderRadius: 12, boxShadow: PC.cardShadow }}
      >
        <h2 className="text-lg font-semibold" style={{ color: PC.text }}>
          Suivi financier — {new Intl.DateTimeFormat("fr-FR", { month: "long" }).format(new Date())}
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          <article className="rounded-xl p-4" style={{ backgroundColor: PC.primaryBg10, border: `1px solid ${PC.primaryBorder40}` }}>
            <p className="text-xs font-medium" style={{ color: PC.secondary }}>Potentiel total du parc</p>
            <p className="mt-2 text-2xl font-semibold" style={{ color: PC.primary }}>{financial.potentielTotal.toLocaleString("fr-FR")} €</p>
            <p className="mt-1 text-xs" style={{ color: PC.muted }}>{financial.totalLogements} logement(s) total</p>
          </article>
          <article className="rounded-xl p-4" style={{ backgroundColor: PC.successBg10, border: `1px solid ${PC.borderSuccess40}` }}>
            <p className="text-xs font-medium" style={{ color: PC.success }}>Actuellement encaissé</p>
            <p className="mt-2 text-2xl font-semibold" style={{ color: PC.success }}>{financial.encaisseMois.toLocaleString("fr-FR")} €</p>
            <p className="mt-1 text-xs" style={{ color: PC.muted }}>
              {financial.logementsLouesCeMois} logements · {financial.chambresLouees} chambres louées
            </p>
          </article>
          <article className="rounded-xl p-4" style={{ backgroundColor: PC.dangerBg10, border: `1px solid ${PC.borderDanger40}` }}>
            <p className="text-xs font-medium" style={{ color: PC.danger }}>Manque à gagner</p>
            <p className="mt-2 text-2xl font-semibold" style={{ color: PC.danger }}>{financial.manque.toLocaleString("fr-FR")} €</p>
            <p className="mt-1 text-xs" style={{ color: PC.muted }}>
              {financial.logementsVacants} logement(s) vacant(s) · {financial.chambresDisponibles} chambre(s) disponible(s)
            </p>
          </article>
        </div>
        <div className="space-y-2 rounded-xl p-4" style={{ backgroundColor: PC.bg, border: `1px solid ${PC.border}` }}>
          <div className="h-3 w-full overflow-hidden rounded-full" style={{ backgroundColor: PC.border }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(0, Math.min(100, financial.tauxRemplissage))}%`,
                background: `linear-gradient(90deg, ${PC.primary} 0%, ${PC.success} 100%)`,
              }}
            />
          </div>
          <div className="flex items-center justify-between text-xs" style={{ color: PC.muted }}>
            <span>0€</span>
            <span>{Math.round(financial.tauxRemplissage)}%</span>
            <span>Objectif : {financial.potentielTotal.toLocaleString("fr-FR")}€</span>
          </div>
        </div>
      </section>

      <section
        className="space-y-4 p-5 sm:p-6"
        style={{ backgroundColor: PC.card, border: `1px solid ${PC.border}`, borderRadius: 12, boxShadow: PC.cardShadow }}
      >
        <h2 className="text-lg font-semibold" style={{ color: PC.text }}>
          Revenus {new Date().getFullYear()}
        </h2>
        <div>
          <div className="min-h-[300px] w-full min-w-0" style={{ position: "relative", height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={annualChartRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgba(144, 144, 168, 0.12)" vertical={false} />
                <XAxis dataKey="mois" tick={{ fill: PC.muted, fontSize: 12 }} axisLine={{ stroke: "rgba(144, 144, 168, 0.12)" }} tickLine={false} />
                <YAxis
                  tick={{ fill: PC.muted, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${Number(v).toLocaleString("fr-FR")} €`}
                />
                <Tooltip
                  cursor={{ fill: "rgba(144, 144, 168, 0.06)" }}
                  formatter={(value, name) => {
                    const n = Number(value ?? 0);
                    const titre: Record<string, string> = {
                      encaisses: "Revenus encaissés",
                      manque: "Manque à gagner",
                      potentiel: "Potentiel total",
                    };
                    const key = String(name);
                    return [`${n.toLocaleString("fr-FR")} €`, titre[key] ?? key];
                  }}
                  labelStyle={{ color: PC.text }}
                  contentStyle={{
                    backgroundColor: PC.card,
                    border: `1px solid ${PC.border}`,
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="encaisses" name="encaisses" fill={PC.primary} radius={[6, 6, 0, 0]} maxBarSize={40} />
                <Bar dataKey="manque" name="manque" fill="rgba(239, 68, 68, 0.25)" radius={[6, 6, 0, 0]} maxBarSize={40} />
                <Line
                  type="monotone"
                  dataKey="potentiel"
                  name="potentiel"
                  stroke={PC.warning}
                  strokeWidth={2}
                  strokeDasharray="6 6"
                  dot={false}
                  activeDot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-xs">
            <span style={{ color: PC.muted }}>
              <span style={{ color: PC.primary, fontWeight: 700 }}>■</span> Revenus encaissés
            </span>
            <span style={{ color: PC.muted }}>
              <span style={{ color: "rgba(239, 68, 68, 0.7)", fontWeight: 700 }}>■</span> Manque à gagner
            </span>
            <span style={{ color: PC.muted }}>
              <span style={{ color: PC.warning, fontWeight: 700 }}>━</span> Potentiel total
            </span>
          </div>
        </div>
      </section>
    </>
  );
}
