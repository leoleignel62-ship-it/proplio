"use client";

import { PC } from "@/lib/proplio-colors";

export type CalendrierReservationRow = {
  id: string;
  logement_id: string;
  date_arrivee: string;
  date_depart: string;
  statut: string;
  notes: string | null;
  voyageurs?: { nom: string; prenom: string } | null;
};

export type CalendrierLogementRow = { id: string; nom: string };

const STATUT_COLOR: Record<string, string> = {
  en_attente: PC.warning,
  confirmee: PC.primary,
  en_cours: PC.success,
  terminee: PC.muted,
  annulee: PC.danger,
};

type Props = {
  logements: CalendrierLogementRow[];
  rows: CalendrierReservationRow[];
  monthDays: Date[];
  monthStartStr: string;
  monthEndStr: string;
  pxPerDay: number;
  onPointerDownBar: (ev: React.PointerEvent, row: CalendrierReservationRow) => void;
  onPointerMoveBar: (ev: React.PointerEvent) => void;
  onPointerUpBar: () => void;
};

export default function CalendrierPlanning({
  logements,
  rows,
  monthDays,
  monthStartStr,
  monthEndStr,
  pxPerDay,
  onPointerDownBar,
  onPointerMoveBar,
  onPointerUpBar,
}: Props) {
  return (
    <div className="space-y-4 overflow-x-auto">
      <p className="text-xs" style={{ color: PC.muted }}>
        Glisser une réservation pour décaler les dates (même durée). Mois courant.
      </p>
      {logements.map((lg) => (
        <div key={lg.id} className="min-w-[800px]">
          <p className="mb-2 text-sm font-medium">{lg.nom}</p>
          <div className="relative flex" style={{ height: 40, border: `1px solid ${PC.border}` }}>
            {monthDays.map((d) => {
              const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
              return (
                <div
                  key={key}
                  className="shrink-0 border-r text-[10px] leading-tight"
                  style={{ width: pxPerDay, borderColor: PC.border, color: PC.muted }}
                >
                  {d.getDate()}
                </div>
              );
            })}
            {rows
              .filter((r) => r.logement_id === lg.id && r.date_depart >= monthStartStr && r.date_arrivee <= monthEndStr)
              .map((row) => {
                const mStart = new Date(`${monthStartStr}T12:00:00`);
                const mEnd = new Date(`${monthEndStr}T12:00:00`);
                const rStart = new Date(`${row.date_arrivee}T12:00:00`);
                const rEnd = new Date(`${row.date_depart}T12:00:00`);
                const visStart = rStart > mStart ? rStart : mStart;
                const visEnd = rEnd < mEnd ? rEnd : mEnd;
                const left = Math.max(0, Math.round((visStart.getTime() - mStart.getTime()) / 86400000)) * pxPerDay;
                const width = Math.max(pxPerDay, Math.round((visEnd.getTime() - visStart.getTime()) / 86400000) * pxPerDay);
                return (
                  <button
                    key={row.id}
                    type="button"
                    className="absolute top-1 cursor-grab rounded px-1 text-left text-[10px] font-medium active:cursor-grabbing"
                    style={{
                      left,
                      width,
                      backgroundColor: `${STATUT_COLOR[row.statut] ?? PC.primary}55`,
                      color: PC.text,
                      border: `1px solid ${STATUT_COLOR[row.statut] ?? PC.primary}`,
                      height: 28,
                      overflow: "hidden",
                    }}
                    onPointerDown={(e) => onPointerDownBar(e, row)}
                    onPointerMove={onPointerMoveBar}
                    onPointerUp={() => onPointerUpBar()}
                    onPointerCancel={() => onPointerUpBar()}
                  >
                    {row.voyageurs?.nom ?? row.notes ?? "Résa"}
                  </button>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}
