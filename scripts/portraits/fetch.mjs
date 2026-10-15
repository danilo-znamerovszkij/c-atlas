// Fetch thinker portraits from Wikimedia Commons (free licences only) for the
// people below: each person's main Wikipedia image, kept only if it is hosted
// on Commons with a free licence (Wikipedia-only "fair use" files are skipped).
// Writes originals to .cache/portraits/ and metadata to .cache/portraits/meta.json;
// crop.mjs turns them into public/portraits/*.webp + src/content/portraits.json.
// Run: node scripts/portraits/fetch.mjs [--discover]
// --discover also tries every other thinker named in the Atlas, by exact
// Wikipedia title, keeping only articles whose short description fits the
// field (philosopher, neuroscientist, physicist, ...) and that aren't
// disambiguation pages. Check the contact sheet afterwards for wrong people.
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// [name as it appears in theory entries, Wikipedia article title]
export const PEOPLE = [
  // most viewed
  ["Roger Penrose", "Roger Penrose"], ["Stuart Hameroff", "Stuart Hameroff"], ["Rupert Spira", "Rupert Spira"],
  ["Philip Goff", "Philip Goff (philosopher)"], ["David Bentley Hart", "David Bentley Hart"], ["Bernardo Kastrup", "Bernardo Kastrup"],
  ["J.P. Moreland", "J. P. Moreland"], ["Richard Swinburne", "Richard Swinburne"], ["David Chalmers", "David Chalmers"],
  ["Giulio Tononi", "Giulio Tononi"], ["Christof Koch", "Christof Koch"], ["Frank Jackson", "Frank Jackson (philosopher)"],
  ["Jay Garfield", "Jay L. Garfield"], ["Sam Harris", "Sam Harris"], ["Paul Davies", "Paul Davies"], ["Thomas Nagel", "Thomas Nagel"],
  ["Ned Block", "Ned Block"], ["J.J.C. Smart", "J. J. C. Smart"], ["Deepak Chopra", "Deepak Chopra"], ["Menas Kafatos", "Menas Kafatos"],
  ["Noam Chomsky", "Noam Chomsky"], ["Rupert Carhart-Harris", "Robin Carhart-Harris"], ["Karl Friston", "Karl J. Friston"],
  ["George Ellis", "George F. R. Ellis"], ["Max Tegmark", "Max Tegmark"], ["George Musser", "George Musser"],
  ["Swami Vivekananda", "Swami Vivekananda"], ["Bhagavan Sri Ramana Maharshi", "Ramana Maharshi"], ["Sri Aurobindo", "Sri Aurobindo"],
  ["Lee Smolin", "Lee Smolin"], ["Dirk K. F. Meijer", "Dirk Meijer"],
  // historical
  ["René Descartes", "René Descartes"], ["Baruch Spinoza", "Baruch Spinoza"], ["Thomas Hobbes", "Thomas Hobbes"], ["John Locke", "John Locke"],
  ["David Hume", "David Hume"], ["Immanuel Kant", "Immanuel Kant"], ["Gottfried Wilhelm Leibniz", "Gottfried Wilhelm Leibniz"],
  ["George Berkeley", "George Berkeley"], ["Arthur Schopenhauer", "Arthur Schopenhauer"], ["William James", "William James"],
  ["Edmund Husserl", "Edmund Husserl"], ["Maurice Merleau-Ponty", "Maurice Merleau-Ponty"], ["Martin Heidegger", "Martin Heidegger"],
  ["Jean-Paul Sartre", "Jean-Paul Sartre"], ["Henri Bergson", "Henri Bergson"], ["Alfred North Whitehead", "Alfred North Whitehead"],
  ["Bertrand Russell", "Bertrand Russell"], ["Sigmund Freud", "Sigmund Freud"], ["Thomas Aquinas", "Thomas Aquinas"],
  ["Ludwig Wittgenstein", "Ludwig Wittgenstein"], ["Aristotle", "Aristotle"], ["Georg Wilhelm Friedrich Hegel", "Georg Wilhelm Friedrich Hegel"],
  ["Carl Jung", "Carl Jung"], ["Wolfgang Pauli", "Wolfgang Pauli"], ["David Bohm", "David Bohm"], ["Alan Turing", "Alan Turing"],
  // also in several theories
  ["Daniel Dennett", "Daniel Dennett"], ["John Searle", "John Searle"],
];

const UA = "ConsciousnessAtlas/1.0 (https://www.consciousnessatlas.com; portraits fetch)";
const FREE = /^(public domain|pd|cc0|cc[- ]by(-sa)?([ -]\d\.\d)?|cc by(-sa)? \d\.\d|attribution|gfdl|no restrictions)/i;
// Found by --discover but not a portrait of the person (or not a person).
export const EXCLUDE = new Set([
  "Richard Gregory", "Vātsyāyana", "Laozi", "Yogācāra Buddhism", "Asaṅga", "Christian Mysticism", "The Upanishads",
  // group shots, no usable face, or not a portrait
  "Herbert Feigl", "Adam Frank", "Manuel Blum", "Ken Wilber", "Rāmānuja", "Madhva", "Dharmakīrti",
  // extra.mjs (Openverse) matches that were diagrams, art, graves or namesakes
  "Michael Graziano", "Benjamin Libet", "Per Bak", "Jan Holmgren", "Friedrich Beck", "George Musser", "Susan Hurley",
]);
const strip = (html) => String(html || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const api = async (host, params) => {
  const res = await fetch(`https://${host}/w/api.php?${new URLSearchParams({ format: "json", formatversion: "2", origin: "*", ...params })}`, { headers: { "User-Agent": UA } });
  return res.json();
};

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const out = join(root, ".cache", "portraits");
mkdirSync(out, { recursive: true });
const metaFile = join(out, "meta.json");
const meta = existsSync(metaFile) ? JSON.parse(readFileSync(metaFile, "utf-8")) : {};
const targets = [...PEOPLE];

if (process.argv.includes("--discover")) {
  const FIELD = /philosoph|neuroscien|scientist|physicist|psycholog|psychiatr|theolog|mathematic|biolog|cognitive|neurolog|physician|monk|guru|mystic|yogi|spiritual|sage|scholar|professor|researcher|author|writer|anthropolog|linguist|cosmolog|astronom|chemist|logician|priest|rabbi|lama|teacher|academic|computer|engineer|parapsycholog|psychoanalys|anaesthesiolog|anesthesiolog|historian|sufi|saint|bishop|pope|religious|zen|buddhist|hindu|jesuit/i;
  const known = new Set(PEOPLE.map(([n]) => n));
  const index = JSON.parse(readFileSync(join(root, "public", "theory-index", "en.json"), "utf-8"));
  const names = [...new Set(index.flatMap((t) => t.thinkers || []).map((n) => n.replace(/\(.*?\)/g, "").replace(/\s+/g, " ").trim()).filter((n) => n && !known.has(n)))];
  for (let i = 0; i < names.length; i += 50) {
    const batch = names.slice(i, i + 50);
    const q = (await api("en.wikipedia.org", { action: "query", prop: "pageimages|description|pageprops", piprop: "name", titles: batch.join("|"), redirects: "1" })).query;
    const to = new Map();
    for (const n of q.normalized || []) to.set(n.from, n.to);
    for (const r of q.redirects || []) to.set(r.from, r.to);
    const pages = new Map((q.pages || []).map((p) => [p.title, p]));
    for (const name of batch) {
      let t = to.get(name) || name;
      t = to.get(t) || t;
      const page = pages.get(t);
      if (!page || page.missing || page.pageprops?.disambiguation !== undefined || !page.pageimage) continue;
      if (!FIELD.test(page.description || "")) { console.log(`? ${name}: "${page.description || ""}", skipped`); continue; }
      targets.push([name, page.title]);
    }
  }
  console.log(`discovered ${targets.length - PEOPLE.length} more candidates`);
}

for (const name of EXCLUDE) delete meta[name];
for (const [name, title] of targets) {
  if (meta[name] || EXCLUDE.has(name)) continue;
  try {
    const page = (await api("en.wikipedia.org", { action: "query", prop: "pageimages", piprop: "name", titles: title, redirects: "1" })).query.pages[0];
    const file = page?.pageimage;
    if (!file) { console.log(`- ${name}: no page image`); continue; }
    const info = (await api("commons.wikimedia.org", { action: "query", prop: "imageinfo", titles: `File:${file}`, iiprop: "url|extmetadata|size", iiurlwidth: "900" })).query.pages[0];
    const ii = info?.imageinfo?.[0];
    if (!ii || info.missing) { console.log(`- ${name}: ${file} not on Commons (non-free), skipped`); continue; }
    const m = ii.extmetadata || {};
    const license = strip(m.LicenseShortName?.value);
    if (!FREE.test(license)) { console.log(`- ${name}: licence "${license}" not free, skipped`); continue; }
    const img = await fetch(ii.thumburl || ii.url, { headers: { "User-Agent": UA } });
    const ext = new URL(ii.thumburl || ii.url).pathname.split(".").pop().toLowerCase();
    const local = `${name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.${ext}`;
    writeFileSync(join(out, local), Buffer.from(await img.arrayBuffer()));
    meta[name] = {
      local, file, source: ii.descriptionurl, license, licenseUrl: m.LicenseUrl?.value || null,
      author: strip(m.Artist?.value) || null, credit: strip(m.Credit?.value) || null, width: ii.width, height: ii.height,
    };
    console.log(`+ ${name}: ${file} (${license})`);
  } catch (e) {
    console.log(`! ${name}: ${e.message}`);
  }
  await new Promise((r) => setTimeout(r, 250));
}
writeFileSync(metaFile, JSON.stringify(meta, null, 2));
console.log(`${Object.keys(meta).length} portraits in total`);
