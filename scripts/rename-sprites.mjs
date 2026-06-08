/**
 * rename-sprites.mjs
 *
 * Maps CRS_J*.png sprite files (from the Google Drive pack shared by CodeDroidX
 * at https://drive.google.com/drive/folders/1-PUz2x1MpY7Qukha6iHb5eRprDlpwDLP)
 * to the kurisu-{slug}.png naming convention expected by AmadeusAvatar.tsx.
 *
 * Usage:
 *   node scripts/rename-sprites.mjs <path-to-downloaded-folder>
 *
 * Example:
 *   node scripts/rename-sprites.mjs "C:\Users\you\Downloads\Makise"
 *
 * What it does:
 *   - Reads *00.png (closed mouth) → public/sprites/kurisu-{slug}.png
 *   - Reads *02.png (open mouth)   → public/sprites/kurisu-{slug}-open.png
 *   - Distance used: Large (CRS_JL*)  ← best quality, fills the 320x420 canvas
 *
 * Naming key (from article's Format() function):
 *   D series  → emotions 0–11  (prefixed CRS_JLD_40000)
 *   E series  → emotions 12–18 (prefixed CRS_JLE_40000)
 *   F series  → emotion 19 Back (prefixed CRS_JLF_00000)
 */

import fs   from "node:fs";
import path from "node:path";

const [,, srcDir] = process.argv;

if (!srcDir) {
  console.error("Usage: node scripts/rename-sprites.mjs <path-to-sprite-folder>");
  process.exit(1);
}

const destDir = path.resolve("public", "sprites");
fs.mkdirSync(destDir, { recursive: true });

// ── Mapping: [CRS_JL series+variant, slug] ────────────────────────
// Reverse-engineered from the article's Format() function.
// Mouth positions: 00 = closed, 01 = half-open, 02 = open
const MAP = [
  // D series (CRS_JLD_40000{variant}{mouth}.png)
  ["D_40000a",  "sleep"],
  ["D_40000b",  "interest"],
  ["D_40000c",  "sad"],
  ["D_400001",  "very-default"],
  ["D_400002",  "wink"],
  ["D_400003",  "serious"],
  ["D_400004",  "disappoint"],
  ["D_400005",  "tired"],
  ["D_400006",  "fun"],
  ["D_400007",  "angry"],
  ["D_400008",  "embrassed"],
  ["D_400009",  "very-not-interest"],   // article D_dat[11] typo fix: "" → "9"
  // E series (CRS_JLE_40000{variant}{mouth}.png)
  ["E_400001",  "default"],
  ["E_400002",  "very-embrassed"],
  ["E_400003",  "calm"],
  ["E_400004",  "very-serious"],
  ["E_400005",  "surprise"],
  ["E_400006",  "not-interest"],
  ["E_400007",  "closed-sleep"],
  // F series (Back — no mouth variants expected)
  ["F_000000",  "back"],
];

let copied = 0;
let skipped = 0;

for (const [variant, slug] of MAP) {
  const base     = `CRS_JL${variant}`;
  const closedSrc = path.join(srcDir, `${base}00.png`);
  const openSrc   = path.join(srcDir, `${base}02.png`);

  // Closed mouth → base sprite
  if (fs.existsSync(closedSrc)) {
    const dest = path.join(destDir, `kurisu-${slug}.png`);
    fs.copyFileSync(closedSrc, dest);
    console.log(`  copied  ${path.basename(closedSrc)} → kurisu-${slug}.png`);
    copied++;
  } else {
    console.warn(`  MISSING ${base}00.png  (slug: ${slug})`);
    skipped++;
  }

  // Open mouth → talking sprite
  if (fs.existsSync(openSrc)) {
    const dest = path.join(destDir, `kurisu-${slug}-open.png`);
    fs.copyFileSync(openSrc, dest);
    console.log(`  copied  ${path.basename(openSrc)} → kurisu-${slug}-open.png`);
    copied++;
  }
  // Missing open variant is fine — code falls back to body-sway for that emotion
}

console.log(`\nDone. ${copied} files copied, ${skipped} base sprites missing.`);
console.log(`Output: ${destDir}`);
