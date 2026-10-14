// Tell IndexNow search engines (Bing, which also feeds ChatGPT search and
// Copilot, plus Yandex, Seznam, Naver) about every URL in the sitemaps.
// Run after a deploy: npm run indexnow. The key file is public/e0922ad1a2b80ec45d103d019e1e01fd.txt.
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const KEY = "e0922ad1a2b80ec45d103d019e1e01fd";
const HOST = "www.consciousnessatlas.com";
const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

const urls = [...new Set(readdirSync(publicDir)
  .filter((f) => /^sitemap-.+\.xml$/.test(f))
  .flatMap((f) => [...readFileSync(join(publicDir, f), "utf-8").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])))];

// IndexNow takes up to 10,000 URLs per request.
for (let i = 0; i < urls.length; i += 10000) {
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: urls.slice(i, i + 10000) }),
  });
  console.log(`IndexNow: ${Math.min(i + 10000, urls.length)}/${urls.length} URLs -> ${res.status} ${res.statusText}`);
}
