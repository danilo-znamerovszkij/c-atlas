import { markQuale } from '@/utils/quale'
import { t, getCurrentLocale } from '@/utils/i18n'
import { getDisplayLabel, baseData } from '@/config/chartConfig'
import { generateSlug } from '@/utils/slugUtils'
import { buildLocalizedPath } from '@/shared/site'
import type { Router } from '@/utils/routing'
import analytics from '@/utils/analytics'
import { versioned } from '@/utils/versioned'
import { loadCategoryTexts, type CategoryText } from '@/utils/categories'
import './AtlasTools.scss'

// Shape written by scripts/generate-static.js into public/theory-index/{locale}.json
interface IndexEntry {
  name: string
  slug: string
  category: string
  subcategory: string
  title: string
  tagline: string
  summary: string
  thinkers: string[]
  stances: Record<Question, string>
}

type Question = 'ai' | 'survival' | 'meaning' | 'virtual'
type View = 'chart' | 'list'

// Each filter chip covers a bucket of the fixed stance vocabulary (see THEORY.md).
const LIKELIHOOD: [string, string[]][] = [
  ['yes', ['Yes', 'Likely']],
  ['maybe', ['Possible', 'Conditional']],
  ['uncertain', ['Uncertain']],
  ['no', ['Unlikely', 'No']]
]

// page: the /questions/{page} hub (scripts/pages.js) explaining that question.
const QUESTIONS: { key: Question; label: string; page: string; buckets: [string, string[]][] }[] = [
  { key: 'ai', label: 'itemDetails.implications.aiConsciousness', page: 'ai-consciousness', buckets: LIKELIHOOD },
  { key: 'survival', label: 'itemDetails.implications.survivalBeyondDeath', page: 'life-after-death', buckets: LIKELIHOOD },
  {
    key: 'meaning',
    label: 'itemDetails.implications.meaningPurpose',
    page: 'meaning-and-purpose',
    buckets: [['cosmic', ['Cosmic/Ultimate']], ['humanistic', ['Humanistic only']], ['uncertain', ['Uncertain']]]
  },
  {
    key: 'virtual',
    label: 'itemDetails.implications.virtualImmortality',
    page: 'mind-uploading',
    buckets: [...LIKELIHOOD, ['notNeeded', ['Not needed']]]
  }
]

const VIEW_STORAGE_KEY = 'atlas.view'

const escapeHtml = (text: string) =>
  text.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

// View switch (chart/list), implications filter, and the list view itself.
export class AtlasTools {
  private root: HTMLElement
  private list: HTMLElement
  private chartContainer: HTMLElement
  private index: IndexEntry[] | null = null
  private indexPromise: Promise<IndexEntry[]> | null = null
  private selected: Partial<Record<Question, string>> = {}
  private view: View = 'chart'
  private categoryTexts: Record<string, CategoryText> = {}
  private router: Router
  private onFilterChange: (names: Set<string> | null) => void

  constructor(rootId: string, listId: string, router: Router, onFilterChange: (names: Set<string> | null) => void) {
    this.router = router
    this.onFilterChange = onFilterChange
    this.root = document.getElementById(rootId)!
    this.list = document.getElementById(listId)!
    this.chartContainer = this.list.closest('.chart-container') as HTMLElement
    this.render()

    let saved: string | null = null
    try { saved = localStorage.getItem(VIEW_STORAGE_KEY) } catch { /* storage blocked */ }
    if (saved === 'list') this.setView('list')
  }

  private loadIndex(): Promise<IndexEntry[]> {
    if (!this.indexPromise) {
      const fetchIndex = (locale: string) =>
        fetch(versioned(`/theory-index/${locale}.json`)).then(r => {
          if (!r.ok) throw new Error(`theory index ${locale}: ${r.status}`)
          return r.json() as Promise<IndexEntry[]>
        })
      this.indexPromise = fetchIndex(getCurrentLocale())
        .catch(() => fetchIndex('en'))
        .then(entries => (this.index = entries))
    }
    return this.indexPromise
  }

  private render() {
    this.root.innerHTML = `
      <div class="atlas-tools-bar">
        <div class="view-switch" role="group" aria-label="${t('tools.view.label')}">
          <button type="button" data-view="chart" aria-pressed="true">${t('tools.view.chart')}</button>
          <button type="button" data-view="list" aria-pressed="false">${t('tools.view.list')}</button>
        </div>
        <button type="button" class="filter-toggle" aria-expanded="false" aria-controls="filter-panel">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 5h18l-7 8v6l-4 2v-8z"/></svg>
          <span>${t('tools.filter.button')}</span>
          <span class="filter-count" hidden></span>
        </button>
      </div>
      <div class="filter-panel" id="filter-panel" hidden>
        ${QUESTIONS.map(q => `
          <div class="filter-group" role="group" aria-label="${escapeHtml(t(q.label))}">
            <div class="filter-question">${t(q.label)}<a class="filter-learn" href="/questions/${q.page}">${t('tools.filter.learn')}</a></div>
            <div class="filter-chips">
              ${q.buckets.map(([bucket]) => `
                <button type="button" class="filter-chip" data-question="${q.key}" data-bucket="${bucket}" aria-pressed="false">${t(`tools.stance.${bucket}`)}</button>
              `).join('')}
            </div>
          </div>
        `).join('')}
        <div class="filter-footer">
          <span class="filter-result" aria-live="polite"></span>
          <button type="button" class="filter-clear" hidden>${t('tools.filter.clear')}</button>
        </div>
      </div>
    `

    this.root.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(btn =>
      btn.addEventListener('click', () => {
        const view = btn.dataset.view as View
        analytics.trackClick(`view_${view}`)
        this.setView(view)
      })
    )

    const toggle = this.root.querySelector<HTMLButtonElement>('.filter-toggle')!
    const panel = this.root.querySelector<HTMLElement>('.filter-panel')!
    toggle.addEventListener('click', () => {
      const open = panel.hidden
      this.setFilterPanel(open)
      if (open) analytics.trackClick('filter_open')
    })

    this.root.querySelectorAll<HTMLButtonElement>('.filter-chip').forEach(chip =>
      chip.addEventListener('click', () => {
        const question = chip.dataset.question as Question
        const bucket = chip.dataset.bucket!
        if (this.selected[question] === bucket) {
          delete this.selected[question]
        } else {
          this.selected[question] = bucket
          analytics.trackClick(`filter_${question}_${bucket}`)
        }
        this.applyFilter()
      })
    )

    this.root.querySelector('.filter-clear')!.addEventListener('click', () => {
      this.selected = {}
      this.applyFilter()
    })
  }

  private setFilterPanel(open: boolean) {
    const toggle = this.root.querySelector<HTMLButtonElement>('.filter-toggle')!
    this.root.querySelector<HTMLElement>('.filter-panel')!.hidden = !open
    toggle.setAttribute('aria-expanded', String(open))
    if (open) {
      this.loadIndex().then(() => this.updateResult())
      this.updateResult()
    }
  }

  // Deep links from the hub pages: ?filter=ai:yes[,survival:no] and ?view=list
  applyUrlParams(params: URLSearchParams) {
    for (const part of (params.get('filter') || '').split(',')) {
      const [question, bucket] = part.split(':')
      const known = QUESTIONS.find(q => q.key === question)?.buckets.some(([b]) => b === bucket)
      if (known) this.selected[question as Question] = bucket
    }
    if (this.hasFilter()) {
      this.applyFilter()
      // Show which filter is on; on phones the panel would cover the map.
      if (window.innerWidth > 768) this.setFilterPanel(true)
    }
    if (params.get('view') === 'list') this.setView('list')
  }

  private matches(entry: IndexEntry): boolean {
    return QUESTIONS.every(q => {
      const bucket = this.selected[q.key]
      if (!bucket) return true
      const stances = q.buckets.find(([b]) => b === bucket)![1]
      return stances.includes(entry.stances[q.key])
    })
  }

  private hasFilter(): boolean {
    return Object.keys(this.selected).length > 0
  }

  private async applyFilter() {
    this.root.querySelectorAll<HTMLButtonElement>('.filter-chip').forEach(chip => {
      const on = this.selected[chip.dataset.question as Question] === chip.dataset.bucket
      chip.setAttribute('aria-pressed', String(on))
    })
    const active = Object.keys(this.selected).length
    const count = this.root.querySelector<HTMLElement>('.filter-count')!
    count.hidden = active === 0
    count.textContent = String(active)
    this.root.querySelector<HTMLElement>('.filter-clear')!.hidden = active === 0

    const index = await this.loadIndex()
    this.onFilterChange(this.hasFilter() ? new Set(index.filter(e => this.matches(e)).map(e => e.name)) : null)
    this.updateResult()
    if (this.view === 'list') this.renderList()
  }

  private updateResult() {
    const result = this.root.querySelector<HTMLElement>('.filter-result')!
    if (!this.index) {
      result.textContent = t('tools.filter.loading')
      return
    }
    const n = this.index.filter(e => this.matches(e)).length
    result.textContent = n === 0
      ? t('tools.filter.none')
      : t('tools.filter.result').replace('{n}', String(n)).replace('{total}', String(this.index.length))
  }

  private setView(view: View) {
    this.view = view
    try { localStorage.setItem(VIEW_STORAGE_KEY, view) } catch { /* storage blocked */ }
    this.root.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(btn =>
      btn.setAttribute('aria-pressed', String(btn.dataset.view === view))
    )
    this.chartContainer.classList.toggle('list-mode', view === 'list')
    document.body.classList.toggle('list-mode', view === 'list')
    window.scrollTo(0, 0)
    this.list.hidden = view !== 'list'
    if (view === 'list') {
      this.list.innerHTML = `<p class="theory-list-status">${t('tools.filter.loading')}</p>`
      Promise.all([this.loadIndex(), loadCategoryTexts()]).then(([, texts]) => {
        this.categoryTexts = texts
        this.renderList()
      })
    }
  }

  private renderList() {
    if (!this.index) return
    const shown = this.index.filter(e => this.matches(e))
    const heading = this.hasFilter()
      ? t('tools.filter.result').replace('{n}', String(shown.length)).replace('{total}', String(this.index.length))
      : t('tools.list.count').replace('{n}', String(this.index.length))

    // Group in chart order: category, then (Materialism's) subcategory.
    const sections = baseData.map(top => {
      const inCategory = shown.filter(e => e.category === top.name)
      if (inCategory.length === 0) return ''
      const subNames = [...new Set(inCategory.map(e => e.subcategory))]
      const groups = subNames.map(sub => {
        const items = inCategory.filter(e => e.subcategory === sub)
        return `
          ${sub ? `<h3 class="theory-list-sub">${escapeHtml(getDisplayLabel(sub))} <span>${items.length}</span></h3>` : ''}
          <ul class="theory-list-items">${items.map(e => this.renderRow(e)).join('')}</ul>
        `
      }).join('')
      return `
        <section class="theory-list-category">
          <h2>${escapeHtml(getDisplayLabel(top.name))} <span>${inCategory.length}</span></h2>
          ${this.categoryTexts[top.name] ? `<p class="theory-list-category-summary">${escapeHtml(this.categoryTexts[top.name].summary)}</p>` : ''}
          ${groups}
        </section>
      `
    }).join('')

    this.list.innerHTML = markQuale(`
      <div class="theory-list-inner">
        <p class="theory-list-status" aria-live="polite">${heading}</p>
        ${sections || `<p class="theory-list-empty">${t('tools.filter.none')}</p>`}
      </div>
    `)

    this.list.querySelectorAll<HTMLAnchorElement>('a[data-theory]').forEach(link =>
      link.addEventListener('click', event => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
        event.preventDefault()
        analytics.trackClick('list_theory', undefined, link.getAttribute('href') || '')
        this.router.navigateToTheory(link.dataset.category!, link.dataset.theory!)
      })
    )
  }

  private renderRow(e: IndexEntry): string {
    const category = generateSlug(e.category)
    const href = buildLocalizedPath(`/${category}/${e.slug}`, getCurrentLocale())
    const thinkers = e.thinkers.slice(0, 3).join(', ') + (e.thinkers.length > 3 ? '…' : '')
    return `
      <li>
        <a class="theory-row" href="${href}" data-category="${category}" data-theory="${e.slug}">
          <span class="theory-row-title">${escapeHtml(e.title)}</span>
          ${e.tagline ? `<span class="theory-row-tagline">${escapeHtml(e.tagline)}</span>` : ''}
          <span class="theory-row-summary">${escapeHtml(e.summary)}</span>
          ${thinkers ? `<span class="theory-row-thinkers">${escapeHtml(thinkers)}</span>` : ''}
        </a>
      </li>
    `
  }
}
