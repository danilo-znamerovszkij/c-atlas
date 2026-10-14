// Static hub pages, generated at build into public/_pages/ (gitignored) and
// served at clean URLs by the Worker (worker/index.ts):
//   /{category}            category hub (overview, subcategories, every theory)
//   /questions, /questions/{slug}   theories grouped by their answer
//   /compare, /compare/{slug}       hand-written comparisons + live data
//   /theories              A–Z of every theory
// plus public/_pages/home-directory/{locale}.html, the crawlable theory
// directory the Worker injects into the homepage.
// Copy for questions/comparisons lives in src/content/*.json.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

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

export function buildPages({ root, publicDir, baseData, generateSlug, resolveTheoryFileStem, locales, defaultLocale, buildLocalizedPath }) {
  const out = join(publicDir, "_pages");
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
      <a href="/compare">Comparisons</a>
    </nav>`;
  const page = ({ path, title, description, h1, eyebrow = "", lead = "", body, jsonLd = [], crumbs = [] }) => {
    const canonical = SITE + path;
    const breadcrumb = {
      "@type": "BreadcrumbList",
      itemListElement: [{ name: "Consciousness Atlas", path: "/" }, ...crumbs, { name: h1, path }].map((c, i) => ({
        "@type": "ListItem", position: i + 1, name: c.name, item: SITE + c.path,
      })),
    };
    const ld = JSON.stringify({ "@context": "https://schema.org", "@graph": [...jsonLd, breadcrumb] }).replace(/</g, "\\u003c");
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="atlas-page" content="hub" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<link rel="canonical" href="${canonical}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Consciousness Atlas" />
<meta property="og:url" content="${canonical}" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:image" content="${SITE}/banner.jpg" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="theme-color" content="#F7B801" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,500&family=Outfit:wght@400;500;600&display=swap" rel="stylesheet" />
<script type="application/ld+json">${ld}</script>
<style>${CSS}</style>
${ANALYTICS(path)}
</head>
<body>
<header class="hub-header">
  <a class="hub-logo" href="/">Consciousness Atlas</a>
  ${nav}
  <a class="hub-cta" href="/">Open the map</a>
</header>
<main class="hub-main">
  <nav class="hub-crumbs" aria-label="Breadcrumb"><a href="/">Atlas</a>${crumbs.map((c) => ` › <a href="${c.path}">${esc(c.name)}</a>`).join("")} › <span>${esc(h1)}</span></nav>
  ${eyebrow ? `<p class="hub-eyebrow">${esc(eyebrow)}</p>` : ""}
  <h1>${esc(h1)}</h1>
  ${lead ? `<p class="hub-lead">${esc(lead)}</p>` : ""}
  ${body}
</main>
<footer class="hub-footer">
  <p>Consciousness Atlas maps theories from Robert Lawrence Kuhn's <a href="https://loc.closertotruth.com/">Landscape of Consciousness</a>. It describes theories; it does not rank them.</p>
  <p><a href="/">Open the interactive map</a> · <a href="/theories">All theories A–Z</a> · <a href="/questions">Big questions</a> · <a href="/compare">Comparisons</a> · <a href="/paper">Kuhn's paper</a></p>
</footer>
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
      crumbs: [{ name: "Comparisons", path: "/compare" }],
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
  write("compare/index.html", page({
    path: "/compare", title: "Theories of Consciousness Compared | Consciousness Atlas",
    description: "Side-by-side comparisons of major theories of consciousness: panpsychism vs idealism, IIT vs global workspace, materialism vs dualism and more.",
    h1: "Theories of consciousness compared",
    lead: "Side-by-side looks at the debates people ask about most, with each side's own entries one click away.",
    body: `<ul class="hub-cards">${COMPARISONS.filter((c) => comparisonCopy[c.slug]).map((c) => `<li><a href="/compare/${c.slug}"><b>${esc(comparisonCopy[c.slug].title)}</b><span>${esc(truncate(comparisonCopy[c.slug].metaDescription, 140))}</span></a></li>`).join("")}</ul>`,
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

    // Links to the hubs, shown above the About text.
    const list = (items) => `<ul>${items.map(([href, text, n]) => `<li><a href="${href}">${esc(text)}</a>${n ? ` <small>${n}</small>` : ""}</li>`).join("")}</ul>`;
    write(`home-explore/${locale}.html`, `<section class="atlas-explore" id="explore" aria-labelledby="explore-title">
  <h2 id="explore-title">${esc(ui["home.explore.title"] || "Explore the theories")}</h2>
  <div class="atlas-explore-grid">
    <div><h3><a href="/questions">${esc(ui["home.directory.questions"] || "Big questions")}</a></h3>${list(QUESTIONS.map((q) => [`/questions/${q.slug}`, questionCopy[q.slug]?.title || q.short]))}</div>
    <div><h3><a href="/compare">${esc(ui["home.directory.compare"] || "Comparisons")}</a></h3>${list(COMPARISONS.filter((c) => comparisonCopy[c.slug]).map((c) => [`/compare/${c.slug}`, comparisonCopy[c.slug].title]))}</div>
    <div><h3><a href="/theories">${esc(ui["home.explore.families"] || "Theory families")}</a></h3>${list(baseData.map((top) => [categoryUrl(top.name), names.categories?.[top.name] || label(top.name), theories.filter((t) => t.category === top.name).length]))}
      <p><a href="/theories">${esc((ui["home.explore.az"] || "All {n} theories, A–Z").replace("{n}", theories.length))} →</a></p></div>
  </div>
</section>`);
  }

  return [...categoryPages, "/questions", ...QUESTIONS.map((q) => `/questions/${q.slug}`), "/compare", ...comparisonPaths, "/theories"];
}

// Mixpanel page view for hub pages (they don't load the app bundle). Same
// event shape as the app; the token is public (it ships in the app's JS).
const ANALYTICS = (path) => {
  const token = process.env.VITE_MIXPANEL_TOKEN;
  if (!token) return "";
  return `<script>
(function(){try{
var k='atlas.mpid',id=localStorage.getItem(k);if(!id){id='$device:'+(crypto.randomUUID?crypto.randomUUID():String(Math.random()).slice(2));localStorage.setItem(k,id)}
var e={event:'Page View',properties:{token:${JSON.stringify(token)},distinct_id:id,theory_name:'Hub',page_type:'hub',hub:${JSON.stringify(path)},url:location.href,time:Date.now()/1000,$referrer:document.referrer}};
var b=new TextEncoder().encode(JSON.stringify([e])),s='';b.forEach(function(c){s+=String.fromCharCode(c)});
navigator.sendBeacon('https://api-js.mixpanel.com/track/?ip=1','data='+encodeURIComponent(btoa(s)));
}catch(_){}})();
</script>`;
};

const CSS = `
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
@media (max-width:640px){.hub-sides{grid-template-columns:1fr}.hub-cta{margin-left:0}.hub-header{gap:10px 16px}.hub-table tbody th{width:auto}}
`;
