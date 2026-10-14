// One-off (re-runnable) snapshot of the most viewed theories for the sidebar's
// "Most viewed" block. Exports 12 months of Mixpanel 'Page View' events with a
// service account and attributes each one to a theory:
//   - theory_name set to a theory (chart click, router): count that theory. Its
//     url is the page the click came from, so the url is ignored.
//   - theory_name 'Home' or missing (the app-load event): the theory in the url
//     path, /{category}/{slug} or /{locale}/{category}/{slug}. Before Oct 2026
//     this was the only record of direct visits (search engines, shared links).
// Keeps theories that are still chart leaves; writes the top 25 to
// src/data/mostViewed.json.
//
// Credentials come from the environment or .env.local (gitignored):
//   MIXPANEL_PROJECT_ID, MIXPANEL_SERVICE_ACCOUNT_USERNAME,
//   MIXPANEL_SERVICE_ACCOUNT_SECRET, MIXPANEL_API_HOST (optional:
//   eu.mixpanel.com / in.mixpanel.com for non-US data residency)
//
// Usage: node scripts/fetch-most-viewed.js
// Note: uses the raw Export API; Mixpanel's query API (segmentation) needs a paid plan.
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TOP = 25;
const MONTHS = 12;

const envFile = join(ROOT, ".env.local");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf-8").split("\n")) {
    const m = line.match(/^\s*(?:export\s+)?([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

const { MIXPANEL_PROJECT_ID, MIXPANEL_SERVICE_ACCOUNT_USERNAME, MIXPANEL_SERVICE_ACCOUNT_SECRET } = process.env;
const missing = ["MIXPANEL_PROJECT_ID", "MIXPANEL_SERVICE_ACCOUNT_USERNAME", "MIXPANEL_SERVICE_ACCOUNT_SECRET"].filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing ${missing.join(", ")} (set them in .env.local or the environment).`);
  process.exit(1);
}

const isoDate = (d) => d.toISOString().slice(0, 10);
const to = new Date();
const from = new Date(to);
from.setMonth(from.getMonth() - MONTHS);

// Raw Export API (available on free plans, unlike the query API): one JSON
// event per line; count theory_name locally.
const params = new URLSearchParams({
  project_id: MIXPANEL_PROJECT_ID,
  from_date: isoDate(from),
  to_date: isoDate(to),
  event: JSON.stringify(["Page View"]),
});
const host = process.env.MIXPANEL_API_HOST ? `data-${process.env.MIXPANEL_API_HOST}` : "data.mixpanel.com";
const auth = Buffer.from(`${MIXPANEL_SERVICE_ACCOUNT_USERNAME}:${MIXPANEL_SERVICE_ACCOUNT_SECRET}`).toString("base64");
const response = await fetch(`https://${host}/api/2.0/export?${params}`, {
  headers: { Authorization: `Basic ${auth}`, Accept: "text/plain" },
});
if (!response.ok) {
  console.error(`Mixpanel ${response.status}: ${(await response.text()).slice(0, 300)}`);
  process.exit(1);
}
// Only names that are chart leaves today (drops 'Home', the paper page, and
// umbrella nodes removed in the LoC sync).
const leaves = new Set();
const walk = (node) => (node.children ? node.children.forEach(walk) : leaves.add(node.name));
JSON.parse(readFileSync(join(ROOT, "src", "config", "taxonomy.json"), "utf-8")).forEach(walk);

// Mirrors generateSlug() in src/utils/slugUtils.ts.
const generateSlug = (name) =>
  name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[øæœßłđ]/g, (c) => ({ ø: "o", æ: "ae", œ: "oe", ß: "ss", ł: "l", đ: "d" })[c] ?? c)
    .replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
const leafBySlug = new Map([...leaves].map((name) => [generateSlug(name), name]));
const LOCALES = new Set(["es", "fr", "de", "it", "nl", "pl", "pt-BR", "pt-PT", "ru", "uk", "tr", "ar", "he", "hi", "bn", "zh-CN", "zh-TW", "ja", "ko", "id", "ms", "vi", "th"]);
const LANDING_NAMES = new Set(["Home", undefined, null, ""]);

const theoryFromUrl = (url) => {
  let path;
  try { path = new URL(url).pathname; } catch { return null; }
  const segments = decodeURIComponent(path).split("/").filter(Boolean);
  if (LOCALES.has(segments[0])) segments.shift();
  return segments.length === 2 ? { slug: segments[1], name: leafBySlug.get(segments[1]) } : null;
};

const counts = new Map();
const bySource = { theory_name: 0, url: 0 };
const unmatchedSlugs = new Map();
let events = 0;
for (const line of (await response.text()).split("\n")) {
  if (!line.trim()) continue;
  let event;
  try {
    event = JSON.parse(line);
  } catch {
    console.error(`Unexpected export response (wrong MIXPANEL_API_HOST region?): ${line.slice(0, 120)}`);
    process.exit(1);
  }
  events++;
  const { theory_name: theoryName, url } = event.properties ?? {};
  let name = null;
  if (!LANDING_NAMES.has(theoryName)) {
    if (leaves.has(theoryName)) { name = theoryName; bySource.theory_name++; }
  } else {
    const hit = theoryFromUrl(url);
    if (hit?.name) { name = hit.name; bySource.url++; }
    else if (hit) unmatchedSlugs.set(hit.slug, (unmatchedSlugs.get(hit.slug) || 0) + 1);
  }
  if (name) counts.set(name, (counts.get(name) || 0) + 1);
}

const ranked = [...counts].map(([name, views]) => ({ name, views })).sort((a, b) => b.views - a.views);
const theories = ranked.slice(0, TOP);

// Editorial overrides kept across refreshes: { "<leaf>": <1-based position> }
// in the existing file's manualPositions.
const outFile = join(ROOT, "src", "data", "mostViewed.json");
const manualPositions = existsSync(outFile) ? JSON.parse(readFileSync(outFile, "utf-8")).manualPositions ?? {} : {};
// Take all pinned entries out first, then insert in ascending position, so
// moving one doesn't shift another's target.
const pinned = Object.entries(manualPositions)
  .map(([name, position]) => ({ position, entry: theories.find((t) => t.name === name) }))
  .filter((p) => p.entry)
  .sort((a, b) => a.position - b.position);
for (const { entry } of pinned) theories.splice(theories.indexOf(entry), 1);
for (const { position, entry } of pinned) theories.splice(position - 1, 0, entry);

const out = {
  source: "Mixpanel 'Page View' events: theory_name, or the theory in the url for app-load events (scripts/fetch-most-viewed.js)",
  from: isoDate(from),
  to: isoDate(to),
  manualPositions,
  theories,
};
writeFileSync(outFile, JSON.stringify(out, null, 2) + "\n");
console.log(`${events} Page View events; attributed via theory_name: ${bySource.theory_name}, via url: ${bySource.url}; wrote top ${theories.length} (${out.from} → ${out.to}).`);
const unmatched = [...unmatchedSlugs].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([slug, n]) => `${slug} (${n})`);
if (unmatched.length) console.log(`Theory-like urls not on the chart today: ${unmatched.join(", ")}`);
