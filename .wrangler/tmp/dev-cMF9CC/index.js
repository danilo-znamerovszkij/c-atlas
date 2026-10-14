var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/shared/site.ts
var SITE_ORIGIN = "https://www.consciousnessatlas.com";
var DEFAULT_LOCALE = "en";
var SUPPORTED_LOCALES = [
  "en",
  "es",
  "fr",
  "de",
  "it",
  "nl",
  "pl",
  "pt-BR",
  "pt-PT",
  "ru",
  "uk",
  "tr",
  "ar",
  "he",
  "hi",
  "bn",
  "zh-CN",
  "zh-TW",
  "ja",
  "ko",
  "id",
  "ms",
  "vi",
  "th"
];
var AVAILABLE_LOCALES = [
  "en",
  "es",
  "fr",
  "de",
  "uk",
  "hi",
  "ms",
  "it",
  "nl",
  "pl",
  "ja",
  "pt-BR",
  "pt-PT",
  "tr",
  "ru",
  "zh-CN",
  "zh-TW",
  "ar",
  "id",
  "he",
  "bn",
  "ko"
];
var RTL_LOCALES = /* @__PURE__ */ new Set(["ar", "he"]);
var SUPPORTED_LOCALE_SET = new Set(SUPPORTED_LOCALES);
function isSupportedLocale(value) {
  return SUPPORTED_LOCALE_SET.has(value);
}
__name(isSupportedLocale, "isSupportedLocale");
function parseLocaleFromPath(path) {
  const segments = path.split("/").filter((segment) => segment.length > 0);
  const candidate = segments[0];
  if (candidate && candidate !== DEFAULT_LOCALE && isSupportedLocale(candidate)) {
    const rest = "/" + segments.slice(1).join("/");
    return {
      locale: candidate,
      pathWithoutLocale: rest === "/" ? "/" : rest.replace(/\/$/, "") || "/"
    };
  }
  return { locale: DEFAULT_LOCALE, pathWithoutLocale: path === "" ? "/" : path };
}
__name(parseLocaleFromPath, "parseLocaleFromPath");

// worker/index.ts
var AVAILABLE_LOCALE_SET = new Set(AVAILABLE_LOCALES);
var SITE_HOST = new URL(SITE_ORIGIN).host;
var HTML_CACHE = "public, max-age=0, must-revalidate";
var OG_LOCALE_MAP = {
  en: "en_US",
  es: "es_ES",
  fr: "fr_FR",
  de: "de_DE",
  it: "it_IT",
  nl: "nl_NL",
  pl: "pl_PL",
  "pt-BR": "pt_BR",
  "pt-PT": "pt_PT",
  ru: "ru_RU",
  uk: "uk_UA",
  tr: "tr_TR",
  ar: "ar_AR",
  he: "he_IL",
  hi: "hi_IN",
  bn: "bn_IN",
  "zh-CN": "zh_CN",
  "zh-TW": "zh_TW",
  ja: "ja_JP",
  ko: "ko_KR",
  id: "id_ID",
  ms: "ms_MY",
  vi: "vi_VN",
  th: "th_TH"
};
var escapeHtml = /* @__PURE__ */ __name((value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"), "escapeHtml");
function hreflangBlock(pathWithoutLocale) {
  const links = AVAILABLE_LOCALES.map((code) => {
    const href = code === DEFAULT_LOCALE ? `${SITE_ORIGIN}${pathWithoutLocale}` : `${SITE_ORIGIN}/${code}${pathWithoutLocale === "/" ? "" : pathWithoutLocale}`;
    return `<link rel="alternate" hreflang="${code}" href="${href}" />`;
  });
  links.push(`<link rel="alternate" hreflang="x-default" href="${SITE_ORIGIN}${pathWithoutLocale}" />`);
  return links.join("\n    ");
}
__name(hreflangBlock, "hreflangBlock");
async function renderPage(request, env, url) {
  let path = url.pathname;
  if (path !== "/" && path.endsWith("/")) path = path.slice(0, -1);
  if (path === `/${DEFAULT_LOCALE}` || path.startsWith(`/${DEFAULT_LOCALE}/`)) {
    return Response.redirect(`${SITE_ORIGIN}${path.slice(DEFAULT_LOCALE.length + 1) || "/"}`, 308);
  }
  const isPaper = path === "/paper";
  const { locale, pathWithoutLocale } = parseLocaleFromPath(path);
  if (!isPaper && locale !== DEFAULT_LOCALE && !AVAILABLE_LOCALE_SET.has(locale)) {
    return Response.redirect(`${SITE_ORIGIN}${pathWithoutLocale}`, 308);
  }
  const shell = await env.ASSETS.fetch(new Request(new URL(isPaper ? "/paper" : "/", url), request));
  if (!shell.ok || !(shell.headers.get("content-type") || "").includes("text/html")) return shell;
  const canonical = path === "/" ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${path}`;
  let html = await shell.text();
  html = html.replace(/(<link[^>]*rel="canonical"[^>]*href=")[^"]*(")/, `$1${canonical}$2`);
  if (!isPaper) {
    html = html.replace(/(<link[^>]*rel="canonical"[^>]*\/?>)/, `$1
    ${hreflangBlock(pathWithoutLocale)}`);
    html = html.replace(/<html lang="en">/, `<html lang="${locale}"${RTL_LOCALES.has(locale) ? ' dir="rtl"' : ""}>`);
    if (locale !== DEFAULT_LOCALE) {
      const seoResponse = await env.ASSETS.fetch(new URL(`/i18n/seo/${locale}.json`, url));
      const seo = seoResponse.ok ? await seoResponse.json() : {};
      if (seo.title) html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(seo.title)}</title>`);
      if (seo.description) {
        html = html.replace(/(<meta\s+name="description"\s+content=")[^"]*(")/, `$1${escapeHtml(seo.description)}$2`);
      }
      if (seo.ogTitle) {
        html = html.replace(/(<meta\s+property="og:title"\s+content=")[^"]*(")/, `$1${escapeHtml(seo.ogTitle)}$2`);
        html = html.replace(/(<meta\s+name="twitter:title"\s+content=")[^"]*(")/, `$1${escapeHtml(seo.ogTitle)}$2`);
      }
      if (seo.ogDescription) {
        html = html.replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/, `$1${escapeHtml(seo.ogDescription)}$2`);
        html = html.replace(/(<meta\s+name="twitter:description"\s+content=")[^"]*(")/, `$1${escapeHtml(seo.ogDescription)}$2`);
      }
      html = html.replace(/(<meta\s+property="og:locale"\s+content=")[^"]*(")/, `$1${OG_LOCALE_MAP[locale]}$2`);
      html = html.replace(/"inLanguage":\s*"en"/, `"inLanguage": "${locale}"`);
    }
  }
  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": HTML_CACHE }
  });
}
__name(renderPage, "renderPage");
var json = /* @__PURE__ */ __name((body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }), "json");
async function handleSubmit(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const { name, email, message } = body;
  if (!message || !message.trim()) return json({ error: "Message is required" }, 400);
  if (!env.TG_BOT_TOKEN || !env.TG_CHAT_ID) {
    console.log("Form submission received:", { name: name || "Not provided", email: email || "Not provided", message });
    return json({ success: true, message: "Form submitted successfully" });
  }
  const emojis = ["\u{1F9E0}", "\u{1F4AD}", "\u{1F914}", "\u{1F4A1}", "\u{1F4A5}", "\u{1F50D}", "\u{1F526}", "\u{1F52C}", "\u{1F52D}", "\u{1F52E}", "\u{1F525}", "\u{1F512}", "\u{1F516}", "\u{1F517}"];
  const emoji = emojis[Math.floor(Math.random() * emojis.length)];
  const text = `
      ${emoji} \u{1F4E8} ${message}
      ${name ? `From: ${name}` : ""}${email ? `(${email})` : ""}
      `;
  const telegram = await fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: env.TG_CHAT_ID, text, parse_mode: "Markdown" })
  });
  if (!telegram.ok) {
    console.error("Telegram API error:", await telegram.text());
    return json({ error: "Failed to send notification" }, 500);
  }
  return json({ success: true, message: "Form submitted successfully" });
}
__name(handleSubmit, "handleSubmit");
var worker_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.host === `${SITE_HOST.replace(/^www\./, "")}`) {
      return Response.redirect(`${SITE_ORIGIN}${url.pathname}${url.search}`, 301);
    }
    if (url.pathname === "/api/submit") return handleSubmit(request, env);
    if (url.pathname.startsWith("/api/")) return json({ error: "Not found" }, 404);
    return renderPage(request, env, url);
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-97d2x7/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-97d2x7/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
