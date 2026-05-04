import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Uses transitive dependency already present in the repo toolchain.
import { PNG } from "pngjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assetsDir = path.join(repoRoot, "apps", "mobile", "assets");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writePng(filePath, png) {
  const buffer = PNG.sync.write(png);
  fs.writeFileSync(filePath, buffer);
}

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;

  const num = Number.parseInt(value, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function fillGradient(png, topHex, bottomHex) {
  const top = hexToRgb(topHex);
  const bottom = hexToRgb(bottomHex);

  for (let y = 0; y < png.height; y += 1) {
    const t = png.height <= 1 ? 0 : y / (png.height - 1);
    const r = Math.round(top.r * (1 - t) + bottom.r * t);
    const g = Math.round(top.g * (1 - t) + bottom.g * t);
    const b = Math.round(top.b * (1 - t) + bottom.b * t);

    for (let x = 0; x < png.width; x += 1) {
      const idx = (png.width * y + x) << 2;
      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = 255;
    }
  }
}

function drawRoundedRect(png, x0, y0, width, height, radius, colorHex) {
  const { r, g, b } = hexToRgb(colorHex);

  const x1 = x0 + width - 1;
  const y1 = y0 + height - 1;

  function inside(x, y) {
    if (x < x0 || x > x1 || y < y0 || y > y1) return false;
    const left = x < x0 + radius;
    const right = x > x1 - radius;
    const top = y < y0 + radius;
    const bottom = y > y1 - radius;

    if (!(left || right || top || bottom)) return true;

    const cx = left ? x0 + radius : x1 - radius;
    const cy = top ? y0 + radius : y1 - radius;
    const dx = x - cx;
    const dy = y - cy;
    return dx * dx + dy * dy <= radius * radius;
  }

  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      if (!inside(x, y)) continue;
      const idx = (png.width * y + x) << 2;
      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = 255;
    }
  }
}

function generateIcon1024() {
  const png = new PNG({ width: 1024, height: 1024 });
  fillGradient(png, "#0B1220", "#111827");

  // Simple mark (rounded square) to avoid a fully-flat icon.
  drawRoundedRect(png, 312, 312, 400, 400, 72, "#22C55E");
  drawRoundedRect(png, 360, 360, 304, 304, 56, "#0B1220");

  return png;
}

function generateAdaptiveForeground() {
  const png = new PNG({ width: 1024, height: 1024 });
  // Transparent background for adaptive icon foreground.
  png.data.fill(0);
  drawRoundedRect(png, 252, 252, 520, 520, 96, "#22C55E");
  drawRoundedRect(png, 320, 320, 384, 384, 72, "#0B1220");
  return png;
}

function generateSplash() {
  const png = new PNG({ width: 1242, height: 2436 }); // iPhone 11-ish aspect
  fillGradient(png, "#0B1220", "#111827");
  drawRoundedRect(png, 396, 1010, 450, 450, 96, "#22C55E");
  drawRoundedRect(png, 450, 1064, 342, 342, 72, "#0B1220");
  return png;
}

function main() {
  ensureDir(assetsDir);

  writePng(path.join(assetsDir, "icon.png"), generateIcon1024());
  writePng(path.join(assetsDir, "adaptive-icon.png"), generateAdaptiveForeground());
  writePng(path.join(assetsDir, "splash.png"), generateSplash());

  console.log(`[mobile-assets] Wrote assets to ${assetsDir}`);
}

main();

