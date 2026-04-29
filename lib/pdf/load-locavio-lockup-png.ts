import fs from "fs";
import path from "path";

const LOCKUP_PNG = path.join(process.cwd(), "public", "logos", "lockup-horizontal-sombre.png");

/** Octets PNG du lockup Locavio pour les en-têtes PDF ; `null` si le fichier est absent. */
export function getLocavioLockupPngBytes(): Uint8Array | null {
  try {
    if (!fs.existsSync(LOCKUP_PNG)) return null;
    return new Uint8Array(fs.readFileSync(LOCKUP_PNG));
  } catch {
    return null;
  }
}
