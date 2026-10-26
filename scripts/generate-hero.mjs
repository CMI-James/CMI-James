// Builds assets/hero.svg and assets/hero-light.svg: outlined text plus an animated
// system diagram. Usage: node scripts/generate-hero.mjs
import { writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fonts, paragraph, textPath, themes, width } from "./svgkit.mjs";

const W = 1200, H = 460, X = 64;
const assets = join(resolve(dirname(fileURLToPath(import.meta.url)), ".."), "assets");

const nodes = {
  next: { label: "Next.js", x: 975, y: 92 },
  pg: { label: "PostgreSQL", x: 862, y: 206 },
  supa: { label: "Supabase", x: 1078, y: 206 },
  sanity: { label: "Sanity CMS", x: 862, y: 320 },
  rust: { label: "Rust · Soroban", x: 1060, y: 320 },
};
const edges = [["next", "pg"], ["next", "supa"], ["pg", "supa"], ["pg", "sanity"], ["supa", "rust"], ["sanity", "rust"]];

function hero(t) {
  const name = "Chibuikem Ilonze", size = 72;
  const nameWidth = width(name, fonts.display, size, -0.02);
  if (X + nameWidth > 780) throw new Error(`Name runs into the diagram (${Math.round(nameWidth)}px)`);

  const lede = paragraph([
    { text: "I build ", font: fonts.body, fill: t.muted },
    { text: "production web apps end to end", font: fonts.bodyMedium, fill: t.text },
    { text: ", from a company-wide ERP to public websites, and ", font: fonts.body, fill: t.muted },
    { text: "smart contracts in Rust", font: fonts.bodyMedium, fill: t.text },
    { text: " for open-source Web3 projects.", font: fonts.body, fill: t.muted },
  ], { x: X, y: 286, size: 25, lineHeight: 38, maxWidth: 650 });

  const dot = X + nameWidth + 3;

  const edgeSvg = edges.map(([a, b], i) => {
    const A = nodes[a], B = nodes[b];
    const d = `M${A.x} ${A.y} L${B.x} ${B.y}`;
    return `<path d="${d}" class="edge"/>
    <circle r="4" fill="${t.accent}"><animateMotion dur="${3 + (i % 3)}s" begin="${i * 0.6}s" repeatCount="indefinite" path="${d}"/></circle>`;
  }).join("");

  const nodeSvg = Object.values(nodes).map((n, i) => {
    const tw = width(n.label, fonts.mono, 16);
    const w = tw + 52, h = 44;
    return `<g class="node" style="animation-delay:${i * 0.5}s">
      <rect x="${n.x - w / 2}" y="${n.y - h / 2}" width="${w}" height="${h}" rx="22" fill="${t.panel}" stroke="${t.line}"/>
      <circle cx="${n.x - w / 2 + 20}" cy="${n.y}" r="5" fill="${t.accent}" class="pulse" style="animation-delay:${i * 0.5}s"/>
      ${textPath(n.label, { x: n.x - w / 2 + 34, y: n.y + 6, font: fonts.mono, size: 16, fill: t.text })}
    </g>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="title">
  <title id="title">Chibuikem Ilonze, full-stack software engineer. I build production web apps end to end, from a company-wide ERP to public websites, and smart contracts in Rust for open-source Web3 projects.</title>
  <defs>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="${t.line}"/></pattern>
    <radialGradient id="fade" cx="0.8" cy="0.1" r="0.7"><stop offset="0" stop-color="#fff" stop-opacity="0.5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <mask id="gridMask"><rect width="${W}" height="${H}" fill="url(#fade)"/></mask>
    <radialGradient id="glow" cx="0.82" cy="0.05" r="0.45"><stop offset="0" stop-color="${t.accent}" stop-opacity="${t === themes.dark ? 0.16 : 0.10}"/><stop offset="1" stop-color="${t.accent}" stop-opacity="0"/></radialGradient>
    <clipPath id="clip"><rect width="${W}" height="${H}" rx="24"/></clipPath>
  </defs>
  <style>
    .edge { stroke: ${t.muted}; stroke-opacity: 0.45; stroke-width: 2; fill: none; stroke-dasharray: 6 8; animation: flow 1.6s linear infinite; }
    .pulse { animation: pulse 2.4s ease-in-out infinite; }
    .reveal { animation: up 0.9s ease-out both; }
    @keyframes flow { to { stroke-dashoffset: -28; } }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
    @keyframes up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
    @media (prefers-reduced-motion: reduce) { .edge, .pulse, .reveal { animation: none; } circle animateMotion { display: none; } }
  </style>
  <g clip-path="url(#clip)">
    <rect width="${W}" height="${H}" fill="${t.bg}"/>
    <rect width="${W}" height="${H}" fill="url(#grid)" mask="url(#gridMask)"/>
    <rect width="${W}" height="${H}" fill="url(#glow)"/>
    <g class="reveal">
      ${textPath("FULL-STACK SOFTWARE ENGINEER", { x: X, y: 120, font: fonts.mono, size: 16, fill: t.accent, letterSpacing: 0.14 })}
      ${textPath(name, { x: X, y: 210, font: fonts.display, size, fill: t.text, letterSpacing: -0.02 })}
      <rect x="${dot}" y="195" width="15" height="15" rx="7.5" fill="${t.accent}"/>
      ${lede.svg}
    </g>
    ${edgeSvg}
    ${nodeSvg}
  </g>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="24" fill="none" stroke="${t.line}"/>
</svg>
`;
}

for (const [name, t] of [["hero", themes.dark], ["hero-light", themes.light]]) {
  writeFileSync(join(assets, `${name}.svg`), hero(t));
  console.log(`${name}.svg`);
}
