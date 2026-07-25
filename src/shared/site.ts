// Pure, dependency-free, DOM-free TS. Imported by both the Vite-bundled browser
// code (via the `@/*` alias) and the Vercel Edge Function `middleware.ts` at the
// repo root (via a relative path, since that bundler does not resolve tsconfig
// path aliases). Keep this file free of any import so both contexts can use it.

export const SITE_ORIGIN = 'https://www.consciousnessatlas.com'

export const DEFAULT_LOCALE = 'en'

export const SUPPORTED_LOCALES = [
  'en', 'es', 'fr', 'de', 'it', 'nl', 'pl', 'pt-BR', 'pt-PT', 'ru', 'uk', 'tr',
  'ar', 'he', 'hi', 'bn', 'zh-CN', 'zh-TW', 'ja', 'ko', 'id', 'ms', 'vi', 'th'
] as const

export type Locale = typeof SUPPORTED_LOCALES[number]

// Locales that actually have complete content shipped (UI dictionary +
// taxonomy + per-theory data). This is the set the language switcher offers
// and the browser-language auto-detect maps to. Keep in sync with the inline
// detection script in index.html (it can't import this module).
export const AVAILABLE_LOCALES = [
  'en', 'es', 'fr', 'de', 'uk', 'hi', 'ms', 'it', 'nl', 'pl', 'ja', 'pt-PT', 'tr', 'ru', 'zh-CN', 'zh-TW', 'ar', 'id', 'he'
] as const

export const RTL_LOCALES = new Set<string>(['ar', 'he'])

const SUPPORTED_LOCALE_SET = new Set<string>(SUPPORTED_LOCALES)

export function isSupportedLocale(value: string): value is Locale {
  return SUPPORTED_LOCALE_SET.has(value)
}

export function parseLocaleFromPath(path: string): { locale: Locale, pathWithoutLocale: string } {
  const segments = path.split('/').filter(segment => segment.length > 0)
  const candidate = segments[0]

  if (candidate && candidate !== DEFAULT_LOCALE && isSupportedLocale(candidate)) {
    const rest = '/' + segments.slice(1).join('/')
    return {
      locale: candidate,
      pathWithoutLocale: rest === '/' ? '/' : rest.replace(/\/$/, '') || '/'
    }
  }

  return { locale: DEFAULT_LOCALE, pathWithoutLocale: path === '' ? '/' : path }
}

export function buildLocalizedPath(pathWithoutLocale: string, locale: Locale): string {
  if (locale === DEFAULT_LOCALE) return pathWithoutLocale
  return pathWithoutLocale === '/' ? `/${locale}` : `/${locale}${pathWithoutLocale}`
}
