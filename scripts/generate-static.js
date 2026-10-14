import { writeFileSync, existsSync, readFileSync, mkdirSync } from "fs";
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

function generateSitemap(baseUrl, locales) {
  const theories = extractTheories();

  const urlEntries = [];

  // Home page - localized, one <url> per shipped locale plus hreflang siblings.
  for (const locale of locales) {
    urlEntries.push(`  <url>
    <loc>${baseUrl}${localizedPath("/", locale)}</loc>
${hreflangBlock(baseUrl, "/", locales)}
  </url>`);
  }

  // /paper is explicitly out of i18n scope: single URL, no locale variants, no hreflang.
  urlEntries.push(`  <url>
    <loc>${baseUrl}/paper</loc>
  </url>`);

  // Theory pages - localized, one <url> per shipped locale plus hreflang siblings.
  // A locale is listed only when that theory has a translated file - untranslated
  // theories fall back to English at runtime, which would be duplicate content.
  for (const { category, theory, stem } of theories) {
    const pathWithoutLocale = `/${category}/${theory}`;
    const theoryLocales = locales.filter(
      (locale) =>
        locale === DEFAULT_LOCALE ||
        existsSync(join(publicDir, "data", locale, `${stem}.json`))
    );
    for (const locale of theoryLocales) {
      urlEntries.push(`  <url>
    <loc>${baseUrl}${localizedPath(pathWithoutLocale, locale)}</loc>
${hreflangBlock(baseUrl, pathWithoutLocale, theoryLocales)}
  </url>`);
    }
  }

  return `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlEntries.join("\n")}
</urlset>`;
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
const sitemap = generateSitemap(baseUrl, shippedLocales);

const sitemapPath = join(publicDir, "sitemap.xml");

writeFileSync(sitemapPath, sitemap, "utf-8");
console.log(`Sitemap generated at ${sitemapPath}`);
console.log(`Shipped locales: ${shippedLocales.join(", ")}`);
console.log(`Total URLs: ${(sitemap.match(/<url>/g) || []).length}`);

generateIndexes(shippedLocales);
