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

function hreflangBlock(pathWithoutLocale: string): string {
  const links = AVAILABLE_LOCALES.map(code => {
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

  // '/' and '/paper' resolve to index.html and paper.html in the assets.
  const shell = await env.ASSETS.fetch(new Request(new URL(isPaper ? '/paper' : '/', url), request))
  if (!shell.ok || !(shell.headers.get('content-type') || '').includes('text/html')) return shell

  const canonical = path === '/' ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${path}`
  let html = await shell.text()
  html = html.replace(/(<link[^>]*rel="canonical"[^>]*href=")[^"]*(")/, `$1${canonical}$2`)

  if (!isPaper) {
    html = html.replace(/(<link[^>]*rel="canonical"[^>]*\/?>)/, `$1\n    ${hreflangBlock(pathWithoutLocale)}`)
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
      html = html.replace(/"inLanguage":\s*"en"/, `"inLanguage": "${locale}"`)
    }
  }

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': HTML_CACHE }
  })
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
