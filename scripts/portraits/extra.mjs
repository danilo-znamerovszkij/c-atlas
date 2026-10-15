// Second pass for significant thinkers still without a portrait: those with an
// English Wikipedia article (in the field) but no free page image. Tries the
// person's Wikidata image (P18, on Commons), then Openverse (openly licensed
// images from Flickr and elsewhere; CC BY, CC BY-SA, CC0, public domain only,
// title must name the person). Adds hits to .cache/portraits/meta.json with
// their licence; review the contact sheet, then run crop.mjs.
// Run: node scripts/portraits/extra.mjs
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { EXCLUDE } from "./fetch.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const cache = join(root, ".cache", "portraits");
const meta = JSON.parse(readFileSync(join(cache, "meta.json"), "utf-8"));
const UA = "ConsciousnessAtlas/1.0 (https://www.consciousnessatlas.com; portraits fetch)";
const FIELD = /philosoph|neuroscien|scientist|physicist|psycholog|psychiatr|theolog|mathematic|biolog|cognitive|neurolog|physician|monk|guru|mystic|spiritual|scholar|professor|researcher|author|writer|anthropolog|linguist|cosmolog|astronom|logician|teacher|academic|computer|engineer|parapsycholog|psychoanalys|historian|religious|buddhist|hindu/i;
const FREE = /^(by|by-sa|cc0|pdm)$/;
const strip = (h) => String(h || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const get = async (url) => (await fetch(url, { headers: { "User-Agent": UA } })).json();
const wiki = (host, p) => get(`https://${host}/w/api.php?${new URLSearchParams({ format: "json", formatversion: "2", origin: "*", ...p })}`);
const slug = (n) => n.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const fold = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const index = JSON.parse(readFileSync(join(root, "public", "theory-index", "en.json"), "utf-8"));
const missing = [...new Set(index.flatMap((t) => t.thinkers || []).map((n) => n.replace(/\(.*?\)/g, "").replace(/\s+/g, " ").trim()))]
  .filter((n) => n && !meta[n] && !EXCLUDE.has(n));

// Significant = has an English Wikipedia article in the field.
const people = [];
for (let i = 0; i < missing.length; i += 50) {
  const batch = missing.slice(i, i + 50);
  const q = (await wiki("en.wikipedia.org", { action: "query", prop: "description|pageprops", titles: batch.join("|"), redirects: "1" })).query;
  const to = new Map([...(q.normalized || []), ...(q.redirects || [])].map((r) => [r.from, r.to]));
  const pages = new Map((q.pages || []).map((p) => [p.title, p]));
  for (const name of batch) {
    const t = to.get(to.get(name) || name) || to.get(name) || name;
    const p = pages.get(t);
    if (p && !p.missing && p.pageprops?.disambiguation === undefined && FIELD.test(p.description || "")) people.push({ name, title: p.title, qid: p.pageprops?.wikibase_item });
  }
}
console.log(`${missing.length} without a portrait, ${people.length} with a Wikipedia article in the field`);

const save = async (name, url, info) => {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`download ${res.status}`);
  const ext = (new URL(url).pathname.split(".").pop() || "jpg").toLowerCase().slice(0, 4);
  const local = `${slug(name)}.${/^(jpe?g|png|webp|gif|tif)$/.test(ext) ? ext : "jpg"}`;
  writeFileSync(join(cache, local), Buffer.from(await res.arrayBuffer()));
  meta[name] = { local, ...info };
};

for (const { name, qid } of people) {
  try {
    // 1. Wikidata image (P18)
    if (qid) {
      const claims = (await get(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`)).entities?.[qid]?.claims;
      const file = claims?.P18?.[0]?.mainsnak?.datavalue?.value;
      if (file) {
        const ii = (await wiki("commons.wikimedia.org", { action: "query", prop: "imageinfo", titles: `File:${file}`, iiprop: "url|extmetadata", iiurlwidth: "900" })).query.pages[0]?.imageinfo?.[0];
        const m = ii?.extmetadata || {};
        const license = strip(m.LicenseShortName?.value);
        if (ii && /^(public domain|pd|cc0|cc[- ]by|attribution|gfdl|no restrictions)/i.test(license)) {
          await save(name, ii.thumburl || ii.url, { file, source: ii.descriptionurl, license, licenseUrl: m.LicenseUrl?.value || null, author: strip(m.Artist?.value) || null, via: "wikidata" });
          console.log(`+ ${name}: Wikidata ${file} (${license})`);
          continue;
        }
      }
    }
    // 2. Openverse
    const ov = await get(`https://api.openverse.org/v1/images/?${new URLSearchParams({ q: `"${name}"`, license: "by,by-sa,cc0,pdm", page_size: "10", mature: "false" })}`);
    const surname = fold(name.split(" ").pop());
    const hit = (ov.results || []).find((r) => FREE.test(r.license) && fold(r.title).includes(surname) && !/(book|cover|poster|slide|diagram|logo|quote)/i.test(r.title));
    if (hit) {
      await save(name, hit.url, {
        file: hit.title, source: hit.foreign_landing_url, license: `CC ${hit.license.toUpperCase()} ${hit.license_version || ""}`.replace("CC PDM", "Public domain").replace("CC CC0", "CC0").trim(),
        licenseUrl: hit.license_url, author: hit.creator || null, via: `openverse:${hit.source}`,
      });
      console.log(`+ ${name}: Openverse/${hit.source} "${hit.title}" (${hit.license} ${hit.license_version || ""}) by ${hit.creator}`);
    } else console.log(`- ${name}`);
  } catch (e) {
    console.log(`! ${name}: ${e.message}`);
  }
  await new Promise((r) => setTimeout(r, 1200));
}
writeFileSync(join(cache, "meta.json"), JSON.stringify(meta, null, 2));
