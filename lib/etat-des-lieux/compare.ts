import type { ElementEdl, PiecesEdlData, RoomEdl } from "./types";
import { etatRank } from "./types";

/** Vrai si sortie est « pire » que entrée (pour surbrillance comparaison) */
export function isDegradedVsEntree(entree: ElementEdl | undefined, sortie: ElementEdl | undefined): boolean {
  if (!entree || !sortie) return false;
  return etatRank(sortie.state) > etatRank(entree.state);
}

export function findRoomById(data: PiecesEdlData, id: string): RoomEdl | undefined {
  return data.rooms.find((r) => r.id === id);
}

export function compareRoomElements(
  entree: PiecesEdlData,
  sortie: PiecesEdlData,
  roomId: string,
): { key: string; entree: ElementEdl; sortie: ElementEdl; worse: boolean }[] {
  const re = findRoomById(entree, roomId);
  const rs = findRoomById(sortie, roomId);
  if (!re || !rs) return [];
  const keys = new Set([...Object.keys(re.elements), ...Object.keys(rs.elements)]);
  const out: { key: string; entree: ElementEdl; sortie: ElementEdl; worse: boolean }[] = [];
  for (const key of keys) {
    const e = re.elements[key] ?? sortie.rooms[0]?.elements[key];
    const s = rs.elements[key];
    if (!e || !s) continue;
    out.push({ key, entree: e, sortie: s, worse: isDegradedVsEntree(e, s) });
  }
  return out;
}
