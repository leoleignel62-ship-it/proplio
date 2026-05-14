/**
 * Génère les PNG lockup depuis les SVG (600×150, fond transparent).
 * Usage : node scripts/convert-logo.mjs  (depuis la racine gestion-locative, après npm install)
 */
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const variants = [
  { svg: "lockup-horizontal-clair.svg", png: "lockup-horizontal-clair.png" },
  { svg: "lockup-horizontal-sombre.svg", png: "lockup-horizontal-sombre.png" },
];

for (const { svg, png } of variants) {
  const svgPath = path.join(root, "public", "logos", svg);
  const outPath = path.join(root, "public", "logos", png);
  await sharp(svgPath, { density: 300 })
    .resize(600, 150, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(outPath);
  console.log("PNG écrit :", outPath);
}
