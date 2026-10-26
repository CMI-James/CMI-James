// Builds assets/stats.svg from live GitHub data. Run by .github/workflows/stats.yml.
// Usage: GITHUB_TOKEN=... node scripts/generate-stats.mjs
import { writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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
      }
      repositoriesContributedTo(contributionTypes: [COMMIT, PULL_REQUEST, ISSUE]) { totalCount }
    }
  }`,
  variables: { login: USER },
});
const merged = await gh(`search/issues?q=${encodeURIComponent(`author:${USER} type:pr is:merged`)}&per_page=1`);

const user = data.user;
const calendar = user.contributionsCollection.contributionCalendar;
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

const fmt = n => n.toLocaleString("en-GB");
const stats = [
  [fmt(calendar.totalContributions), "contributions, past year"],
  [fmt(merged.total_count), "pull requests merged"],
  [fmt(user.repositoriesContributedTo.totalCount), "repos contributed to"],
  [`${current}d`, `current streak · best ${longest}d`],
];

// Weekly totals as a bar strip along the bottom. Square-root scale so one
// huge week doesn't flatten the rest of the year.
const weeks = calendar.weeks.map(w => Math.sqrt(w.contributionDays.reduce((s, d) => s + d.contributionCount, 0)));
const max = Math.max(1, ...weeks);
const W = 1200, H = 300, barTop = 196, barH = 64, x0 = 64, span = W - 128;
const step = span / weeks.length;
const bars = weeks.map((v, i) => {
  const h = Math.max(2, (v / max) * barH);
  const opacity = v === 0 ? 0.15 : (0.35 + 0.65 * (v / max)).toFixed(2);
  return `<rect x="${(x0 + i * step).toFixed(1)}" y="${(barTop + barH - h).toFixed(1)}" width="${(step - 4).toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="#7cf2c9" fill-opacity="${opacity}"><animate attributeName="height" from="0" to="${h.toFixed(1)}" dur="0.8s" begin="${(i * 0.012).toFixed(3)}s" fill="freeze"/><animate attributeName="y" from="${barTop + barH}" to="${(barTop + barH - h).toFixed(1)}" dur="0.8s" begin="${(i * 0.012).toFixed(3)}s" fill="freeze"/></rect>`;
}).join("");

const col = span / stats.length;
const cells = stats.map(([value, label], i) => `
  <text x="${x0 + i * col}" y="118" class="v">${value}</text>
  <text x="${x0 + i * col}" y="148" class="l">${label}</text>`).join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t">
  <title id="t">GitHub activity for ${USER}: ${stats.map(([v, l]) => `${v} ${l}`).join(", ")}.</title>
  <style>
    .e { font: 600 13px ui-monospace, "SFMono-Regular", Consolas, monospace; letter-spacing: 0.14em; fill: #7cf2c9; }
    .v { font: 700 44px -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; fill: #e8edf3; letter-spacing: -0.02em; }
    .l { font: 400 15px -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; fill: #8a96a6; }
  </style>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="20" fill="#0a0c10" stroke="#222a35"/>
  <text x="${x0}" y="58" class="e">ACTIVITY · UPDATED DAILY</text>
  ${cells}
  ${bars}
</svg>
`;

const out = join(resolve(dirname(fileURLToPath(import.meta.url)), ".."), "assets", "stats.svg");
writeFileSync(out, svg);
console.log(`stats.svg: ${stats.map(([v, l]) => `${v} ${l}`).join(" | ")}`);
