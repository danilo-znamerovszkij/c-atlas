import { t, getCurrentLocale } from '@/utils/i18n'
import { getDisplayLabel, baseData } from '@/config/chartConfig'
import { getTheoryFullName } from '@/data/theoryNames'
import { generateSlug } from '@/utils/slugUtils'
import { loadCategoryTexts, type CategoryText } from '@/utils/categories'
import { buildLocalizedPath } from '@/shared/site'
import globalState from '@/utils/globalState'
import type { Router } from '@/utils/routing'
import type { ItemDetailsPanel } from './ItemDetailsPanel'
import analytics from '@/utils/analytics'
import mostViewedData from '@/data/mostViewed.json'
import './AtlasSidebar.scss'

// Recorded from Mixpanel (one-off analysis); see src/data/mostViewed.json.
const mostViewed: { from: string; to: string; theories: { name: string; views: number }[] } = mostViewedData

const escapeHtml = (text: string) =>
  text.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

// Left column under the tools: "Most viewed" at the overview, and the
// current category's card (summary + "Read the overview") after a drill-down.
export class AtlasSidebar {
  private root: HTMLElement
  private router: Router
  private panel: ItemDetailsPanel
  private openPath: (path: string[]) => void
  private texts: Record<string, CategoryText> = {}
  private path: string[] = []

  constructor(rootId: string, router: Router, panel: ItemDetailsPanel, openPath: (path: string[]) => void) {
    this.root = document.getElementById(rootId)!
    this.router = router
    this.panel = panel
    this.openPath = openPath
    loadCategoryTexts().then(texts => {
      this.texts = texts
      this.render()
    })
    this.render()
  }

  setPath(path: string[]) {
    this.path = path
    this.render()
  }

  private theoryHref(name: string): { href: string; category: string; slug: string } | null {
    const category = globalState.getTheoryCategory(name)
    if (!category) return null
    const slug = generateSlug(name)
    return { href: buildLocalizedPath(`/${category}/${slug}`, getCurrentLocale()), category, slug }
  }

  private render() {
    const key = this.path[this.path.length - 1]
    // The homepage ships the Most viewed card in its HTML (the first text to
    // paint there). Keep those nodes instead of rebuilding identical ones.
    const shipped = this.root.querySelector<HTMLElement>('.most-viewed:not([data-wired])')
    if (!key && shipped) {
      shipped.dataset.wired = ''
      this.root.hidden = false
      this.wireTheoryLinks(shipped)
      return
    }
    if (!key && this.root.querySelector('.most-viewed[data-wired]')) return
    this.root.innerHTML = key ? this.renderCategory(key) : this.renderMostViewed()
    this.root.hidden = this.root.innerHTML.trim() === ''
    this.wireTheoryLinks(this.root)
    this.root.querySelector('[data-action="overview"]')?.addEventListener('click', () => {
      analytics.trackClick(`category_overview_${key}`)
      this.showOverview(key!)
    })
  }

  private renderMostViewed(): string {
    const top = mostViewed.theories.filter(t => this.theoryHref(t.name))
    if (top.length === 0) return ''
    return `
      <section class="sidebar-card most-viewed">
        <h2 class="sidebar-eyebrow sidebar-eyebrow-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>
          ${t('sidebar.mostViewed.title')}
        </h2>
        <ol class="most-viewed-list">
          ${top.map(entry => {
            const link = this.theoryHref(entry.name)!
            const category = baseData.find(c => generateSlug(c.name) === link.category)?.name ?? ''
            return `
              <li>
                <a href="${link.href}" data-category="${link.category}" data-theory="${link.slug}">
                  <span class="most-viewed-title">${escapeHtml(getTheoryFullName(entry.name))}</span>
                  <span class="most-viewed-category">${escapeHtml(getDisplayLabel(category))}</span>
                </a>
              </li>`
          }).join('')}
        </ol>
      </section>
    `
  }

  private renderCategory(key: string): string {
    const text = this.texts[key]
    const node = this.nodeAt(this.path)
    const leaves = node ? this.countLeaves(node) : 0
    const subs = node?.children?.filter((c: any) => c.children).length ?? 0
    const parent = this.path.length > 1 ? getDisplayLabel(this.path[0]) : ''
    return `
      <section class="sidebar-card category-card">
        <p class="sidebar-eyebrow">${parent ? escapeHtml(parent) : t('sidebar.category.eyebrow')}</p>
        <h2 class="category-card-title">${escapeHtml(getDisplayLabel(key))}</h2>
        ${text ? `<p class="category-card-summary">${escapeHtml(text.summary)}</p>` : ''}
        <p class="category-card-meta">
          ${t('sidebar.category.theories').replace('{n}', String(leaves))}${subs ? ` · ${t('sidebar.category.subcategories').replace('{n}', String(subs))}` : ''}
        </p>
        ${text ? `<button type="button" class="category-card-more" data-action="overview">${t('sidebar.category.readMore')}</button>` : ''}
      </section>
    `
  }

  private showOverview(key: string) {
    const text = this.texts[key]
    if (!text) return
    const node = this.nodeAt(this.path)
    const subs: string[] = node?.children?.filter((c: any) => c.children).map((c: any) => c.name) ?? []
    const parent = this.path.length > 1 ? getDisplayLabel(this.path[0]) : ''
    const html = `
      <div class="theory-content category-overview">
        <div class="theory-header">
          <h1 class="theory-title">${escapeHtml(getDisplayLabel(key))}</h1>
          <div class="theory-category">${parent ? escapeHtml(parent) : t('sidebar.category.eyebrow')}</div>
        </div>
        <div class="theory-summary"><p class="theory-summary-text">${escapeHtml(text.summary)}</p></div>
        <div class="category-overview-body">
          ${text.overview.map(p => `<p>${escapeHtml(p)}</p>`).join('')}
        </div>
        ${subs.length ? `
          <h2 class="category-overview-heading">${t('sidebar.category.subcategoriesHeading')}</h2>
          <div class="category-overview-chips">
            ${subs.map(s => `<button type="button" class="category-chip" data-path="${escapeHtml(s)}">${escapeHtml(getDisplayLabel(s))}</button>`).join('')}
          </div>` : ''}
        <p class="category-overview-page"><a href="${this.path.length > 1 ? `/theories/${generateSlug(this.path[0])}#${generateSlug(key)}` : `/theories/${generateSlug(key)}`}">${t('sidebar.category.fullPage').replace('{name}', escapeHtml(getDisplayLabel(this.path.length > 1 ? this.path[0] : key)))}</a></p>
        <h2 class="category-overview-heading">${t('sidebar.category.examples')}</h2>
        <ul class="category-overview-examples">
          ${text.examples.map(name => {
            const link = this.theoryHref(name)
            return link ? `<li><a href="${link.href}" data-category="${link.category}" data-theory="${link.slug}">${escapeHtml(getTheoryFullName(name))}</a></li>` : ''
          }).join('')}
        </ul>
      </div>
    `
    const content = this.panel.showContent(getDisplayLabel(key), html)
    if (!content) return
    this.wireTheoryLinks(content)
    content.querySelectorAll<HTMLButtonElement>('[data-path]').forEach(chip =>
      chip.addEventListener('click', () => {
        this.panel.hide()
        this.openPath([...this.path, chip.dataset.path!])
      })
    )
  }

  private wireTheoryLinks(scope: HTMLElement) {
    scope.querySelectorAll<HTMLAnchorElement>('a[data-theory]').forEach(link =>
      link.addEventListener('click', event => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
        event.preventDefault()
        analytics.trackClick('sidebar_theory', undefined, link.getAttribute('href') || '')
        this.router.navigateToTheory(link.dataset.category!, link.dataset.theory!)
      })
    )
  }

  private nodeAt(path: string[]): any {
    let nodes: any[] = baseData
    let node: any = null
    for (const name of path) {
      node = nodes.find(n => n.name === name)
      if (!node) return null
      nodes = node.children || []
    }
    return node
  }

  private countLeaves(node: any): number {
    return node.children ? node.children.reduce((n: number, c: any) => n + this.countLeaves(c), 0) : 1
  }
}
