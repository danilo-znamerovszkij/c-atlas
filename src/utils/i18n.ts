import { DEFAULT_LOCALE, RTL_LOCALES, parseLocaleFromPath } from '../shared/site'
import type { Locale } from '../shared/site'
import { versioned } from './versioned'

export interface TaxonomyDictionary {
  categories: Record<string, string>
  subcategories: Record<string, string>
  shortLabels: Record<string, string>
  fullNames: Record<string, string>
}

const EMPTY_TAXONOMY: TaxonomyDictionary = {
  categories: {},
  subcategories: {},
  shortLabels: {},
  fullNames: {}
}

let activeLocale: Locale = DEFAULT_LOCALE
let uiDict: Record<string, string> = {}
// English UI strings, used for keys a locale hasn't translated yet.
let fallbackDict: Record<string, string> = {}
let taxonomyDict: TaxonomyDictionary = EMPTY_TAXONOMY

async function fetchJsonSafe<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(versioned(path))
    if (!response.ok) return fallback
    return await response.json() as T
  } catch {
    return fallback
  }
}

export function getCurrentLocale(): Locale {
  return activeLocale
}

export async function initI18n(): Promise<void> {
  const { locale } = parseLocaleFromPath(window.location.pathname)
  activeLocale = locale

  document.documentElement.lang = locale
  if (RTL_LOCALES.has(locale)) {
    document.documentElement.dir = 'rtl'
  }

  // Always fetch, including for English: the UI dictionary is the only
  // source of truth t() reads from (components call t('key') directly, with
  // no hardcoded English fallback left in the TS source), so skipping the
  // fetch for the default locale would make every t() call return its raw
  // key instead of English text.
  const [ui, taxonomy, fallback] = await Promise.all([
    fetchJsonSafe<Record<string, string>>(`/i18n/ui/${locale}.json`, {}),
    fetchJsonSafe<TaxonomyDictionary>(`/i18n/taxonomy/${locale}.json`, EMPTY_TAXONOMY),
    locale === DEFAULT_LOCALE ? Promise.resolve({}) : fetchJsonSafe<Record<string, string>>(`/i18n/ui/${DEFAULT_LOCALE}.json`, {})
  ])

  uiDict = ui
  fallbackDict = fallback
  taxonomyDict = taxonomy

  translatePage()
}

export function t(key: string): string {
  return uiDict[key] ?? fallbackDict[key] ?? key
}

export function getTaxonomyDict(): TaxonomyDictionary {
  return taxonomyDict
}

export function translatePage(root: ParentNode = document): void {
  root.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n')
    if (!key) return
    const attr = el.getAttribute('data-i18n-attr')
    if (attr) {
      el.setAttribute(attr, t(key))
    } else if (el.hasAttribute('data-i18n-html')) {
      el.innerHTML = t(key)
    } else {
      el.textContent = t(key)
    }
  })
}
