"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatSubmitError } from "@/lib/supabase-submit-error";
import { supabase } from "@/lib/supabase";

const BG = "#0d0d14";
const BORDER = "#ffffff08";
const TODAY_BG = "#7c3aed15";
const TODAY_TEXT = "#a78bfa";
const WEEKEND_BG = "rgba(255,255,255,0.03)";
const COL_MIN = 32;
const VISIBLE_DAYS = 35;

const SOURCE_COLORS: Record<string, string> = {
  direct: "#7c3aed",
  airbnb: "#ff5a5f",
  booking: "#003580",
  blocage: "#64748b",
  autre: "#8b5cf6",
};

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

function startOfMondayWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

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

function daysBetweenInclusiveStart(aIso: string, bIso: string): number {
  const a = new Date(`${aIso}T12:00:00`).getTime();
  const b = new Date(`${bIso}T12:00:00`).getTime();
  return Math.round((b - a) / 86400000);
}

function formatPeriodLabel(firstIso: string, lastIso: string): string {
  const a = new Date(`${firstIso}T12:00:00`);
  const b = new Date(`${lastIso}T12:00:00`);
  const mo = new Intl.DateTimeFormat("fr-FR", { month: "long" });
  const ma = mo.format(a);
  const mb = mo.format(b);
  const ya = a.getFullYear();
  const yb = b.getFullYear();
  if (ma === mb && ya === yb) {
    return `${ma.charAt(0).toUpperCase()}${ma.slice(1)} ${ya}`;
  }
  if (ya === yb) {
    return `${ma.charAt(0).toUpperCase()}${ma.slice(1)} – ${mb} ${yb}`;
  }
  return `${ma.charAt(0).toUpperCase()}${ma.slice(1)} ${ya} – ${mb} ${yb}`;
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
): { start: number; endExclusive: number } | null {
  const idxStart = Math.max(0, daysBetweenInclusiveStart(gridStartIso, r.date_arrivee));
  const idxEndExclusive = Math.min(VISIBLE_DAYS, daysBetweenInclusiveStart(gridStartIso, r.date_depart));
  if (idxEndExclusive <= idxStart) return null;
  return { start: idxStart, endExclusive: idxEndExclusive };
}

export function SaisonnierReservationsPlanningCalendar({
  proprietaireId,
  logements,
  reservationRevision,
  onOpenDetail,
  onEmptyCellClick,
}: SaisonnierReservationsPlanningCalendarProps) {
  const [gridStartIso, setGridStartIso] = useState(() => toIsoDate(startOfMondayWeek(new Date())));
  const [filterLogementId, setFilterLogementId] = useState("");
  const [rows, setRows] = useState<PlanningCalendarReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const todayIso = useMemo(() => toIsoDate(new Date()), []);

  const dayHeaders = useMemo(() => {
    const list: { iso: string; weekday: string; dayNum: string; isWeekend: boolean; isToday: boolean }[] = [];
    for (let i = 0; i < VISIBLE_DAYS; i++) {
      const iso = addDaysIso(gridStartIso, i);
      const d = new Date(`${iso}T12:00:00`);
      const wd = new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(d);
      const dayNum = String(d.getDate());
      const day = d.getDay();
      const isWeekend = day === 0 || day === 6;
      list.push({ iso, weekday: wd, dayNum, isWeekend, isToday: iso === todayIso });
    }
    return list;
  }, [gridStartIso, todayIso]);

  const periodLabel = useMemo(
    () => formatPeriodLabel(gridStartIso, addDaysIso(gridStartIso, VISIBLE_DAYS - 1)),
    [gridStartIso],
  );

  const logementsRows = useMemo(() => {
    if (!filterLogementId) return logements;
    return logements.filter((l) => l.id === filterLogementId);
  }, [logements, filterLogementId]);

  const loadWindow = useCallback(async () => {
    setLoading(true);
    setFetchError("");
    const fetchStart = addDaysIso(gridStartIso, -14);
    const fetchEndLast = addDaysIso(gridStartIso, VISIBLE_DAYS + 14 - 1);

    let q = supabase
      .from("reservations")
      .select("id, logement_id, date_arrivee, date_depart, source, voyageurs(prenom, nom)")
      .eq("proprietaire_id", proprietaireId)
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
  }, [proprietaireId, gridStartIso, filterLogementId, reservationRevision]);

  useEffect(() => {
    void loadWindow();
  }, [loadWindow]);

  function goWeek(delta: number) {
    setGridStartIso((prev) => addDaysIso(prev, delta * 7));
  }

  function goToday() {
    setGridStartIso(toIsoDate(startOfMondayWeek(new Date())));
  }

  return (
    <div
      className="overflow-hidden rounded-xl text-sm"
      style={{ backgroundColor: BG, border: `1px solid ${BORDER}`, color: "#e4e4e7" }}
    >
      <div className="flex flex-col gap-3 border-b p-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between" style={{ borderColor: BORDER }}>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-lg px-2 py-1.5 text-xs font-semibold transition hover:opacity-90"
            style={{ border: `1px solid ${BORDER}`, backgroundColor: "rgba(255,255,255,0.04)", color: "#fafafa" }}
            onClick={() => goWeek(-1)}
            aria-label="Semaine précédente"
          >
            ‹
          </button>
          <button
            type="button"
            className="rounded-lg px-2 py-1.5 text-xs font-semibold transition hover:opacity-90"
            style={{ border: `1px solid ${BORDER}`, backgroundColor: "rgba(255,255,255,0.04)", color: "#fafafa" }}
            onClick={() => goWeek(1)}
            aria-label="Semaine suivante"
          >
            ›
          </button>
          <button
            type="button"
            className="rounded-lg px-3 py-1.5 text-xs font-semibold transition hover:opacity-90"
            style={{ border: `1px solid ${BORDER}`, backgroundColor: "#7c3aed22", color: TODAY_TEXT }}
            onClick={goToday}
          >
            Aujourd&apos;hui
          </button>
        </div>
        <p className="text-center text-sm font-semibold sm:flex-1" style={{ color: "#fafafa" }}>
          {periodLabel}
        </p>
        <label className="flex min-w-[180px] flex-col gap-1 text-xs" style={{ color: "#a1a1aa" }}>
          Logement
          <select
            className="rounded-lg px-2 py-1.5 text-sm"
            style={{
              backgroundColor: "rgba(255,255,255,0.06)",
              border: `1px solid ${BORDER}`,
              color: "#fafafa",
              colorScheme: "dark",
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
        </label>
      </div>

      {fetchError ? (
        <p className="px-3 py-2 text-xs" style={{ color: "#f87171" }}>
          {fetchError}
        </p>
      ) : null}
      {loading ? (
        <p className="px-3 py-6 text-center text-xs" style={{ color: "#a1a1aa" }}>
          Chargement du planning…
        </p>
      ) : (
        <div className="overflow-x-auto overscroll-x-contain">
          <div className="inline-flex min-w-max align-top">
            <div
              className="sticky left-0 z-30 w-[140px] shrink-0 border-r"
              style={{ backgroundColor: BG, borderColor: BORDER }}
            >
              <div
                className="flex items-end border-b px-2 pb-2 pt-3 text-xs font-medium"
                style={{ borderColor: BORDER, minHeight: 56, color: "#71717a" }}
              >
                Logement
              </div>
              {logementsRows.map((lg) => (
                <div
                  key={lg.id}
                  className="flex items-center border-b px-2 py-2 text-xs font-medium leading-snug"
                  style={{ borderColor: BORDER, minHeight: 44, color: "#d4d4d8" }}
                >
                  <span className="line-clamp-2">{lg.nom}</span>
                </div>
              ))}
            </div>
            <div className="shrink-0" style={{ width: VISIBLE_DAYS * COL_MIN }}>
              <div
                className="grid border-b"
                style={{
                  gridTemplateColumns: `repeat(${VISIBLE_DAYS}, minmax(${COL_MIN}px, 1fr))`,
                  borderColor: BORDER,
                  minHeight: 56,
                }}
              >
                {dayHeaders.map((h) => (
                  <div
                    key={h.iso}
                    className="flex flex-col justify-end border-r px-0.5 pb-2 pt-1 text-center text-[10px] leading-tight sm:text-[11px]"
                    style={{
                      borderColor: BORDER,
                      backgroundColor: h.isToday ? TODAY_BG : h.isWeekend ? WEEKEND_BG : "transparent",
                      color: h.isToday ? TODAY_TEXT : "#71717a",
                    }}
                  >
                    <div className="uppercase">{h.weekday}</div>
                    <div className="font-semibold" style={{ color: h.isToday ? TODAY_TEXT : "#a1a1aa" }}>
                      {h.dayNum}
                    </div>
                  </div>
                ))}
              </div>

              {logementsRows.map((lg) => {
                const forLogement = rows.filter((r) => r.logement_id === lg.id);
                return (
                  <div
                    key={lg.id}
                    className="grid border-b"
                    style={{
                      gridTemplateColumns: `repeat(${VISIBLE_DAYS}, minmax(${COL_MIN}px, 1fr))`,
                      gridTemplateRows: "44px",
                      borderColor: BORDER,
                    }}
                  >
                    {dayHeaders.map((h, i) => (
                      <button
                        key={`${lg.id}-${h.iso}`}
                        type="button"
                        className="border-r transition hover:opacity-90"
                        style={{
                          gridColumn: i + 1,
                          gridRow: 1,
                          zIndex: 1,
                          borderColor: BORDER,
                          backgroundColor: h.isToday ? TODAY_BG : h.isWeekend ? WEEKEND_BG : "transparent",
                          minHeight: 44,
                        }}
                        aria-label={`Nouvelle réservation ${lg.nom} le ${h.iso}`}
                        onClick={() => onEmptyCellClick(lg.id, h.iso)}
                      />
                    ))}
                    {forLogement.map((r) => {
                      const span = reservationSpanOnGrid(gridStartIso, r);
                      if (!span) return null;
                      const color = SOURCE_COLORS[r.source] ?? SOURCE_COLORS.autre;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          className="flex items-center overflow-hidden px-1 text-left text-[10px] font-semibold leading-tight text-white sm:text-[11px]"
                          style={{
                            gridColumn: `${span.start + 1} / ${span.endExclusive + 1}`,
                            gridRow: 1,
                            zIndex: 2,
                            marginTop: 4,
                            marginBottom: 4,
                            alignSelf: "stretch",
                            backgroundColor: color,
                            opacity: 0.9,
                            borderRadius: 4,
                            boxShadow: "0 1px 2px rgba(0,0,0,0.35)",
                          }}
                          title={blockLabel(r)}
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenDetail(r.id);
                          }}
                        >
                          <span className="truncate">{blockLabel(r)}</span>
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
