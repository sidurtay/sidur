import sharp from "sharp";
import { mkdirSync } from "fs";

mkdirSync("assets", { recursive: true });

const svg = `<svg width="1024" height="1024" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" rx="0" fill="#F97316"/>
  <path
    d="M64 38c-2-6-8-10-16-10-10 0-17 5-17 13 0 7 5 10 14 12l4 1c10 2 16 6 16 14 0 9-8 15-19 15-9 0-16-4-19-11"
    stroke="#FFFFFF" stroke-width="9" stroke-linecap="round" fill="none"
  />
  <g stroke="#FFFFFF" stroke-width="4.5" stroke-linecap="round">
    <line x1="78" y1="20" x2="78" y2="32"/>
    <line x1="90" y1="32" x2="80" y2="38"/>
    <line x1="92" y1="48" x2="81" y2="45"/>
  </g>
</svg>`;

// icon.png — used by @capacitor/assets for all app icon sizes
await sharp(Buffer.from(svg))
  .resize(1024, 1024)
  .png()
  .toFile("assets/icon.png");

// splash.png — 2732x2732 centered logo on dark background
const logoSmall = await sharp(Buffer.from(svg)).resize(400, 400).png().toBuffer();

await sharp({
  create: { width: 2732, height: 2732, channels: 4, background: { r: 15, g: 17, b: 23, alpha: 1 } }
})
  .composite([{ input: logoSmall, gravity: "center" }])
  .png()
  .toFile("assets/splash.png");

// splash-dark.png — same (already dark)
await sharp({
  create: { width: 2732, height: 2732, channels: 4, background: { r: 15, g: 17, b: 23, alpha: 1 } }
})
  .composite([{ input: logoSmall, gravity: "center" }])
  .png()
  .toFile("assets/splash-dark.png");

console.log("✅ assets/icon.png, splash.png, splash-dark.png created");
