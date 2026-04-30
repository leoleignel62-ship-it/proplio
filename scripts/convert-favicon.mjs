import sharp from "sharp";
import { readFileSync, writeFileSync } from "fs";

// 32x32 PNG
await sharp("public/logos/favicon.svg")
  .resize(32, 32)
  .png()
  .toFile("public/logos/favicon-32x32.png");

// 192x192 PNG
await sharp("public/logos/favicon.svg")
  .resize(192, 192)
  .png()
  .toFile("public/logos/favicon-192x192.png");

console.log("Favicons générés !");
