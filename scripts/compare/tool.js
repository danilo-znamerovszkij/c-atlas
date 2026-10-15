// /compare: pick up to five theories and read them side by side. Inlined into
// the page after render.js (renderComparison, wireClamps, MAX_THEORIES,
// SLOT_COLORS are in scope). State lives in the URL: /compare?t=iit,seth
(() => {
  const INDEX = JSON.parse(document.getElementById("cmp-index").textContent);
  const BUILD = document.getElementById("cmp-index").dataset.build;
  const bySlug = new Map(INDEX.map((e) => [e.s, e]));
  const picker = document.getElementById("cmp-picker");
  const chips = document.getElementById("cmp-chips");
  const input = document.getElementById("cmp-input");
  const list = document.getElementById("cmp-options");
  const status = document.getElementById("cmp-status");
  const results = document.getElementById("cmp-results");
  const start = document.getElementById("cmp-start");
  const actions = document.getElementById("cmp-actions");
  const copyBtn = document.getElementById("cmp-copy");
  const clearBtn = document.getElementById("cmp-clear");

  const track = (element, props) => window.atlasTrack?.("Click", { element, ...props });
  const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const fold = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const haystack = new Map(INDEX.map((e) => [e.s, fold([e.t, e.n, e.a, e.c, ...(e.h || [])].join(" | ")).replace(/[’']/g, "")]));

  let selected = (new URLSearchParams(location.search).get("t") || "")
    .split(",").map((s) => s.trim()).filter((s, i, all) => bySlug.has(s) && all.indexOf(s) === i).slice(0, MAX_THEORIES);
  let options = [];
  let active = -1;
  const cache = new Map();
  let renderToken = 0;

  const load = (slug) => {
    if (!cache.has(slug)) {
      const e = bySlug.get(slug);
      cache.set(slug, fetch(`/data/${e.f}.json?v=${BUILD}`).then((r) => {
        if (!r.ok) throw new Error(r.status);
        return r.json();
      }));
    }
    return cache.get(slug);
  };

  const entryFor = (slug, data) => {
    const e = bySlug.get(slug);
    return { slug, short: e.n, title: e.t, family: e.c, familyUrl: e.cu, url: e.u, thinkers: e.h, photos: e.ph, data };
  };

  // ---- search ----------------------------------------------------------------
  // Every word of the query must appear (any order); title/name/alias
  // prefixes rank first, then word starts, then popularity.
  const search = (query) => {
    const q = fold(query.trim()).replace(/[’']/g, "");
    const pool = INDEX.filter((e) => !selected.includes(e.s));
    if (!q) return pool.slice().sort((a, b) => a.r - b.r).slice(0, 8);
    const words = q.split(/\s+/);
    const wordStart = new RegExp("(^|[^a-z0-9])" + words[0].replace(/[.*+?^$(){}|[\]\\]/g, "\\$&"));
    const scored = [];
    for (const e of pool) {
      const text = haystack.get(e.s);
      if (!words.every((w) => text.includes(w))) continue;
      const title = fold(e.t).replace(/[’']/g, ""), short = fold(e.n).replace(/[’']/g, "");
      const score = title.startsWith(q) || short.startsWith(q) || fold(e.a).split("|").includes(q) ? 0
        : wordStart.test(text) ? 1 : 2;
      scored.push([score, e.r, e]);
    }
    return scored.sort((a, b) => a[0] - b[0] || a[1] - b[1]).slice(0, 8).map((s) => s[2]);
  };

  const highlight = (text, query) => {
    const q = fold(query.trim());
    const at = q ? fold(text).indexOf(q) : -1;
    if (at < 0) return esc(text);
    return `${esc(text.slice(0, at))}<mark>${esc(text.slice(at, at + q.length))}</mark>${esc(text.slice(at + q.length))}`;
  };

  const openList = () => {
    if (selected.length >= MAX_THEORIES) return closeList();
    options = search(input.value);
    active = options.length ? 0 : -1;
    list.innerHTML = options.length
      ? `${input.value.trim() ? "" : `<li class="cmp-opt-head" role="presentation">Most viewed</li>`}${options.map((e, i) => `
        <li class="cmp-opt" role="option" id="cmp-opt-${i}" data-slug="${esc(e.s)}" aria-selected="${i === active}">
          <span class="cmp-opt-title">${highlight(e.t, input.value)}</span>
          <span class="cmp-opt-meta">${esc(e.c)}${e.h?.length ? ` · ${esc(e.h.slice(0, 2).join(", "))}` : ""}</span>
        </li>`).join("")}`
      : `<li class="cmp-opt-empty" role="presentation">No theory matches “${esc(input.value.trim())}”</li>`;
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
    syncActive();
  };

  const closeList = () => {
    list.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  };

  const syncActive = () => {
    list.querySelectorAll(".cmp-opt").forEach((li, i) => li.setAttribute("aria-selected", String(i === active)));
    if (active >= 0) {
      input.setAttribute("aria-activedescendant", `cmp-opt-${active}`);
      list.querySelector(`#cmp-opt-${active}`)?.scrollIntoView({ block: "nearest" });
    } else input.removeAttribute("aria-activedescendant");
  };

  // ---- state -----------------------------------------------------------------
  const add = (slug, via = "search") => {
    if (!bySlug.has(slug) || selected.includes(slug) || selected.length >= MAX_THEORIES) return;
    selected = [...selected, slug];
    track("compare_add", { theory: slug, via, count: selected.length });
    input.value = "";
    update();
    if (selected.length < MAX_THEORIES) openList();
    else closeList();
  };

  const remove = (slug) => {
    selected = selected.filter((s) => s !== slug);
    track("compare_remove", { theory: slug, count: selected.length });
    update();
  };

  const syncUrl = () => {
    const url = selected.length ? `/compare?t=${selected.join(",")}` : "/compare";
    if (location.pathname + location.search !== url) history.replaceState(null, "", url);
  };

  const renderChips = () => {
    chips.innerHTML = selected.map((slug, i) => {
      const e = bySlug.get(slug);
      return `<li class="cmp-chip" style="--slot:${SLOT_COLORS[i]}">
        <span>${esc(e.n)}</span>
        <button type="button" data-remove="${esc(slug)}" aria-label="Remove ${esc(e.n)}">×</button>
      </li>`;
    }).join("");
    const full = selected.length >= MAX_THEORIES;
    input.disabled = full;
    input.placeholder = full ? "Five is the limit. Remove one to add another."
      : selected.length ? "Add another theory…" : "Search 450+ theories, e.g. IIT, Kastrup, illusionism…";
    picker.classList.toggle("is-full", full);
    actions.hidden = selected.length < 2;
  };

  // A lone pick: suggest theories from the same family to set it against.
  const renderHint = () => {
    const e = bySlug.get(selected[0]);
    const near = INDEX.filter((o) => o.c === e.c && o.s !== e.s).sort((a, b) => a.r - b.r).slice(0, 4);
    const far = INDEX.filter((o) => o.c !== e.c).sort((a, b) => a.r - b.r).slice(0, 3);
    results.innerHTML = `<div class="cmp-hint">
      <p>Add at least one more theory to compare with <b>${esc(e.t)}</b>.</p>
      <div class="cmp-suggest">
        <span>From ${esc(e.c)}</span>${near.map((o) => `<button type="button" data-add="${esc(o.s)}">+ ${esc(o.n)}</button>`).join("")}
      </div>
      <div class="cmp-suggest">
        <span>From other families</span>${far.map((o) => `<button type="button" data-add="${esc(o.s)}">+ ${esc(o.n)}</button>`).join("")}
      </div>
    </div>`;
  };

  const update = async () => {
    renderChips();
    syncUrl();
    start.hidden = selected.length > 0;
    const token = ++renderToken;
    if (selected.length === 0) return (results.innerHTML = "");
    if (selected.length === 1) return renderHint();
    results.setAttribute("aria-busy", "true");
    status.textContent = "Loading…";
    try {
      const data = await Promise.all(selected.map(load));
      if (token !== renderToken) return;
      results.innerHTML = renderComparison(selected.map((s, i) => entryFor(s, data[i])), { removable: true });
      window.atlasTrack?.("Compare View", { theories: selected.join(","), count: selected.length });
      wireClamps(results);
      const names = selected.map((s) => bySlug.get(s).n);
      status.textContent = `Comparing ${names.join(", ")}`;
      document.title = `${names.join(" vs ")} | Compare theories | Consciousness Atlas`;
    } catch {
      if (token !== renderToken) return;
      results.innerHTML = `<p class="cmp-hint">Couldn’t load one of these theories. Check your connection and try again.</p>`;
      status.textContent = "";
    } finally {
      if (token === renderToken) results.removeAttribute("aria-busy");
    }
  };

  // ---- events ----------------------------------------------------------------
  input.addEventListener("focus", openList);
  input.addEventListener("input", openList);
  input.addEventListener("keydown", (ev) => {
    if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
      ev.preventDefault();
      if (list.hidden) return openList();
      if (!options.length) return;
      active = (active + (ev.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
      syncActive();
    } else if (ev.key === "Enter") {
      if (!list.hidden && options[active]) {
        ev.preventDefault();
        add(options[active].s);
      }
    } else if (ev.key === "Escape") {
      if (!list.hidden) {
        ev.preventDefault();
        closeList();
      }
    } else if (ev.key === "Backspace" && !input.value && selected.length) {
      remove(selected[selected.length - 1]);
    }
  });
  // mousedown, not click: picking an option must not blur the input first.
  list.addEventListener("mousedown", (ev) => {
    const li = ev.target.closest(".cmp-opt");
    if (!li) return;
    ev.preventDefault();
    add(li.dataset.slug);
  });
  document.addEventListener("pointerdown", (ev) => {
    if (!picker.contains(ev.target)) closeList();
  });
  picker.addEventListener("click", (ev) => {
    if (ev.target === picker || ev.target === chips) input.focus();
  });
  document.addEventListener("click", (ev) => {
    const target = ev.target.closest("[data-remove],[data-add],[data-pair]");
    if (!target) return;
    if (target.dataset.remove) remove(target.dataset.remove);
    else if (target.dataset.add) add(target.dataset.add, "suggestion");
    else {
      selected = target.dataset.pair.split(",").filter((s) => bySlug.has(s));
      track("compare_preset", { theories: selected.join(",") });
      update();
      results.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    }
  });
  clearBtn.addEventListener("click", () => {
    track("compare_clear", { count: selected.length });
    selected = [];
    update();
    input.focus();
  });
  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      track("compare_copy_link", { count: selected.length });
      copyBtn.dataset.state = "done";
      copyBtn.querySelector("span").textContent = "Link copied";
    } catch {
      copyBtn.querySelector("span").textContent = "Copy failed";
    }
    clearTimeout(copyBtn.timer);
    copyBtn.timer = setTimeout(() => {
      delete copyBtn.dataset.state;
      copyBtn.querySelector("span").textContent = "Copy link";
    }, 1800);
  });
  // Keep the sticky column headers under the site header.
  const header = document.querySelector(".hub-header");
  const setHeaderHeight = () => document.documentElement.style.setProperty("--head-h", `${header.offsetHeight}px`);
  setHeaderHeight();
  addEventListener("resize", setHeaderHeight);

  update();
})();
