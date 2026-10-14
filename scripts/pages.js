// Static hub pages, generated at build into public/_pages/ (gitignored) and
// served at clean URLs by the Worker (worker/index.ts):
//   /{category}            category hub (overview, subcategories, every theory)
//   /questions, /questions/{slug}   theories grouped by their answer
//   /compare               comparison tool: up to five theories side by side
//   /compare/{slug}        hand-written comparisons, and generated head-to-heads
//                          ({a}-vs-{b}) for well-known theories; /compare/all lists them
//   /theories              A–Z of every theory
// plus public/_pages/home-directory/{locale}.html, the crawlable theory
// directory the Worker injects into the homepage.
// Copy for questions/comparisons lives in src/content/*.json.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { renderComparison, agreement, wireClamps, QUESTION_ROWS, MAX_THEORIES } from "./compare/render.js";

const here = dirname(fileURLToPath(import.meta.url));

const SITE = "https://www.consciousnessatlas.com";

const esc = (v) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const truncate = (text, max) =>
  !text || text.length <= max ? text || "" : text.slice(0, text.lastIndexOf(" ", max - 1)).replace(/[,;:]$/, "") + "…";

// Stance buckets: keep in sync with LIKELIHOOD/QUESTIONS in src/components/AtlasTools.ts
// (the bucket keys are also the ?filter= values the map understands).
const LIKELIHOOD = [
  ["yes", "Yes or likely", ["Yes", "Likely"]],
  ["maybe", "Possible or depends", ["Possible", "Conditional"]],
  ["uncertain", "Uncertain", ["Uncertain"]],
  ["no", "Unlikely or no", ["Unlikely", "No"]],
];
export const QUESTIONS = [
  { slug: "ai-consciousness", key: "ai", field: "AI_consciousness", short: "AI consciousness", buckets: LIKELIHOOD },
  { slug: "life-after-death", key: "survival", field: "survival_beyond_death", short: "Life after death", buckets: LIKELIHOOD },
  { slug: "mind-uploading", key: "virtual", field: "virtual_immortality", short: "Mind uploading", buckets: [...LIKELIHOOD, ["notNeeded", "Not needed (consciousness persists anyway)", ["Not needed"]]] },
  {
    slug: "meaning-and-purpose", key: "meaning", field: "meaning_and_purpose", short: "Meaning and purpose",
    buckets: [["cosmic", "Cosmic or ultimate", ["Cosmic/Ultimate"]], ["humanistic", "Humanistic only", ["Humanistic only"]], ["uncertain", "Uncertain", ["Uncertain"]]],
  },
];

// Comparison sides: { kind: 'category' | 'subcategory' | 'theory', key, label }
export const COMPARISONS = [
  { slug: "panpsychism-vs-idealism", a: { kind: "category", key: "Panpsychism" }, b: { kind: "category", key: "Idealism" } },
  { slug: "iit-vs-global-workspace-theory", a: { kind: "theory", key: "IIT" }, b: { kind: "theory", key: "Baars-Dehaene" } },
  { slug: "materialism-vs-idealism", a: { kind: "category", key: "Materialism" }, b: { kind: "category", key: "Idealism" } },
  { slug: "dualism-vs-materialism", a: { kind: "category", key: "Dualism" }, b: { kind: "category", key: "Materialism" } },
  { slug: "orch-or-vs-iit", a: { kind: "theory", key: "Penrose-Hameroff" }, b: { kind: "theory", key: "IIT" } },
  { slug: "illusionism-vs-panpsychism", a: { kind: "subcategory", key: "Eliminative", parent: "Materialism" }, b: { kind: "category", key: "Panpsychism" } },
];

// Head-to-head pages: every pair of these well-known theories gets a static
// /compare/{a}-vs-{b} page (n·(n-1)/2 pages). Values are the names people
// search for; they also label the theory in the comparison tool.
export const PAIR_NAMES = {
  IIT: "Integrated Information Theory", "Baars-Dehaene": "Global Workspace Theory", "Penrose-Hameroff": "Orch OR",
  "Dennett Illusionism": "Dennett’s Illusionism", Frankish: "Frankish’s Illusionism", Chalmers: "Chalmers’s Panpsychism",
  Kastrup: "Kastrup’s Analytic Idealism", Hoffman: "Hoffman’s Conscious Realism", Goff: "Goff’s Panpsychism",
  Searle: "Searle’s Biological Naturalism", Seth: "Seth’s Beast Machine Theory", Friston: "Free Energy Principle",
  Graziano: "Attention Schema Theory", Rosenthal: "Higher-Order Thought Theory", Lamme: "Recurrent Processing Theory",
  "Crick-Koch": "Crick and Koch’s NCC", Churchlands: "Eliminative Materialism", Functionalism: "Functionalism",
  Epiphenomenalism: "Epiphenomenalism", Emergence: "Emergence", Descartes: "Descartes’s Substance Dualism",
  Spinoza: "Spinoza’s One Reality", Strawson: "Strawson’s Panpsychism", Russellian: "Russellian Monism",
  Nagel: "Nagel’s Mind and Cosmos", Buddhism: "Buddhism", "Indian Cosmic": "Advaita Vedanta",
  "Christian Soul": "Christian Soul Theory", Spira: "Spira’s Non-Duality", Tegmark: "Tegmark’s State of Matter",
  Meijer: "Meijer’s Universal Knowledge Field", "Bentley Hart": "Bentley Hart’s Monism", "S. Harris": "Sam Harris",
};

// Extra search terms for the comparison tool (| separates alternatives).
const TOOL_ALIASES = {
  IIT: "iit|tononi", "Baars-Dehaene": "gwt|global workspace|gnw", "Penrose-Hameroff": "orch or|orchestrated objective reduction|microtubules",
  Graziano: "ast", Lamme: "rpt", Friston: "fep|free energy|active inference", "Crick-Koch": "ncc", Rosenthal: "hot",
  "Indian Cosmic": "advaita|vedanta", Churchlands: "eliminativism",
};

// Starting points on /compare: [label, chart keys].
const PRESETS = [
  ["IIT vs Global Workspace", ["IIT", "Baars-Dehaene"]],
  ["Orch OR vs IIT", ["Penrose-Hameroff", "IIT"]],
  ["Kastrup vs Hoffman", ["Kastrup", "Hoffman"]],
  ["Chalmers vs Dennett", ["Chalmers", "Dennett Illusionism"]],
  ["Goff vs Frankish", ["Goff", "Frankish"]],
  ["Descartes vs Searle", ["Descartes", "Searle"]],
  ["Four neuroscience theories", ["IIT", "Baars-Dehaene", "Lamme", "Rosenthal"]],
];

// Last commit touching content, for dateModified (falls back to today).
const contentDate = (root) => {
  try {
    return execSync("git log -1 --format=%cs -- public/data src/content public/categories", { cwd: root, encoding: "utf-8" }).trim() || null;
  } catch {
    return null;
  }
};

export function buildPages({ root, publicDir, baseData, generateSlug, resolveTheoryFileStem, locales, defaultLocale, buildLocalizedPath }) {
  const out = join(publicDir, "_pages");
  const modified = contentDate(root) || new Date().toISOString().slice(0, 10);
  const readJson = (p, fallback) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf-8")) : fallback);
  const en = readJson(join(publicDir, "i18n", "taxonomy", "en.json"), { categories: {}, subcategories: {}, fullNames: {} });
  const categoryTexts = readJson(join(publicDir, "categories", "en.json"), {});
  const questionCopy = readJson(join(root, "src", "content", "questions.json"), {});
  const comparisonCopy = readJson(join(root, "src", "content", "comparisons.json"), {});
  const label = (key) => en.categories[key] || en.subcategories[key] || key;

  // Every chart theory with its English content.
  const theories = [];
  const byLeaf = new Map();
  for (const top of baseData) {
    for (const child of top.children) {
      for (const leaf of child.children ?? [child]) {
        const data = JSON.parse(readFileSync(join(publicDir, "data", `${resolveTheoryFileStem(leaf.name)}.json`), "utf-8"));
        const t = {
          leaf: leaf.name,
          category: top.name,
          subcategory: child.children ? child.name : "",
          url: `/${generateSlug(top.name)}/${generateSlug(leaf.name)}`,
          title: data.id_and_class.theory_title,
          tagline: data.id_and_class.core_identity_tagline,
          summary: data.id_and_class.summary,
          thinkers: data.id_and_class.associated_thinkers || [],
          implications: data.implications,
          data,
        };
        theories.push(t);
        byLeaf.set(leaf.name, t);
      }
    }
  }
  const categoryUrl = (key) => `/theories/${generateSlug(key)}`;
  // Map URL of a category or subcategory; mirrors src/utils/groupPaths.ts.
  const groupUrl = (key, sub) => {
    if (!sub) return `/${generateSlug(key)}`;
    const top = baseData.find((t) => t.name === key);
    const leafSlugs = new Set(top.children.flatMap((c) => c.children ?? [c]).map((l) => generateSlug(l.name)));
    const slug = generateSlug(sub);
    return `/${generateSlug(key)}/${leafSlugs.has(slug) ? `${slug}-theories` : slug}`;
  };
  const mapUrl = (params) => `/?${new URLSearchParams(params)}`;

  const write = (path, html) => {
    const file = join(out, path);
    mkdirSync(join(file, ".."), { recursive: true });
    writeFileSync(file, html, "utf-8");
  };

  // ---- shared layout --------------------------------------------------------
  const nav = `
    <nav class="hub-nav" aria-label="Sections">
      <a href="/theories">All theories</a>
      <a href="/questions">Big questions</a>
      <a href="/compare">Compare</a>
      <a href="/quiz">Quiz</a>
    </nav>`;
  const page = ({ path, title, description, h1, eyebrow = "", lead = "", body, jsonLd = [], crumbs = [], css = "", scripts = "", wide = false }) => {
    const canonical = SITE + path;
    const breadcrumb = {
      "@type": "BreadcrumbList",
      itemListElement: [{ name: "Consciousness Atlas", path: "/" }, ...crumbs, { name: h1, path }].map((c, i) => ({
        "@type": "ListItem", position: i + 1, name: c.name, item: SITE + c.path,
      })),
    };
    // Every page's main node names the publisher, language, image and date.
    const enriched = jsonLd.map((node, i) => (i === 0 ? {
      inLanguage: "en", image: `${SITE}/banner.jpg`, dateModified: modified,
      publisher: { "@type": "Organization", name: "Consciousness Atlas", url: SITE + "/" }, ...node,
    } : node));
    const ld = JSON.stringify({ "@context": "https://schema.org", "@graph": [...enriched, breadcrumb] }).replace(/</g, "\\u003c");
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="atlas-page" content="hub" />
<meta name="color-scheme" content="dark" />
<meta name="darkreader-lock" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<link rel="canonical" href="${canonical}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Consciousness Atlas" />
<meta property="og:url" content="${canonical}" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:image" content="${SITE}/banner.jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:locale" content="en_US" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />
<meta name="twitter:image" content="${SITE}/banner.jpg" />
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
<meta name="theme-color" content="#F7B801" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
<link rel="preload" href="/fonts/outfit-latin.woff2" as="font" type="font/woff2" crossorigin />
<link rel="preload" href="/fonts/bodoni-moda-latin.woff2" as="font" type="font/woff2" crossorigin />
<script type="application/ld+json">${ld}</script>
<style>${CSS}${css}</style>
${ANALYTICS(path)}
</head>
<body${wide ? ' class="is-wide"' : ""}>
<header class="hub-header">
  <a class="hub-logo" href="/">Consciousness Atlas</a>
  ${nav}
  <a class="hub-cta" href="/">Open the map</a>
</header>
<main class="hub-main${wide ? " hub-wide" : ""}">
  <nav class="hub-crumbs" aria-label="Breadcrumb"><a href="/">Atlas</a>${crumbs.map((c) => ` › <a href="${c.path}">${esc(c.name)}</a>`).join("")} › <span>${esc(h1)}</span></nav>
  ${eyebrow ? `<p class="hub-eyebrow">${esc(eyebrow)}</p>` : ""}
  <h1>${esc(h1)}</h1>
  ${lead ? `<p class="hub-lead">${esc(lead)}</p>` : ""}
  ${body}
</main>
<footer class="hub-footer">
  <p>Consciousness Atlas maps theories from Robert Lawrence Kuhn's <a href="https://loc.closertotruth.com/">Landscape of Consciousness</a>. It describes theories; it does not rank them.</p>
  <p><a href="/">Open the interactive map</a> · <a href="/theories">All theories A–Z</a> · <a href="/questions">Big questions</a> · <a href="/compare">Compare theories</a> · <a href="/quiz">Which theory fits you?</a> · <a href="/mentions">What people say</a> · <a href="/paper">Kuhn's paper</a></p>
</footer>
${scripts}
</body>
</html>`;
  };

  const theoryItem = (t, extra = "") => `
    <li class="hub-theory">
      <a href="${t.url}">${esc(t.title)}</a>
      ${t.tagline ? `<span class="hub-tagline">${esc(t.tagline)}</span>` : ""}
      ${extra}
    </li>`;
  const stanceOf = (t, q) => t.implications[q.field]?.stance || "";
  const bucketOf = (t, q) => q.buckets.find(([, , stances]) => stances.includes(stanceOf(t, q)));
  const distribution = (list, q) =>
    q.buckets.map(([key, name, stances]) => ({ key, name, n: list.filter((t) => stances.includes(stanceOf(t, q))).length }));
  const distBar = (list, q) => {
    const d = distribution(list, q).filter((b) => b.n);
    const total = d.reduce((s, b) => s + b.n, 0) || 1;
    return `<div class="hub-dist" role="img" aria-label="${esc(d.map((b) => `${b.name}: ${b.n}`).join(", "))}">${d
      .map((b) => `<span class="hub-dist-seg seg-${b.key}" style="flex:${b.n}" tabindex="0" data-tip="${esc(b.name)}: ${b.n} ${b.n === 1 ? "theory" : "theories"} (${Math.round((100 * b.n) / total)}%)"></span>`)
      .join("")}</div><ul class="hub-dist-legend">${d
      .map((b) => `<li><i class="seg-${b.key}"></i>${esc(b.name)} <b>${b.n}</b> <small>${Math.round((100 * b.n) / total)}%</small></li>`)
      .join("")}</ul>`;
  };

  // ---- category hubs ---------------------------------------------------------
  const categoryPages = [];
  for (const top of baseData) {
    const key = top.name;
    const text = categoryTexts[key] || { summary: "", overview: [], examples: [] };
    const list = theories.filter((t) => t.category === key);
    const subs = top.children.filter((c) => c.children);
    const path = categoryUrl(key);
    categoryPages.push(path);
    const examples = (text.examples || []).map((l) => byLeaf.get(l)).filter(Boolean);
    const groups = subs.length
      ? subs.map((s) => {
          const st = categoryTexts[s.name];
          const members = list.filter((t) => t.subcategory === s.name);
          return `<section class="hub-section" id="${generateSlug(s.name)}">
            <h2>${esc(label(s.name))} <small>${members.length}</small></h2>
            ${st ? `<p>${esc(st.summary)}</p>` : ""}
            <p><a class="hub-link" href="${groupUrl(key, s.name)}">Open ${esc(label(s.name))} on the map →</a></p>
            <ul class="hub-theories">${members.map((t) => theoryItem(t)).join("")}</ul>
          </section>`;
        }).join("")
      : `<section class="hub-section"><h2>All ${list.length} theories</h2><ul class="hub-theories">${list.map((t) => theoryItem(t)).join("")}</ul></section>`;
    const others = baseData.filter((c) => c.name !== key);
    write(`category/${generateSlug(key)}.html`, page({
      path,
      title: `${label(key)}: ${list.length} Theories of Consciousness | Consciousness Atlas`,
      description: truncate(text.summary || `${list.length} ${label(key)} theories of consciousness, each with a structured summary.`, 155),
      h1: `${label(key)}: theories of consciousness`,
      crumbs: [{ name: "All theories", path: "/theories" }],
      eyebrow: `${list.length} theories${subs.length ? ` · ${subs.length} subcategories` : ""}`,
      lead: text.summary,
      body: `
        <p class="hub-actions"><a class="hub-button" href="${groupUrl(key)}">Open ${esc(label(key))} on the map</a><a class="hub-button hub-button-quiet" href="/theories">All theories A–Z</a></p>
        ${(text.overview || []).map((p) => `<p>${esc(p)}</p>`).join("")}
        ${examples.length ? `<section class="hub-section"><h2>Good places to start</h2><ul class="hub-theories">${examples.map((t) => theoryItem(t)).join("")}</ul></section>` : ""}
        ${groups}
        <section class="hub-section"><h2>Other families</h2><ul class="hub-pills">${others.map((c) => `<li><a href="${categoryUrl(c.name)}">${esc(label(c.name))}</a></li>`).join("")}</ul></section>`,
      jsonLd: [{
        "@type": "CollectionPage", name: `${label(key)} theories of consciousness`, url: SITE + path, description: text.summary,
        isPartOf: { "@type": "WebSite", name: "Consciousness Atlas", url: SITE + "/" },
        mainEntity: { "@type": "ItemList", numberOfItems: list.length, itemListElement: list.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.title, url: SITE + t.url })) },
      }],
    }));
  }

  // ---- question hubs ---------------------------------------------------------
  const otherQuestions = (slug) => QUESTIONS.filter((q) => q.slug !== slug)
    .map((q) => `<li><a href="/questions/${q.slug}">${esc(questionCopy[q.slug]?.title || q.short)}</a></li>`).join("");
  for (const q of QUESTIONS) {
    const copy = questionCopy[q.slug] || { title: q.short, seoTitle: `${q.short} | Consciousness Atlas`, metaDescription: "", intro: [] };
    const path = `/questions/${q.slug}`;
    const sections = q.buckets.map(([key, name, stances]) => {
      const members = theories.filter((t) => stances.includes(stanceOf(t, q)));
      if (!members.length) return "";
      return `<section class="hub-section" id="${key}">
        <h2>${esc(name)} <small>${members.length}</small></h2>
        <p><a class="hub-link" href="${mapUrl({ filter: `${q.key}:${key}` })}">Highlight these on the map →</a></p>
        <ul class="hub-theories">${members.map((t) => theoryItem(t, `<span class="hub-why">${esc(truncate(t.implications[q.field]?.rationale, 240))}</span><span class="hub-family">${esc(label(t.category))}</span>`)).join("")}</ul>
      </section>`;
    }).join("");
    const unaddressed = theories.filter((t) => !bucketOf(t, q));
    write(`questions/${q.slug}.html`, page({
      path, title: copy.seoTitle, description: copy.metaDescription, h1: copy.title, eyebrow: "Big question",
      crumbs: [{ name: "Big questions", path: "/questions" }],
      body: `
        ${(copy.intro || []).map((p) => `<p>${esc(p)}</p>`).join("")}
        <section class="hub-section"><h2>How the theories answer</h2>${distBar(theories, q)}
          <p class="hub-note">${unaddressed.length} theories don't take a position on this question.</p></section>
        ${sections}
        ${unaddressed.length ? `<details class="hub-section"><summary>No position (${unaddressed.length})</summary><ul class="hub-theories">${unaddressed.map((t) => theoryItem(t)).join("")}</ul></details>` : ""}
        <section class="hub-section"><h2>Other big questions</h2><ul class="hub-pills">${otherQuestions(q.slug)}</ul></section>`,
      jsonLd: [{ "@type": "Article", headline: copy.title, description: copy.metaDescription, url: SITE + path, isPartOf: { "@type": "WebSite", name: "Consciousness Atlas", url: SITE + "/" } }],
    }));
  }
  write("questions/index.html", page({
    path: "/questions", title: "Big Questions About Consciousness | Consciousness Atlas",
    description: "Can AI be conscious? Does consciousness survive death? See how hundreds of theories of consciousness answer four big questions.",
    h1: "Big questions about consciousness",
    lead: "The Atlas records how every theory answers four questions. Pick one to see how the theories split, and why.",
    body: `<ul class="hub-cards">${QUESTIONS.map((q) => {
      const c = questionCopy[q.slug];
      return `<li><a href="/questions/${q.slug}"><b>${esc(c?.title || q.short)}</b><span>${esc(truncate(c?.metaDescription || "", 140))}</span></a>${distBar(theories, q)}</li>`;
    }).join("")}</ul>`,
  }));

  // ---- comparisons -----------------------------------------------------------
  const side = (s) => {
    if (s.kind === "theory") {
      const t = byLeaf.get(s.key);
      return { name: t.title, url: t.url, summary: t.summary, members: [t], kind: s.kind };
    }
    const members = theories.filter((t) => (s.kind === "category" ? t.category === s.key : t.subcategory === s.key));
    const text = categoryTexts[s.key] || {};
    const examples = (text.examples || []).map((l) => byLeaf.get(l)).filter(Boolean);
    return {
      name: label(s.key), url: s.kind === "category" ? categoryUrl(s.key) : `${categoryUrl(s.parent)}#${generateSlug(s.key)}`,
      summary: text.summary, members, examples, kind: s.kind,
    };
  };
  const stanceCell = (sd, q) => {
    if (sd.kind === "theory") {
      const imp = sd.members[0].implications[q.field];
      return imp?.stance ? `<b>${esc(imp.stance)}</b><span>${esc(truncate(imp.rationale, 160))}</span>` : "<span>No position</span>";
    }
    return distribution(sd.members, q).filter((b) => b.n).map((b) => `${esc(b.name)} <b>${b.n}</b>`).join("<br />");
  };
  for (const c of COMPARISONS) {
    const copy = comparisonCopy[c.slug];
    if (!copy) continue;
    const a = side(c.a), b = side(c.b);
    const path = `/compare/${c.slug}`;
    const sideCard = (s) => `<div class="hub-side">
      <h3><a href="${s.url}">${esc(s.name)}</a></h3>
      <p>${esc(truncate(s.summary, 360))}</p>
      ${s.examples?.length ? `<ul class="hub-theories">${s.examples.map((t) => `<li class="hub-theory"><a href="${t.url}">${esc(t.title)}</a></li>`).join("")}</ul>` : ""}
      <p><a class="hub-link" href="${s.url}">${s.kind === "theory" ? "Read the full entry →" : `All ${s.members.length} theories →`}</a></p>
    </div>`;
    write(`compare/${c.slug}.html`, page({
      path, title: copy.seoTitle, description: copy.metaDescription, h1: copy.title, eyebrow: "Comparison",
      crumbs: [{ name: "Compare", path: "/compare" }],
      body: `
        ${copy.intro.map((p) => `<p>${esc(p)}</p>`).join("")}
        ${copy.commonGround ? `<p class="hub-callout"><b>Common ground.</b> ${esc(copy.commonGround)}</p>` : ""}
        <section class="hub-section"><h2>Key differences</h2><div class="hub-table-wrap"><table class="hub-table">
          <thead><tr><th></th><th>${esc(a.name)}</th><th>${esc(b.name)}</th></tr></thead>
          <tbody>${copy.differences.map((r) => `<tr><th>${esc(r.aspect)}</th><td>${esc(r.a)}</td><td>${esc(r.b)}</td></tr>`).join("")}</tbody>
        </table></div></section>
        <section class="hub-section"><h2>On the big questions</h2><div class="hub-table-wrap"><table class="hub-table">
          <thead><tr><th></th><th>${esc(a.name)}</th><th>${esc(b.name)}</th></tr></thead>
          <tbody>${QUESTIONS.map((q) => `<tr><th><a href="/questions/${q.slug}">${esc(q.short)}</a></th><td>${stanceCell(a, q)}</td><td>${stanceCell(b, q)}</td></tr>`).join("")}</tbody>
        </table></div></section>
        <section class="hub-section hub-sides">${sideCard(a)}${sideCard(b)}</section>
        <section class="hub-section"><h2>More comparisons</h2><ul class="hub-pills">${COMPARISONS.filter((o) => o.slug !== c.slug && comparisonCopy[o.slug]).map((o) => `<li><a href="/compare/${o.slug}">${esc(comparisonCopy[o.slug].title)}</a></li>`).join("")}</ul></section>`,
      jsonLd: [{ "@type": "Article", headline: copy.title, description: copy.metaDescription, url: SITE + path, isPartOf: { "@type": "WebSite", name: "Consciousness Atlas", url: SITE + "/" } }],
    }));
  }
  const comparisonPaths = COMPARISONS.filter((c) => comparisonCopy[c.slug]).map((c) => `/compare/${c.slug}`);
  const curatedCards = `<ul class="hub-cards">${COMPARISONS.filter((c) => comparisonCopy[c.slug]).map((c) => `<li><a href="/compare/${c.slug}"><b>${esc(comparisonCopy[c.slug].title)}</b><span>${esc(truncate(comparisonCopy[c.slug].metaDescription, 140))}</span></a></li>`).join("")}</ul>`;

  // ---- comparison tool + generated head-to-heads ------------------------------
  const shortLabels = en.shortLabels || {};
  const viewed = readJson(join(root, "src", "data", "mostViewed.json"), { theories: [] }).theories.map((t) => t.name);
  const pairKeys = Object.keys(PAIR_NAMES);
  // Most viewed first, then the head-to-head set, then everything else.
  const rank = (leaf) => (viewed.includes(leaf) ? viewed.indexOf(leaf) : pairKeys.includes(leaf) ? 100 + pairKeys.indexOf(leaf) : 1000);
  const shortName = (t) => PAIR_NAMES[t.leaf] || shortLabels[t.leaf] || t.leaf;
  const entryOf = (t) => ({
    slug: generateSlug(t.leaf), short: shortName(t), title: t.title, family: label(t.category),
    familyUrl: categoryUrl(t.category), url: t.url, thinkers: t.thinkers, data: t.data,
  });

  const featured = pairKeys.map((k) => byLeaf.get(k)).filter(Boolean);
  const missing = pairKeys.filter((k) => !byLeaf.has(k));
  if (missing.length) console.warn(`pages: PAIR_NAMES keys not in the taxonomy: ${missing.join(", ")}`);
  // Theory-vs-theory pairs that already have a hand-written page link there.
  const curatedPairs = new Map();
  for (const c of COMPARISONS) {
    if (c.a.kind === "theory" && c.b.kind === "theory" && comparisonCopy[c.slug]) {
      curatedPairs.set([generateSlug(c.a.key), generateSlug(c.b.key)].sort().join("|"), `/compare/${c.slug}`);
    }
  }
  // Pair URLs put the two slugs in alphabetical order; the Worker redirects the reverse.
  const ordered = (x, y) => (generateSlug(x.leaf) < generateSlug(y.leaf) ? [x, y] : [y, x]);
  const pairUrl = (x, y) => {
    const [a, b] = ordered(x, y).map((t) => generateSlug(t.leaf));
    return curatedPairs.get(`${a}|${b}`) || `/compare/${a}-vs-${b}`;
  };
  const pairs = [];
  for (let i = 0; i < featured.length; i++) {
    for (let j = i + 1; j < featured.length; j++) pairs.push(ordered(featured[i], featured[j]));
  }
  pairs.sort((p, q) => rank(p[0].leaf) + rank(p[1].leaf) - rank(q[0].leaf) - rank(q[1].leaf));
  const pairLink = ([x, y]) => `<li><a href="${pairUrl(x, y)}">${esc(shortName(x))} vs ${esc(shortName(y))}</a></li>`;

  const nature = (t) => {
    const word = String(t.data.conceptual_ground?.primitive_or_emergent_status || "").trim().split(/[\s(,;:/.]/)[0];
    return word === "Primitive" ? "fundamental" : word === "Emergent" ? "emergent" : "";
  };
  const listJoin = (xs) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
  const glance = (x, y, a, b) => {
    const lines = [x.category === y.category
      ? `Both belong to the ${label(x.category)} family in Kuhn's Landscape of Consciousness.`
      : `${a.short} belongs to the ${label(x.category)} family in Kuhn's Landscape of Consciousness, ${b.short} to ${label(y.category)}.`];
    const [na, nb] = [nature(x), nature(y)];
    if (na && nb) lines.push(na === nb ? `Both treat consciousness as ${na}.` : `${a.short} treats consciousness as ${na}; ${b.short} treats it as ${nb}.`);
    const { agree, split } = agreement([a, b]);
    if (agree.length) lines.push(`They give the same kind of answer on ${listJoin(agree.map((r) => r.q.short))}.`);
    for (const { q, stances } of split) lines.push(`On ${q.short}, ${a.short} says “${stances[0]}” and ${b.short} says “${stances[1]}”.`);
    return lines;
  };

  const pairPaths = [];
  const pairScript = `<script>${wireClamps.toString()}
document.documentElement.style.setProperty("--head-h", document.querySelector(".hub-header").offsetHeight + "px");
wireClamps(document);</script>`;
  for (const [x, y] of pairs) {
    const path = pairUrl(x, y);
    if (!path.includes("-vs-") || [...curatedPairs.values()].includes(path)) continue;
    pairPaths.push(path);
    const a = entryOf(x), b = entryOf(y);
    const people = (t) => (t.thinkers.length ? ` (${t.thinkers.slice(0, 2).join(", ")})` : "");
    const more = (t, other) => featured.filter((o) => o !== t && o !== other).sort((p, q) => rank(p.leaf) - rank(q.leaf)).slice(0, 6)
      .map((o) => pairLink([t, o])).join("");
    write(`${path.slice(1)}.html`, page({
      path, wide: true, css: CMP_CSS, scripts: pairScript,
      title: `${a.short} vs ${b.short}: Compared Side by Side | Consciousness Atlas`,
      description: truncate(`${a.short}${people(x)} and ${b.short}${people(y)} compared: core claims, mechanism, evidence, criticisms, and their answers on AI consciousness and life after death.`, 158),
      h1: `${a.short} vs ${b.short}`, eyebrow: "Head to head",
      lead: `${x.title} and ${y.title}, compared field by field from their entries in the Atlas.`,
      crumbs: [{ name: "Compare", path: "/compare" }],
      body: `
        <div class="cmp-glance"><h2>At a glance</h2><ul>${glance(x, y, a, b).map((l) => `<li>${esc(l)}</li>`).join("")}</ul></div>
        <p class="hub-actions"><a class="hub-button" href="/compare?t=${a.slug},${b.slug}">Add more theories to this comparison</a><a class="hub-button hub-button-quiet" href="/compare">Compare other theories</a></p>
        ${renderComparison([a, b])}
        <section class="hub-section"><h2>More comparisons</h2>
          <div class="cmp-more-pairs"><div><h3>${esc(a.short)} vs …</h3><ul class="hub-pills">${more(x, y)}</ul></div><div><h3>${esc(b.short)} vs …</h3><ul class="hub-pills">${more(y, x)}</ul></div></div>
          <p><a class="hub-link" href="/compare/all">All head-to-head comparisons →</a></p>
        </section>`,
      jsonLd: [{
        "@type": "Article", headline: `${a.short} vs ${b.short}`, url: SITE + path,
        about: [x, y].map((t) => ({ "@type": "Thing", name: t.title, url: SITE + t.url })),
        isPartOf: { "@type": "WebSite", name: "Consciousness Atlas", url: SITE + "/" },
      }],
    }));
  }

  write("compare/all.html", page({
    path: "/compare/all", title: `All ${pairPaths.length + curatedPairs.size} Head-to-Head Theory Comparisons | Consciousness Atlas`,
    description: `Every head-to-head comparison in the Consciousness Atlas, from IIT vs Global Workspace Theory to Kastrup vs Hoffman, grouped by theory.`,
    h1: "All head-to-head comparisons", eyebrow: "Compare",
    lead: `Pairs of the most discussed theories in the Atlas, grouped by theory. For any other combination, use the comparison tool.`,
    crumbs: [{ name: "Compare", path: "/compare" }],
    body: `<p class="hub-actions"><a class="hub-button" href="/compare">Open the comparison tool</a></p>
      ${[...featured].sort((p, q) => shortName(p).localeCompare(shortName(q))).map((t) => `<section class="hub-section"><h2>${esc(shortName(t))} <small>${esc(t.title)}</small></h2><ul class="hub-pills">${featured.filter((o) => o !== t).sort((p, q) => shortName(p).localeCompare(shortName(q))).map((o) => pairLink([t, o])).join("")}</ul></section>`).join("")}`,
  }));

  // The tool: theories embedded for instant search; full entries load on pick.
  const toolIndex = [...theories].sort((p, q) => p.title.localeCompare(q.title)).map((t) => ({
    s: generateSlug(t.leaf), f: resolveTheoryFileStem(t.leaf), t: t.title, n: shortName(t), a: TOOL_ALIASES[t.leaf] || "",
    c: label(t.category), cu: categoryUrl(t.category), u: t.url, h: t.thinkers.slice(0, 4), r: rank(t.leaf),
  }));
  const renderSrc = readFileSync(join(here, "compare", "render.js"), "utf-8").replace(/^export /gm, "");
  const toolSrc = readFileSync(join(here, "compare", "tool.js"), "utf-8");
  const presets = PRESETS.map(([text, keys]) => `<button type="button" class="cmp-preset" data-pair="${keys.map((k) => generateSlug(k)).join(",")}">${esc(text)}</button>`).join("");
  write("compare/index.html", page({
    path: "/compare", wide: true, css: CMP_CSS,
    title: "Compare Theories of Consciousness Side by Side | Consciousness Atlas",
    description: "Pick up to five theories of consciousness, from IIT and global workspace to panpsychism and idealism, and compare their claims, mechanisms, evidence and answers to the big questions.",
    h1: "Compare theories of consciousness", eyebrow: "Compare",
    lead: `Pick up to ${MAX_THEORIES} theories and read them side by side: what each claims, how it explains experience, and where they part ways on AI, death and meaning.`,
    body: `
      <div class="cmp-tool">
        <div class="cmp-picker" id="cmp-picker">
          <ul class="cmp-chips" id="cmp-chips" role="list" aria-label="Selected theories"></ul>
          <input id="cmp-input" class="cmp-input" type="text" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="cmp-options" aria-label="Add a theory to compare" autocomplete="off" spellcheck="false" placeholder="Search 450+ theories, e.g. IIT, Kastrup, illusionism…" />
          <ul class="cmp-options" id="cmp-options" role="listbox" aria-label="Theories" hidden></ul>
        </div>
        <div class="cmp-actions" id="cmp-actions" hidden>
          <button type="button" class="cmp-action" id="cmp-copy"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg><span>Copy link</span></button>
          <button type="button" class="cmp-action cmp-action-quiet" id="cmp-clear">Clear all</button>
        </div>
        <p class="cmp-sr" id="cmp-status" aria-live="polite"></p>
        <div class="cmp-start" id="cmp-start">
          <p>Or start with a well-known pairing</p>
          <div class="cmp-presets">${presets}</div>
        </div>
        <div id="cmp-results"></div>
        <noscript><p class="hub-note">The comparison tool needs JavaScript. The pages below work without it.</p></noscript>
      </div>
      <section class="hub-section"><h2>What a comparison covers</h2>
        <p>Each column comes from a theory's entry in the Atlas: its core claim, what it says consciousness is, its answers on AI consciousness, life after death, mind uploading and meaning, its view of mind and body, whether consciousness is fundamental or emergent, its account of qualia, the mechanism it proposes, where it locates consciousness, how testable it is, the tests run so far, the main criticisms, and key sources. Rows where all the theories give the same kind of answer are marked.</p></section>
      <section class="hub-section"><h2>Written comparisons</h2>${curatedCards}</section>
      <section class="hub-section"><h2>Popular head-to-heads</h2><ul class="hub-pills">${pairs.slice(0, 24).map(pairLink).join("")}</ul>
        <p><a class="hub-link" href="/compare/all">All ${pairPaths.length + curatedPairs.size} head-to-head comparisons →</a></p></section>`,
    scripts: `<script type="application/json" id="cmp-index" data-build="${Date.now().toString(36)}">${JSON.stringify(toolIndex).replace(/</g, "\\u003c")}</script>
<script type="module">${renderSrc}
${toolSrc}</script>`,
    jsonLd: [{ "@type": "WebApplication", name: "Compare theories of consciousness", url: SITE + "/compare", applicationCategory: "EducationalApplication", isAccessibleForFree: true }],
  }));

  // ---- A–Z -------------------------------------------------------------------
  const sorted = [...theories].sort((x, y) => x.title.localeCompare(y.title, "en", { sensitivity: "base" }));
  const letterOf = (t) => {
    const ch = t.title.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/^[^A-Za-z0-9]+/, "")[0]?.toUpperCase() || "#";
    return /[A-Z]/.test(ch) ? ch : "#";
  };
  const letters = [...new Set(sorted.map(letterOf))];
  write("theories.html", page({
    path: "/theories", title: `All ${theories.length} Theories of Consciousness, A–Z | Consciousness Atlas`,
    description: `An A–Z list of ${theories.length} theories of consciousness, from materialism to idealism, each with a structured summary and its view on AI and life after death.`,
    h1: "All theories of consciousness, A–Z",
    lead: `${theories.length} theories from Robert Lawrence Kuhn's Landscape of Consciousness. Each links to its full entry; the family links open that part of the map.`,
    body: `
      <nav class="hub-letters" aria-label="Jump to letter">${letters.map((l) => `<a href="#letter-${l === "#" ? "num" : l}">${l}</a>`).join("")}</nav>
      ${letters.map((l) => `<section class="hub-section" id="letter-${l === "#" ? "num" : l}"><h2>${l}</h2><ul class="hub-theories">${sorted.filter((t) => letterOf(t) === l).map((t) => theoryItem(t, `<span class="hub-family"><a href="${categoryUrl(t.category)}">${esc(label(t.category))}</a>${t.thinkers.length ? ` · ${esc(t.thinkers.slice(0, 3).join(", "))}` : ""}</span>`)).join("")}</ul></section>`).join("")}`,
    jsonLd: [{ "@type": "CollectionPage", name: "All theories of consciousness", url: SITE + "/theories", mainEntity: { "@type": "ItemList", numberOfItems: theories.length } }],
  }));

  // ---- quiz ----------------------------------------------------------------------
  const quiz = readJson(join(root, "src", "content", "quiz.json"), { questions: [] });
  const quizScores = readJson(join(root, "src", "content", "quizScores.json"), { scores: {} }).scores;
  const STANCE_VALUE = { Yes: 4, Likely: 3.5, Possible: 3, Conditional: 3, Uncertain: 2, Unlikely: 1, No: 0, "Not needed": "n", "Cosmic/Ultimate": 4, "Humanistic only": 0 };
  const stance = (t, field) => STANCE_VALUE[String(t.implications?.[field]?.stance ?? "").trim()] ?? null;
  const quizData = {
    site: SITE,
    questions: quiz.questions.map(({ text, help, axis, key, weight, topic, ends, options }) => ({ text, help, axis, key, weight, topic, ends, options })),
    families: Object.fromEntries(baseData.map((top) => [top.name, { name: label(top.name), url: categoryUrl(top.name), summary: categoryTexts[top.name]?.summary || "" }])),
    theories: theories.map((t) => {
      const v = quizScores[t.leaf] || [null, null, null, null, null];
      return {
        s: generateSlug(t.leaf), t: t.title, tg: t.tagline, u: t.url, c: t.category, h: t.thinkers.slice(0, 2),
        v: { mm: v[0], fu: v[1], lo: v[2], ev: v[3], qu: v[4] },
        st: { ai: stance(t, "AI_consciousness"), survival: stance(t, "survival_beyond_death"), virtual: stance(t, "virtual_immortality"), meaning: stance(t, "meaning_and_purpose") },
      };
    }),
  };
  const unscored = theories.filter((t) => !quizScores[t.leaf]).map((t) => t.leaf);
  if (unscored.length) console.warn(`pages: quiz scores missing for ${unscored.join(", ")}`);
  write("quiz.html", page({
    path: "/quiz", css: QUIZ_CSS + readFileSync(join(root, "src", "shared", "share.css"), "utf-8"),
    title: "Which Theory of Consciousness Fits You? A 2-Minute Quiz | Consciousness Atlas",
    description: `Answer ${quiz.questions.length} questions about mind, matter, AI and death, and see which of ${theories.length} theories of consciousness are closest to your view.`,
    h1: "Which theory of consciousness fits you?", eyebrow: "Quiz",
    lead: `${quiz.questions.length} questions about mind, matter, machines and death. Your answers are matched against ${theories.length} theories from Kuhn's Landscape of Consciousness, and you see the five closest, with where you agree and where you part ways.`,
    body: `<div class="quiz" id="quiz"><noscript><p class="hub-note">The quiz needs JavaScript. You can <a href="/theories">browse every theory</a> instead.</p></noscript></div>
      <p class="hub-note quiz-note">There are no right answers. The Atlas describes theories; it does not rank them. Each theory's position comes from its entry in the Atlas, scored on the same scale as your answers.</p>
      <section class="hub-section quiz-method">
        <h2>How the quiz works</h2>
        <p>Every theory in the Atlas has a position on five axes, read from its entry: what is ultimately real (matter to mind), how basic consciousness is (an illusion to the ground of reality), where it is (particular brain circuits to nowhere in space), what evidence the theory rests on (experiment to tradition and extraordinary experience), and whether it needs quantum physics. Each theory also gives its own answer on AI consciousness, life after death, mind uploading and meaning.</p>
        <p>Your answers are placed on the same scales and compared with all ${theories.length} theories. Questions about what is real and how basic consciousness is count most. The five closest theories are shown with where you agree and where you differ, and the eleven families are ranked by how close their nearest theories are.</p>
        <details><summary>All ${quiz.questions.length} questions and answers</summary><ol class="quiz-method-list">${quiz.questions.map((q) => `<li><b>${esc(q.text)}</b><ul>${q.options.map((o) => `<li>${esc(o.label)}</li>`).join("")}</ul></li>`).join("")}</ol></details>
      </section>`,
    scripts: `<script type="application/json" id="quiz-data">${JSON.stringify(quizData).replace(/</g, "\\u003c")}</script>
<script>${readFileSync(join(root, "src", "shared", "share.js"), "utf-8").replace(/^export /gm, "")}
${readFileSync(join(here, "quiz", "quiz.js"), "utf-8")}</script>`,
    jsonLd: [{ "@type": "WebApplication", name: "Which theory of consciousness fits you?", url: SITE + "/quiz", applicationCategory: "EducationalApplication", isAccessibleForFree: true }],
  }));

  // ---- mentions wall -----------------------------------------------------------
  const wall = readJson(join(root, "src", "content", "wall.json"), { quotes: [], citedIn: [] });
  const month = (d) => {
    if (!d) return "";
    const [y, m] = d.split("-");
    return m ? `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+m - 1]} ${y}` : y;
  };
  // Verbatim text: markdown links show their text, bare URLs become links.
  const quoteHtml = (text) => esc(text.replace(/\[([^\]]*)\]\(([^)]+)\)/g, (_, t, u) => (t.trim() ? t : u)))
    .replace(/https?:\/\/[^\s)]+|www\.consciousnessatlas\.com\/?/g, (u) => `<span class="wall-url">${u.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>`)
    .replace(/\n+/g, "<br />");
  const platformKey = (p) => ({ Reddit: "reddit", Bluesky: "bluesky", "Hacker News": "hn" })[p] || "web";
  const card = (q, big = false) => `<figure class="wall-card${big ? " wall-big" : ""}" data-platform="${platformKey(q.platform)}">
      <blockquote${q.lang ? ` lang="${esc(q.lang)}"` : ""}>${quoteHtml(q.quote)}</blockquote>
      ${q.translation ? `<p class="wall-translation">${esc(q.translation)} <span>(translated)</span></p>` : ""}
      <figcaption>
        <span class="wall-avatar" aria-hidden="true">${esc([...q.name][0].toUpperCase())}</span>
        <span class="wall-who"><b>${esc(q.name)}</b><span>${esc([q.platform === "Article" || q.platform === "Forum" ? q.handle : q.community || q.handle, month(q.date)].filter(Boolean).join(" · "))}</span></span>
        <a class="wall-source" href="${esc(q.url)}" rel="noopener nofollow" target="_blank">${esc(q.platform)} ↗</a>
      </figcaption>
    </figure>`;
  const featuredQuotes = wall.quotes.filter((q) => q.featured);
  const sites = new Set([...wall.quotes.map((q) => q.community || q.platform), ...wall.citedIn.map((c) => c.site)]);
  const filters = [["all", "All"], ["reddit", "Reddit"], ["bluesky", "Bluesky"], ["hn", "Hacker News"], ["web", "Articles and forums"]]
    .filter(([k]) => k === "all" || wall.quotes.some((q) => platformKey(q.platform) === k));
  write("mentions.html", page({
    path: "/mentions", wide: true, css: WALL_CSS,
    title: "What People Say About the Consciousness Atlas | Consciousness Atlas",
    description: "Quotes from researchers, readers and writers who use and cite the Consciousness Atlas, copied word for word from public posts on Reddit, Bluesky, Hacker News and the web.",
    h1: "What people say about the Atlas", eyebrow: "In the wild",
    lead: "Researchers, students and curious readers use the Atlas and point others to it. These quotes are copied word for word from public posts, typos included, and each links to the original.",
    body: `
      <ul class="wall-stats">
        <li><b>${wall.quotes.length}</b> quotes</li>
        <li><b>${sites.size}</b> communities and sites</li>
        <li><b>${wall.citedIn.length}</b> articles, newsletters, wikis and podcasts</li>
      </ul>
      <section class="wall-featured" aria-label="Featured quotes">${featuredQuotes.map((q) => card(q, true)).join("")}</section>
      <div class="wall-filters" role="group" aria-label="Filter by source">${filters.map(([k, label], i) => `<button type="button" data-filter="${k}" aria-pressed="${i === 0}">${esc(label)}</button>`).join("")}</div>
      <section class="wall-grid" aria-label="All quotes">${wall.quotes.filter((q) => !q.featured).map((q) => card(q)).join("")}</section>
      <section class="hub-section"><h2>Linked from</h2>
        <ul class="wall-cited">${wall.citedIn.map((c) => `<li>
          <span class="wall-kind">${esc(c.kind)}</span>
          <a href="${esc(c.url)}" rel="noopener nofollow" target="_blank">${esc(c.title)}</a>
          <span class="wall-meta">${esc([c.site, c.author, month(c.date)].filter(Boolean).join(" · "))}${c.note ? ` · ${esc(c.note)}` : ""}</span>
        </li>`).join("")}</ul>
      </section>
      <p class="hub-note">Wrote about the Atlas or cited it somewhere? Tell us with the feedback button on the <a href="/">map</a> and we’ll add it here.</p>`,
    scripts: `<script>(() => {
  const buttons = document.querySelectorAll("[data-filter]");
  buttons.forEach((b) => b.addEventListener("click", () => {
    buttons.forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
    window.atlasTrack?.("Click", { element: "mentions_filter_" + b.dataset.filter });
    document.querySelectorAll(".wall-grid .wall-card, .wall-featured .wall-card").forEach((c) => {
      c.hidden = b.dataset.filter !== "all" && c.dataset.platform !== b.dataset.filter;
    });
  }));
})();</script>`,
    jsonLd: [{ "@type": "CollectionPage", name: "What people say about the Consciousness Atlas", url: SITE + "/mentions", isPartOf: { "@type": "WebSite", name: "Consciousness Atlas", url: SITE + "/" } }],
  }));

  // ---- homepage directory (per locale) --------------------------------------
  const translations = readJson(join(publicDir, "theory-index", "translations.json"), {});
  for (const locale of locales) {
    const names = locale === defaultLocale ? en : readJson(join(publicDir, "i18n", "taxonomy", `${locale}.json`), en);
    const ui = { ...readJson(join(publicDir, "i18n", "ui", "en.json"), {}), ...(locale === defaultLocale ? {} : readJson(join(publicDir, "i18n", "ui", `${locale}.json`), {})) };
    const html = `<section class="atlas-directory" id="all-theories" aria-labelledby="all-theories-title">
  <h2 id="all-theories-title">${esc(ui["home.directory.title"] || "Browse all theories")}</h2>
  <p>${esc(ui["home.directory.intro"] || "Every theory on the map, by family.")} <a href="/theories">${esc(ui["home.directory.az"] || "A–Z list")}</a> · <a href="/questions">${esc(ui["home.directory.questions"] || "Big questions")}</a> · <a href="/compare">${esc(ui["home.directory.compare"] || "Comparisons")}</a></p>
  ${baseData.map((top) => {
      const members = theories.filter((t) => t.category === top.name);
      return `<details><summary><a href="${categoryUrl(top.name)}">${esc(names.categories?.[top.name] || label(top.name))}</a> <small>${members.length}</small></summary><ul>${members.map((t) => {
        const stem = resolveTheoryFileStem(t.leaf);
        const loc = locale !== defaultLocale && translations[stem]?.includes(locale) ? locale : defaultLocale;
        return `<li><a href="${buildLocalizedPath(t.url, loc)}">${esc(names.fullNames?.[t.leaf] || t.title)}</a></li>`;
      }).join("")}</ul></details>`;
    }).join("\n  ")}
</section>`;
    write(`home-directory/${locale}.html`, html);

    // The sidebar's Most viewed card, server-rendered so it paints with the
    // page (AtlasSidebar adopts it). Same markup as renderMostViewed().
    const mostViewedNames = readJson(join(root, "src", "data", "mostViewed.json"), { theories: [] }).theories.map((t) => t.name).filter((n) => byLeaf.has(n));
    write(`home-sidebar/${locale}.html`, `<section class="sidebar-card most-viewed is-shipped">
  <h2 class="sidebar-eyebrow sidebar-eyebrow-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>${esc(ui["sidebar.mostViewed.title"] || "Most viewed")}</h2>
  <ol class="most-viewed-list">${mostViewedNames.map((leaf) => {
      const t = byLeaf.get(leaf);
      const catSlug = generateSlug(t.category), slug = generateSlug(leaf);
      return `<li><a href="${buildLocalizedPath(`/${catSlug}/${slug}`, locale)}" data-category="${catSlug}" data-theory="${slug}"><span class="most-viewed-title">${esc(names.fullNames?.[leaf] || en.fullNames?.[leaf] || t.title)}</span><span class="most-viewed-category">${esc(names.categories?.[t.category] || label(t.category))}</span></a></li>`;
    }).join("")}</ol>
</section>`);

    // Links to the hubs, shown above the About text.
    const list = (items) => `<ul>${items.map(([href, text, n]) => `<li><a href="${href}">${esc(text)}</a>${n ? ` <small>${n}</small>` : ""}</li>`).join("")}</ul>`;
    write(`home-explore/${locale}.html`, `<section class="atlas-explore" id="explore" aria-labelledby="explore-title">
  <h2 id="explore-title">${esc(ui["home.explore.title"] || "Explore the theories")}</h2>
  <a class="atlas-explore-quiz" href="/quiz"><b>${esc(ui["home.explore.quiz"] || "Which theory of consciousness fits you?")}</b><span>${esc(ui["home.explore.quizCta"] || "Take the two-minute quiz")} →</span></a>
  <div class="atlas-explore-grid">
    <div><h3><a href="/questions">${esc(ui["home.directory.questions"] || "Big questions")}</a></h3>${list(QUESTIONS.map((q) => [`/questions/${q.slug}`, questionCopy[q.slug]?.title || q.short]))}</div>
    <div><h3><a href="/compare">${esc(ui["home.directory.compare"] || "Comparisons")}</a></h3>${list(COMPARISONS.filter((c) => comparisonCopy[c.slug]).map((c) => [`/compare/${c.slug}`, comparisonCopy[c.slug].title]))}
      <p><a href="/compare">${esc(ui["home.explore.compareTool"] || "Compare any theories side by side")} →</a></p></div>
    <div><h3><a href="/theories">${esc(ui["home.explore.families"] || "Theory families")}</a></h3>${list(baseData.map((top) => [categoryUrl(top.name), names.categories?.[top.name] || label(top.name), theories.filter((t) => t.category === top.name).length]))}
      <p><a href="/theories">${esc((ui["home.explore.az"] || "All {n} theories, A–Z").replace("{n}", theories.length))} →</a></p></div>
  </div>
</section>`);
  }

  // ---- llms.txt (llmstxt.org) and llms-full.txt --------------------------------
  // Plain-text guides for AI crawlers and assistants, written to the site root.
  const families = baseData.map((top) => ({ top, list: theories.filter((t) => t.category === top.name) }));
  const stanceLine = (t) => QUESTIONS.map((q) => `${q.short}: ${t.implications?.[q.field]?.stance || "no position"}`).join(" · ");
  writeFileSync(join(publicDir, "llms.txt"), `# Consciousness Atlas

> An interactive map of ${theories.length} theories of consciousness from Robert Lawrence Kuhn's "A Landscape of Consciousness: Toward a Taxonomy of Explanations and Implications" (Progress in Biophysics and Molecular Biology, 2024). Every theory has a structured entry: what it claims, how it explains experience, its evidence and criticisms, and its answers on AI consciousness, life after death, mind uploading and meaning. Built by Danilo Znamerovszkij. The Atlas describes theories; it does not rank them.

Theory pages live at ${SITE}/{family}/{theory}. Cite as: Consciousness Atlas (${SITE}), based on Kuhn (2024). Content is also available in ${locales.length - 1} other languages under /{locale}/.

## Start here
- [Interactive map](${SITE}/): every theory on one sunburst chart, grouped into ${baseData.length} families from the most physical to the most non-physical
- [All theories A–Z](${SITE}/theories): every theory with its tagline, family and thinkers
- [Compare theories](${SITE}/compare): any two to five theories side by side
- [Which theory of consciousness fits you?](${SITE}/quiz): a ${quiz.questions.length}-question quiz matched against every theory
- [Big questions](${SITE}/questions): how the theories answer AI consciousness, life after death, mind uploading and meaning
- [Kuhn's paper](${SITE}/paper): the source taxonomy
- [What people say](${SITE}/mentions): public quotes and citations

## Theory families
${families.map(({ top, list }) => `- [${label(top.name)}](${SITE}${categoryUrl(top.name)}): ${categoryTexts[top.name]?.summary || ""} (${list.length} theories)`).join("\n")}

## Big questions
${QUESTIONS.map((q) => `- [${questionCopy[q.slug]?.title || q.short}](${SITE}/questions/${q.slug}): ${questionCopy[q.slug]?.metaDescription || ""}`).join("\n")}

## Comparisons
${COMPARISONS.filter((c) => comparisonCopy[c.slug]).map((c) => `- [${comparisonCopy[c.slug].title}](${SITE}/compare/${c.slug}): ${comparisonCopy[c.slug].metaDescription}`).join("\n")}
- [All ${pairPaths.length + curatedPairs.size} head-to-head comparisons](${SITE}/compare/all)

## Optional
- [Every theory with its summary and stances](${SITE}/llms-full.txt)
- [Sitemap](${SITE}/sitemap.xml)
`);
  writeFileSync(join(publicDir, "llms-full.txt"), `# Consciousness Atlas: all ${theories.length} theories

> Every theory in the Consciousness Atlas (${SITE}), based on Robert Lawrence Kuhn's "A Landscape of Consciousness" (2024), with its family, thinkers, summary and its answers to four big questions. Each heading links to the full structured entry.

${families.map(({ top, list }) => `## ${label(top.name)}

${categoryTexts[top.name]?.summary || ""}

${list.map((t) => `### [${t.title}](${SITE}${t.url})
${[t.subcategory ? label(t.subcategory) : "", t.thinkers.join(", ")].filter(Boolean).join(" · ")}

${t.summary}

${stanceLine(t)}
`).join("\n")}`).join("\n")}`);

  return [...categoryPages, "/questions", ...QUESTIONS.map((q) => `/questions/${q.slug}`), "/compare", ...comparisonPaths, "/compare/all", ...pairPaths, "/theories", "/mentions", "/quiz"];
}

// Mixpanel page view for hub pages (they don't load the app bundle). Same
// event shape as the app; the token is public (it ships in the app's JS).
const ANALYTICS = (path) => {
  const token = process.env.VITE_MIXPANEL_TOKEN;
  if (!token) return "";
  // window.atlasTrack(event, props): Mixpanel via sendBeacon, no library.
  // Reuses the app's Mixpanel distinct_id when the visitor has one, so map and
  // hub activity land on the same person. Also tracks every link click.
  return `<script>
(function(){
var T=${JSON.stringify(token)},P=${JSON.stringify(path)};
function id(){try{var m=JSON.parse(localStorage.getItem('mp_'+T+'_mixpanel')||'{}');if(m.distinct_id)return m.distinct_id;var k='atlas.mpid',v=localStorage.getItem(k);if(!v){v='$device:'+(crypto.randomUUID?crypto.randomUUID():String(Math.random()).slice(2));localStorage.setItem(k,v)}return v}catch(_){return 'anonymous'}}
window.atlasTrack=function(ev,p){try{var props={token:T,distinct_id:id(),hub:P,url:location.href,time:Date.now()/1000,$referrer:document.referrer,locale:'en'};for(var x in p)if(p[x]!==undefined)props[x]=p[x];var b=new TextEncoder().encode(JSON.stringify([{event:ev,properties:props}])),s='';b.forEach(function(c){s+=String.fromCharCode(c)});navigator.sendBeacon('https://api-js.mixpanel.com/track/?ip=1','data='+encodeURIComponent(btoa(s)))}catch(_){}};
var q=new URLSearchParams(location.search);
atlasTrack('Page View',{theory_name:'Hub',page_type:'hub',shared_result:q.has('r')||undefined,compare_preset:q.get('t')||undefined});
document.addEventListener('click',function(ev){var a=ev.target.closest&&ev.target.closest('a[href]');if(!a)return;var h=a.getAttribute('href')||'';atlasTrack('Click',{element:a.dataset.share?'share_'+a.dataset.share:/^https?:/.test(h)?'hub_outbound':h.indexOf('mailto:')===0?'contact_email':'hub_link',link_url:h.indexOf('mailto:')===0?'mailto':h,click_type:'interaction'})},true);
})();
</script>`;
};

const CSS = `
@font-face{font-family:"Outfit";font-style:normal;font-weight:100 900;font-display:optional;src:url(/fonts/outfit-latin.woff2) format("woff2");unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:"Outfit";font-style:normal;font-weight:100 900;font-display:optional;src:url(/fonts/outfit-latin-ext.woff2) format("woff2");unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C4,U+2113,U+2C60-2C7F,U+A720-A7FF}
@font-face{font-family:"Bodoni Moda";font-style:normal;font-weight:400 900;font-display:swap;src:url(/fonts/bodoni-moda-latin.woff2) format("woff2");unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:"Bodoni Moda";font-style:normal;font-weight:400 900;font-display:swap;src:url(/fonts/bodoni-moda-latin-ext.woff2) format("woff2");unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C4,U+2113,U+2C60-2C7F,U+A720-A7FF}
:root{--bg:#1b1b1b;--panel:#16140d;--fg:rgba(255,255,255,.86);--muted:rgba(255,255,255,.55);--gold:#f7b801;--gold-soft:#c6a032;--gold-light:#fcd771;--blue:#7ea6f2;--line:rgba(255,255,255,.1)}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.65 Outfit,"Helvetica Neue",Arial,sans-serif}
a{color:var(--blue);text-underline-offset:3px}
a:focus-visible,summary:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
.hub-header{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:20px;flex-wrap:wrap;padding:14px max(16px,calc((100vw - 980px)/2));background:rgba(27,27,27,.94);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
.hub-logo{font-family:"Bodoni Moda","Bodoni 72",Georgia,serif;font-size:22px;color:#fff;text-decoration:none}
.hub-nav{display:flex;gap:18px;flex-wrap:wrap}
.hub-nav a{color:var(--muted);text-decoration:none;font-size:14px}
.hub-nav a:hover{color:#fff}
.hub-cta{margin-left:auto;padding:8px 14px;border:1px solid var(--gold);border-radius:4px;color:var(--gold);text-decoration:none;font-size:14px;background:rgba(247,184,1,.1)}
.hub-cta:hover{background:rgba(247,184,1,.2)}
.hub-main{max-width:980px;margin:0 auto;padding:28px 16px 48px}
.hub-main>p,.hub-section>p,.hub-lead{max-width:70ch}
.hub-crumbs{font-size:13px;color:var(--muted);margin-bottom:18px}
.hub-crumbs a{color:var(--muted)}
.hub-eyebrow{color:var(--gold-soft);font-size:12px;letter-spacing:.08em;text-transform:uppercase;margin:0 0 6px}
h1{font-family:"Bodoni Moda","Bodoni 72",Georgia,serif;font-weight:500;color:#fff;font-size:clamp(30px,5vw,46px);line-height:1.1;margin:0 0 14px;text-wrap:balance}
h2{font-family:"Bodoni Moda","Bodoni 72",Georgia,serif;font-weight:500;color:var(--gold-light);font-size:26px;margin:0 0 10px}
h2 small{font-family:Outfit,sans-serif;font-size:14px;color:var(--muted);margin-left:6px}
h3{margin:0 0 6px;font-size:18px}
.hub-lead{font-size:19px;color:#fff}
.hub-section{margin-top:40px}
.hub-actions{display:flex;gap:10px;flex-wrap:wrap;margin:22px 0}
.hub-button{display:inline-block;padding:10px 16px;border-radius:4px;border:1px solid var(--gold);background:rgba(247,184,1,.14);color:var(--gold);text-decoration:none;font-weight:500}
.hub-button:hover{background:rgba(247,184,1,.24)}
.hub-button-quiet{border-color:var(--line);background:transparent;color:var(--fg)}
.hub-link{font-size:14px;color:var(--gold-soft)}
.hub-theories{list-style:none;padding:0;margin:12px 0 0;display:grid;gap:2px}
.hub-theory{display:grid;gap:2px;padding:10px 0;border-bottom:1px solid var(--line)}
.hub-theory>a{color:#fff;font-weight:500;text-decoration:none}
.hub-theory>a:hover{color:var(--gold)}
.hub-tagline{color:var(--muted);font-style:italic;font-size:14px}
.hub-why{color:var(--fg);font-size:14px}
.hub-family{color:var(--muted);font-size:13px}
.hub-family a{color:var(--muted)}
.hub-pills{list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:8px}
.hub-pills a{display:inline-block;padding:6px 12px;border:1px solid var(--line);border-radius:16px;color:var(--fg);text-decoration:none;font-size:14px}
.hub-pills a:hover{border-color:var(--gold);color:var(--gold)}
.hub-cards{list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
.hub-cards>li{border:1px solid var(--line);border-radius:6px;padding:16px;background:var(--panel)}
.hub-cards>li>a{display:grid;gap:6px;text-decoration:none}
.hub-cards>li>a b{color:#fff;font-size:18px}
.hub-cards>li>a span{color:var(--muted);font-size:14px}
.hub-dist{display:flex;height:12px;border-radius:6px;margin:14px 0 10px;gap:2px}
.hub-dist-seg{position:relative;cursor:default;transition:filter .15s}
.hub-dist-seg:first-child{border-radius:6px 0 0 6px}.hub-dist-seg:last-child{border-radius:0 6px 6px 0}.hub-dist-seg:only-child{border-radius:6px}
.hub-dist-seg:hover,.hub-dist-seg:focus-visible{filter:brightness(1.25);outline:none}
.hub-dist-seg::after{content:attr(data-tip);position:absolute;bottom:calc(100% + 8px);left:50%;transform:translate(-50%,4px);white-space:nowrap;padding:5px 9px;border-radius:4px;background:var(--panel);border:1px solid rgba(198,160,50,.45);color:var(--fg);font-size:13px;line-height:1.3;opacity:0;pointer-events:none;transition:opacity .12s,transform .12s;z-index:2}
.hub-dist-seg:first-child::after{left:0;transform:translate(0,4px)}.hub-dist-seg:last-child:not(:first-child)::after{left:auto;right:0;transform:translate(0,4px)}
.hub-dist-seg:hover::after,.hub-dist-seg:focus-visible::after{opacity:1;transform:translate(-50%,0)}
.hub-dist-seg:first-child:hover::after,.hub-dist-seg:first-child:focus-visible::after,.hub-dist-seg:last-child:not(:first-child):hover::after,.hub-dist-seg:last-child:not(:first-child):focus-visible::after{transform:none}
.hub-dist-legend{list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:6px 16px;font-size:14px;margin:0}
.hub-dist-legend i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:6px;vertical-align:0}
.hub-dist-legend small{color:var(--muted)}
.seg-yes,.seg-cosmic{background:#f7b801}.seg-maybe{background:#c99a3c}.seg-humanistic{background:#7ea6f2}.seg-uncertain{background:#6b6b6b}.seg-no{background:#3f5f8f}.seg-notNeeded{background:#5f8366}
.hub-note{color:var(--muted);font-size:14px}
details.hub-section summary{cursor:pointer;color:var(--gold-light);font-size:20px}
.hub-callout{border-left:3px solid var(--gold);padding:10px 14px;background:rgba(247,184,1,.06)}
.hub-table-wrap{overflow-x:auto}
.hub-table{width:100%;border-collapse:collapse;font-size:15px}
.hub-table th,.hub-table td{text-align:left;vertical-align:top;padding:10px 12px;border-bottom:1px solid var(--line)}
.hub-table thead th{color:var(--gold-light);font-weight:500}
.hub-table tbody th{color:var(--muted);font-weight:500;width:22%}
.hub-table td span{display:block;color:var(--muted);font-size:13px;margin-top:2px}
.hub-sides{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.hub-side{border:1px solid var(--line);border-radius:6px;padding:16px;background:var(--panel)}
.hub-side h3 a{color:#fff;text-decoration:none}
.hub-letters{display:flex;flex-wrap:wrap;gap:4px;margin:18px 0}
.hub-letters a{min-width:30px;text-align:center;padding:4px 6px;border:1px solid var(--line);border-radius:4px;color:var(--fg);text-decoration:none;font-size:14px}
.hub-letters a:hover{border-color:var(--gold);color:var(--gold)}
.hub-footer{max-width:980px;margin:0 auto;padding:24px 16px 48px;border-top:1px solid var(--line);color:var(--muted);font-size:14px}
.hub-footer a{color:var(--gold-soft)}
@media (max-width:640px){.hub-header{position:static}.hub-sides{grid-template-columns:1fr}.hub-cta{margin-left:0}.hub-header{gap:10px 16px}.hub-table tbody th{width:auto}}
`;

// Comparison grid, tool and head-to-head pages (scripts/compare/).
const CMP_CSS = `
:root{--ease-out:cubic-bezier(.23,1,.32,1)}
.hub-wide{max-width:1240px}
.is-wide .hub-header{padding-inline:max(16px,calc((100vw - 1240px)/2))}
.is-wide .hub-footer{max-width:1240px}
.cmp-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.cmp-tool{margin-top:22px}
.cmp-picker{position:relative;display:flex;flex-wrap:wrap;align-items:center;gap:8px;min-height:58px;padding:9px 10px;border:1px solid rgba(198,160,50,.45);border-radius:10px;background:var(--panel);cursor:text;transition:border-color .15s ease,box-shadow .15s ease}
.cmp-picker:focus-within{border-color:var(--gold);box-shadow:0 0 0 3px rgba(247,184,1,.12)}
.cmp-chips{display:contents;list-style:none}
.cmp-chip{display:inline-flex;align-items:center;gap:7px;padding:5px 5px 5px 11px;border-radius:999px;border:1px solid color-mix(in srgb,var(--slot) 55%,transparent);background:color-mix(in srgb,var(--slot) 13%,transparent);color:#fff;font-size:14px;line-height:1.3;cursor:default;transition:opacity .18s var(--ease-out),transform .18s var(--ease-out)}
@starting-style{.cmp-chip{opacity:0;transform:scale(.96)}}
.cmp-chip::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--slot)}
.cmp-chip button{display:grid;place-items:center;width:22px;height:22px;border:0;border-radius:50%;background:transparent;color:var(--muted);font-size:17px;line-height:1;cursor:pointer;transition:background .15s ease,color .15s ease,transform .12s ease-out}
.cmp-chip button:hover{background:rgba(255,255,255,.1);color:#fff}
.cmp-chip button:active{transform:scale(.9)}
.cmp-input{flex:1;min-width:min(260px,100%);padding:7px 6px;border:0;background:transparent;color:#fff;font:16px Outfit,sans-serif;outline:none}
.cmp-input::placeholder{color:var(--muted)}
.cmp-input:disabled{cursor:default}
.cmp-picker.is-full .cmp-input::placeholder{color:var(--gold-soft)}
.cmp-options{position:absolute;z-index:20;top:calc(100% + 6px);left:0;right:0;max-height:min(380px,60vh);overflow:auto;margin:0;padding:6px;list-style:none;background:#16140d;border:1px solid rgba(198,160,50,.45);border-radius:10px;box-shadow:0 18px 50px rgba(0,0,0,.55);transform-origin:top center;transition:opacity .15s var(--ease-out),transform .15s var(--ease-out)}
@starting-style{.cmp-options{opacity:0;transform:translateY(-4px) scale(.985)}}
.cmp-opt-head{padding:6px 10px 4px;color:var(--muted);font-size:11px;letter-spacing:.08em;text-transform:uppercase}
.cmp-opt{display:grid;gap:1px;padding:8px 10px;border-radius:6px;cursor:pointer}
.cmp-opt[aria-selected="true"]{background:rgba(247,184,1,.1)}
.cmp-opt-title{color:#fff;font-size:15px}
.cmp-opt-title mark{background:none;color:var(--gold);font-weight:600}
.cmp-opt-meta{color:var(--muted);font-size:13px}
.cmp-opt-empty{padding:12px 10px;color:var(--muted);font-size:14px}
.cmp-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:10px}
.cmp-action{display:inline-flex;align-items:center;gap:7px;padding:7px 12px;border:1px solid rgba(198,160,50,.45);border-radius:6px;background:transparent;color:var(--gold-light);font:14px Outfit,sans-serif;cursor:pointer;transition:border-color .15s ease,color .15s ease,transform .16s ease-out}
.cmp-action:active,.cmp-preset:active,.cmp-suggest button:active{transform:scale(.97)}
.cmp-action[data-state="done"]{color:var(--gold);border-color:var(--gold)}
.cmp-action-quiet{border-color:var(--line);color:var(--muted)}
.cmp-start{margin-top:18px}
.cmp-start p{margin:0 0 10px;color:var(--muted);font-size:14px}
.cmp-presets,.cmp-suggest{display:flex;flex-wrap:wrap;gap:8px}
.cmp-preset,.cmp-suggest button{padding:8px 14px;border:1px solid var(--line);border-radius:999px;background:transparent;color:var(--fg);font:14px Outfit,sans-serif;cursor:pointer;transition:border-color .15s ease,color .15s ease,transform .16s ease-out}
.cmp-hint{margin-top:24px;padding:20px;border:1px dashed rgba(198,160,50,.35);border-radius:10px}
.cmp-hint p{margin:0 0 14px}
.cmp-suggest{align-items:center;margin-top:10px}
.cmp-suggest span{width:100%;color:var(--muted);font-size:12px;letter-spacing:.06em;text-transform:uppercase}
.cmp-glance{margin:8px 0 4px;padding:16px 20px;border-left:3px solid var(--gold);background:rgba(247,184,1,.05);border-radius:0 8px 8px 0;max-width:80ch}
.cmp-glance h2{font-size:20px;margin-bottom:6px}
.cmp-glance ul{margin:0;padding-left:18px}
.cmp-glance li{margin:3px 0}
.cmp-grid{--label:170px;margin-top:28px;transition:opacity .2s ease}
@starting-style{.cmp-grid{opacity:0}}
.cmp-row{display:grid;grid-template-columns:var(--label) repeat(var(--cols),minmax(0,1fr));gap:0 22px;padding:14px 0;border-bottom:1px solid var(--line)}
.cmp-head{position:sticky;top:var(--head-h,63px);z-index:4;padding:12px 0;background:rgba(27,27,27,.95);backdrop-filter:blur(8px);border-bottom:1px solid rgba(198,160,50,.3)}
.cmp-col{position:relative;display:grid;align-content:start;gap:3px;padding:10px 26px 0 0;border-top:3px solid var(--slot)}
.cmp-family{color:var(--slot);font-size:11px;letter-spacing:.08em;text-transform:uppercase;text-decoration:none}
.cmp-title{font-family:"Bodoni Moda","Bodoni 72",Georgia,serif;font-size:19px;line-height:1.2;color:#fff;text-decoration:none;text-wrap:balance}
.cmp-title:hover{color:var(--gold-light)}
.cmp-thinkers{color:var(--muted);font-size:13px}
.cmp-remove{position:absolute;top:6px;right:0;display:grid;place-items:center;width:24px;height:24px;border:0;border-radius:50%;background:transparent;color:var(--muted);font-size:18px;line-height:1;cursor:pointer;transition:background .15s ease,color .15s ease,transform .12s ease-out}
.cmp-remove:hover{background:rgba(255,255,255,.1);color:#fff}
.cmp-remove:active{transform:scale(.9)}
.cmp-section-title{margin:34px 0 2px;font-size:22px}
.cmp-label{display:flex;flex-direction:column;align-items:flex-start;gap:7px;color:var(--muted);font-size:13px;font-weight:500;line-height:1.4}
.cmp-label a{color:var(--muted);text-decoration-style:dotted}
.cmp-label a:hover{color:var(--gold-light)}
.cmp-verdict{padding:1px 8px;border-radius:999px;border:1px solid var(--line);font-size:11px;letter-spacing:.03em}
.cmp-agree{border-color:rgba(247,184,1,.5);color:var(--gold-light)}
.cmp-split{color:var(--muted)}
.cmp-cell{min-width:0;font-size:15px;line-height:1.6;color:var(--fg)}
.cmp-tag{display:none}
.cmp-key{display:block;color:#fff;font-weight:500}
.cmp-why{display:block;margin-top:2px;color:var(--muted);font-size:14px}
.cmp-text{display:block}
.cmp-empty{color:rgba(255,255,255,.35);font-style:italic}
.cmp-stance{display:inline-block;margin-bottom:6px;padding:1px 9px;border-radius:999px;color:#1b1b1b;font-size:12px;font-weight:600}
.cmp-stance.seg-no,.cmp-stance.seg-uncertain,.cmp-stance.seg-notNeeded{color:#fff}
.cmp-sources{margin:0;padding-left:16px;font-size:14px}
.cmp-sources span{color:var(--muted)}
.is-clamped .cmp-cell{max-height:9em;overflow:hidden;-webkit-mask-image:linear-gradient(#000 55%,transparent);mask-image:linear-gradient(#000 55%,transparent)}
.cmp-more{padding:0;border:0;background:none;color:var(--gold-soft);font:13px Outfit,sans-serif;cursor:pointer}
.cmp-more:hover{color:var(--gold)}
.cmp-more-pairs{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.cmp-more-pairs h3{font-weight:500;color:#fff}
@media (hover:hover) and (pointer:fine){
  .cmp-row:not(.cmp-head):hover{background:linear-gradient(90deg,transparent,rgba(255,255,255,.025) 8%,rgba(255,255,255,.025) 92%,transparent)}
  .cmp-preset:hover,.cmp-suggest button:hover{border-color:var(--gold-soft);color:var(--gold-light)}
  .cmp-action:hover{border-color:var(--gold)}
}
@media (max-width:760px){
  .cmp-row{grid-template-columns:1fr;gap:12px}
  .cmp-head{position:static;gap:10px;background:none;backdrop-filter:none}
  .cmp-col{padding:4px 30px 4px 12px;border-top:0;border-left:3px solid var(--slot)}
  .cmp-title{font-size:18px}
  .cmp-head .cmp-label{display:none}
  .cmp-label{flex-direction:row;flex-wrap:wrap;align-items:center;color:var(--gold-soft);font-size:12px;letter-spacing:.06em;text-transform:uppercase}
  .cmp-label .cmp-more{margin-left:auto;text-transform:none;letter-spacing:0}
  .cmp-cell{padding-left:12px;border-left:2px solid var(--slot)}
  .cmp-tag{display:flex;align-items:center;gap:6px;margin-bottom:2px;color:var(--slot);font-size:12px;font-weight:600}
  .cmp-more-pairs{grid-template-columns:1fr}
  .cmp-actions{justify-content:flex-start}
}
@media (prefers-reduced-motion:reduce){.cmp-chip,.cmp-options,.cmp-grid{transition:none}}
`;

// /mentions: quote wall.
const WALL_CSS = `
.hub-wide{max-width:1240px}
.is-wide .hub-header{padding-inline:max(16px,calc((100vw - 1240px)/2))}
.is-wide .hub-footer{max-width:1240px}
.wall-stats{display:flex;flex-wrap:wrap;gap:8px 28px;list-style:none;padding:0;margin:4px 0 30px;color:var(--muted);font-size:15px}
.wall-stats b{font-family:"Bodoni Moda","Bodoni 72",Georgia,serif;font-weight:500;font-size:30px;color:var(--gold-light);margin-right:6px;vertical-align:-3px}
.wall-featured{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-bottom:34px}
.wall-card{margin:0 0 16px;padding:20px 20px 16px;border:1px solid var(--line);border-radius:10px;background:var(--panel);break-inside:avoid;display:flex;flex-direction:column;gap:14px;transition:border-color .2s ease}
.wall-card[hidden]{display:none}
.wall-card blockquote{margin:0;color:#fff;font-size:16px;line-height:1.6;overflow-wrap:anywhere}
.wall-card blockquote::before{content:"“";display:block;height:.55em;margin-bottom:6px;font-family:"Bodoni Moda","Bodoni 72",Georgia,serif;font-size:44px;line-height:1;color:var(--gold-soft)}
.wall-big{margin:0;border-color:rgba(198,160,50,.35);background:linear-gradient(160deg,rgba(247,184,1,.07),rgba(22,20,13,1) 55%)}
.wall-big blockquote{font-family:"Bodoni Moda","Bodoni 72",Georgia,serif;font-size:21px;line-height:1.4}
.wall-url{color:var(--muted);font-family:Outfit,sans-serif;font-size:.85em}
.wall-translation{margin:-4px 0 0;color:var(--muted);font-size:14px;font-style:italic}
.wall-translation span{font-style:normal;font-size:12px}
.wall-card figcaption{display:flex;align-items:center;gap:10px;margin-top:auto;font-size:13px}
.wall-avatar{display:grid;place-items:center;flex:none;width:30px;height:30px;border-radius:50%;background:rgba(247,184,1,.14);color:var(--gold-light);font-weight:600}
[data-platform="reddit"] .wall-avatar{background:rgba(255,122,69,.16);color:#ffa27f}
[data-platform="bluesky"] .wall-avatar{background:rgba(95,168,255,.16);color:#9cc7ff}
[data-platform="hn"] .wall-avatar{background:rgba(255,166,77,.16);color:#ffc183}
.wall-who{display:grid;min-width:0}
.wall-who b{color:#fff;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wall-who span{color:var(--muted);line-height:1.4}
.wall-source{margin-left:auto;flex:none;color:var(--gold-soft);text-decoration:none}
.wall-source:hover{color:var(--gold)}
.wall-filters{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 18px}
.wall-filters button{padding:7px 14px;border:1px solid var(--line);border-radius:999px;background:transparent;color:var(--fg);font:14px Outfit,sans-serif;cursor:pointer;transition:border-color .15s ease,color .15s ease,background .15s ease,transform .16s ease-out}
.wall-filters button[aria-pressed="true"]{border-color:var(--gold);color:var(--gold);background:rgba(247,184,1,.1)}
.wall-filters button:active{transform:scale(.97)}
.wall-grid{columns:3 300px;column-gap:16px}
.wall-cited{list-style:none;padding:0;margin:0;display:grid;gap:2px}
.wall-cited li{display:grid;grid-template-columns:110px 1fr;gap:2px 14px;padding:12px 0;border-bottom:1px solid var(--line)}
.wall-cited a{color:#fff;text-decoration:none;font-weight:500}
.wall-cited a:hover{color:var(--gold)}
.wall-kind{grid-row:span 2;color:var(--gold-soft);font-size:12px;letter-spacing:.06em;text-transform:uppercase;padding-top:3px}
.wall-meta{color:var(--muted);font-size:14px}
@media (hover:hover) and (pointer:fine){.wall-card:hover{border-color:rgba(198,160,50,.45)}.wall-filters button:hover{border-color:var(--gold-soft)}}
@media (max-width:640px){.wall-cited li{grid-template-columns:1fr}.wall-kind{grid-row:auto}.wall-big blockquote{font-size:19px}}
`;

// /quiz.
const QUIZ_CSS = `
:root{--ease-out:cubic-bezier(.23,1,.32,1)}
.quiz{max-width:760px;margin-top:26px;scroll-margin-top:90px}
.quiz-screen{transition:opacity .22s var(--ease-out),transform .22s var(--ease-out)}
@starting-style{.quiz-screen{opacity:0;transform:translateY(6px)}}
.quiz-screen h2{margin:4px 0 8px;color:#fff;font-size:clamp(26px,4vw,34px);line-height:1.2;text-wrap:balance;outline:none}
.quiz-screen h2 a{color:var(--gold-light);text-decoration-thickness:1px}
.quiz-help{margin:0 0 20px;color:var(--muted);max-width:62ch}
.quiz-intro{padding:26px;border:1px solid rgba(198,160,50,.35);border-radius:12px;background:linear-gradient(160deg,rgba(247,184,1,.07),var(--panel) 60%)}
.quiz-meta{margin:0 0 16px;color:var(--gold-soft);font-size:13px;letter-spacing:.08em;text-transform:uppercase}
.quiz-start,.quiz-primary{display:inline-block;padding:12px 22px;border:1px solid var(--gold);border-radius:6px;background:rgba(247,184,1,.16);color:var(--gold);font:500 16px Outfit,sans-serif;text-decoration:none;cursor:pointer;transition:background .15s ease,transform .16s ease-out}
.quiz-start:active,.quiz-primary:active,.quiz-secondary:active{transform:scale(.97)}
.quiz-fine{margin:14px 0 0;color:var(--muted);font-size:13px}
.quiz-progress{height:3px;border-radius:2px;background:var(--line);overflow:hidden;margin-bottom:16px}
.quiz-progress span{display:block;height:100%;background:var(--gold);transform-origin:left;transition:transform .3s var(--ease-out)}
.quiz-count{margin:0;color:var(--gold-soft);font-size:12px;letter-spacing:.08em;text-transform:uppercase}
.quiz-options{display:grid;gap:10px}
.quiz-option{display:flex;align-items:center;gap:14px;width:100%;padding:15px 18px;border:1px solid var(--line);border-radius:10px;background:var(--panel);color:var(--fg);font:17px/1.45 Outfit,sans-serif;text-align:left;cursor:pointer;transition:border-color .15s ease,background .15s ease,transform .12s ease-out}
.quiz-option:active{transform:scale(.985)}
.quiz-option:focus-visible,.quiz-back:focus-visible,.quiz-skip:focus-visible,.quiz-start:focus-visible,.quiz-secondary:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
.quiz-key{display:grid;place-items:center;flex:none;width:26px;height:26px;border:1px solid var(--line);border-radius:6px;color:var(--muted);font-size:13px;transition:background .15s ease,color .15s ease,border-color .15s ease}
.quiz-option.is-chosen{border-color:var(--gold);background:rgba(247,184,1,.1);color:#fff}
.quiz-option.is-chosen .quiz-key{border-color:var(--gold);background:var(--gold);color:#1b1b1b}
.quiz-nav{display:flex;justify-content:space-between;margin-top:18px}
.quiz-back,.quiz-skip{padding:6px 0;border:0;background:none;color:var(--muted);font:14px Outfit,sans-serif;cursor:pointer}
.quiz-back:hover,.quiz-skip:hover{color:#fff}
.quiz-top{list-style:none;padding:0;margin:22px 0 0;display:grid;gap:12px}
.quiz-match{padding:16px 18px;border:1px solid var(--line);border-radius:10px;background:var(--panel)}
.quiz-match.is-first{border-color:rgba(247,184,1,.55);background:linear-gradient(160deg,rgba(247,184,1,.08),var(--panel) 55%)}
.quiz-match-head{display:grid;grid-template-columns:auto 1fr auto;gap:14px;align-items:start}
.quiz-match-head>div{display:grid;gap:2px;min-width:0}
.quiz-rank{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;border:1px solid rgba(198,160,50,.5);color:var(--gold-light);font-size:14px}
.quiz-family{color:var(--gold-soft);font-size:11px;letter-spacing:.08em;text-transform:uppercase;text-decoration:none}
.quiz-title{font-family:"Bodoni Moda","Bodoni 72",Georgia,serif;font-size:20px;line-height:1.25;color:#fff;text-decoration:none}
.quiz-title:hover{color:var(--gold-light)}
.quiz-thinkers{color:var(--muted);font-size:13px}
.quiz-score{font-family:"Bodoni Moda","Bodoni 72",Georgia,serif;font-size:26px;color:var(--gold);font-variant-numeric:tabular-nums}
.quiz-tagline{margin:8px 0 0 42px;color:var(--muted);font-style:italic;font-size:14px}
.quiz-why{list-style:none;margin:10px 0 0 42px;padding:0;display:grid;gap:4px;font-size:14px}
.quiz-why li{padding-left:20px;position:relative}
.quiz-why li::before{position:absolute;left:0;top:0}
.is-agree::before{content:"✓";color:var(--gold)}
.is-differ{color:var(--muted)}
.is-differ::before{content:"≠";color:var(--muted)}
.quiz-actions{display:flex;flex-wrap:wrap;gap:10px;margin:22px 0 8px}
.quiz-share{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px 20px;margin:4px 0 6px;padding:14px 16px;border:1px solid rgba(198,160,50,.35);border-radius:10px;background:rgba(247,184,1,.05);outline:none;transition:border-color .3s ease,box-shadow .3s ease}
.quiz-share-copy{display:grid;gap:2px;flex:1 1 260px;min-width:0}
.quiz-share-copy b{color:var(--gold-light);font-weight:500}
.quiz-share-copy span{color:var(--muted);font-size:14px}
.quiz-share .share-icon{width:36px;height:36px}
.quiz-share .share-icon svg{width:16px;height:16px}
.quiz-share.is-flash{animation:quiz-flash 1.2s ease-out}
@keyframes quiz-flash{0%{border-color:var(--gold);box-shadow:0 0 0 4px rgba(247,184,1,.25)}100%{border-color:rgba(198,160,50,.35);box-shadow:0 0 0 0 rgba(247,184,1,0)}}
.quiz-share-cta{display:inline-flex;align-items:center;gap:8px;font-size:15px}
.quiz-primary.quiz-share-cta{background:transparent}
.quiz-secondary{padding:12px 18px;border:1px solid var(--line);border-radius:6px;background:transparent;color:var(--fg);font:15px Outfit,sans-serif;cursor:pointer;transition:border-color .15s ease,transform .16s ease-out}
.quiz-profile,.quiz-families{margin-top:36px}
.quiz-profile h3,.quiz-families h3{font-family:"Bodoni Moda","Bodoni 72",Georgia,serif;font-weight:500;font-size:22px;color:var(--gold-light);margin:0 0 14px}
.quiz-axis{display:grid;gap:6px;margin-bottom:18px}
.quiz-axis-name{color:var(--muted);font-size:12px;letter-spacing:.06em;text-transform:uppercase}
.quiz-axis-line{display:grid;grid-template-columns:150px 1fr 150px;align-items:center;gap:14px}
.quiz-axis-end{color:var(--muted);font-size:13px}
.quiz-axis-end:last-child{text-align:right}
.quiz-axis-track{position:relative;height:2px;background:var(--line);margin:0 7px}
.quiz-dot{position:absolute;top:50%;width:14px;height:14px;border-radius:50%;transform:translate(-50%,-50%)}
.quiz-dot.is-you{background:var(--gold);box-shadow:0 0 0 3px rgba(247,184,1,.2);z-index:1}
.quiz-dot.is-theirs{width:24px;height:24px;border:2px solid var(--blue);background:transparent}
.quiz-legend{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;color:var(--muted);font-size:13px}
.quiz-legend .quiz-dot{position:static;transform:none;display:inline-block;width:12px;height:12px;box-shadow:none}
.quiz-families ol{list-style:none;padding:0;margin:0;display:grid;gap:8px}
.quiz-families li{display:grid;grid-template-columns:180px 1fr 48px;align-items:center;gap:12px;font-size:14px}
.quiz-families a{color:var(--fg);text-decoration:none}
.quiz-families a:hover{color:var(--gold)}
.quiz-families b{color:var(--muted);font-weight:500;text-align:right;font-variant-numeric:tabular-nums}
.quiz-bar{height:6px;border-radius:3px;background:var(--line);overflow:hidden}
.quiz-bar span{display:block;height:100%;background:var(--gold-soft);transform-origin:left}
.quiz-families li:first-child .quiz-bar span{background:var(--gold)}
.quiz-note{margin-top:34px}
.quiz-method{max-width:760px}
.quiz-method details{margin-top:12px}
.quiz-method summary{cursor:pointer;color:var(--gold-light)}
.quiz-method-list{padding-left:20px;color:var(--fg)}
.quiz-method-list>li{margin:12px 0}
.quiz-method-list ul{margin:4px 0 0;padding-left:18px;color:var(--muted);font-size:15px}
@media (hover:hover) and (pointer:fine){.quiz-option:hover{border-color:rgba(198,160,50,.6)}.quiz-start:hover,.quiz-primary:hover{background:rgba(247,184,1,.26)}.quiz-secondary:hover{border-color:var(--gold-soft)}}
@media (max-width:640px){.quiz-axis-line{grid-template-columns:1fr;gap:8px}.quiz-axis-line .quiz-axis-end{display:none}.quiz-axis-track{margin:8px 7px}.quiz-families li{grid-template-columns:120px 1fr 40px}.quiz-tagline,.quiz-why{margin-left:0}.quiz-option{font-size:16px}}
@media (prefers-reduced-motion:reduce){.quiz-screen,.quiz-progress span{transition:none}.quiz-share.is-flash{animation:none}}
`;
