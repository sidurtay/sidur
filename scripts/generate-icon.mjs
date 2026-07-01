import sharp from "sharp";
import { mkdirSync } from "fs";

mkdirSync("assets", { recursive: true });

// icon.png — the new brand mark (public/logo.png) isn't square, so pad it to
// a square canvas first (fit: "contain") before scaling to 1024 — resizing
// directly would stretch/crop the mark. Apple also rejects App Store icons
// with an alpha channel, so .flatten() here is load-bearing, not cosmetic.
await sharp("public/logo.png")
  .resize(880, 880, { fit: "contain", background: "#FFFFFF" })
  .extend({ top: 72, bottom: 72, left: 72, right: 72, background: "#FFFFFF" })
  .flatten({ background: "#FFFFFF" })
  .png()
  .toFile("assets/icon.png");

// splash.png — logo on a rounded white badge, centered on the app's dark
// background (a hard-edged white square would look like a rendering glitch)
const badgeSize = 460;
const roundedMask = Buffer.from(
  `<svg width="${badgeSize}" height="${badgeSize}"><rect width="${badgeSize}" height="${badgeSize}" rx="${badgeSize * 0.22}" fill="#fff"/></svg>`
);
const innerSize = Math.round(badgeSize * 0.72);
const pad = Math.round((badgeSize - innerSize) / 2);
const badge = await sharp("public/logo.png")
  .resize(innerSize, innerSize, { fit: "contain", background: "#FFFFFF" })
  .extend({ top: pad, bottom: pad, left: pad, right: pad, background: "#FFFFFF" })
  .resize(badgeSize, badgeSize)
  .composite([{ input: roundedMask, blend: "dest-in" }])
  .png()
  .toBuffer();

await sharp({
  create: { width: 2732, height: 2732, channels: 4, background: { r: 15, g: 17, b: 23, alpha: 1 } },
})
  .composite([{ input: badge, gravity: "center" }])
  .png()
  .toFile("assets/splash.png");

// splash-dark.png — same background is already dark
await sharp({
  create: { width: 2732, height: 2732, channels: 4, background: { r: 15, g: 17, b: 23, alpha: 1 } },
})
  .composite([{ input: badge, gravity: "center" }])
  .png()
  .toFile("assets/splash-dark.png");

console.log("✅ assets/icon.png, splash.png, splash-dark.png created");
