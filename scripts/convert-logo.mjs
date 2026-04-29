/**
 * Génère public/logos/lockup-horizontal-sombre.png à partir du SVG (600×150, fond transparent).
 * Usage une fois : node scripts/convert-logo.mjs  (depuis la racine du projet, après npm install)
 */
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const svgPath = path.join(root, "public", "logos", "lockup-horizontal-sombre.svg");
const outPath = path.join(root, "public", "logos", "lockup-horizontal-sombre.png");

await sharp(svgPath, { density: 300 })
  .resize(600, 150, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toFile(outPath);

console.log("PNG écrit :", outPath);
