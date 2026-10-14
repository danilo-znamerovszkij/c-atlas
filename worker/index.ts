// Cloudflare Worker for consciousnessatlas.com (replaces Vercel's middleware.ts
// and api/submit.ts). Static files are served straight from the assets binding
// (dist/, see wrangler.jsonc); this code only runs for extension-less paths,
// i.e. page loads and /api/*:
//   - apex -> www redirect, /en/... -> unprefixed, unknown locale -> English
//   - serve the SPA (index.html) or /paper shell with per-URL canonical,
//     hreflang, <html lang/dir> and localized SEO meta
//   - POST /api/submit: feedback form -> Telegram
import { SITE_ORIGIN, AVAILABLE_LOCALES, DEFAULT_LOCALE, RTL_LOCALES, parseLocaleFromPath } from '../src/shared/site'
import type { Locale } from '../src/shared/site'
import { markQuale } from '../src/utils/quale'
import { groupPathFromSegments } from '../src/utils/groupPaths'
import enTaxonomy from '../public/i18n/taxonomy/en.json'
import { routeTheory, theoryHead, theoryArticle, type TheoryRoute } from './theoryPage'
import { hubAsset, HUB_MARKER } from './hubs'

interface Env {
  ASSETS: Fetcher
  TG_BOT_TOKEN?: string
  TG_CHAT_ID?: string
}

interface SeoDictionary {
  title?: string
  description?: string
  ogTitle?: string
  ogDescription?: string
}

const AVAILABLE_LOCALE_SET = new Set<string>(AVAILABLE_LOCALES)
const SITE_HOST = new URL(SITE_ORIGIN).host
const HTML_CACHE = 'public, max-age=0, must-revalidate'

const OG_LOCALE_MAP: Record<Locale, string> = {
  en: 'en_US', es: 'es_ES', fr: 'fr_FR', de: 'de_DE', it: 'it_IT', nl: 'nl_NL',
  pl: 'pl_PL', 'pt-BR': 'pt_BR', 'pt-PT': 'pt_PT', ru: 'ru_RU', uk: 'uk_UA', tr: 'tr_TR',
  ar: 'ar_AR', he: 'he_IL', hi: 'hi_IN', bn: 'bn_IN', 'zh-CN': 'zh_CN', 'zh-TW': 'zh_TW',
  ja: 'ja_JP', ko: 'ko_KR', id: 'id_ID', ms: 'ms_MY', vi: 'vi_VN', th: 'th_TH'
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function hreflangBlock(pathWithoutLocale: string, locales: readonly Locale[] = AVAILABLE_LOCALES): string {
  const links = locales.map(code => {
    const href = code === DEFAULT_LOCALE
      ? `${SITE_ORIGIN}${pathWithoutLocale}`
      : `${SITE_ORIGIN}/${code}${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`
    return `<link rel="alternate" hreflang="${code}" href="${href}" />`
  })
  links.push(`<link rel="alternate" hreflang="x-default" href="${SITE_ORIGIN}${pathWithoutLocale}" />`)
  return links.join('\n    ')
}

async function renderPage(request: Request, env: Env, url: URL): Promise<Response> {
  let path = url.pathname
  if (path !== '/' && path.endsWith('/')) path = path.slice(0, -1)

  // English is unprefixed; /en/... is a duplicate of it.
  if (path === `/${DEFAULT_LOCALE}` || path.startsWith(`/${DEFAULT_LOCALE}/`)) {
    return Response.redirect(`${SITE_ORIGIN}${path.slice(DEFAULT_LOCALE.length + 1) || '/'}`, 308)
  }

  const isPaper = path === '/paper'
  const { locale, pathWithoutLocale } = parseLocaleFromPath(path)
  // Supported-but-not-shipped locale prefixes: send to the English page.
  if (!isPaper && locale !== DEFAULT_LOCALE && !AVAILABLE_LOCALE_SET.has(locale)) {
    return Response.redirect(`${SITE_ORIGIN}${pathWithoutLocale}`, 308)
  }

  const segments = pathWithoutLocale.split('/').filter(Boolean)

  // Static hub pages (categories, questions, comparisons, A–Z) generated at
  // build by scripts/pages.js. English-only for now: locale prefixes redirect.
  const hub = hubAsset(segments)
  if (hub) {
    if (locale !== DEFAULT_LOCALE) return Response.redirect(`${SITE_ORIGIN}${pathWithoutLocale}`, 308)
    // A missing file falls back to the SPA's index.html, so check for the
    // marker only generated hub pages carry.
    const page = await env.ASSETS.fetch(new URL(hub, url))
    const body = page.ok ? await page.text() : ''
    if (body.includes(HUB_MARKER)) {
      return new Response(body, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': HTML_CACHE } })
    }
    // Head-to-head pages exist once, slugs in alphabetical order: send b-vs-a there.
    const [a, b, ...rest] = segments[0] === 'compare' && segments[1] ? segments[1].split('-vs-') : []
    if (a && b && !rest.length) {
      const reverse = await env.ASSETS.fetch(new URL(`/_pages/compare/${b}-vs-${a}`, url))
      if (reverse.ok && (await reverse.text()).includes(HUB_MARKER)) return Response.redirect(`${SITE_ORIGIN}/compare/${b}-vs-${a}`, 301)
    }
  }

  // /{category} and /{category}/{subcategory}: the map, drilled into that group.
  const group = !isPaper && !hub ? groupPathFromSegments(segments) : null

  // /{category}/{theory}: server-rendered theory page (see theoryPage.ts).
  let theoryRoute: Extract<TheoryRoute, { kind: 'page' }> | null = null
  // Not a page the site has: real 404 instead of a duplicate homepage.
  const notFound = !isPaper && !group && segments.length > 0 && (hub !== null || segments.length !== 2)
  if (!isPaper && segments.length === 2 && !hub && !group) {
    const route = await routeTheory(env.ASSETS, url.origin, locale, segments[0], segments[1])
    if (route.kind === 'redirect') return Response.redirect(route.location, 301)
    theoryRoute = route
  }

  // '/' and '/paper' resolve to index.html and paper.html in the assets.
  const shell = await env.ASSETS.fetch(new Request(new URL(isPaper ? '/paper' : '/', url), request))
  if (!shell.ok || !(shell.headers.get('content-type') || '').includes('text/html')) return shell

  const canonical = theoryRoute?.canonical ?? (path === '/' ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${path}`)
  let html = await shell.text()
  html = html.replace(/(<link[^>]*rel="canonical"[^>]*href=")[^"]*(")/, `$1${canonical}$2`)

  // Homepage: hub links and a crawlable directory of every theory (scripts/pages.js).
  // A missing fragment comes back as the SPA shell, hence the prefix check.
  if (!isPaper && segments.length === 0) {
    for (const [marker, name, prefix] of [
      [/<!--HOME_SIDEBAR[^>]*-->/, 'home-sidebar', '<section class="sidebar-card most-viewed is-shipped"'],
      [/<!--HOME_EXPLORE[^>]*-->/, 'home-explore', '<section class="atlas-explore"'],
      [/<!--THEORY_DIRECTORY[^>]*-->/, 'home-directory', '<section class="atlas-directory"']
    ] as const) {
      const res = await env.ASSETS.fetch(new URL(`/_pages/${name}/${locale}`, url))
      const fragment = res.ok ? await res.text() : ''
      if (fragment.startsWith(prefix)) html = html.replace(marker, fragment)
    }
  }

  if (!isPaper) {
    // Theory pages list only the languages that theory exists in; a 404 lists none.
    const hreflangLocales = notFound ? [] : theoryRoute ? (theoryRoute.theory ? theoryRoute.locales : []) : AVAILABLE_LOCALES
    if (hreflangLocales.length) {
      html = html.replace(/(<link[^>]*rel="canonical"[^>]*\/?>)/, `$1\n    ${hreflangBlock(pathWithoutLocale, hreflangLocales)}`)
    }
    html = html.replace(/<html lang="en">/, `<html lang="${locale}"${RTL_LOCALES.has(locale) ? ' dir="rtl"' : ''}>`)

    if (locale !== DEFAULT_LOCALE) {
      const seoResponse = await env.ASSETS.fetch(new URL(`/i18n/seo/${locale}.json`, url))
      const seo: SeoDictionary = seoResponse.ok ? await seoResponse.json() : {}
      if (seo.title) html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(seo.title)}</title>`)
      if (seo.description) {
        html = html.replace(/(<meta\s+name="description"\s+content=")[^"]*(")/, `$1${escapeHtml(seo.description)}$2`)
      }
      if (seo.ogTitle) {
        html = html.replace(/(<meta\s+property="og:title"\s+content=")[^"]*(")/, `$1${escapeHtml(seo.ogTitle)}$2`)
        html = html.replace(/(<meta\s+name="twitter:title"\s+content=")[^"]*(")/, `$1${escapeHtml(seo.ogTitle)}$2`)
      }
      if (seo.ogDescription) {
        html = html.replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/, `$1${escapeHtml(seo.ogDescription)}$2`)
        html = html.replace(/(<meta\s+name="twitter:description"\s+content=")[^"]*(")/, `$1${escapeHtml(seo.ogDescription)}$2`)
      }
      html = html.replace(/(<meta\s+property="og:locale"\s+content=")[^"]*(")/, `$1${OG_LOCALE_MAP[locale]}$2`)
      html = html.replace(/"inLanguage":\s*"en"/g, `"inLanguage": "${locale}"`)
    }

    if (group && locale === DEFAULT_LOCALE) {
      const names: Record<string, string> = { ...enTaxonomy.categories, ...enTaxonomy.subcategories }
      const name = group.map(key => names[key] ?? key).join(' › ')
      const texts = await env.ASSETS.fetch(new URL('/categories/en.json', url))
      const summary: string = texts.ok ? (await texts.json() as Record<string, { summary?: string }>)[group[group.length - 1]]?.summary ?? '' : ''
      const title = `${name}: theories of consciousness on the map | Consciousness Atlas`
      html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
      html = html.replace(/(<meta\s+(?:property="og:title"|name="twitter:title")\s+content=")[^"]*(")/g, `$1${escapeHtml(title)}$2`)
      if (summary) {
        const description = summary.length > 160 ? `${summary.slice(0, summary.lastIndexOf(' ', 157))}…` : summary
        html = html.replace(/(<meta\s+(?:name="description"|property="og:description"|name="twitter:description")\s+content=")[^"]*(")/g, `$1${escapeHtml(description)}$2`)
      }
    }

    if (theoryRoute?.theory) {
      const head = theoryHead(theoryRoute.theory, canonical, theoryRoute.leaf)
      html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(head.title)}</title>`)
      html = html.replace(/(<meta\s+name="description"\s+content=")[^"]*(")/, `$1${escapeHtml(head.description)}$2`)
      html = html.replace(/(<meta\s+(?:property="og:title"|name="twitter:title")\s+content=")[^"]*(")/g, `$1${escapeHtml(head.title)}$2`)
      html = html.replace(/(<meta\s+(?:property="og:description"|name="twitter:description")\s+content=")[^"]*(")/g, `$1${escapeHtml(head.description)}$2`)
      html = html.replace(/(<meta\s+property="og:type"\s+content=")[^"]*(")/, `$1article$2`)
      // Homepage-only markup (site/app JSON-LD, the About section's H1) doesn't
      // describe this page; the theory article carries the page's only H1.
      html = html.replace(/\s*<!--[^>]*data-scope="home"[^>]*-->/, '')
      html = html.replace(/<script type="application\/ld\+json" data-scope="home">[\s\S]*?<\/script>/g, '')
      html = html.replace(/<h1 data-i18n="about\.heading">([\s\S]*?)<\/h1>/, '<h2 data-i18n="about.heading">$1</h2>')
      html = html.replace('</head>', `  <script type="application/ld+json">${head.jsonLd}</script>\n  </head>`)
      html = html.replace('<div id="item-details"></div>', `<div id="item-details">${markQuale(theoryArticle(theoryRoute.theory, locale, theoryRoute.leaf))}</div>`)
    } else if (theoryRoute || notFound) {
      html = html.replace('</head>', '  <meta name="robots" content="noindex" />\n  </head>')
    }
  }

  html = html.replace(/(<meta\s+property="og:url"\s+content=")[^"]*(")/, `$1${canonical}$2`)
  const response = new Response(html, {
    status: notFound ? 404 : theoryRoute?.status ?? 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': HTML_CACHE }
  })
  if (isPaper || locale === DEFAULT_LOCALE) return response

  // Translate [data-i18n] text server-side (the app does the same on boot), so
  // crawlers see /fr etc. in French, not just the French <title>.
  const dictResponse = await env.ASSETS.fetch(new URL(`/i18n/ui/${locale}.json`, url))
  if (!dictResponse.ok) return response
  const dict: Record<string, string> = await dictResponse.json()
  return new HTMLRewriter().on('[data-i18n]', {
    element(el) {
      const value = dict[el.getAttribute('data-i18n') ?? '']
      if (!value) return
      const attr = el.getAttribute('data-i18n-attr')
      if (attr) el.setAttribute(attr, value)
      else el.setInnerContent(value, { html: el.hasAttribute('data-i18n-html') })
    }
  }).transform(response)
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })

async function handleSubmit(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  let body: { name?: string; email?: string; message?: string }
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }
  const { name, email, message } = body
  if (!message || !message.trim()) return json({ error: 'Message is required' }, 400)

  if (!env.TG_BOT_TOKEN || !env.TG_CHAT_ID) {
    // Local dev without secrets: log instead of sending.
    console.log('Form submission received:', { name: name || 'Not provided', email: email || 'Not provided', message })
    return json({ success: true, message: 'Form submitted successfully' })
  }

  const emojis = ['🧠', '💭', '🤔', '💡', '💥', '🔍', '🔦', '🔬', '🔭', '🔮', '🔥', '🔒', '🔖', '🔗']
  const emoji = emojis[Math.floor(Math.random() * emojis.length)]
  const text = `
      ${emoji} 📨 ${message}
      ${name ? `From: ${name}` : ''}${email ? `(${email})` : ''}
      `
  const telegram = await fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: env.TG_CHAT_ID, text, parse_mode: 'Markdown' })
  })
  if (!telegram.ok) {
    console.error('Telegram API error:', await telegram.text())
    return json({ error: 'Failed to send notification' }, 500)
  }
  return json({ success: true, message: 'Form submitted successfully' })
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url)
    if (url.host === `${SITE_HOST.replace(/^www\./, '')}`) {
      return Response.redirect(`${SITE_ORIGIN}${url.pathname}${url.search}`, 301)
    }
    if (url.pathname === '/api/submit') return handleSubmit(request, env)
    if (url.pathname.startsWith('/api/')) return json({ error: 'Not found' }, 404)
    return renderPage(request, env, url)
  }
} satisfies ExportedHandler<Env>
