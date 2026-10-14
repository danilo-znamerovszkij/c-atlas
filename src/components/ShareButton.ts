import { shareLinksHtml } from '@/shared/share'
import '@/shared/share.css'
import { t } from '@/utils/i18n'
import analytics from '@/utils/analytics'
import './ShareButton.scss'

const SITE_IMAGE = 'https://www.consciousnessatlas.com/banner.jpg'

// Share button + popover: links for a dozen platforms, copy link, and the
// system share sheet where the browser has one. Shares the page being viewed
// (a theory, a family, or the map), via its canonical URL.
export class ShareButton {
  private button: HTMLButtonElement
  private pop: HTMLElement
  private onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') this.close(true) }
  private onDown = (e: PointerEvent) => {
    if (!this.pop.contains(e.target as Node) && !this.button.contains(e.target as Node)) this.close(false)
  }

  constructor(buttonId: string) {
    this.button = document.getElementById(buttonId) as HTMLButtonElement
    this.pop = document.createElement('div')
    this.pop.className = 'share-pop'
    this.pop.id = 'share-pop'
    this.pop.setAttribute('role', 'dialog')
    this.pop.setAttribute('aria-label', t('share.title'))
    document.body.appendChild(this.pop)
    this.button.setAttribute('aria-haspopup', 'dialog')
    this.button.setAttribute('aria-expanded', 'false')
    this.button.setAttribute('aria-controls', 'share-pop')
    this.button.addEventListener('click', () => (this.pop.classList.contains('is-open') ? this.close(true) : this.open()))
  }

  private context() {
    const canonical = document.getElementById('canonical-link')?.getAttribute('href')
    const url = canonical || location.href
    // An open theory shares itself; otherwise the Atlas (the app doesn't keep
    // document.title in step with the panel, so read the panel's heading).
    const theory = document.querySelector('.item-details-panel.visible .theory-title')?.textContent?.trim()
    const title = theory ? `${theory} · Consciousness Atlas` : t('share.text')
    return { url, title, text: title, image: SITE_IMAGE }
  }

  private open() {
    const ctx = this.context()
    this.pop.innerHTML = `
      <p class="share-pop-title">${t('share.title')}</p>
      ${shareLinksHtml(ctx)}
      <div class="share-copy">
        <input type="text" readonly value="${ctx.url.replace(/"/g, '&quot;')}" aria-label="${t('share.linkLabel')}" />
        <button type="button" data-copy>${t('share.copy')}</button>
      </div>
      ${'share' in navigator ? `<button type="button" class="share-native" data-native>${t('share.more')}</button>` : ''}`
    this.pop.querySelectorAll<HTMLAnchorElement>('[data-share]').forEach(a =>
      a.addEventListener('click', () => {
        analytics.trackClick(`share_${a.dataset.share}`)
        this.close(false)
      }))
    const copy = this.pop.querySelector<HTMLButtonElement>('[data-copy]')!
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(ctx.url)
        copy.textContent = t('share.copied')
        copy.classList.add('is-done')
        analytics.trackClick('share_copy')
      } catch {
        this.pop.querySelector('input')?.select()
      }
    })
    this.pop.querySelector('[data-native]')?.addEventListener('click', () => {
      analytics.trackClick('share_native')
      navigator.share({ title: ctx.title, text: ctx.text, url: ctx.url }).catch(() => {})
    })
    this.pop.classList.add('is-open')
    this.button.setAttribute('aria-expanded', 'true')
    document.addEventListener('keydown', this.onKey)
    document.addEventListener('pointerdown', this.onDown)
    this.pop.querySelector<HTMLElement>('.share-target')?.focus()
    analytics.trackClick('share_open')
  }

  private close(returnFocus: boolean) {
    if (!this.pop.classList.contains('is-open')) return
    this.pop.classList.remove('is-open')
    this.button.setAttribute('aria-expanded', 'false')
    document.removeEventListener('keydown', this.onKey)
    document.removeEventListener('pointerdown', this.onDown)
    if (returnFocus) this.button.focus()
  }
}
