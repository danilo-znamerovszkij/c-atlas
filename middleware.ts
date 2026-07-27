import { SITE_ORIGIN, AVAILABLE_LOCALES, DEFAULT_LOCALE, RTL_LOCALES, parseLocaleFromPath } from './src/shared/site'
import type { Locale } from './src/shared/site'

// Locales we actually ship content for. Only these get advertised via
// hreflang / served; requests for any other (routable-but-empty) locale are
// redirected to English. Keep as a Set for cheap membership checks.
const AVAILABLE_LOCALE_SET = new Set<string>(AVAILABLE_LOCALES)

interface SeoDictionary {
  title?: string
  description?: string
  ogTitle?: string
  ogDescription?: string
}

const OG_LOCALE_MAP: Record<Locale, string> = {
  en: 'en_US', es: 'es_ES', fr: 'fr_FR', de: 'de_DE', it: 'it_IT', nl: 'nl_NL',
  pl: 'pl_PL', 'pt-BR': 'pt_BR', 'pt-PT': 'pt_PT', ru: 'ru_RU', uk: 'uk_UA', tr: 'tr_TR',
  ar: 'ar_AR', he: 'he_IL', hi: 'hi_IN', bn: 'bn_IN', 'zh-CN': 'zh_CN', 'zh-TW': 'zh_TW',
  ja: 'ja_JP', ko: 'ko_KR', id: 'id_ID', ms: 'ms_MY', vi: 'vi_VN', th: 'th_TH'
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function fetchJsonSafe<T>(url: URL, fallback: T): Promise<T> {
  try {
    const response = await fetch(url, { headers: { 'x-middleware-request': 'true' } })
    if (!response.ok) return fallback
    return await response.json() as T
  } catch {
    return fallback
  }
}

function buildHreflangBlock(pathWithoutLocale: string): string {
  const links = AVAILABLE_LOCALES.map(code => {
    const href = code === DEFAULT_LOCALE
      ? `${SITE_ORIGIN}${pathWithoutLocale}`
      : `${SITE_ORIGIN}/${code}${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`
    return `<link rel="alternate" hreflang="${code}" href="${href}" />`
  })
  links.push(`<link rel="alternate" hreflang="x-default" href="${SITE_ORIGIN}${pathWithoutLocale}" />`)
  return links.join('\n    ')
}

function getCacheHeader(path: string): string {
  // index.html - no browser cache, CDN cache 1 day
  if (path === '/index.html') {
    return 'public, max-age=0, s-maxage=86400, stale-while-revalidate=86400'
  }

  // paper.html and /paper - long cache
  if (path === '/paper' || path === '/paper.html') {
    return 'public, max-age=31536000, s-maxage=31536000, immutable'
  }

  // assets - long cache
  if (path.startsWith('/assets/')) {
    return 'public, max-age=31536000, s-maxage=31536000, immutable'
  }

  // static files - long cache
  if (path.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|json|xml|webmanifest|js|css)$/)) {
    return 'public, max-age=31536000, s-maxage=31536000, immutable'
  }

  // default for HTML pages (SPA routes)
  return 'public, max-age=604800, stale-while-revalidate=86400'
}

export default async function middleware(request: Request) {
  const url = new URL(request.url)
  let path = url.pathname

  if (request.headers.get('x-middleware-request') === 'true') {
    const response = await fetch(request)
    const cacheHeader = getCacheHeader(path)
    const newHeaders = new Headers(response.headers)
    newHeaders.set('Cache-Control', cacheHeader)
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    })
  }

  if (path === '/index.html' || path === '/paper.html') {
    const response = await fetch(request)
    const cacheHeader = getCacheHeader(path)
    const newHeaders = new Headers(response.headers)
    newHeaders.set('Cache-Control', cacheHeader)
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    })
  }

  if (path.startsWith('/api/') ||
      path.startsWith('/assets/') ||
      path.startsWith('/data/') ||
      path.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|json|xml|webmanifest|js|css)$/)) {
    const response = await fetch(request)
    const cacheHeader = getCacheHeader(path)
    const newHeaders = new Headers(response.headers)
    newHeaders.set('Cache-Control', cacheHeader)
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    })
  }

  if (path !== '/' && path.endsWith('/')) {
    path = path.slice(0, -1)
  }

  // English is the default locale and is served unprefixed. A stray /en/...
  // link would otherwise fall through parseLocaleFromPath as a broken
  // default-locale path returning 200; permanently redirect it to the
  // canonical unprefixed URL so it never gets indexed as a duplicate.
  if (path === `/${DEFAULT_LOCALE}` || path.startsWith(`/${DEFAULT_LOCALE}/`)) {
    const stripped = path.slice(DEFAULT_LOCALE.length + 1) || '/'
    return Response.redirect(`${SITE_ORIGIN}${stripped}`, 308)
  }

  const canonicalUrl = path === '/'
    ? `${SITE_ORIGIN}/`
    : `${SITE_ORIGIN}${path}`

  // Locale detection is independent of the html-shell decision below: /paper
  // and /paper.html never get locale/hreflang treatment, regardless of any
  // leading locale segment a stray link might contain.
  const { locale, pathWithoutLocale } = parseLocaleFromPath(path)

  const htmlPath = path === '/paper' ? '/paper.html' : '/index.html'
  const htmlUrl = new URL(htmlPath, url.origin)
  const isPaperShell = htmlPath === '/paper.html'

  // A path may carry a locale that is routable (in SUPPORTED_LOCALES, so it
  // parses out) but has no shipped content — e.g. /ms/... . These render
  // broken (empty dictionaries, English fallback) yet return 200, and were
  // historically advertised via hreflang, so search engines indexed some.
  // Permanently redirect them to the English canonical so users get a working
  // page and Google consolidates the URL.
  if (!isPaperShell && locale !== DEFAULT_LOCALE && !AVAILABLE_LOCALE_SET.has(locale)) {
    return Response.redirect(`${SITE_ORIGIN}${pathWithoutLocale}`, 308)
  }

  const response = await fetch(htmlUrl, {
    headers: {
      'x-middleware-request': 'true',
    },
  })

  if (!response.ok) {
    return response
  }

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('text/html')) {
    return response
  }

  let html = await response.text()

  html = html.replace(
    /(<link[^>]*rel="canonical"[^>]*href=")[^"]*(")/,
    `$1${canonicalUrl}$2`
  )

  if (!isPaperShell) {
    html = html.replace(
      /(<link[^>]*rel="canonical"[^>]*\/?>)/,
      `$1\n    ${buildHreflangBlock(pathWithoutLocale)}`
    )

    html = html.replace(/<html lang="en">/, `<html lang="${locale}"${RTL_LOCALES.has(locale) ? ' dir="rtl"' : ''}>`)

    if (locale !== DEFAULT_LOCALE) {
      const seo = await fetchJsonSafe<SeoDictionary>(new URL(`/i18n/seo/${locale}.json`, url.origin), {})

      if (seo.title) {
        html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(seo.title)}</title>`)
      }
      if (seo.description) {
        html = html.replace(
          /(<meta\s+name="description"\s+content=")[^"]*(")/,
          `$1${escapeHtml(seo.description)}$2`
        )
      }
      if (seo.ogTitle) {
        html = html.replace(
          /(<meta\s+property="og:title"\s+content=")[^"]*(")/,
          `$1${escapeHtml(seo.ogTitle)}$2`
        )
        html = html.replace(
          /(<meta\s+name="twitter:title"\s+content=")[^"]*(")/,
          `$1${escapeHtml(seo.ogTitle)}$2`
        )
      }
      if (seo.ogDescription) {
        html = html.replace(
          /(<meta\s+property="og:description"\s+content=")[^"]*(")/,
          `$1${escapeHtml(seo.ogDescription)}$2`
        )
        html = html.replace(
          /(<meta\s+name="twitter:description"\s+content=")[^"]*(")/,
          `$1${escapeHtml(seo.ogDescription)}$2`
        )
      }

      const ogLocale = OG_LOCALE_MAP[locale]
      if (ogLocale) {
        html = html.replace(
          /(<meta\s+property="og:locale"\s+content=")[^"]*(")/,
          `$1${ogLocale}$2`
        )
      }

      html = html.replace(/"inLanguage":\s*"en"/, `"inLanguage": "${locale}"`)
    }
  }

  const cacheHeader = getCacheHeader(path)
  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers: {
      ...Object.fromEntries(response.headers.entries()),
      'Content-Type': 'text/html',
      'Cache-Control': cacheHeader,
    },
  })
}
