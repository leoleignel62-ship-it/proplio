import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { fetchLatestIrlFromInsee } from "@/lib/irl-insee";

const getIrlCached = unstable_cache(
  async () => fetchLatestIrlFromInsee({ next: { revalidate: 86400 } }),
  ["irl-insee-bdm-001515333"],
  { revalidate: 86400 },
);

export async function GET() {
  try {
    const data = await getIrlCached();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ valeur: 143.46, trimestre: "T4 2024" });
  }
}
