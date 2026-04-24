"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PC } from "@/lib/proplio-colors";

type Row = { mois: string; revenus: number; nuits: number; nbReservations: number };

function TooltipContent({ active, payload }: { active?: boolean; payload?: Array<{ payload: Row }> }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as Row;
  return (
    <div className="rounded-lg border px-3 py-2 text-xs" style={{ backgroundColor: PC.card, borderColor: PC.border, color: PC.text }}>
      <p className="font-semibold">{row.mois}</p>
      <p>Revenus: {row.revenus.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €</p>
      <p>Nuits: {row.nuits}</p>
      <p>Reservations: {row.nbReservations}</p>
    </div>
  );
}

export function RevenusMensuelsChart({ data }: { data: Row[] }) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={PC.border} />
          <XAxis dataKey="mois" stroke={PC.muted} />
          <YAxis stroke={PC.muted} />
          <Tooltip content={<TooltipContent />} />
          <Bar dataKey="revenus" fill="#7c3aed" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
