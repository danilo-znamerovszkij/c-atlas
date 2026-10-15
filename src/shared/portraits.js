// Thinker portraits (src/content/portraits.json, public/portraits) by name.
// Shared by the app, the Worker and scripts/pages.js. Plain JS, no imports.

// "J.P. Moreland" == "J. P. Moreland"; "David Chalmers (Classifier)" == "David Chalmers".
export const portraitKey = (name) =>
  String(name).replace(/\(.*?\)/g, "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");

export function portraitIndex(portraits) {
  const index = new Map();
  for (const [name, p] of Object.entries(portraits)) index.set(portraitKey(name), { name, ...p });
  return index;
}

const attr = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

// Hover text: who it is, and the photo credit the licence asks for.
export const portraitTitle = (p) => `${p.name}. Photo: ${p.author || "Wikimedia Commons"}, ${p.license}`;

export const portraitImg = (p, size, cls = "thinker-photo") =>
  `<img class="${cls}" src="${attr(p.src)}" alt="" width="${size}" height="${size}" loading="lazy" decoding="async" title="${attr(portraitTitle(p))}" />`;

// Names with a circle portrait where there is one; null when nobody has one.
export function thinkersHtml(names, index, size = 42) {
  const found = names.map((n) => index.get(portraitKey(n)));
  if (!found.some(Boolean)) return null;
  return names.map((n, i) => `<span class="thinker">${found[i] ? portraitImg(found[i], size) : ""}<span>${attr(n)}</span></span>`).join("");
}
