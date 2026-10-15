// Turn the fetched originals (.cache/portraits, see fetch.mjs) into square,
// face-centred, black-and-white 160px WebP portraits in public/portraits/, and
// write their credits to src/content/portraits.json. Faces come from
// faces.swift (Apple Vision); without one, crop the top-centre square.
// Run: node scripts/portraits/crop.mjs   (macOS, needs ImageMagick)
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { execFileSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const cache = join(root, ".cache", "portraits");
const outDir = join(root, "public", "portraits");
mkdirSync(outDir, { recursive: true });
const meta = JSON.parse(readFileSync(join(cache, "meta.json"), "utf-8"));
const faces = JSON.parse(execFileSync("swift", [join(root, "scripts", "portraits", "faces.swift"), ...Object.values(meta).map((m) => join(cache, m.local))], { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }));

const credits = {};
for (const [name, m] of Object.entries(meta)) {
  const src = join(cache, m.local);
  const [W, H] = execFileSync("magick", ["identify", "-format", "%w %h", `${src}[0]`], { encoding: "utf-8" }).trim().split(" ").map(Number);
  let side, x, y;
  const f = faces[m.local];
  if (f) {
    const [fx, fy, fw, fh] = f;
    side = Math.min(W, H, Math.round(Math.max(fw, fh) * 2.1));
    x = Math.round(fx + fw / 2 - side / 2);
    y = Math.round(fy + fh / 2 + fh * 0.08 - side / 2); // a little low, to keep the chin
  } else {
    side = Math.min(W, H);
    x = Math.round((W - side) / 2);
    y = Math.round((H - side) * 0.15);
  }
  x = Math.max(0, Math.min(W - side, x));
  y = Math.max(0, Math.min(H - side, y));
  const file = `${name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.webp`;
  execFileSync("magick", [`${src}[0]`, "-crop", `${side}x${side}+${x}+${y}`, "+repage", "-resize", "160x160", "-colorspace", "Gray", "-sigmoidal-contrast", "3x50%", "-strip", "-quality", "82", join(outDir, file)]);
  credits[name] = { src: `/portraits/${file}`, author: m.author, license: m.license, licenseUrl: m.licenseUrl, source: m.source };
}
writeFileSync(join(root, "src", "content", "portraits.json"), JSON.stringify({
  _note: "Thinker portraits (public/portraits) from Wikimedia Commons, free licences only. Keyed by the name used in theory entries. Regenerate: node scripts/portraits/fetch.mjs && node scripts/portraits/crop.mjs",
  portraits: credits,
}, null, 2) + "\n");
console.log(`${Object.keys(credits).length} portraits -> public/portraits`);
