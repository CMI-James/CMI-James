// Renders the HTML cards in design/ to PNGs in assets/ with headless Chrome.
// Usage: node scripts/render-cards.mjs   (set CHROME=/path/to/chrome to override)
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const design = join(root, "design");
const assets = join(root, "assets");
mkdirSync(assets, { recursive: true });

const chrome = process.env.CHROME || [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
].find(existsSync);
if (!chrome) throw new Error("No Chrome found; set CHROME=/path/to/chrome");

// [output name, template, query string]; each is rendered dark (name.png) and light (name-light.png)
const cards = [
  ["p-erp", "featured.html", "p=erp"],
  ["p-web", "featured.html", "p=web"],
  ["p-stellarcade", "small.html", "p=stellarcade"],
  ["p-sylox", "small.html", "p=sylox"],
  ["stack", "stack.html", ""],
  ["c-github", "contact.html", "c=github"],
  ["c-linkedin", "contact.html", "c=linkedin"],
  ["c-x", "contact.html", "c=x"],
  ["c-site", "contact.html", "c=site"],
];

const jobs = cards.flatMap(([name, file, query]) => [
  [name, file, `?${query}`],
  [`${name}-light`, file, `?${query}&theme=light`],
]);

for (const [name, file, query] of jobs) {
  const html = readFileSync(join(design, file), "utf8");
  const [w, h] = html.match(/name="size" content="(\d+)x(\d+)"/).slice(1);
  const out = join(assets, `${name}.png`);
  execFileSync(chrome, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=2",
    "--default-background-color=00000000",
    "--virtual-time-budget=6000",
    `--window-size=${w},${h}`,
    `--screenshot=${out}`,
    pathToFileURL(join(design, file)).href + query,
  ], { stdio: "ignore" });
  console.log(`${name}.png  ${w}x${h} @2x`);
}
