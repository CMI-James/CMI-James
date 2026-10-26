// Shared theme tokens and text-to-path helpers for the generated SVGs.
// Text is outlined with opentype.js because SVGs shown through <img> can't load web fonts.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import opentype from "opentype.js";

// Keep in sync with design/base.css
export const themes = {
  dark: { bg: "#0a0c10", panel: "#12161d", line: "#222a35", text: "#e8edf3", muted: "#8a96a6", accent: "#7cf2c9", glow: "rgba(124,242,201,0.16)" },
  light: { bg: "#ffffff", panel: "#f3f5f8", line: "#d9dfe7", text: "#0f1419", muted: "#57606a", accent: "#0a7d5c", glow: "rgba(10,125,92,0.10)" },
};

const fontDir = join(dirname(fileURLToPath(import.meta.url)), "fonts");
const load = file => {
  const buf = readFileSync(join(fontDir, file));
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
};
export const fonts = {
  display: load("space-grotesk-700.woff"),
  body: load("inter-400.woff"),
  bodyMedium: load("inter-500.woff"),
  mono: load("jetbrains-mono-500.woff"),
};

// letterSpacing is in em, like CSS
export function width(text, font, size, letterSpacing = 0) {
  return font.getAdvanceWidth(text, size) + letterSpacing * size * Math.max(0, text.length - 1);
}

export function textPath(text, { x, y, font, size, fill, letterSpacing = 0, anchor = "start", attrs = "" }) {
  const w = width(text, font, size, letterSpacing);
  let cx = anchor === "end" ? x - w : anchor === "middle" ? x - w / 2 : x;
  let d = "";
  if (letterSpacing) {
    for (const ch of text) {
      d += font.getPath(ch, cx, y, size).toPathData(2);
      cx += font.getAdvanceWidth(ch, size) + letterSpacing * size;
    }
  } else {
    d = font.getPath(text, cx, y, size).toPathData(2);
  }
  return `<path d="${d}" fill="${fill}" ${attrs}/>`;
}

// Lays out runs of differently styled text across lines, wrapping at maxWidth.
// runs: [{ text, font, fill }]; returns { svg, lines }
export function paragraph(runs, { x, y, size, lineHeight, maxWidth }) {
  const words = runs.flatMap(r => r.text.split(/(?<= )/).map(t => ({ ...r, text: t })));
  let cx = x, cy = y, lines = 1, svg = "";
  for (const w of words) {
    const ww = width(w.text.trimEnd(), w.font, size);
    if (cx > x && cx + ww > x + maxWidth) { cx = x; cy += lineHeight; lines++; }
    svg += textPath(w.text, { x: cx, y: cy, font: w.font, size, fill: w.fill });
    cx += width(w.text, w.font, size);
  }
  return { svg, lines };
}
