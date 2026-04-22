/** IRL publiés (valeurs indicatives pour baux passés ; le plus récent = T1 2025 dans cette liste). */
export const IRL_HISTORIQUE = [
  { trimestre: "T1 2025", valeur: 143.97 },
  { trimestre: "T4 2024", valeur: 143.46 },
  { trimestre: "T3 2024", valeur: 142.37 },
  { trimestre: "T2 2024", valeur: 141.79 },
  { trimestre: "T1 2024", valeur: 141.4 },
  { trimestre: "T4 2023", valeur: 140.59 },
  { trimestre: "T3 2023", valeur: 141.41 },
  { trimestre: "T2 2023", valeur: 140.29 },
  { trimestre: "T1 2023", valeur: 138.64 },
  { trimestre: "T4 2022", valeur: 136.27 },
  { trimestre: "T3 2022", valeur: 135.84 },
  { trimestre: "T2 2022", valeur: 133.93 },
  { trimestre: "T1 2022", valeur: 131.67 },
  { trimestre: "T4 2021", valeur: 129.24 },
  { trimestre: "T3 2021", valeur: 128.45 },
  { trimestre: "T2 2021", valeur: 127.76 },
  { trimestre: "T1 2021", valeur: 127.2 },
] as const;

type Quarter = { y: number; q: 1 | 2 | 3 | 4 };

const HIST_MAP = new Map<string, number>(
  IRL_HISTORIQUE.map((row) => [row.trimestre, row.valeur] as [string, number]),
);

function parseTrimestreLabel(s: string): Quarter | null {
  const m = /^T([1-4])\s+(\d{4})$/.exec(s.trim());
  if (!m) return null;
  return { q: Number(m[1]) as Quarter["q"], y: Number(m[2]) };
}

function dateToQuarter(d: Date): Quarter {
  const mo = d.getMonth();
  const q = (mo < 3 ? 1 : mo < 6 ? 2 : mo < 9 ? 3 : 4) as Quarter["q"];
  return { y: d.getFullYear(), q };
}

function trimestreLabel(q: Quarter): string {
  return `T${q.q} ${q.y}`;
}

function cmpQuarter(a: Quarter, b: Quarter): number {
  if (a.y !== b.y) return a.y - b.y;
  return a.q - b.q;
}

const OLDEST = parseTrimestreLabel(IRL_HISTORIQUE[IRL_HISTORIQUE.length - 1].trimestre)!;
const NEWEST = parseTrimestreLabel(IRL_HISTORIQUE[0].trimestre)!;

/**
 * Trimestre civil contenant la date (ex. 15/05/2024 → T2 2024).
 */
export function getTrimestrePourDate(date: Date): string {
  return trimestreLabel(dateToQuarter(date));
}

/**
 * - Trimestre contenant `date`
 * - Valeur dans IRL_HISTORIQUE si comprise entre T1 2021 et le dernier trimestre tabulé
 * - Si plus récent que le dernier trimestre connu → `/api/irl` (IRL courant)
 * - Si antérieur à T1 2021 → `null` (saisie manuelle)
 */
export async function getIrlPourDate(
  date: Date,
  fetchLive: typeof fetch = fetch,
): Promise<{ valeur: number; trimestre: string } | null> {
  const qd = dateToQuarter(date);
  if (cmpQuarter(qd, OLDEST) < 0) return null;

  if (cmpQuarter(qd, NEWEST) > 0) {
    try {
      const res = await fetchLive("/api/irl");
      if (!res.ok) return null;
      const j = (await res.json()) as { valeur?: number; trimestre?: string };
      if (typeof j.valeur !== "number" || typeof j.trimestre !== "string") return null;
      return { valeur: j.valeur, trimestre: j.trimestre };
    } catch {
      return null;
    }
  }

  const label = trimestreLabel(qd);
  const valeur = HIST_MAP.get(label);
  if (valeur != null) return { valeur, trimestre: label };

  try {
    const res = await fetchLive("/api/irl");
    if (!res.ok) return null;
    const j = (await res.json()) as { valeur?: number; trimestre?: string };
    if (typeof j.valeur !== "number" || typeof j.trimestre !== "string") return null;
    return { valeur: j.valeur, trimestre: j.trimestre };
  } catch {
    return null;
  }
}
