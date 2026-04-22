/** Série officielle IRL logements (BDM INSEE). */
export const INSEE_IRL_SERIES_URL =
  "https://api.insee.fr/series/BDM/V1/data/SERIES_BDM/001515333";

export const IRL_FALLBACK = { valeur: 143.46, trimestre: "T4 2024" } as const;

/** Convertit TIME_PERIOD SDMX (ex. 2026-Q1) en libellé T1 2026. */
export function formatInseeTrimestre(timePeriod: string): string {
  const m = /^(\d{4})-Q([1-4])$/.exec(timePeriod.trim());
  if (!m) return timePeriod;
  return `T${m[2]} ${m[1]}`;
}

function parseFirstObsFromXml(xml: string): { timePeriod: string; obsValue: number } | null {
  const i = xml.indexOf("<Obs ");
  if (i === -1) return null;
  const slice = xml.slice(i, i + 800);
  const tp = /TIME_PERIOD="([^"]+)"/.exec(slice);
  const ov = /OBS_VALUE="([\d.]+)"/.exec(slice);
  if (!tp || !ov) return null;
  const n = Number(ov[1]);
  if (!Number.isFinite(n)) return null;
  return { timePeriod: tp[1], obsValue: n };
}

export type IrlResponse = { valeur: number; trimestre: string };

/**
 * Récupère la dernière observation IRL publiée (XML BDM).
 * En cas d’échec, retourne IRL_FALLBACK.
 */
export async function fetchLatestIrlFromInsee(
  init?: RequestInit & { next?: { revalidate?: number } },
): Promise<IrlResponse> {
  try {
    const res = await fetch(INSEE_IRL_SERIES_URL, {
      ...init,
      headers: {
        Accept: "application/xml",
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) return { ...IRL_FALLBACK };
    const xml = await res.text();
    const first = parseFirstObsFromXml(xml);
    if (!first) return { ...IRL_FALLBACK };
    return {
      valeur: first.obsValue,
      trimestre: formatInseeTrimestre(first.timePeriod),
    };
  } catch {
    return { ...IRL_FALLBACK };
  }
}
