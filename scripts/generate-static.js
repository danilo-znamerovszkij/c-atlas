import { writeFileSync, existsSync, readFileSync, mkdirSync } from "fs";
import { execSync } from "child_process";
import { buildPages } from "./pages.js";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Keep in sync with SUPPORTED_LOCALES / DEFAULT_LOCALE in src/shared/site.ts
const DEFAULT_LOCALE = "en";
const SUPPORTED_LOCALES = [
  "en", "es", "fr", "de", "it", "nl", "pl", "pt-BR", "pt-PT", "ru", "uk", "tr",
  "ar", "he", "hi", "bn", "zh-CN", "zh-TW", "ja", "ko", "id", "ms", "vi", "th",
];

function generateSlug(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[øæœßłđ]/g, (c) => ({ ø: "o", æ: "ae", œ: "oe", ß: "ss", ł: "l", đ: "d" })[c] ?? c)
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// Same taxonomy the chart renders (src/config/chartConfig.ts imports it too).
const baseData = JSON.parse(
  readFileSync(join(__dirname, "..", "src", "config", "taxonomy.json"), "utf-8")
);

// Mirrors resolveTheoryFileStem() in src/utils/slugUtils.ts.
function resolveTheoryFileStem(name) {
  return generateSlug(name)
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("-");
}

function extractTheories() {
  const theories = [];

  for (const mainCategory of baseData) {
    const categorySlug = generateSlug(mainCategory.name);

    if (mainCategory.children) {
      for (const subcategory of mainCategory.children) {
        if (subcategory.children) {
          for (const theory of subcategory.children) {
            theories.push({
              category: categorySlug,
              theory: generateSlug(theory.name),
              stem: resolveTheoryFileStem(theory.name),
            });
          }
        } else {
          theories.push({
            category: categorySlug,
            theory: generateSlug(subcategory.name),
            stem: resolveTheoryFileStem(subcategory.name),
          });
        }
      }
    }
  }

  return theories;
}

function getShippedLocales(publicDir) {
  // A locale counts as "shipped" only when it has BOTH a UI dictionary and a
  // taxonomy dictionary. Requiring the taxonomy too excludes locales that are
  // half-translated (e.g. `hi`, which has UI strings but no taxonomy or
  // per-theory data) - otherwise the sitemap would advertise localized theory
  // URLs that just fall back to English content (thin/duplicate content).
  // This matches AVAILABLE_LOCALES in src/shared/site.ts.
  return SUPPORTED_LOCALES.filter(
    (locale) =>
      locale === DEFAULT_LOCALE ||
      (existsSync(join(publicDir, "i18n", "ui", `${locale}.json`)) &&
        existsSync(join(publicDir, "i18n", "taxonomy", `${locale}.json`)))
  );
}

function localizedPath(pathWithoutLocale, locale) {
  if (locale === DEFAULT_LOCALE) return pathWithoutLocale;
  return pathWithoutLocale === "/" ? `/${locale}` : `/${locale}${pathWithoutLocale}`;
}

function hreflangBlock(baseUrl, pathWithoutLocale, locales) {
  const links = locales.map(
    (code) =>
      `      <xhtml:link rel="alternate" hreflang="${code}" href="${baseUrl}${localizedPath(pathWithoutLocale, code)}" />`
  );
  links.push(
    `      <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}${pathWithoutLocale}" />`
  );
  return links.join("\n");
}

// Last commit date per file under public/ (one git call). Builds without git
// history (or a shallow clone) just omit <lastmod>.
function gitLastModified() {
  const dates = new Map();
  try {
    const log = execSync("git log --format=@%cI --name-only -- public/data public/categories src/content", {
      cwd: join(__dirname, ".."), encoding: "utf-8", maxBuffer: 64 * 1024 * 1024,
    });
    let current = null;
    for (const line of log.split("\n")) {
      if (line.startsWith("@")) current = line.slice(1, 11);
      else if (line && current && !dates.has(line)) dates.set(line, current);
    }
  } catch {
    // no git available
  }
  return dates;
}

// One sitemap per locale plus a sitemap index (sitemap.xml), so Search
// Console reports indexing per language. Hub pages (scripts/pages.js) are
// English-only and go in the English sitemap.
function generateSitemaps(baseUrl, locales, hubPaths) {
  const theories = extractTheories();
  const modified = gitLastModified();
  const latest = [...modified.values()].sort().pop();
  const urlEntry = (loc, alternates, lastmod) => `  <url>
    <loc>${loc}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}${alternates ? `\n${alternates}` : ""}
  </url>`;
  const byLocale = Object.fromEntries(locales.map((l) => [l, []]));

  for (const locale of locales) {
    byLocale[locale].push(urlEntry(`${baseUrl}${localizedPath("/", locale)}`, hreflangBlock(baseUrl, "/", locales), latest));
  }
  byLocale[DEFAULT_LOCALE].push(urlEntry(`${baseUrl}/paper`));
  for (const path of hubPaths) byLocale[DEFAULT_LOCALE].push(urlEntry(`${baseUrl}${path}`, "", latest));

  // A locale is listed only when that theory has a translated file - untranslated
  // theories fall back to English at runtime, which would be duplicate content.
  for (const { category, theory, stem } of theories) {
    const pathWithoutLocale = `/${category}/${theory}`;
    const theoryLocales = locales.filter(
      (locale) => locale === DEFAULT_LOCALE || existsSync(join(publicDir, "data", locale, `${stem}.json`))
    );
    for (const locale of theoryLocales) {
      const file = locale === DEFAULT_LOCALE ? `public/data/${stem}.json` : `public/data/${locale}/${stem}.json`;
      byLocale[locale].push(urlEntry(`${baseUrl}${localizedPath(pathWithoutLocale, locale)}`, hreflangBlock(baseUrl, pathWithoutLocale, theoryLocales), modified.get(file)));
    }
  }

  const files = {};
  for (const locale of locales) {
    files[`sitemap-${locale}.xml`] = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${byLocale[locale].join("\n")}
</urlset>`;
  }
  files["sitemap.xml"] = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${locales.map((l) => `  <sitemap><loc>${baseUrl}/sitemap-${l}.xml</loc>${latest ? `<lastmod>${latest}</lastmod>` : ""}</sitemap>`).join("\n")}
</sitemapindex>`;
  return { files, count: Object.values(byLocale).reduce((n, l) => n + l.length, 0) };
}

// Per-locale theory index for the list view and implications filter, which
// need every theory up front (full content stays lazily loaded per theory).
// Text comes from the locale's file when translated, else English; stances
// always come from English, since they are the filter's fixed vocabulary.
function readTheory(locale, stem) {
  const dir = locale === DEFAULT_LOCALE ? "data" : join("data", locale);
  const path = join(publicDir, dir, `${stem}.json`);
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf-8")) : null;
}

function generateIndexes(locales) {
  const leaves = [];
  for (const top of baseData) {
    for (const child of top.children) {
      if (child.children) {
        for (const leaf of child.children) leaves.push({ name: leaf.name, category: top.name, subcategory: child.name });
      } else {
        leaves.push({ name: child.name, category: top.name, subcategory: "" });
      }
    }
  }
  const outDir = join(publicDir, "theory-index");
  mkdirSync(outDir, { recursive: true });
  for (const locale of locales) {
    const entries = leaves.map(({ name, category, subcategory }) => {
      const stem = resolveTheoryFileStem(name);
      const en = readTheory(DEFAULT_LOCALE, stem);
      if (!en) throw new Error(`Missing public/data/${stem}.json for chart leaf "${name}"`);
      const text = (locale !== DEFAULT_LOCALE && readTheory(locale, stem)) || en;
      const imp = en.implications;
      return {
        name,
        slug: generateSlug(name),
        category,
        subcategory,
        title: text.id_and_class.theory_title,
        tagline: text.id_and_class.core_identity_tagline,
        summary: text.id_and_class.summary,
        thinkers: text.id_and_class.associated_thinkers,
        stances: {
          ai: imp.AI_consciousness.stance,
          survival: imp.survival_beyond_death.stance,
          meaning: imp.meaning_and_purpose.stance,
          virtual: imp.virtual_immortality.stance,
        },
      };
    });
    writeFileSync(join(outDir, `${locale}.json`), JSON.stringify(entries), "utf-8");
  }
  // Which non-English locales have a translated file per theory stem; the
  // Worker uses it for canonical/hreflang on theory pages (worker/index.ts).
  const translations = {};
  for (const { name } of leaves) {
    const stem = resolveTheoryFileStem(name);
    translations[stem] = locales.filter((l) => l !== DEFAULT_LOCALE && existsSync(join(publicDir, "data", l, `${stem}.json`)));
  }
  writeFileSync(join(outDir, "translations.json"), JSON.stringify(translations), "utf-8");
  console.log(`Theory indexes: ${leaves.length} theories x ${locales.length} locales -> ${outDir}`);
}

const baseUrl = process.env.SITE_URL || "https://www.consciousnessatlas.com";
const publicDir = join(__dirname, "..", "public");
const shippedLocales = getShippedLocales(publicDir);

// Order matters: the hub pages read the theory index's translations manifest,
// and the sitemap lists the hub pages.
generateIndexes(shippedLocales);
const hubPaths = buildPages({
  root: join(__dirname, ".."), publicDir, baseData, generateSlug, resolveTheoryFileStem,
  locales: shippedLocales, defaultLocale: DEFAULT_LOCALE,
  buildLocalizedPath: (path, locale) => localizedPath(path, locale),
});
console.log(`Hub pages: ${hubPaths.length} -> ${join(publicDir, "_pages")}`);

const { files, count } = generateSitemaps(baseUrl, shippedLocales, hubPaths);
for (const [name, xml] of Object.entries(files)) writeFileSync(join(publicDir, name), xml, "utf-8");
console.log(`Sitemaps: ${Object.keys(files).length} files, ${count} URLs (shipped locales: ${shippedLocales.join(", ")})`);
