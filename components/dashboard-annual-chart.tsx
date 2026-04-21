"use client";

import {
  CategoryScale,
  Chart as ChartJS,
  ChartData,
  ChartOptions,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  BarElement,
  Tooltip,
} from "chart.js";
import { Chart } from "react-chartjs-2";
import { PC } from "@/lib/proplio-colors";

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend, Filler);

type DashboardAnnualChartProps = {
  labels: string[];
  encaisses: number[];
  manque: number[];
  potentiel: number[];
};

export function DashboardAnnualChart({ labels, encaisses, manque, potentiel }: DashboardAnnualChartProps) {
  const data: ChartData<"bar" | "line"> = {
    labels,
    datasets: [
      {
        type: "bar",
        label: "Revenus encaissés",
        data: encaisses,
        backgroundColor: PC.primary,
        borderRadius: 6,
      },
      {
        type: "bar",
        label: "Manque à gagner",
        data: manque,
        backgroundColor: "rgba(239, 68, 68, 0.25)",
        borderRadius: 6,
      },
      {
        type: "line",
        label: "Potentiel total",
        data: potentiel,
        borderColor: PC.warning,
        borderDash: [6, 6],
        pointRadius: 0,
        pointHoverRadius: 3,
        tension: 0.2,
      },
    ],
  };

  const options: ChartOptions<"bar" | "line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: "index",
        intersect: false,
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${Number(ctx.parsed.y || 0).toLocaleString("fr-FR")} €`,
        },
      },
    },
    interaction: { mode: "index", intersect: false },
    scales: {
      x: {
        ticks: { color: PC.muted },
        grid: { color: "rgba(144, 144, 168, 0.12)" },
      },
      y: {
        ticks: {
          color: PC.muted,
          callback: (value) => `${Number(value).toLocaleString("fr-FR")} €`,
        },
        grid: { color: "rgba(144, 144, 168, 0.12)" },
      },
    },
  };

  return (
    <div>
      <div style={{ position: "relative", height: 300, width: "100%" }}>
        <Chart id="dashboard-annual-revenue-chart" type="bar" data={data} options={options} />
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
  );
}
