import { t } from '@/utils/i18n'
import analytics from '@/utils/analytics'
import './WelcomeTour.scss'

const SEEN_KEY = 'atlas.tourSeen'

// A step either spotlights a control (target) or floats a card over the map.
interface Step {
  target?: string
  title: string
  body: string
}

const STEPS: Step[] = [
  { title: 'tour.map.title', body: 'tour.map.body' },
  { target: '.filter-toggle', title: 'tour.filter.title', body: 'tour.filter.body' },
  { target: '.view-switch', title: 'tour.list.title', body: 'tour.list.body' },
  { target: '#atlas-sidebar', title: 'tour.start.title', body: 'tour.start.body' }
]

// First-visit welcome with an opt-in, skippable 4-step tour of the controls.
export class WelcomeTour {
  private root: HTMLElement | null = null
  private index = -1
  private onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') this.finish('escape') }
  private onResize = () => this.place()

  static seen(): boolean {
    try { return localStorage.getItem(SEEN_KEY) === '1' } catch { return true }
  }

  // Intro card asking whether to take the tour.
  start() {
    this.mount()
    this.index = -1
    this.root!.innerHTML = `
      <div class="tour-card tour-card-intro" role="dialog" aria-modal="true" aria-labelledby="tour-title">
        <p class="tour-eyebrow">${t('tour.intro.eyebrow')}</p>
        <h2 id="tour-title">${t('tour.intro.title')}</h2>
        <p>${t('tour.intro.body')}</p>
        <div class="tour-actions">
          <button type="button" class="tour-secondary" data-action="skip">${t('tour.skip')}</button>
          <button type="button" class="tour-primary" data-action="next">${t('tour.intro.start')}</button>
        </div>
      </div>`
    this.wire()
    this.root!.querySelector<HTMLButtonElement>('[data-action="next"]')?.focus()
    analytics.trackClick('tour_shown')
  }

  private mount() {
    if (this.root) return
    this.root = document.createElement('div')
    this.root.className = 'tour'
    document.body.appendChild(this.root)
    document.addEventListener('keydown', this.onKey)
    window.addEventListener('resize', this.onResize)
  }

  private visibleTarget(step: Step): HTMLElement | null {
    if (!step.target) return null
    const el = document.querySelector<HTMLElement>(step.target)
    if (!el || el.hidden) return null
    const r = el.getBoundingClientRect()
    // Phones dock the card to the bottom (~300px), so the target must start
    // above it to be seen.
    const limit = window.innerWidth <= 768 ? window.innerHeight - 300 : window.innerHeight - 40
    return r.width > 0 && r.height > 0 && r.top >= 0 && r.top < limit ? el : null
  }

  private go(index: number) {
    // Skip steps whose control isn't on screen (e.g. the sidebar sits below the
    // chart on phones).
    while (index < STEPS.length && STEPS[index].target && !this.visibleTarget(STEPS[index])) index++
    if (index >= STEPS.length) return this.finish('done')
    this.index = index
    const step = STEPS[index]
    const last = !STEPS.slice(index + 1).some(s => !s.target || this.visibleTarget(s))
    this.root!.innerHTML = `
      ${step.target ? '<div class="tour-spotlight"></div>' : '<div class="tour-scrim"></div>'}
      <div class="tour-card" role="dialog" aria-modal="true" aria-labelledby="tour-title">
        <p class="tour-eyebrow">${t('tour.progress').replace('{n}', String(index + 1)).replace('{total}', String(STEPS.length))}</p>
        <h2 id="tour-title">${t(step.title)}</h2>
        <p>${t(step.body)}</p>
        <div class="tour-actions">
          <button type="button" class="tour-link" data-action="skip">${t('tour.skip')}</button>
          <span class="tour-spacer"></span>
          ${index > 0 ? `<button type="button" class="tour-secondary" data-action="back">${t('tour.back')}</button>` : ''}
          <button type="button" class="tour-primary" data-action="next">${t(last ? 'tour.done' : 'tour.next')}</button>
        </div>
      </div>`
    this.wire()
    this.place()
    this.root!.querySelector<HTMLButtonElement>('[data-action="next"]')?.focus()
  }

  // Position the spotlight over the target and the card next to it.
  private place() {
    if (!this.root || this.index < 0) return
    const step = STEPS[this.index]
    const card = this.root.querySelector<HTMLElement>('.tour-card')!
    const target = this.visibleTarget(step)
    const spot = this.root.querySelector<HTMLElement>('.tour-spotlight')
    if (!target || !spot) {
      card.classList.add('tour-card-floating')
      return
    }
    const r = target.getBoundingClientRect()
    const pad = 6
    Object.assign(spot.style, {
      top: `${r.top - pad}px`, left: `${r.left - pad}px`,
      width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px`
    })
    if (window.innerWidth <= 768) return // phones: card docks to the bottom (CSS)
    const gap = 14
    const cardHeight = card.offsetHeight
    const below = r.bottom + gap + cardHeight < window.innerHeight
    card.style.top = `${below ? r.bottom + gap : Math.max(16, r.top - gap - cardHeight)}px`
    card.style.left = `${Math.min(Math.max(16, r.left), window.innerWidth - card.offsetWidth - 16)}px`
  }

  private wire() {
    this.root!.querySelector('[data-action="next"]')?.addEventListener('click', () => this.go(this.index + 1))
    this.root!.querySelector('[data-action="back"]')?.addEventListener('click', () => {
      let i = this.index - 1
      while (i > 0 && STEPS[i].target && !this.visibleTarget(STEPS[i])) i--
      this.go(Math.max(0, i))
    })
    this.root!.querySelector('[data-action="skip"]')?.addEventListener('click', () => this.finish(this.index < 0 ? 'skipped_intro' : 'skipped'))
  }

  private finish(reason: string) {
    try { localStorage.setItem(SEEN_KEY, '1') } catch { /* storage blocked */ }
    analytics.trackClick(`tour_${reason}${this.index >= 0 ? `_step${this.index + 1}` : ''}`)
    document.removeEventListener('keydown', this.onKey)
    window.removeEventListener('resize', this.onResize)
    this.root?.remove()
    this.root = null
    this.index = -1
  }
}
