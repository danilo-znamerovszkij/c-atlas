import { AVAILABLE_LOCALES, DEFAULT_LOCALE, parseLocaleFromPath, buildLocalizedPath } from '@/shared/site'
import type { Locale } from '@/shared/site'
import { getCurrentLocale, t } from '@/utils/i18n'
import analytics from '@/utils/analytics'
import './LanguagePopup.scss'

// Native name for every supported locale. Typed as Record<Locale, ...> so a
// new locale can't ship without one; the menu lists AVAILABLE_LOCALES in
// that order (it used to be a separate hand-kept list that fell behind).
const NATIVE_NAMES: Record<Locale, string> = {
  en: 'English', es: 'Español', fr: 'Français', de: 'Deutsch', it: 'Italiano',
  nl: 'Nederlands', pl: 'Polski', 'pt-BR': 'Português (Brasil)', 'pt-PT': 'Português (Portugal)',
  ru: 'Русский', uk: 'Українська', tr: 'Türkçe', ar: 'العربية', he: 'עברית', hi: 'हिन्दी',
  bn: 'বাংলা', 'zh-CN': '简体中文', 'zh-TW': '繁體中文', ja: '日本語', ko: '한국어',
  id: 'Bahasa Indonesia', ms: 'Bahasa Melayu', vi: 'Tiếng Việt', th: 'ไทย'
}

const PREFERRED_LOCALE_KEY = 'preferredLocale'

export class LanguagePopup {
  private container: HTMLElement
  private overlay!: HTMLElement
  private isVisible = false

  constructor(containerId: string) {
    const element = document.getElementById(containerId)
    if (!element) {
      throw new Error(`Container with id '${containerId}' not found`)
    }
    this.container = element
    this.render()
    this.attachEventListeners()
  }

  private render() {
    const current = getCurrentLocale()
    const cards = AVAILABLE_LOCALES
      .map(code => ({ code, native: NATIVE_NAMES[code], label: code.toUpperCase() }))
      .map(l => {
        const isActive = l.code === current
        return `
          <button
            type="button"
            class="language-card${isActive ? ' active' : ''}"
            data-locale="${l.code}"
            role="option"
            aria-selected="${isActive}"
            lang="${l.code}"
          >
            <span class="language-card-native">${l.native}</span>
            <span class="language-card-code">${l.label}</span>
            ${isActive ? `<svg class="language-card-check" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>` : ''}
          </button>`
      })
      .join('')

    this.container.innerHTML = `
      <div class="language-overlay" id="language-overlay">
        <div class="language-popup" role="dialog" aria-modal="true" aria-label="${t('languagePopup.title')}">
          <div class="language-header">
            <div>
              <h3>${t('languagePopup.title')}</h3>
              <p class="language-subtitle">${t('languagePopup.subtitle')}</p>
            </div>
            <button class="language-close" id="language-close" aria-label="${t('languagePopup.closeAriaLabel')}">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="language-grid" role="listbox" aria-label="${t('languagePopup.title')}">
            ${cards}
          </div>
        </div>
      </div>
    `

    this.overlay = this.container.querySelector('#language-overlay') as HTMLElement
  }

  private attachEventListeners() {
    const closeBtn = this.container.querySelector('#language-close') as HTMLElement
    closeBtn.addEventListener('click', () => this.hide())

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.hide()
    })

    this.container.querySelectorAll<HTMLButtonElement>('.language-card').forEach(card => {
      card.addEventListener('click', () => {
        const locale = card.dataset.locale as Locale | undefined
        if (locale) this.selectLocale(locale)
      })
    })

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) this.hide()
    })
  }

  private selectLocale(locale: Locale) {
    // Remember the explicit choice so auto-detect never overrides it later —
    // including choosing English on a non-English browser.
    try {
      localStorage.setItem(PREFERRED_LOCALE_KEY, locale)
    } catch { /* private mode / storage disabled — non-fatal */ }

    analytics.trackClick(`language_select:${locale}`)

    if (locale === getCurrentLocale()) {
      this.hide()
      return
    }

    // A full navigation is the clean way to switch locale: it re-runs i18n
    // init, re-fetches the translated taxonomy/dictionaries, and re-renders
    // the chart with localized labels. In-place switching would require
    // re-initializing every component.
    const { pathWithoutLocale } = parseLocaleFromPath(window.location.pathname)
    const target = buildLocalizedPath(pathWithoutLocale, locale)
    window.location.href = target + window.location.search + window.location.hash
  }

  show() {
    this.isVisible = true
    this.overlay.classList.add('visible')
    document.body.style.overflow = 'hidden'
  }

  hide() {
    this.isVisible = false
    this.overlay.classList.remove('visible')
    document.body.style.overflow = ''
  }

  toggle() {
    this.isVisible ? this.hide() : this.show()
  }

  isOpen(): boolean {
    return this.isVisible
  }
}

export { PREFERRED_LOCALE_KEY, DEFAULT_LOCALE }
