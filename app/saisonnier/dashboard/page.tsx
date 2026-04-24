"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  getAnneesDisponibles,
  getRevenusAnnuels,
  getReservationsStats,
  getRevenusParMois,
  getSourcesRepartition,
  getTauxOccupation,
} from "@/lib/saisonnier-dashboard-metrics";
import { PC } from "@/lib/proplio-colors";

const RevenusMensuelsChart = dynamic(
  () => import("./revenus-mensuels-chart").then((m) => m.RevenusMensuelsChart),
  { ssr: false },
);

type LogementOption = { id: string; nom: string };

const EMPTY_REVENUS = {
  revenusEncaisses: 0,
  revenusAVenir: 0,
  totalAnnuel: 0,
  revpan: 0,
  moyParReservation: 0,
  variationVsAnneePrec: 0,
};

const EMPTY_RES_STATS = { total: 0, terminees: 0, enCours: 0, aVenir: 0, annulees: 0 };
const EMPTY_OCC = {
  nuitsOccupees: 0,
  nuitsDisponibles: 0,
  tauxOccupation: 0,
  moisLePlusRentable: { mois: "-", revenus: 0 },
  moisLeMoinsRentable: { mois: "-", revenus: 0 },
};
const EMPTY_SOURCES = { airbnb: 0, direct: 0, booking: 0, autre: 0 };

export default function SaisonnierDashboardPage() {
  const currentYear = new Date().getFullYear();
  const [ownerId, setOwnerId] = useState<string>("");
  const [annees, setAnnees] = useState<number[]>([]);
  const [annee, setAnnee] = useState<number>(new Date().getFullYear());
  const [logements, setLogements] = useState<LogementOption[]>([]);
  const [logementId, setLogementId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const [revenus, setRevenus] = useState(EMPTY_REVENUS);
  const [stats, setStats] = useState(EMPTY_RES_STATS);
  const [occupation, setOccupation] = useState(EMPTY_OCC);
  const [sources, setSources] = useState(EMPTY_SOURCES);
  const [mensuel, setMensuel] = useState<Array<{ mois: string; revenus: number; nuits: number; nbReservations: number }>>([]);
  const [syncRefreshTick, setSyncRefreshTick] = useState(0);
  const hasAutoSyncedIcalRef = useRef(false);
  const [syncToast, setSyncToast] = useState<{ message: string; visible: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadOwner = async () => {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: proprietaire } = await supabase
        .from("proprietaires")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      const nextOwnerId = String(proprietaire?.id ?? "");
      if (!nextOwnerId || cancelled) return;
      setOwnerId(nextOwnerId);

      const [anneesList, logementsData] = await Promise.all([
        getAnneesDisponibles(supabase, nextOwnerId),
        supabase
          .from("logements")
          .select("id, nom, type_location, ical_airbnb_url, ical_booking_url")
          .eq("proprietaire_id", nextOwnerId),
      ]);

      if (cancelled) return;
      const mergedYears = Array.from(new Set([currentYear, ...anneesList])).sort((a, b) => b - a);
      setAnnees(mergedYears);
      setAnnee(mergedYears[0] ?? currentYear);
      setLogements(
        (logementsData.data ?? [])
          .filter((l) => l.type_location === "saisonnier" || l.type_location === "les_deux")
          .map((l) => ({ id: String(l.id), nom: String(l.nom ?? "Logement") })),
      );

      if (!hasAutoSyncedIcalRef.current) {
        hasAutoSyncedIcalRef.current = true;
        const logementsAvecIcal = (logementsData.data ?? [])
          .filter((l) => l.type_location === "saisonnier" || l.type_location === "les_deux")
          .map((l) => ({
            id: String(l.id),
            airbnb: String((l as { ical_airbnb_url?: string | null }).ical_airbnb_url ?? "").trim(),
            booking: String((l as { ical_booking_url?: string | null }).ical_booking_url ?? "").trim(),
          }))
          .filter((l) => l.airbnb.length > 0 || l.booking.length > 0);
        if (logementsAvecIcal.length > 0) {
          void (async () => {
            const results = await Promise.allSettled(
              logementsAvecIcal.map((logement) =>
                fetch("/api/saisonnier/ical-sync", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ logement_id: logement.id }),
                }),
              ),
            );
            const successCount = results.filter(
              (r) => r.status === "fulfilled" && r.value.ok,
            ).length;
            if (successCount > 0) {
              const message =
                successCount > 1
                  ? `${successCount} calendriers synchronisés avec Airbnb/Booking`
                  : "Calendrier synchronisé avec Airbnb/Booking";
              setSyncToast({ message, visible: true });
              window.setTimeout(() => {
                setSyncToast((prev) => (prev ? { ...prev, visible: false } : prev));
              }, 3000);
              window.setTimeout(() => setSyncToast(null), 3300);
            }
            setSyncRefreshTick((n) => n + 1);
          })().catch(() => {});
        }
      }
    };
    void loadOwner();
    return () => {
      cancelled = true;
    };
  }, [currentYear]);

  useEffect(() => {
    let cancelled = false;
    const loadMetrics = async () => {
      if (!ownerId) return;
      setLoading(true);
      const supabase = createSupabaseBrowserClient();
      const selectedLogement = logementId || undefined;
      const [revenusData, statsData, occupationData, mensuelData, sourcesData] = await Promise.all([
        getRevenusAnnuels(supabase, annee, ownerId, selectedLogement),
        getReservationsStats(supabase, annee, ownerId, selectedLogement),
        getTauxOccupation(supabase, annee, ownerId, selectedLogement),
        getRevenusParMois(supabase, annee, ownerId, selectedLogement),
        getSourcesRepartition(supabase, annee, ownerId, selectedLogement),
      ]);
      if (cancelled) return;
      setRevenus(revenusData);
      setStats(statsData);
      setOccupation(occupationData);
      setMensuel(mensuelData);
      setSources(sourcesData);
      setLoading(false);
    };
    void loadMetrics();
    return () => {
      cancelled = true;
    };
  }, [annee, logementId, ownerId, syncRefreshTick]);

  const totalMensuel = useMemo(
    () =>
      mensuel.reduce(
        (acc, row) => ({
          revenus: acc.revenus + row.revenus,
          nuits: acc.nuits + row.nuits,
          nbReservations: acc.nbReservations + row.nbReservations,
        }),
        { revenus: 0, nuits: 0, nbReservations: 0 },
      ),
    [mensuel],
  );

  const sourceSegments = [
    { label: "Airbnb", value: sources.airbnb, color: "#ff5a5f" },
    { label: "Direct", value: sources.direct, color: "#7c3aed" },
    { label: "Booking", value: sources.booking, color: "#003580" },
  ];
  const yearIndex = annees.findIndex((y) => y === annee);
  const canGoPreviousYear = yearIndex >= 0 && yearIndex < annees.length - 1;
  const canGoNextYear = yearIndex > 0;
  const hasReservationsForYear = stats.total > 0;

  return (
    <section className="proplio-page-wrap space-y-6" style={{ color: PC.text }}>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="proplio-page-title">Dashboard Saisonnier</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-md px-2 py-1 text-sm disabled:opacity-40"
            style={{ border: `1px solid ${PC.border}` }}
            disabled={!canGoPreviousYear}
            onClick={() => {
              if (!canGoPreviousYear) return;
              setAnnee(annees[yearIndex + 1] ?? annee);
            }}
          >
            {"<"}
          </button>
          <select className="rounded-md px-3 py-1.5 text-sm" style={{ backgroundColor: PC.card, border: `1px solid ${PC.border}` }} value={annee} onChange={(e) => setAnnee(Number(e.target.value))}>
            {annees.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="rounded-md px-2 py-1 text-sm disabled:opacity-40"
            style={{ border: `1px solid ${PC.border}` }}
            disabled={!canGoNextYear}
            onClick={() => {
              if (!canGoNextYear) return;
              setAnnee(annees[yearIndex - 1] ?? annee);
            }}
          >
            {">"}
          </button>
          <select className="rounded-md px-3 py-1.5 text-sm" style={{ backgroundColor: PC.card, border: `1px solid ${PC.border}` }} value={logementId} onChange={(e) => setLogementId(e.target.value)}>
            <option value="">Tous les logements</option>
            {logements.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nom}
              </option>
            ))}
          </select>
        </div>
      </header>
      {syncToast ? (
        <div
          className="fixed bottom-6 right-6 z-[90] flex items-center gap-2 px-3 py-2 text-sm"
          style={{
            backgroundColor: "#13131a",
            border: "1px solid #ffffff10",
            borderRadius: 8,
            color: "#e5e7eb",
            opacity: syncToast.visible ? 1 : 0,
            transform: syncToast.visible ? "translateY(0)" : "translateY(10px)",
            transition: "opacity 300ms ease, transform 300ms ease",
          }}
          role="status"
        >
          <span style={{ color: "#22c55e", fontWeight: 700 }}>✓</span>
          <span>{syncToast.message}</span>
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-xl p-6 text-sm" style={{ backgroundColor: PC.card, border: `1px solid ${PC.border}`, color: PC.muted }}>
          Chargement du dashboard...
        </div>
      ) : !hasReservationsForYear ? (
        <div className="rounded-xl p-6 text-sm" style={{ backgroundColor: PC.card, border: `1px solid ${PC.border}`, color: PC.muted }}>
          Aucune reservation pour {annee}.
        </div>
      ) : (
        <>
      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-xl p-4" style={{ backgroundColor: PC.card, border: `1px solid ${PC.border}` }}>
          <p className="text-sm" style={{ color: PC.muted }}>Revenus encaisses</p>
          <p className="mt-2 text-2xl font-bold text-green-500">{revenus.revenusEncaisses.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €</p>
          <p className="mt-1 text-xs" style={{ color: PC.muted }}>Variation vs annee precedente: {revenus.variationVsAnneePrec.toFixed(1)}%</p>
        </article>
        <article className="rounded-xl p-4" style={{ backgroundColor: PC.card, border: `1px solid ${PC.border}` }}>
          <p className="text-sm" style={{ color: PC.muted }}>Revenus a venir</p>
          <p className="mt-2 text-2xl font-bold" style={{ color: "#8b5cf6" }}>{revenus.revenusAVenir.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €</p>
        </article>
        <article className="rounded-xl p-4" style={{ backgroundColor: PC.card, border: `1px solid ${PC.border}` }}>
          <p className="text-sm" style={{ color: PC.muted }}>Total annuel</p>
          <p className="mt-2 text-2xl font-bold">{revenus.totalAnnuel.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €</p>
          <p className="mt-1 text-xs" style={{ color: PC.muted }}>
            RevPAN: {revenus.revpan.toFixed(1)}€/nuit · Moy. par reservation: {revenus.moyParReservation.toFixed(0)}€
          </p>
        </article>
      </section>

      <section className="flex flex-wrap gap-2 text-sm">
        <span className="rounded-full px-3 py-1" style={{ backgroundColor: PC.border }}>Total: {stats.total}</span>
        <span className="rounded-full px-3 py-1" style={{ backgroundColor: "rgba(34,197,94,0.2)", color: "#22c55e" }}>Terminees: {stats.terminees}</span>
        <span className="rounded-full px-3 py-1" style={{ backgroundColor: "rgba(59,130,246,0.2)", color: "#3b82f6" }}>En cours: {stats.enCours}</span>
        <span className="rounded-full px-3 py-1" style={{ backgroundColor: "rgba(139,92,246,0.2)", color: "#8b5cf6" }}>A venir: {stats.aVenir}</span>
        <span className="rounded-full px-3 py-1" style={{ backgroundColor: "rgba(239,68,68,0.2)", color: "#ef4444" }}>Annulees: {stats.annulees}</span>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-xl p-4" style={{ backgroundColor: PC.card, border: `1px solid ${PC.border}` }}>
          <h2 className="text-base font-semibold">Taux d&apos;occupation</h2>
          <p className="mt-2 text-2xl font-bold">{occupation.tauxOccupation.toFixed(1)}%</p>
          <div className="mt-2 h-2 rounded-full" style={{ backgroundColor: PC.border }}>
            <div className="h-2 rounded-full" style={{ width: `${Math.min(100, occupation.tauxOccupation)}%`, backgroundColor: "#7c3aed" }} />
          </div>
          <p className="mt-2 text-xs" style={{ color: PC.muted }}>{occupation.nuitsOccupees} nuits occupees sur {occupation.nuitsDisponibles} disponibles</p>
        </article>
        <article className="rounded-xl p-4" style={{ backgroundColor: PC.card, border: `1px solid ${PC.border}` }}>
          <h2 className="text-base font-semibold">Periodes cles</h2>
          <p className="mt-2 text-sm">📈 Mois le plus rentable: {occupation.moisLePlusRentable.mois} ({occupation.moisLePlusRentable.revenus.toFixed(0)}€)</p>
          <p className="mt-1 text-sm">📉 Mois le moins rentable: {occupation.moisLeMoinsRentable.mois} ({occupation.moisLeMoinsRentable.revenus.toFixed(0)}€)</p>
        </article>
      </section>

      <section className="rounded-xl p-4" style={{ backgroundColor: PC.card, border: `1px solid ${PC.border}` }}>
        <h2 className="text-base font-semibold">Repartition par source</h2>
        <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full">
          {sourceSegments.map((segment) => (
            <div key={segment.label} style={{ width: `${segment.value}%`, backgroundColor: segment.color }} />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-xs">
          {sourceSegments.map((segment) => (
            <span key={segment.label}>{segment.label}: {segment.value.toFixed(1)}%</span>
          ))}
          <span>Autre: {sources.autre.toFixed(1)}%</span>
        </div>
      </section>

      <section className="rounded-xl p-4" style={{ backgroundColor: PC.card, border: `1px solid ${PC.border}` }}>
        <h2 className="text-base font-semibold">Graphique mensuel</h2>
        <RevenusMensuelsChart data={mensuel} />
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr style={{ color: PC.muted }}>
                <th className="px-2 py-2 text-left">Mois</th>
                <th className="px-2 py-2 text-right">Reservations</th>
                <th className="px-2 py-2 text-right">Nuits occupees</th>
                <th className="px-2 py-2 text-right">Revenus</th>
              </tr>
            </thead>
            <tbody>
              {mensuel.map((row) => (
                <tr key={row.mois} style={{ borderTop: `1px solid ${PC.border}` }}>
                  <td className="px-2 py-2">{row.mois}</td>
                  <td className="px-2 py-2 text-right">{row.nbReservations}</td>
                  <td className="px-2 py-2 text-right">{row.nuits}</td>
                  <td className="px-2 py-2 text-right">{row.revenus.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €</td>
                </tr>
              ))}
              <tr className="font-semibold" style={{ borderTop: `1px solid ${PC.primary}`, color: "#7c3aed" }}>
                <td className="px-2 py-2">Total</td>
                <td className="px-2 py-2 text-right">{totalMensuel.nbReservations}</td>
                <td className="px-2 py-2 text-right">{totalMensuel.nuits}</td>
                <td className="px-2 py-2 text-right">{totalMensuel.revenus.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
        </>
      )}
    </section>
  );
}
