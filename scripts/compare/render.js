// Side-by-side theory comparison: one renderer for the static pair pages
// (scripts/pages.js, Node) and the /compare tool (inlined into the page, so it
// runs in the browser too). Plain JS with no imports.
//
// An entry is { slug, short, title, tagline, family, familyUrl, url, thinkers, data }
// where data is the theory's full MTTS JSON (public/data/*.json).

export const SLOT_COLORS = ["#f7b801", "#7ea6f2", "#e58fa5", "#5cc8b4", "#b39ddb"];
export const MAX_THEORIES = 5;

const escHtml = (v) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Stance buckets; keys match the hub question pages and the map's ?filter=.
const LIKELIHOOD = { Yes: "yes", Likely: "yes", Possible: "maybe", Conditional: "maybe", Uncertain: "uncertain", Unlikely: "no", No: "no", "Not needed": "notNeeded" };
const MEANING = { "Cosmic/Ultimate": "cosmic", "Humanistic only": "humanistic", Uncertain: "uncertain" };

export const QUESTION_ROWS = [
  { key: "ai", field: "AI_consciousness", label: "Can AI be conscious?", short: "AI consciousness", page: "/questions/ai-consciousness", buckets: LIKELIHOOD },
  { key: "survival", field: "survival_beyond_death", label: "Does consciousness survive death?", short: "life after death", page: "/questions/life-after-death", buckets: LIKELIHOOD },
  { key: "virtual", field: "virtual_immortality", label: "Could a mind be uploaded?", short: "mind uploading", page: "/questions/mind-uploading", buckets: LIKELIHOOD },
  { key: "meaning", field: "meaning_and_purpose", label: "Does it give life meaning?", short: "meaning and purpose", page: "/questions/meaning-and-purpose", buckets: MEANING },
];

const pick = (path) => (d) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), d);

// Rows of plain text, grouped. clamp: long prose that collapses to a few lines.
const SECTIONS = [
  {
    title: "The claim",
    rows: [
      { label: "In brief", get: pick("id_and_class.summary"), clamp: true },
      { label: "What consciousness is", get: pick("conceptual_ground.explanatory_identity_claim"), clamp: true },
    ],
  },
  { title: "Big questions", questions: true },
  {
    title: "Nature of mind",
    rows: [
      { label: "Ontology", get: pick("conceptual_ground.ontological_status") },
      { label: "Mind and body", get: pick("conceptual_ground.mind_body_relationship") },
      { label: "Fundamental or emergent", get: pick("conceptual_ground.primitive_or_emergent_status") },
      { label: "Qualia", get: pick("conceptual_ground.qualia_account"), clamp: true },
    ],
  },
  {
    title: "How it works",
    rows: [
      { label: "Mechanism", get: pick("mechanism_and_dynamics.distinctive_mechanism_or_principle"), clamp: true },
      { label: "Where it is", get: pick("mechanism_and_dynamics.location_and_distribution"), clamp: true },
      { label: "What it does", get: pick("mechanism_and_dynamics.causation_and_functional_role"), clamp: true },
    ],
  },
  {
    title: "Evidence and criticism",
    rows: [
      { label: "Testability", get: pick("empirics_and_critiques.testability_status") },
      { label: "Tests so far", get: pick("empirics_and_critiques.known_empirical_interventions_or_tests"), clamp: true },
      { label: "Criticisms", get: pick("empirics_and_critiques.criticisms_and_tensions"), clamp: true },
    ],
  },
];

export const bucketOf = (q, stance) => q.buckets[String(stance ?? "").trim()] || "";

// "Speculative (Justified Explanation: …)" -> value + muted reason.
const value = (text) => {
  const v = String(text ?? "").trim();
  if (!v) return `<span class="cmp-empty">Not stated</span>`;
  const m = /^([^(]*?)\s*\(Justified Explanation:\s*([\s\S]+)\)\s*$/.exec(v);
  if (m && m[1]) return `<b class="cmp-key">${escHtml(m[1])}</b><span class="cmp-why">${escHtml(m[2])}</span>`;
  return `<span class="cmp-text">${escHtml(v)}</span>`;
};

const slotStyle = (i) => `style="--slot:${SLOT_COLORS[i % SLOT_COLORS.length]}"`;
const tag = (e) => `<span class="cmp-tag">${escHtml(e.short)}</span>`;

const verdict = (q, entries) => {
  const buckets = entries.map((e) => bucketOf(q, e.data?.implications?.[q.field]?.stance));
  if (buckets.some((b) => !b)) return "";
  const same = buckets.every((b) => b === buckets[0]);
  return same
    ? `<span class="cmp-verdict cmp-agree">${entries.length === 2 ? "Both agree" : "All agree"}</span>`
    : `<span class="cmp-verdict cmp-split">${entries.length === 2 ? "Differ" : "Split"}</span>`;
};

const row = (label, cells, { clamp = false, extra = "", id = "" } = {}) =>
  `<div class="cmp-row${clamp ? " cmp-clampable" : ""}"${id ? ` data-row="${id}"` : ""}>
    <div class="cmp-label">${label}${extra}</div>${cells}
  </div>`;

// Column headers: one card per theory, sticky on wide screens.
const head = (entries, removable) =>
  `<div class="cmp-row cmp-head">
    <div class="cmp-label"></div>
    ${entries.map((e, i) => `<div class="cmp-col" ${slotStyle(i)}>
      <a class="cmp-family" href="${escHtml(e.familyUrl)}">${escHtml(e.family)}</a>
      <a class="cmp-title" href="${escHtml(e.url)}">${escHtml(e.title)}</a>
      ${e.thinkers?.length ? `<span class="cmp-people">${e.photos?.length ? `<span class="cmp-photos">${e.photos.map((p) => `<img class="cmp-photo" src="${escHtml(p.src)}" alt="" width="26" height="26" loading="lazy" decoding="async" title="${escHtml(p.title)}" />`).join("")}</span>` : ""}<span class="cmp-thinkers">${escHtml(e.thinkers.slice(0, 3).join(", "))}${e.thinkers.length > 3 ? " …" : ""}</span></span>` : ""}
      ${removable ? `<button type="button" class="cmp-remove" data-remove="${escHtml(e.slug)}" aria-label="Remove ${escHtml(e.short)}">×</button>` : ""}
    </div>`).join("")}
  </div>`;

export function renderComparison(entries, { removable = false } = {}) {
  const cells = (fn) =>
    entries.map((e, i) => `<div class="cmp-cell" ${slotStyle(i)}>${tag(e)}${fn(e)}</div>`).join("");
  const sections = SECTIONS.map((s) => {
    const rows = s.questions
      ? QUESTION_ROWS.map((q) =>
          row(`<a href="${q.page}">${escHtml(q.label)}</a>`, cells((e) => {
            const imp = e.data?.implications?.[q.field];
            if (!imp?.stance) return `<span class="cmp-empty">No position</span>`;
            return `<span class="cmp-stance seg-${bucketOf(q, imp.stance) || "uncertain"}">${escHtml(imp.stance)}</span><span class="cmp-text">${escHtml(imp.rationale)}</span>`;
          }), { clamp: true, extra: verdict(q, entries), id: q.key }))
      : s.rows.map((r) => row(escHtml(r.label), cells((e) => value(r.get(e.data))), { clamp: r.clamp }));
    return `<section class="cmp-section" aria-label="${escHtml(s.title)}"><h2 class="cmp-section-title">${escHtml(s.title)}</h2>${rows.join("")}</section>`;
  }).join("");
  const sources = row("Key sources", cells((e) => {
    const list = (e.data?.relations_and_sources?.sources_and_references || []).slice(0, 3);
    return list.length
      ? `<ul class="cmp-sources">${list.map((s) => `<li>${escHtml(s.title_with_names)}${s.year ? ` <span>(${escHtml(s.year)})</span>` : ""}</li>`).join("")}</ul>`
      : `<span class="cmp-empty">None listed</span>`;
  }));
  return `<div class="cmp-grid" style="--cols:${entries.length}">
    ${head(entries, removable)}
    ${sections}
    <section class="cmp-section" aria-label="Sources"><h2 class="cmp-section-title">Sources</h2>${sources}</section>
  </div>`;
}

// Where a set of theories agree and split on the big questions.
export function agreement(entries) {
  const agree = [], split = [];
  for (const q of QUESTION_ROWS) {
    const stances = entries.map((e) => e.data?.implications?.[q.field]?.stance);
    if (stances.some((s) => !s)) continue;
    const buckets = stances.map((s) => bucketOf(q, s));
    (buckets.every((b) => b === buckets[0]) ? agree : split).push({ q, stances });
  }
  return { agree, split };
}

// Lines up the expand toggles after render (browser only): a clampable row
// gets a "Show more" button when any of its cells is cut off.
export function wireClamps(root) {
  root.querySelectorAll(".cmp-clampable").forEach((r) => {
    r.classList.add("is-clamped");
    const cut = [...r.querySelectorAll(".cmp-cell")].some((c) => c.scrollHeight > c.clientHeight + 4);
    if (!cut) return r.classList.remove("is-clamped");
    const label = r.querySelector(".cmp-label");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cmp-more";
    btn.textContent = "Show more";
    btn.setAttribute("aria-expanded", "false");
    btn.addEventListener("click", () => {
      const open = r.classList.toggle("is-clamped") === false;
      btn.textContent = open ? "Show less" : "Show more";
      btn.setAttribute("aria-expanded", String(open));
    });
    label.appendChild(btn);
  });
}
