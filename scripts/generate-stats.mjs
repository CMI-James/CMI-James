// Builds assets/stats.svg and assets/stats-light.svg from live GitHub data.
// Run daily by .github/workflows/stats.yml. Usage: GITHUB_TOKEN=... node scripts/generate-stats.mjs
import { writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fonts, textPath, themes } from "./svgkit.mjs";

const USER = process.env.STATS_USER || "CMI-James";
const TOKEN = process.env.GITHUB_TOKEN;
if (!TOKEN) throw new Error("GITHUB_TOKEN is required");

async function gh(path, body) {
  const res = await fetch(`https://api.github.com/${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `bearer ${TOKEN}`, "User-Agent": USER },
    body: body && JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

const { data } = await gh("graphql", {
  query: `query($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } }
        commitContributionsByRepository(maxRepositories: 100) {
          contributions { totalCount }
          repository { primaryLanguage { name } }
        }
      }
      repositoriesContributedTo(contributionTypes: [COMMIT, PULL_REQUEST, ISSUE]) { totalCount }
    }
  }`,
  variables: { login: USER },
});
const merged = await gh(`search/issues?q=${encodeURIComponent(`author:${USER} type:pr is:merged`)}&per_page=1`);

const user = data.user;
const collection = user.contributionsCollection;
const calendar = collection.contributionCalendar;
const days = calendar.weeks.flatMap(w => w.contributionDays);

// Longest run of active days in the past year, and the run ending today
// (today may still be empty, so the current streak may end yesterday).
let longest = 0, run = 0;
for (const d of days) { run = d.contributionCount > 0 ? run + 1 : 0; longest = Math.max(longest, run); }
let current = 0;
for (let i = days.length - 1; i >= 0; i--) {
  if (days[i].contributionCount > 0) current++;
  else if (i === days.length - 1) continue;
  else break;
}

// Languages weighted by commits in the past year: up to 5 with at least 1%, the rest as "Other"
const byLang = {};
for (const { contributions, repository } of collection.commitContributionsByRepository) {
  const lang = repository.primaryLanguage?.name;
  if (lang) byLang[lang] = (byLang[lang] || 0) + contributions.totalCount;
}
const langTotal = Object.values(byLang).reduce((a, b) => a + b, 0) || 1;
const ranked = Object.entries(byLang).sort((a, b) => b[1] - a[1]).map(([name, n]) => [name, n / langTotal]);
const shown = ranked.filter(([, share]) => share >= 0.01).slice(0, 5);
const other = 1 - shown.reduce((s, [, share]) => s + share, 0);
const langs = other >= 0.01 ? shown.concat([["Other", other]]) : shown;

const fmt = n => n.toLocaleString("en-GB");
const stats = [
  [fmt(calendar.totalContributions), "contributions, past year"],
  [fmt(merged.total_count), "pull requests merged"],
  [fmt(user.repositoriesContributedTo.totalCount), "repos contributed to"],
  [String(current), `day streak · best ${longest}`],
];

// Weekly totals on a square-root scale so one huge week doesn't flatten the rest
const weeks = calendar.weeks.map(w => Math.sqrt(w.contributionDays.reduce((s, d) => s + d.contributionCount, 0)));
const maxWeek = Math.max(1, ...weeks);

const W = 1200, H = 420, X = 56, span = W - 2 * X;

function render(t) {
  const col = span / stats.length;
  const cells = stats.map(([value, label], i) =>
    textPath(value, { x: X + i * col, y: 152, font: fonts.display, size: 58, fill: t.text, letterSpacing: -0.02 }) +
    textPath(label, { x: X + i * col, y: 188, font: fonts.body, size: 20, fill: t.muted })).join("");

  const barTop = 218, barH = 72, step = span / weeks.length;
  const bars = weeks.map((v, i) => {
    const h = Math.max(3, (v / maxWeek) * barH);
    const y = barTop + barH - h;
    const opacity = v === 0 ? 0.15 : (0.35 + 0.65 * (v / maxWeek)).toFixed(2);
    const begin = `${(i * 0.012).toFixed(3)}s`;
    return `<rect x="${(X + i * step).toFixed(1)}" y="${y.toFixed(1)}" width="${(step - 4).toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="${t.accent}" fill-opacity="${opacity}"><animate attributeName="height" from="0" to="${h.toFixed(1)}" dur="0.8s" begin="${begin}" fill="freeze"/><animate attributeName="y" from="${barTop + barH}" to="${y.toFixed(1)}" dur="0.8s" begin="${begin}" fill="freeze"/></rect>`;
  }).join("");

  // Stacked language bar with a legend underneath, shades of the accent
  const langY = 322;
  let lx = X, legendX = X;
  const shade = i => Math.max(0.2, 1 - i * 0.3).toFixed(2);
  const segments = langs.map(([, share], i) => {
    const w = share * span;
    const seg = `<rect x="${lx.toFixed(1)}" y="${langY}" width="${Math.max(0, w - 3).toFixed(1)}" height="14" rx="4" fill="${t.accent}" fill-opacity="${shade(i)}"/>`;
    lx += w;
    return seg;
  }).join("");
  const legend = langs.map(([name, share], i) => {
    const label = `${name} ${Math.round(share * 100)}%`;
    const item = `<circle cx="${legendX + 6}" cy="${langY + 50}" r="6" fill="${t.accent}" fill-opacity="${shade(i)}"/>` +
      textPath(label, { x: legendX + 20, y: langY + 57, font: fonts.body, size: 19, fill: t.muted });
    legendX += 20 + fonts.body.getAdvanceWidth(label, 19) + 32;
    return item;
  }).join("");

  const summary = `${stats.map(([v, l]) => `${v} ${l}`).join(", ")}. Languages by commits: ${langs.map(([n, s]) => `${n} ${Math.round(s * 100)}%`).join(", ")}.`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="title">
  <title id="title">GitHub activity for ${USER}: ${summary}</title>
  <style>@media (prefers-reduced-motion: reduce) { animate { display: none; } }</style>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="24" fill="${t.bg}" stroke="${t.line}"/>
  ${textPath("ACTIVITY · UPDATED DAILY", { x: X, y: 66, font: fonts.mono, size: 16, fill: t.accent, letterSpacing: 0.14 })}
  ${cells}
  ${bars}
  ${segments}
  ${legend}
</svg>
`;
}

const assets = join(resolve(dirname(fileURLToPath(import.meta.url)), ".."), "assets");
writeFileSync(join(assets, "stats.svg"), render(themes.dark));
writeFileSync(join(assets, "stats-light.svg"), render(themes.light));
console.log(`stats: ${stats.map(([v, l]) => `${v} ${l}`).join(" | ")} | ${langs.map(([n, s]) => `${n} ${Math.round(s * 100)}%`).join(", ")}`);
