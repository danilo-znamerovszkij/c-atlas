import type { TheoryData } from '../types/theory'
import { generateSlug, resolveTheoryFileStem } from './slugUtils'
import { SITE_ORIGIN, DEFAULT_LOCALE, parseLocaleFromPath, buildLocalizedPath } from '../shared/site'
import type { Locale } from '../shared/site'
import { t } from './i18n'
import { versioned } from './versioned'
import analytics from './analytics'
import { getAllTheoryNames } from '../config/chartConfig'
import { groupPathFromSegments, groupUrlPath } from './groupPaths'

const theoryCache = new Map<string, TheoryData>()

export async function loadTheoryByName(theoryName: string, locale: Locale = DEFAULT_LOCALE): Promise<TheoryData> {
  const cacheKey = `${locale}:${theoryName}`
  if (theoryCache.has(cacheKey)) {
    return theoryCache.get(cacheKey)!
  }
  // theoryName may be a raw chart taxonomy name ("A. Clark", "Buzsáki") that
  // doesn't literally match its content filename - resolve through the same
  // slugify+title-case transform the actual files were named with.
  const fileName = `${resolveTheoryFileStem(theoryName)}.json`
  const filePath = locale === DEFAULT_LOCALE ? `/data/${fileName}` : `/data/${locale}/${fileName}`

  try {
    const response = await fetch(versioned(filePath))
    if (!response.ok) {
      if (locale !== DEFAULT_LOCALE) return loadTheoryByName(theoryName, DEFAULT_LOCALE)
      throw new Error(`Failed to load theory data: ${response.statusText}`)
    }
    const theoryData = await response.json() as TheoryData
    theoryCache.set(cacheKey, theoryData)
    return theoryData
  } catch (error) {
    if (locale !== DEFAULT_LOCALE) return loadTheoryByName(theoryName, DEFAULT_LOCALE)
    throw new Error(`Failed to load theory data: ${error}`)
  }
}

export class Router {
  private static instance: Router
  private currentTheory: TheoryData | null = null
  private currentLocale: Locale = DEFAULT_LOCALE
  private onTheoryChange: ((theory: TheoryData | null, error?: string) => void) | null = null
  private onLoading: ((category: string, theory: string) => void) | null = null
  private onGroupChange: ((path: string[]) => void) | null = null
  // Category/subcategory the URL last put the chart in (/, /materialism, ...).
  private groupPath: string[] = []

  private constructor() {
    this.setupPopstateListener()
    this.parseCurrentURL()
  }

  public static getInstance(): Router {
    if (!Router.instance) {
      Router.instance = new Router()
    }
    return Router.instance
  }

  public setTheoryChangeCallback(callback: (theory: TheoryData | null, error?: string) => void) {
    this.onTheoryChange = callback
  }

  public setLoadingCallback(callback: (category: string, theory: string) => void) {
    this.onLoading = callback
  }

  // Called with the chart path when the URL names a category/subcategory (or
  // '/'), including right away for the page's own URL.
  public setGroupChangeCallback(callback: (path: string[]) => void) {
    this.onGroupChange = callback
    if (this.groupPath.length) callback([...this.groupPath])
  }

  private setupPopstateListener() {
    window.addEventListener('popstate', () => {
      this.parseCurrentURL()
    })
  }

  private updateCanonicalLink() {
    const canonicalLink = document.getElementById('canonical-link')
    if (canonicalLink) {
      const path = window.location.pathname
      canonicalLink.setAttribute('href', path === '/' ? SITE_ORIGIN : SITE_ORIGIN + path)
    }
  }

  public getCurrentLocale(): Locale {
    return this.currentLocale
  }

  private async parseCurrentURL() {
    const path = window.location.pathname
    this.updateCanonicalLink()
    const { locale, pathWithoutLocale } = parseLocaleFromPath(path)
    this.currentLocale = locale
    const segments = pathWithoutLocale.split('/').filter(segment => segment.length > 0)
    const group = segments.length ? groupPathFromSegments(segments) : []

    if (group) {
      this.groupPath = group
      this.currentTheory = null
      this.onTheoryChange?.(null)
      this.onGroupChange?.([...group])
    } else if (segments.length >= 2) {
      const category = segments[0]
      const theory = segments[1]

      this.onLoading?.(category, theory)
      
      try {
        const theoryData = await this.loadTheory(category, theory)
        this.currentTheory = theoryData
        this.onTheoryChange?.(theoryData)
        // One place for theory page views: chart, search, list, direct links,
        // back/forward. theory_name is the chart leaf key (what Most viewed ranks).
        const leaf = getAllTheoryNames().find(name => generateSlug(name) === theory) ?? theory
        analytics.trackPageView(leaf, category, theoryData.id_and_class.subcategory || undefined)
      } catch (error) {
        console.error('Failed to load theory:', error)
        this.currentTheory = null
        this.onTheoryChange?.(null, error instanceof Error ? error.message : t('misc.unknownError'))
      }
    } else {
      this.currentTheory = null
      this.onTheoryChange?.(null)
    }
  }

  private async loadTheory(category: string, theory: string): Promise<TheoryData> {
    return await loadTheoryByName(theory, this.currentLocale)
  }

  public navigateToTheory(category: string, theory: string) {
    const newPath = buildLocalizedPath(`/${category}/${theory}`, this.currentLocale)
    window.history.pushState({}, '', newPath)
    this.parseCurrentURL()
  }

  public getCurrentTheory(): TheoryData | null {
    return this.currentTheory
  }

  public isGroupUrl(): boolean {
    const segments = parseLocaleFromPath(window.location.pathname).pathWithoutLocale.split('/').filter(Boolean)
    return groupPathFromSegments(segments) !== null
  }

  // The chart moved to another category/subcategory: give it its own URL, so
  // Back steps up a level and the link can be shared.
  public showGroup(path: string[]) {
    if (path.join('/') === this.groupPath.join('/')) return
    this.groupPath = [...path]
    this.currentTheory = null
    analytics.trackClick('map_open', undefined, groupUrlPath(path))
    window.history.pushState({}, '', buildLocalizedPath(groupUrlPath(path), this.currentLocale))
    this.updateCanonicalLink()
  }

  // Closing a theory returns to the part of the map it was opened from.
  public goHome() {
    window.history.pushState({}, '', buildLocalizedPath(groupUrlPath(this.groupPath), this.currentLocale))
    this.parseCurrentURL()
  }

  public goToOverview() {
    window.history.pushState({}, '', buildLocalizedPath('/', this.currentLocale))
    this.parseCurrentURL()
  }

  public async getAllTheories(): Promise<Array<{category: string, theory: string, title: string}>> {
    return []
  }
}
