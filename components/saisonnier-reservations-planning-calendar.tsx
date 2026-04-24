"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatSubmitError } from "@/lib/supabase-submit-error";
import { supabase } from "@/lib/supabase";

const BG = "#0d0d14";
const BORDER_OUTER = "#ffffff08";
const COL_BORDER = "#ffffff04";
const COL_MIN = 40;
const LEFT_COL_BG = "#13131a";
const LEFT_COL_BORDER = "#ffffff10";

function sourceGradient(source: string): string {
  switch (source) {
    case "direct":
      return "linear-gradient(145deg, #a78bfa 0%, #7c3aed 42%, #5b21b6 100%)";
    case "airbnb":
      return "linear-gradient(145deg, #ff8a84 0%, #ff5a5f 45%, #dc2626 100%)";
    case "booking":
      return "linear-gradient(145deg, #1e4a9e 0%, #003580 45%, #001e4d 100%)";
    case "blocage":
      return "linear-gradient(145deg, #94a3b8 0%, #64748b 50%, #475569 100%)";
    default:
      return "linear-gradient(145deg, #a78bfa 0%, #8b5cf6 45%, #6d28d9 100%)";
  }
}

export type PlanningCalendarLogement = { id: string; nom: string };

export type PlanningCalendarReservation = {
  id: string;
  logement_id: string;
  date_arrivee: string;
  date_depart: string;
  source: string;
  voyageurs?: { prenom: string; nom: string } | null;
};

export type SaisonnierReservationsPlanningCalendarProps = {
  proprietaireId: string;
  logements: PlanningCalendarLogement[];
  reservationRevision: number;
  onOpenDetail: (reservationId: string) => void;
  onEmptyCellClick: (logementId: string, dateIso: string) => void;
};

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysIso(iso: string, delta: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return toIsoDate(d);
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function firstOfMonthIso(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`;
}

function lastOfMonthIso(year: number, monthIndex: number): string {
  const d = new Date(year, monthIndex + 1, 0);
  return toIsoDate(d);
}

function daysBetweenInclusiveStart(aIso: string, bIso: string): number {
  const a = new Date(`${aIso}T12:00:00`).getTime();
  const b = new Date(`${bIso}T12:00:00`).getTime();
  return Math.round((b - a) / 86400000);
}

function capitalizeFr(s: string): string {
  const t = s.trim();
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function monthYearLabelFr(year: number, monthIndex: number): string {
  const d = new Date(year, monthIndex, 1);
  const raw = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(d);
  return capitalizeFr(raw);
}

function blockLabel(r: PlanningCalendarReservation): string {
  if (r.voyageurs) {
    const n = `${r.voyageurs.prenom ?? ""} ${r.voyageurs.nom ?? ""}`.trim();
    if (n) return n;
  }
  if (r.source === "airbnb") return "Airbnb";
  if (r.source === "booking") return "Booking";
  if (r.source === "blocage") return "Blocage";
  return "Autre";
}

function reservationSpanOnGrid(
  gridStartIso: string,
  r: PlanningCalendarReservation,
  visibleDays: number,
): { start: number; endExclusive: number } | null {
  const idxStart = Math.max(0, daysBetweenInclusiveStart(gridStartIso, r.date_arrivee));
  const idxEndExclusive = Math.min(visibleDays, daysBetweenInclusiveStart(gridStartIso, r.date_depart));
  if (idxEndExclusive <= idxStart) return null;
  return { start: idxStart, endExclusive: idxEndExclusive };
}

function overlapsMonth(dateArrivee: string, dateDepart: string, monthStart: string, monthEnd: string): boolean {
  return dateArrivee <= monthEnd && dateDepart > monthStart;
}

function IconChevronLeft({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="26" height="26" aria-hidden fill="none">
      <path
        d="M15 18l-6-6 6-6"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="26" height="26" aria-hidden fill="none">
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconFilter({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="17" height="17" aria-hidden fill="currentColor">
      <path d="M10 18h4v-2h-4v2zM3 6h18v2H3V6zm3 7h12v2H6v-2z" />
    </svg>
  );
}

export function SaisonnierReservationsPlanningCalendar({
  proprietaireId,
  logements,
  reservationRevision,
  onOpenDetail,
  onEmptyCellClick,
}: SaisonnierReservationsPlanningCalendarProps) {
  const now = new Date();
  const [yearMonth, setYearMonth] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [filterLogementId, setFilterLogementId] = useState("");
  const [rows, setRows] = useState<PlanningCalendarReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const gridStartIso = useMemo(() => firstOfMonthIso(yearMonth.year, yearMonth.month), [yearMonth]);
  const visibleDays = useMemo(() => daysInMonth(yearMonth.year, yearMonth.month), [yearMonth]);
  const monthEndIso = useMemo(() => lastOfMonthIso(yearMonth.year, yearMonth.month), [yearMonth]);
  const todayIso = useMemo(() => toIsoDate(new Date()), []);

  const monthYearTitle = useMemo(
    () => monthYearLabelFr(yearMonth.year, yearMonth.month),
    [yearMonth.year, yearMonth.month],
  );

  const dayHeaders = useMemo(() => {
    const list: { iso: string; weekdayShort: string; dayNum: string; isToday: boolean }[] = [];
    for (let i = 0; i < visibleDays; i++) {
      const iso = addDaysIso(gridStartIso, i);
      const d = new Date(`${iso}T12:00:00`);
      const weekdayShort = new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(d).replace(/\.$/, "");
      const dayNum = String(d.getDate());
      list.push({ iso, weekdayShort: capitalizeFr(weekdayShort), dayNum, isToday: iso === todayIso });
    }
    return list;
  }, [gridStartIso, visibleDays, todayIso]);

  const logementsRows = useMemo(() => {
    if (!filterLogementId) return logements;
    return logements.filter((l) => l.id === filterLogementId);
  }, [logements, filterLogementId]);

  const countsByLogement = useMemo(() => {
    const map = new Map<string, number>();
    for (const lg of logementsRows) map.set(lg.id, 0);
    for (const r of rows) {
      if (!overlapsMonth(r.date_arrivee, r.date_depart, gridStartIso, monthEndIso)) continue;
      if (!map.has(r.logement_id)) continue;
      map.set(r.logement_id, (map.get(r.logement_id) ?? 0) + 1);
    }
    return map;
  }, [rows, logementsRows, gridStartIso, monthEndIso]);

  const loadWindow = useCallback(async () => {
    setLoading(true);
    setFetchError("");
    const fetchStart = addDaysIso(gridStartIso, -14);
    const fetchEndLast = addDaysIso(monthEndIso, 14);

    let q = supabase
      .from("reservations")
      .select("id, logement_id, date_arrivee, date_depart, source, voyageurs(prenom, nom)")
      .eq("proprietaire_id", proprietaireId)
      .neq("source", "blocage")
      .lte("date_arrivee", fetchEndLast)
      .gt("date_depart", fetchStart)
      .order("date_arrivee", { ascending: true });

    if (filterLogementId) {
      q = q.eq("logement_id", filterLogementId);
    }

    const { data, error } = await q;
    if (error) {
      setFetchError(formatSubmitError(error));
      setRows([]);
      setLoading(false);
      return;
    }

    const normalized: PlanningCalendarReservation[] = (data ?? []).map((raw) => {
      const rec = raw as Record<string, unknown>;
      const vg = rec.voyageurs;
      const vj = Array.isArray(vg)
        ? (vg[0] as { prenom?: string; nom?: string })
        : (vg as { prenom?: string; nom?: string } | null);
      return {
        id: String(rec.id),
        logement_id: String(rec.logement_id),
        date_arrivee: String(rec.date_arrivee),
        date_depart: String(rec.date_depart),
        source: String(rec.source ?? "direct"),
        voyageurs: vj
          ? { prenom: String(vj.prenom ?? ""), nom: String(vj.nom ?? "") }
          : null,
      };
    });
    setRows(normalized);
    setLoading(false);
  }, [proprietaireId, gridStartIso, monthEndIso, filterLogementId, reservationRevision]);

  useEffect(() => {
    void loadWindow();
  }, [loadWindow]);

  function goMonth(delta: number) {
    setYearMonth(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  function goToday() {
    const d = new Date();
    setYearMonth({ year: d.getFullYear(), month: d.getMonth() });
  }

  const gridWidth = visibleDays * COL_MIN;

  return (
    <div
      className="overflow-hidden rounded-xl text-sm"
      style={{ backgroundColor: BG, border: `1px solid ${BORDER_OUTER}`, color: "#e4e4e7" }}
    >
      <div
        className="flex flex-col gap-4 border-b px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-4"
        style={{ borderColor: BORDER_OUTER }}
      >
        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start sm:gap-3">
          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-zinc-200 transition duration-150 hover:bg-white/[0.08] hover:text-white active:scale-[0.97]"
            style={{ border: `1px solid ${COL_BORDER}` }}
            onClick={() => goMonth(-1)}
            aria-label="Mois précédent"
          >
            <IconChevronLeft />
          </button>
          <h2 className="min-w-[10rem] text-center text-base font-semibold tracking-tight text-white sm:min-w-[12rem] sm:text-lg">
            {monthYearTitle}
          </h2>
          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-zinc-200 transition duration-150 hover:bg-white/[0.08] hover:text-white active:scale-[0.97]"
            style={{ border: `1px solid ${COL_BORDER}` }}
            onClick={() => goMonth(1)}
            aria-label="Mois suivant"
          >
            <IconChevronRight />
          </button>
          <button
            type="button"
            className="ml-0 rounded-full px-4 py-2 text-xs font-semibold text-white shadow-md transition duration-150 hover:brightness-110 active:scale-[0.98] sm:ml-2"
            style={{
              background: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
              boxShadow: "0 2px 12px rgba(124, 58, 237, 0.35)",
            }}
            onClick={goToday}
          >
            Aujourd&apos;hui
          </button>
        </div>

        <div className="relative w-full sm:w-auto sm:min-w-[240px]">
          <span className="pointer-events-none absolute left-3.5 top-1/2 z-[1] -translate-y-1/2 text-zinc-500" aria-hidden>
            <IconFilter className="block" />
          </span>
          <label className="sr-only" htmlFor="planning-filter-logement">
            Filtrer par logement
          </label>
          <select
            id="planning-filter-logement"
            className="w-full appearance-none rounded-xl py-3 pl-11 pr-10 text-sm font-medium outline-none transition duration-150 focus:ring-2 focus:ring-violet-500/40"
            style={{
              backgroundColor: "#0f0f16",
              border: `1px solid ${LEFT_COL_BORDER}`,
              color: "#fafafa",
              colorScheme: "dark",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
            value={filterLogementId}
            onChange={(e) => setFilterLogementId(e.target.value)}
          >
            <option value="">Tous les logements</option>
            {logements.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nom}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500" aria-hidden>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </div>

      {fetchError ? (
        <p className="px-4 py-2 text-xs" style={{ color: "#f87171" }}>
          {fetchError}
        </p>
      ) : null}
      {loading ? (
        <p className="px-4 py-8 text-center text-xs text-zinc-500">Chargement du planning…</p>
      ) : (
        <div
          className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]"
          style={{ touchAction: "pan-x pinch-zoom" }}
        >
          <div className="inline-flex min-w-max align-top">
            <div
              className="sticky left-0 z-30 w-[168px] shrink-0 border-r"
              style={{ backgroundColor: LEFT_COL_BG, borderColor: LEFT_COL_BORDER }}
            >
              <div
                className="flex items-end border-b px-3 pb-2.5 pt-3 text-[11px] font-medium uppercase tracking-wide text-zinc-500"
                style={{ borderColor: COL_BORDER, minHeight: 64 }}
              >
                Logement
              </div>
              {logementsRows.map((lg, rowIdx) => {
                const count = countsByLogement.get(lg.id) ?? 0;
                return (
                  <div
                    key={lg.id}
                    className="flex flex-col justify-center gap-1.5 border-b px-3 py-2"
                    style={{
                      borderColor: COL_BORDER,
                      minHeight: 56,
                      backgroundColor: rowIdx % 2 === 1 ? "rgba(255,255,255,0.02)" : "transparent",
                    }}
                  >
                    <span className="line-clamp-2 text-[13px] font-bold leading-snug text-white">{lg.nom}</span>
                    <span
                      className="w-fit rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-zinc-300"
                      style={{ backgroundColor: "rgba(124, 58, 237, 0.2)", color: "#c4b5fd" }}
                    >
                      {count} réservation{count === 1 ? "" : "s"} ce mois
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="shrink-0" style={{ width: gridWidth }}>
              <div
                className="grid border-b"
                style={{
                  gridTemplateColumns: `repeat(${visibleDays}, minmax(${COL_MIN}px, 1fr))`,
                  borderColor: COL_BORDER,
                  minHeight: 64,
                }}
              >
                {dayHeaders.map((h) => (
                  <div
                    key={h.iso}
                    className="flex flex-col items-center justify-end gap-0.5 border-r px-0.5 pb-2 pt-2 text-center"
                    style={{ borderColor: COL_BORDER }}
                  >
                    <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                      {h.weekdayShort}
                    </span>
                    {h.isToday ? (
                      <span
                        className="flex h-8 w-8 items-center justify-center text-sm font-bold text-white"
                        style={{
                          borderRadius: "9999px",
                          background: "linear-gradient(145deg, #8b5cf6, #6d28d9)",
                          boxShadow: "0 2px 8px rgba(124, 58, 237, 0.45)",
                        }}
                      >
                        {h.dayNum}
                      </span>
                    ) : (
                      <span className="pb-0.5 text-[15px] font-semibold tabular-nums text-zinc-100">{h.dayNum}</span>
                    )}
                  </div>
                ))}
              </div>

              {logementsRows.map((lg, rowIdx) => {
                const forLogement = rows.filter((r) => r.logement_id === lg.id);
                const rowBg = rowIdx % 2 === 1 ? "rgba(255,255,255,0.02)" : "transparent";
                return (
                  <div
                    key={lg.id}
                    className="grid border-b"
                    style={{
                      gridTemplateColumns: `repeat(${visibleDays}, minmax(${COL_MIN}px, 1fr))`,
                      gridTemplateRows: "minmax(56px, auto)",
                      borderColor: COL_BORDER,
                      backgroundColor: rowBg,
                    }}
                  >
                    {dayHeaders.map((h, i) => (
                      <button
                        key={`${lg.id}-${h.iso}`}
                        type="button"
                        className="border-r transition-colors duration-150 hover:bg-white/[0.04]"
                        style={{
                          gridColumn: i + 1,
                          gridRow: 1,
                          zIndex: 1,
                          borderColor: COL_BORDER,
                          backgroundColor: h.isToday ? "rgba(124, 58, 237, 0.06)" : "transparent",
                          minHeight: 56,
                        }}
                        aria-label={`Nouvelle réservation ${lg.nom} le ${h.iso}`}
                        onClick={() => onEmptyCellClick(lg.id, h.iso)}
                      />
                    ))}
                    {forLogement.map((r) => {
                      const span = reservationSpanOnGrid(gridStartIso, r, visibleDays);
                      if (!span) return null;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          className="flex cursor-pointer items-center justify-center overflow-hidden px-1.5 text-center text-[11px] font-semibold leading-tight text-white transition duration-150 ease-out hover:z-[3] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,0,0,0.42)] active:translate-y-0"
                          style={{
                            gridColumn: `${span.start + 1} / ${span.endExclusive + 1}`,
                            gridRow: 1,
                            zIndex: 2,
                            height: 36,
                            marginTop: "auto",
                            marginBottom: "auto",
                            alignSelf: "center",
                            background: sourceGradient(r.source),
                            borderRadius: 8,
                            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                          }}
                          title={blockLabel(r)}
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenDetail(r.id);
                          }}
                        >
                          <span className="line-clamp-2 w-full text-center">{blockLabel(r)}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
