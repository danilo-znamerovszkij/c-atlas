import { getCurrentLocale } from './i18n'
import { versioned } from './versioned'

// Written overviews for chart categories and Materialism's subcategories,
// keyed by chart key (src/config/taxonomy.json). public/categories/{locale}.json
export interface CategoryText {
  summary: string
  overview: string[]
  examples: string[]
}

let pending: Promise<Record<string, CategoryText>> | null = null

export function loadCategoryTexts(): Promise<Record<string, CategoryText>> {
  if (!pending) {
    const get = (locale: string) =>
      fetch(versioned(`/categories/${locale}.json`)).then(r => {
        if (!r.ok) throw new Error(`categories ${locale}: ${r.status}`)
        return r.json() as Promise<Record<string, CategoryText>>
      })
    pending = get(getCurrentLocale()).catch(() => get('en')).catch(() => ({}))
  }
  return pending
}
