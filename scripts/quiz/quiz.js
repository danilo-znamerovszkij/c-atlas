// /quiz: nine questions, matched against every theory's scores. Inlined into
// the page by scripts/pages.js together with the questions and theory data.
// Answers live in the URL (?r=…) so a result can be shared.
(() => {
  const DATA = JSON.parse(document.getElementById("quiz-data").textContent);
  const { questions: QUESTIONS, theories: THEORIES, families: FAMILIES } = DATA;
  const root = document.getElementById("quiz");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  // answers[i] = option index, or -1 for skipped
  let answers = [];
  let step = -1;

  // ---- matching -----------------------------------------------------------------
  // Every answer carries a value on its question's axis (0-4). Distance is a
  // weighted RMS over the questions both sides answered; match = 1 - d/4.
  const theoryValue = (t, q) => (q.axis ? t.v[q.axis] : t.st[q.key]);
  const gap = (q, a, b) => {
    if (a == null || b == null) return null;
    if (typeof a === "string" || typeof b === "string") return a === b ? 0 : 3; // "notNeeded"
    return Math.abs(a - b);
  };
  const match = (t) => {
    let sum = 0, weight = 0;
    const agree = [], differ = [];
    QUESTIONS.forEach((q, i) => {
      if (answers[i] == null || answers[i] < 0) return;
      const mine = q.options[answers[i]].value;
      const d = gap(q, mine, theoryValue(t, q));
      if (d == null) return;
      sum += q.weight * d * d;
      weight += q.weight;
      if (d <= 0.5) agree.push({ q, value: mine });
      else if (d >= 2) differ.push(q);
    });
    if (!weight) return { score: 0, agree, differ };
    return { score: Math.max(0, 1 - Math.sqrt(sum / weight) / 4), agree, differ };
  };

  const encode = () => answers.map((a) => (a < 0 ? "x" : String(a))).join("");
  const decode = (s) => {
    if (!s || s.length !== QUESTIONS.length) return null;
    const out = [...s].map((c, i) => (c === "x" ? -1 : +c));
    return out.every((a, i) => a === -1 || (Number.isInteger(a) && a >= 0 && a < QUESTIONS[i].options.length)) ? out : null;
  };

  // ---- screens ---------------------------------------------------------------------
  const swap = (html, focusSel) => {
    root.innerHTML = html;
    root.querySelector(".quiz-screen")?.classList.add("is-in");
    const target = root.querySelector(focusSel || "h2");
    target?.focus({ preventScroll: true });
    // Keep the current screen in view (on phones the intro text pushes it down).
    const top = root.getBoundingClientRect().top;
    if (step >= 0 && (top < 0 || top > innerHeight * 0.35)) root.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  const intro = () => {
    step = -1;
    swap(`<div class="quiz-screen quiz-intro">
      <p class="quiz-meta">${QUESTIONS.length} questions · about two minutes</p>
      <button type="button" class="quiz-start" data-act="start">Start the quiz</button>
      <p class="quiz-fine">No sign-up. Your answers stay in your browser and in the link you share.</p>
    </div>`, ".quiz-start");
  };

  const question = (i) => {
    step = i;
    const q = QUESTIONS[i];
    const chosen = answers[i];
    swap(`<div class="quiz-screen" aria-live="polite">
      <div class="quiz-progress" role="progressbar" aria-valuemin="1" aria-valuemax="${QUESTIONS.length}" aria-valuenow="${i + 1}" aria-label="Question ${i + 1} of ${QUESTIONS.length}">
        <span style="transform:scaleX(${(i + 1) / QUESTIONS.length})"></span>
      </div>
      <p class="quiz-count">Question ${i + 1} of ${QUESTIONS.length}</p>
      <h2 tabindex="-1">${esc(q.text)}</h2>
      ${q.help ? `<p class="quiz-help">${esc(q.help)}</p>` : ""}
      <div class="quiz-options" role="group" aria-label="Answers">
        ${q.options.map((o, j) => `<button type="button" class="quiz-option${chosen === j ? " is-chosen" : ""}" data-pick="${j}" aria-pressed="${chosen === j}">
          <span class="quiz-key" aria-hidden="true">${j + 1}</span><span>${esc(o.label)}</span>
        </button>`).join("")}
      </div>
      <div class="quiz-nav">
        <button type="button" class="quiz-back" data-act="back">${i === 0 ? "Back to start" : "Back"}</button>
        <button type="button" class="quiz-skip" data-act="skip">Skip this question</button>
      </div>
    </div>`, "h2");
  };

  const pick = (j) => {
    answers[step] = j;
    root.querySelectorAll(".quiz-option").forEach((b, k) => {
      b.classList.toggle("is-chosen", k === j);
      b.setAttribute("aria-pressed", String(k === j));
    });
    // Let the chosen state register before moving on.
    setTimeout(next, reduce ? 0 : 220);
  };

  const next = () => (step + 1 < QUESTIONS.length ? question(step + 1) : results());

  const pct = (x) => `${Math.round(x * 100)}%`;
  // Short label of the option closest to a value ("Likely" 3.5 -> the 4 option).
  const said = (q, value) => {
    if (value == null) return "";
    if (typeof value === "string") return q.options.find((o) => o.value === value)?.short || "";
    const nums = q.options.filter((o) => typeof o.value === "number");
    return nums.reduce((best, o) => (Math.abs(o.value - value) < Math.abs(best.value - value) ? o : best), nums[0]).short;
  };

  const results = () => {
    step = QUESTIONS.length;
    history.replaceState(null, "", `/quiz?r=${encode()}`);
    const answered = answers.filter((a) => a >= 0).length;
    if (answered < 3) {
      return swap(`<div class="quiz-screen quiz-intro">
        <h2 tabindex="-1">Answer a few more</h2>
        <p class="quiz-help">You skipped most questions, so there isn't enough to match on. Answer at least three.</p>
        <button type="button" class="quiz-start" data-act="restart">Start again</button>
      </div>`);
    }
    const ranked = THEORIES.map((t) => ({ t, ...match(t) })).sort((a, b) => b.score - a.score);
    const top = ranked.slice(0, 5);
    // Lead with what sets each match apart: agreements fewest of the five share.
    const shared = new Map();
    top.forEach((r) => r.agree.forEach((a) => shared.set(a.q, (shared.get(a.q) || 0) + 1)));
    top.forEach((r) => r.agree.sort((x, y) => shared.get(x.q) - shared.get(y.q) || y.q.weight - x.q.weight));
    // Families: mean match of each family's three closest theories.
    const fam = Object.entries(FAMILIES).map(([key, f]) => {
      const best = ranked.filter((r) => r.t.c === key).slice(0, 3);
      return { ...f, score: best.reduce((s, r) => s + r.score, 0) / (best.length || 1) };
    }).sort((a, b) => b.score - a.score);
    const axes = QUESTIONS.filter((q) => q.axis);
    const lean = fam[0];
    const share = {
      url: `${DATA.site}/quiz?r=${encode()}`,
      title: "Which theory of consciousness fits you?",
      text: `I lean toward ${lean.name}, and my closest theory of consciousness is ${top[0].t.t}. Which one fits you?`,
      image: `${DATA.site}/banner.jpg`,
    };
    swap(`<div class="quiz-screen quiz-results">
      <p class="quiz-count">Your result</p>
      <h2 tabindex="-1">You lean toward <a href="${esc(lean.url)}">${esc(lean.name)}</a></h2>
      <p class="quiz-help">${esc(lean.summary)}</p>

      <section class="quiz-share" id="quiz-share" aria-labelledby="quiz-share-title" tabindex="-1">
        <div class="quiz-share-copy">
          <b id="quiz-share-title">Share your result</b>
          <span>${esc(share.text)}</span>
        </div>
        ${shareLinksHtml(share, { labels: false })}
      </section>

      <ol class="quiz-top">
        ${top.map((r, k) => `<li class="quiz-match${k === 0 ? " is-first" : ""}">
          <div class="quiz-match-head">
            <span class="quiz-rank">${k + 1}</span>
            <div>
              <a class="quiz-family" href="${esc(FAMILIES[r.t.c].url)}">${esc(FAMILIES[r.t.c].name)}</a>
              <a class="quiz-title" href="${esc(r.t.u)}">${esc(r.t.t)}</a>
              ${r.t.h.length ? `<span class="quiz-thinkers">${esc(r.t.h.join(", "))}</span>` : ""}
            </div>
            <span class="quiz-score" title="How close this theory is to your answers">${pct(r.score)}</span>
          </div>
          ${r.t.tg ? `<p class="quiz-tagline">${esc(r.t.tg)}</p>` : ""}
          <ul class="quiz-why">
            ${r.agree.slice(0, 3).map((a) => `<li class="is-agree">${esc(a.q.options.find((o) => o.value === a.value).agree)}</li>`).join("")}
            ${r.differ.slice(0, 1).map((q) => `<li class="is-differ">${esc(q.topic)}: you said ${esc(said(q, q.options[answers[QUESTIONS.indexOf(q)]].value))}, it says ${esc(said(q, theoryValue(r.t, q)) || "something else")}</li>`).join("")}
          </ul>
        </li>`).join("")}
      </ol>

      <div class="quiz-actions">
        <a class="quiz-primary" href="/compare?t=${top.slice(0, 3).map((r) => r.t.s).join(",")}">Compare your top 3 side by side</a>
        <button type="button" class="quiz-primary quiz-share-cta" data-act="share-out">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5 15.4 17.5M15.4 6.5 8.6 10.5"/></svg>
          Share your result
        </button>
        <button type="button" class="quiz-secondary" data-act="share"><span>Copy link to your result</span></button>
        <button type="button" class="quiz-secondary" data-act="restart">Retake</button>
      </div>

      <section class="quiz-profile" aria-label="Your answers on each axis">
        <h3>Where you stand</h3>
        ${axes.map((q) => {
          const a = answers[QUESTIONS.indexOf(q)];
          const v = a >= 0 ? q.options[a].value : null;
          const theirs = top[0].t.v[q.axis];
          return `<div class="quiz-axis">
            <span class="quiz-axis-name">${esc(q.topic)}</span>
            <div class="quiz-axis-line">
              <span class="quiz-axis-end">${esc(q.ends[0])}</span>
              <span class="quiz-axis-track">
                ${theirs != null ? `<i class="quiz-dot is-theirs" style="left:${theirs * 25}%" title="${esc(top[0].t.t)}"></i>` : ""}
                ${v != null ? `<i class="quiz-dot is-you" style="left:${v * 25}%" title="You"></i>` : ""}
              </span>
              <span class="quiz-axis-end">${esc(q.ends[1])}</span>
            </div>
          </div>`;
        }).join("")}
        <p class="quiz-legend"><i class="quiz-dot is-you"></i> You <i class="quiz-dot is-theirs"></i> ${esc(top[0].t.t)}${answers.some((a) => a < 0) ? " · Skipped questions have no marker" : ""}</p>
      </section>

      <section class="quiz-families" aria-label="Families ranked">
        <h3>All eleven families</h3>
        <ol>${fam.map((f) => `<li><a href="${esc(f.url)}">${esc(f.name)}</a><span class="quiz-bar"><span style="transform:scaleX(${f.score.toFixed(3)})"></span></span><b>${pct(f.score)}</b></li>`).join("")}</ol>
      </section>
    </div>`);
  };

  // ---- events -------------------------------------------------------------------------
  root.addEventListener("click", async (ev) => {
    const t = ev.target.closest("[data-pick],[data-act]");
    if (!t) return;
    if (t.dataset.pick) return pick(+t.dataset.pick);
    const act = t.dataset.act;
    if (act === "start" || act === "restart") {
      answers = [];
      history.replaceState(null, "", "/quiz");
      question(0);
    } else if (act === "back") step > 0 ? question(step - 1) : intro();
    else if (act === "skip") {
      answers[step] = -1;
      next();
    } else if (act === "share-out") {
      // Phones: the system share sheet. Elsewhere: the share links at the top.
      const box = document.getElementById("quiz-share");
      const text = box.querySelector(".quiz-share-copy span").textContent;
      if (navigator.share && matchMedia("(pointer: coarse)").matches) {
        navigator.share({ title: document.title, text, url: location.href.replace(location.origin, DATA.site) }).catch(() => {});
      } else {
        box.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
        box.focus({ preventScroll: true });
        box.classList.remove("is-flash");
        void box.offsetWidth;
        box.classList.add("is-flash");
      }
    } else if (act === "share") {
      const label = t.querySelector("span");
      try {
        await navigator.clipboard.writeText(location.href);
        label.textContent = "Link copied";
      } catch {
        label.textContent = "Copy failed";
      }
      setTimeout(() => (label.textContent = "Copy link to your result"), 1800);
    }
  });
  document.addEventListener("keydown", (ev) => {
    if (step < 0 || step >= QUESTIONS.length || ev.metaKey || ev.ctrlKey || ev.altKey) return;
    const n = Number(ev.key);
    if (n >= 1 && n <= QUESTIONS[step].options.length) {
      ev.preventDefault();
      pick(n - 1);
    } else if (ev.key === "Backspace" || ev.key === "ArrowLeft") {
      ev.preventDefault();
      step > 0 ? question(step - 1) : intro();
    }
  });

  const shared = decode(new URLSearchParams(location.search).get("r"));
  if (shared) {
    answers = shared;
    results();
  } else intro();
})();
