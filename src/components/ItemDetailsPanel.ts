import { markQuale } from '@/utils/quale'
import { groupPathFromSegments } from '@/utils/groupPaths'
import { parseLocaleFromPath } from '@/shared/site'
import { baseData, getDisplayLabel, getAllTheoryNames } from '../config/chartConfig'
import { getTheoryFullName, theoryFullNames } from '../data/theoryNames'
import { generateSlug } from '../utils/slugUtils'
import { buildLocalizedPath } from '../shared/site'
import { getCurrentLocale } from '../utils/i18n'
import globalState from '../utils/globalState'
import type { TheoryData } from '../types/theory'
import analytics from '../utils/analytics'
import { t } from '../utils/i18n'

interface ItemData {
  name: string
  heading: string
  text: string
  details: string
  tags: string[]
  category?: string
  subcategory?: string
}

const FULLSCREEN_STORAGE_KEY = 'atlas.panelFullscreen'

// Lets the panel open things outside itself (set by TheoryChart).
export interface PanelNavigator {
  openTheory: (category: string, slug: string) => void
  openPath: (path: string[]) => void
}

type RelatedTarget = { kind: 'theory'; href: string; category: string; slug: string } | { kind: 'path'; path: string[] }

const normalizeName = (name: string) =>
  name.toLowerCase().replace(/[’‘`]/g, "'").replace(/\s+/g, ' ').trim()

let relatedIndex: Map<string, RelatedTarget> | null = null

// related_theories[].name -> a chart theory (by full or short name, English or
// current locale) or a category/subcategory (by key or label). Unknown names
// stay plain text.
function resolveRelated(name: string): RelatedTarget | null {
  if (!relatedIndex) {
    relatedIndex = new Map()
    const walk = (nodes: any[], prefix: string[]) => {
      for (const node of nodes) {
        if (!node.children) continue
        const path = [...prefix, node.name]
        for (const n of [node.name, getDisplayLabel(node.name)]) relatedIndex!.set(normalizeName(n), { kind: 'path', path })
        walk(node.children, path)
      }
    }
    walk(baseData, [])
    for (const leaf of getAllTheoryNames()) {
      const category = globalState.getTheoryCategory(leaf)
      if (!category) continue
      const slug = generateSlug(leaf)
      const target: RelatedTarget = { kind: 'theory', href: buildLocalizedPath(`/${category}/${slug}`, getCurrentLocale()), category, slug }
      for (const n of [getTheoryFullName(leaf), theoryFullNames[leaf], leaf]) {
        if (n) relatedIndex.set(normalizeName(n), target)
      }
    }
  }
  return relatedIndex.get(normalizeName(name)) ?? null
}

export class ItemDetailsPanel {
  private container: HTMLElement
  private isVisible: boolean = false
  private itemData: Map<string, ItemData> = new Map()
  private onCloseCallback: (() => void) | null = null
  private navigator: PanelNavigator | null = null

  constructor(containerId: string) {
    const element = document.getElementById(containerId)
    if (!element) {
      throw new Error(`Container with id '${containerId}' not found`)
    }
    this.container = element
    this.initializeItemData()
    this.render()
  }

  public setCloseCallback(callback: () => void) {
    this.onCloseCallback = callback
  }

  public setNavigator(navigator: PanelNavigator) {
    this.navigator = navigator
  }

  private initializeItemData() {
    this.itemData.set('Eliminative', {
      name: 'Eliminative',
      heading: 'Eliminative Materialism',
      text: 'A radical form of materialism that denies the existence of mental states as commonly understood.',
      details: 'Eliminative materialism argues that our common-sense understanding of mental states (beliefs, desires, etc.) is fundamentally flawed and should be replaced by a more accurate scientific understanding of the brain.',
      tags: ['Materialism', 'Philosophy of Mind', 'Reductionism'],
      category: 'Materialism',
      subcategory: 'Philosophical'
    })

    this.itemData.set('Functionalism', {
      name: 'Functionalism',
      heading: 'Functionalist Theory of Mind',
      text: 'Mental states are defined by their functional roles rather than their physical constitution.',
      details: 'Functionalism suggests that mental states are like software running on the hardware of the brain. The same mental state could theoretically be realized in different physical systems.',
      tags: ['Materialism', 'Philosophy of Mind', 'Computation'],
      category: 'Materialism',
      subcategory: 'Philosophical'
    })

    this.itemData.set('Chalmers', {
      name: 'Chalmers',
      heading: 'David Chalmers & The Hard Problem',
      text: 'Philosopher who formulated the "hard problem" of consciousness and advocates for panpsychism.',
      details: 'Chalmers distinguishes between the "easy problems" of consciousness (explaining cognitive functions) and the "hard problem" (explaining subjective experience or qualia). He argues that physicalism cannot solve the hard problem.',
      tags: ['Panpsychism', 'Philosophy of Mind', 'Consciousness'],
      category: 'Panpsychism',
      subcategory: 'Micropsychism'
    })

    this.itemData.set('Penrose-Hameroff', {
      name: 'Penrose-Hameroff',
      heading: 'Orchestrated Objective Reduction',
      text: 'Quantum consciousness theory proposing that consciousness arises from quantum processes in microtubules.',
      details: 'This theory combines Roger Penrose\'s ideas about quantum gravity and consciousness with Stuart Hameroff\'s work on microtubules in neurons. It suggests that consciousness is a quantum phenomenon.',
      tags: ['Quantum', 'Consciousness', 'Microtubules', 'Physics'],
      category: 'Quantum',
      subcategory: 'Quantum Extensions'
    })
  }

  private render() {
    this.container.innerHTML = `
      <div class="item-details-panel ${this.isVisible ? 'visible' : ''}" 
           role="dialog" 
           aria-labelledby="item-title" 
           aria-hidden="${!this.isVisible}">
        <div class="panel-content">
          <button class="fullscreen-btn"
                  id="fullscreen-panel"
                  type="button"
                  aria-pressed="false"
                  aria-label="${t('itemDetails.fullscreen.enter')}"
                  title="${t('itemDetails.fullscreen.enter')}">
            <svg class="icon-expand" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
            <svg class="icon-collapse" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/></svg>
          </button>
          <button class="close-btn"
                  id="close-panel"
                  aria-label="${t('itemDetails.closePanel')}"
                  title="${t('itemDetails.closePanel')}">×</button>
          <div id="item-info">
            <div class="welcome-message">
              <div class="mystic-icon" aria-hidden="true">✦</div>
              <p>${t('itemDetails.welcome')}</p>
            </div>
          </div>
        </div>
      </div>
    `

    this.attachEventListeners()
  }

  // Landing directly on a theory URL reads best full-screen; don't store it as
  // the user's preference.
  public showFullscreenForDirectVisit() {
    this.setFullscreen(true, false)
  }

  private resizeTimer = 0

  private setFullscreen(on: boolean, persist = true) {
    const panel = this.container.querySelector('.item-details-panel')
    const btn = this.container.querySelector('#fullscreen-panel')
    // Fade the text while the width animates (see .is-resizing), only when
    // the switch is visible and the class actually changes.
    if (panel?.classList.contains('visible') && panel.classList.contains('fullscreen') !== on) {
      panel.classList.add('is-resizing')
      clearTimeout(this.resizeTimer)
      this.resizeTimer = window.setTimeout(() => panel.classList.remove('is-resizing'), 380)
    }
    panel?.classList.toggle('fullscreen', on)
    if (btn) {
      const label = t(on ? 'itemDetails.fullscreen.exit' : 'itemDetails.fullscreen.enter')
      btn.setAttribute('aria-pressed', String(on))
      btn.setAttribute('aria-label', label)
      btn.setAttribute('title', label)
    }
    if (!persist) return
    try { localStorage.setItem(FULLSCREEN_STORAGE_KEY, on ? '1' : '0') } catch { /* storage blocked */ }
  }

  // Lock page scroll whenever the open panel covers the whole viewport.
  private watchScrollLock() {
    const panel = this.container.querySelector('.item-details-panel')
    if (!panel) return
    const sync = () => {
      const covers = panel.classList.contains('visible') &&
        (panel.classList.contains('fullscreen') || window.innerWidth <= 768)
      document.documentElement.classList.toggle('panel-covers', covers)
    }
    new MutationObserver(sync).observe(panel, { attributes: true, attributeFilter: ['class'] })
    window.addEventListener('resize', sync)
    sync()
  }

  private attachEventListeners() {
    this.watchScrollLock()
    let savedFullscreen = false
    try { savedFullscreen = localStorage.getItem(FULLSCREEN_STORAGE_KEY) === '1' } catch { /* storage blocked */ }
    this.setFullscreen(savedFullscreen, false)
    this.container.querySelector('#fullscreen-panel')?.addEventListener('click', () => {
      const on = !this.container.querySelector('.item-details-panel')?.classList.contains('fullscreen')
      analytics.trackClick(on ? 'panel_fullscreen_on' : 'panel_fullscreen_off')
      this.setFullscreen(on)
    })

    const closeBtn = this.container.querySelector('#close-panel')
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hide()
        this.onCloseCallback?.()
      })

      closeBtn.addEventListener('keydown', (e) => {
        const keyboardEvent = e as KeyboardEvent
        if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
          e.preventDefault()
          this.hide()
          this.onCloseCallback?.()
        }
      })
    }

    document.addEventListener('keydown', (e) => {
      const keyboardEvent = e as KeyboardEvent
      if (keyboardEvent.key === 'Escape' && this.isVisible) {
        this.hide()
        this.onCloseCallback?.()
      }
    })
  }

  public show(itemName: string) {
    this.isVisible = true
    const panel = this.container.querySelector('.item-details-panel')
    panel?.classList.add('visible')
    panel?.setAttribute('aria-hidden', 'false')

    const itemData = this.itemData.get(itemName)

    if (itemData) {
      const infoElement = this.container.querySelector('#item-info')
      if (infoElement) {
        infoElement.innerHTML = `
          <div class="scholarly-panel">
            <div class="breadcrumb">
              ${this.buildBreadcrumb(itemName).split(' > ').map((item, index, array) =>
          `<span class="breadcrumb-item">${item}</span>${index < array.length - 1 ? '<span class="breadcrumb-separator">›</span>' : ''}`
        ).join('')}
            </div>
            
            <h1 class="headline">${itemData.heading}</h1>
            
            <div class="thinker-line">
              <span class="thinker-name">${itemName}</span>
              <span class="thinker-role">Philosopher & Theorist</span>
            </div>
            
            <blockquote class="summary-quote">
              <p>${itemData.text}</p>
            </blockquote>
            
            <div class="shields-section">
              <div class="shield" data-tooltip="Core philosophical position">
                <div class="shield-icon">⚖️</div>
                <span class="shield-label">Position</span>
              </div>
              <div class="shield" data-tooltip="Methodological approach">
                <div class="shield-icon">🔬</div>
                <span class="shield-label">Method</span>
              </div>
              <div class="shield" data-tooltip="Influence and impact">
                <div class="shield-icon">🌟</div>
                <span class="shield-label">Influence</span>
              </div>
              <div class="shield" data-tooltip="Current development status">
                <div class="shield-icon">📈</div>
                <span class="shield-label">Status</span>
              </div>
            </div>
            
            <div class="callout">
              <div class="callout-title">CORE ONTOLOGY</div>
              <div class="callout-table">
                <div class="table-row">
                  <div class="table-cell">Ontology</div>
                  <div class="table-cell">Functionalist</div>
                </div>
                <div class="table-row">
                  <div class="table-cell">Identity</div>
                  <div class="table-cell">Information system</div>
                </div>
              </div>
            </div>
            
            <div class="relations-block">
              <h3 class="relations-title">CRITIQUE & RELATED THEORIES</h3>
              <div class="relations-grid">
                <div class="relation-item">Criticized for lacking empirical support</div>
                <div class="relation-item">Related to Global Workspace Theory</div>
                <div class="relation-item">Contrasts with Integrated Information Theory</div>
                <div class="relation-item">Influences modern cognitive science</div>
              </div>
            </div>
            
            <div class="faq-section">
              <div class="faq-item">
                <div class="faq-question">IMPLICATIONS</div>
                <div class="faq-answer">
                  <p>This theory suggests that consciousness emerges from the integration of information across different brain regions, providing a framework for understanding how subjective experience arises from neural activity.</p>
                </div>
              </div>
              
              <div class="faq-item">
                <div class="faq-question">LIMITS OF SUMMARY</div>
                <div class="faq-answer">
                  <p>This summary provides only a basic overview. The full theory involves complex arguments about information processing, neural networks, and the nature of subjective experience that require deeper study.</p>
                </div>
              </div>
              
              <div class="faq-item">
                <div class="faq-question">L2LTS SUMMARY</div>
                <div class="faq-answer">
                  <p>Global Workspace Theory proposes that consciousness results from the global broadcasting of information across specialized brain modules. <a href="#" style="color: #eabd61;">Read more ✓</a></p>
                </div>
              </div>
            </div>
            
            <div class="action-buttons">
              <button class="action-button">Phenomenal</button>
              <button class="action-button">Access <span class="separator">·</span> Memory</button>
            </div>
          </div>
        `
      }
    } else {
      const infoElement = this.container.querySelector('#item-info')
      if (infoElement) {
        infoElement.innerHTML = `
          <div class="scholarly-panel">
            <div class="breadcrumb">
              ${this.buildBreadcrumb(itemName).split(' > ').map((item, index, array) =>
          `<span class="breadcrumb-item">${item}</span>${index < array.length - 1 ? '<span class="breadcrumb-separator">›</span>' : ''}`
        ).join('')}
            </div>
            <h1 class="headline">${itemName}</h1>
            <div class="thinker-line">
              <span class="thinker-name">Associated thinkers: Bernard Baars Stanislas Dehaene</span>
            </div>
            <blockquote class="summary-quote">
              <p>"This theory proposes that consciousness emerges from the global integration of information across specialized brain modules, creating a unified workspace for cognitive processing."</p>
            </blockquote>
            
            <!-- CORE ONTOLOGY Section -->
            <div class="callout">
              <div class="callout-title">CORE ONTOLOGY</div>
              <div class="callout-table">
                <div class="table-row">
                  <div class="table-cell">Ontology</div>
                  <div class="table-cell">Functionalist</div>
                </div>
                <div class="table-row">
                  <div class="table-cell">Identity</div>
                  <div class="table-cell">Information system</div>
                </div>
              </div>
            </div>
            
            <!-- CRITIQUE & RELATED THEORIES Section -->
            <div class="relations-block">
              <h3 class="relations-title">CRITIQUE & RELATED THEORIES</h3>
              <div class="relations-grid">
                <div class="relation-item">Criticized for lacking empirical support</div>
                <div class="relation-item">Related to Global Workspace Theory</div>
                <div class="relation-item">Contrasts with Integrated Information Theory</div>
                <div class="relation-item">Influences modern cognitive science</div>
              </div>
            </div>
            
            <!-- IMPLICATIONS Section -->
            <div class="faq-section">
              <div class="faq-item">
                <div class="faq-question">IMPLICATIONS</div>
                <div class="faq-answer">
                  <p>This theory suggests that consciousness emerges from the integration of information across different brain regions, providing a framework for understanding how subjective experience arises from neural activity.</p>
                </div>
              </div>
              
              <div class="faq-item">
                <div class="faq-question">LIMITS OF SUMMARY</div>
                <div class="faq-answer">
                  <p>This summary provides only a basic overview. The full theory involves complex arguments about information processing, neural networks, and the nature of subjective experience that require deeper study.</p>
                </div>
              </div>
              
              <div class="faq-item">
                <div class="faq-question">L2LTS SUMMARY</div>
                <div class="faq-answer">
                  <p>Global Workspace Theory proposes that consciousness results from the global broadcasting of information across specialized brain modules. <a href="#" style="color: #eabd61;">Read more ✓</a></p>
                </div>
              </div>
            </div>
            
            <!-- Action Buttons -->
            <div class="action-buttons">
              <button class="action-button">Phenomenal</button>
              <button class="action-button">Access <span class="separator">·</span> Memory</button>
            </div>
          </div>
        `
      }
    }

    this.attachFAQListeners()
    this.attachLinkTracking()
  }

  private attachFAQListeners() {
    const faqQuestions = this.container.querySelectorAll('.faq-question')
    faqQuestions.forEach(question => {
      question.addEventListener('click', () => {
        const faqItem = question.closest('.faq-item')
        const answer = faqItem?.querySelector('.faq-answer') as HTMLElement
        const icon = question.querySelector('.faq-icon')

        if (faqItem?.classList.contains('active')) {
          faqItem.classList.remove('active')
          if (answer) answer.style.setProperty('max-height', '0')
          if (icon) icon.textContent = '+'
        } else {
          faqItem?.classList.add('active')
          if (answer) answer.style.setProperty('max-height', answer.scrollHeight + 'px')
          if (icon) icon.textContent = '−'
        }
      })
    })
  }

  private attachLinkTracking() {
    const readMoreLinks = this.container.querySelectorAll('a[href="#"]')
    readMoreLinks.forEach(link => {
      link.addEventListener('click', (event) => {
        const rect = link.getBoundingClientRect()
        analytics.trackClick('read_more_link', {
          x: (event as MouseEvent).clientX - rect.left,
          y: (event as MouseEvent).clientY - rect.top
        }, link.getAttribute('href') || '')
      })
    })
  }

  private buildBreadcrumb(itemName: string): string {
    for (const topLevel of baseData) {
      for (const secondLevel of topLevel.children) {
        if (secondLevel.name === itemName) {
          return `${topLevel.name}`
        }
        if ('children' in secondLevel && secondLevel.children) {
          for (const thirdLevel of secondLevel.children) {
            if (thirdLevel.name === itemName) {
              return `${topLevel.name} > ${secondLevel.name}`
            }
          }
        }
      }
    }

    return 'Philosophy'
  }

  public showTheory(theoryData: TheoryData) {
    this.isVisible = true
    const panel = this.container.querySelector('.item-details-panel')
    panel?.classList.add('visible')
    panel?.setAttribute('aria-hidden', 'false')

    const titleElement = this.container.querySelector('#item-title')
    if (titleElement) {
      titleElement.textContent = theoryData.id_and_class.theory_title
    }

    const infoElement = this.container.querySelector('#item-info')
    if (infoElement) {
      infoElement.innerHTML = markQuale(`
        <div class="theory-content">
          <div class="theory-header">
            <h1 class="theory-title">${theoryData.id_and_class.theory_title}</h1>
            <div class="theory-category">
              ${getDisplayLabel(theoryData.id_and_class.category)}
              ${theoryData.id_and_class.subcategory ? `
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4.5 2L7.5 6L4.5 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              ${getDisplayLabel(theoryData.id_and_class.subcategory)}
              ` : ''}
            </div>
            <div class="theory-tagline">${theoryData.id_and_class.core_identity_tagline}</div>
          </div>
          
          <div class="theory-summary">
            <p class="theory-summary-text">${theoryData.id_and_class.summary}</p>
          </div>
          
          ${theoryData.id_and_class.associated_thinkers && theoryData.id_and_class.associated_thinkers.length > 0 ? `
          <div class="thinkers-section">
            <div class="thinkers-list">
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7.8125 8.33252C9.19321 8.33252 10.3125 7.21323 10.3125 5.83252C10.3125 4.45181 9.19321 3.33252 7.8125 3.33252C6.43179 3.33252 5.3125 4.45181 5.3125 5.83252C5.3125 7.21323 6.43179 8.33252 7.8125 8.33252Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M3.54297 12.2326C3.98921 11.5001 4.61638 10.8948 5.36418 10.4747C6.11197 10.0546 6.95526 9.83398 7.81297 9.83398C8.67068 9.83398 9.51396 10.0546 10.2618 10.4747C11.0096 10.8948 11.6367 11.5001 12.083 12.2326" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M7.8125 13.8325C11.4024 13.8325 14.3125 10.9224 14.3125 7.33252C14.3125 3.74267 11.4024 0.83252 7.8125 0.83252C4.22265 0.83252 1.3125 3.74267 1.3125 7.33252C1.3125 10.9224 4.22265 13.8325 7.8125 13.8325Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              ${theoryData.id_and_class.associated_thinkers.join(', ')}
            </div>
          </div>
          ` : ''}
          ${this.compareHref() ? `
          <a class="theory-compare" href="${this.compareHref()}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="7" height="16" rx="1.5"/><rect x="14" y="4" width="7" height="16" rx="1.5"/></svg>
            ${t('itemDetails.compare')}
          </a>` : ''}
          
          <!-- I. Conceptual Ground -->
          <div class="theory-section">
            <h2>${t('itemDetails.sections.conceptualGround')}</h2>
            <div class="section-content">
              <div class="field">
                <div class="field-label">${t('itemDetails.fields.explanatoryIdentityClaim')}</div>
                <div class="field-value">${theoryData.conceptual_ground.explanatory_identity_claim}</div>
              </div>
              <div class="field">
                <div class="field-label">${t('itemDetails.fields.mindBodyRelationship')}</div>
                <div class="field-value">${theoryData.conceptual_ground.mind_body_relationship}</div>
              </div>
              <div class="field">
                <div class="field-label">${t('itemDetails.fields.subjectivityIntentionality')}</div>
                <div class="field-value">${theoryData.conceptual_ground.subjectivity_and_intentionality}</div>
              </div>
              <div class="field">
                <div class="field-label">${t('itemDetails.fields.qualiaAccount')}</div>
                <div class="field-value">${theoryData.conceptual_ground.qualia_account}</div>
              </div>
              <div class="field">
                <div class="field-label">${t('itemDetails.fields.ontologicalCommitments')}</div>
                <div class="field-value">${theoryData.conceptual_ground.ontological_commitments}</div>
              </div>
              <div class="field">
                <div class="field-label">${t('itemDetails.fields.epistemicAccess')}</div>
                <div class="field-value">${theoryData.conceptual_ground.epistemic_access}</div>
              </div>
              <div class="field">
                <div class="field-label">${t('itemDetails.fields.constituentsStructure')}</div>
                <div class="field-value">${theoryData.conceptual_ground.constituents_and_structure}</div>
              </div>

              <div class="field">
                <div class="field-label">${t('itemDetails.fields.primitiveOrEmergentStatus')}</div>
                <div class="field-value">${theoryData.conceptual_ground.primitive_or_emergent_status}</div>
              </div>
              ${theoryData.conceptual_ground.emergence_type && theoryData.conceptual_ground.emergence_type.trim() !== '' ? `
              <div class="field">
                <div class="field-label">${t('itemDetails.fields.emergenceType')}</div>
                <div class="field-value">${theoryData.conceptual_ground.emergence_type}</div>
              </div>
              ` : ''}
              <div class="field">
                <div class="field-label">${t('itemDetails.fields.ontologicalStatus')}</div>
                <div class="field-value">${theoryData.conceptual_ground.ontological_status}</div>
              </div>
            </div>
          </div>

          <!-- II. Mechanism & Dynamics -->
          <div class="theory-section">
            <h2>${t('itemDetails.sections.mechanismDynamics')}</h2>
            <div class="section-content">
              <div class="field">
                <div class="field-label">${t('itemDetails.fields.scopeOfConsciousness')}</div>
                <div class="field-value">${theoryData.mechanism_and_dynamics.scope_of_consciousness}</div>
              </div>
              <div class="field">
                <div class="field-label">${t('itemDetails.fields.distinctiveMechanism')}</div>
                <div class="field-value">${theoryData.mechanism_and_dynamics.distinctive_mechanism_or_principle}</div>
              </div>
              <div class="field">
                <div class="field-label">${t('itemDetails.fields.dynamicsOfEmergence')}</div>
                <div class="field-value">${theoryData.mechanism_and_dynamics.dynamics_of_emergence}</div>
              </div>
              <div class="field">
                <div class="field-label">${t('itemDetails.fields.locationDistribution')}</div>
                <div class="field-value">${theoryData.mechanism_and_dynamics.location_and_distribution}</div>
              </div>
              <div class="field">
                <div class="field-label">${t('itemDetails.fields.causationFunctionalRole')}</div>
                <div class="field-value">${theoryData.mechanism_and_dynamics.causation_and_functional_role}</div>
              </div>
              ${theoryData.mechanism_and_dynamics.integration_or_binding && theoryData.mechanism_and_dynamics.integration_or_binding !== 'Not specified' ? `
              <div class="field">
                <div class="field-label">${t('itemDetails.fields.integrationBinding')}</div>
                <div class="field-value">${theoryData.mechanism_and_dynamics.integration_or_binding}</div>
              </div>
              ` : ''}
              ${theoryData.mechanism_and_dynamics.information_flow_or_representation && theoryData.mechanism_and_dynamics.information_flow_or_representation !== 'Not specified' ? `
              <div class="field">
                <div class="field-label">${t('itemDetails.fields.informationFlowRepresentation')}</div>
                <div class="field-value">${theoryData.mechanism_and_dynamics.information_flow_or_representation}</div>
              </div>
              ` : ''}
              ${theoryData.mechanism_and_dynamics.evolutionary_account && theoryData.mechanism_and_dynamics.evolutionary_account !== 'Not specified' ? `
              <div class="field">
                <div class="field-label">${t('itemDetails.fields.evolutionaryAccount')}</div>
                <div class="field-value">${theoryData.mechanism_and_dynamics.evolutionary_account}</div>
              </div>
              ` : ''}
              ${theoryData.mechanism_and_dynamics?.core_claims_and_evidence && theoryData.mechanism_and_dynamics.core_claims_and_evidence.length > 0 ? `
              <div class="field">
                <div class="field-label">${t('itemDetails.fields.coreClaimsEvidence')}</div>
                <div class="field-value">
                  <div class="claims-list">
                    ${theoryData.mechanism_and_dynamics.core_claims_and_evidence.map(claim =>
        `<div class="claim-item">
                        <div class="claim-icon"><svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 300 300"><path d="M129.5 1.6C96 6.7 70.2 19.3 46.7 42 20.8 66.9 6.8 94.2 1.6 130.1c-3.4 23.2-.5 50 7.9 72.5 4.2 10.9 13 27.1 19.9 36.4 8.3 11.1 25.9 28 36.6 35.1 45.8 30.5 102.5 34.2 151.3 9.8 19.2-9.6 40.1-27.2 53.3-44.9 22.8-30.6 33.3-71.6 27.8-108.9-4.9-33.8-17.5-59.7-40.4-83.4-24.9-25.9-52.2-39.9-88.1-45.1-12.8-1.9-28.1-1.9-40.4 0m38.9 29.9c50.8 7.7 92.4 49.3 100.1 100.1 12.1 80.2-56.7 149-136.9 136.9-50.8-7.7-92.4-49.3-100.1-100.1C20.6 96 76 30.8 149 30.1c5.2 0 13.9.6 19.4 1.4"/><path d="M133.7 76.9c-4.2 1-12.1 3.9-17.5 6.6-8.2 4.1-11.1 6.2-18.8 14-8 7.9-9.8 10.4-14.2 19.5-10.9 22.5-10.9 43.5 0 66 4.4 9.1 6.2 11.6 14.2 19.6 8.1 8 10.4 9.8 19.6 14.2 22.7 10.9 43.5 10.9 66 0 9.1-4.4 11.6-6.2 19.6-14.2s9.8-10.5 14.2-19.6c10.9-22.5 10.9-43.3 0-66-4.4-9.2-6.2-11.5-14.2-19.6-8-8-10.5-9.8-19.6-14.2-16.5-8-32.5-10.1-49.3-6.3"/></svg></div>
                        <div class="claim-text">${claim}</div>
                      </div>`
      ).join('')}
                  </div>
                </div>
              </div>
              ` : ''}
              ${theoryData.mechanism_and_dynamics.basis_of_belief_or_evidence_type && theoryData.mechanism_and_dynamics.basis_of_belief_or_evidence_type !== 'Not specified' ? `
              <div class="field">
                <div class="field-label">${t('itemDetails.fields.basisOfBelief')}</div>
                <div class="field-value">${theoryData.mechanism_and_dynamics.basis_of_belief_or_evidence_type}</div>
              </div>
              ` : ''}
            </div>
          </div>

          <!-- III. Empirics & Critiques -->
          <div class="theory-section">
            <h2>${t('itemDetails.sections.empiricsCritiques')}</h2>
            <div class="section-content">
              <div class="field">
                <div class="field-label">${t('itemDetails.fields.testabilityStatus')}</div>
                <div class="field-value">${theoryData.empirics_and_critiques.testability_status}</div>
              </div>
              ${theoryData.empirics_and_critiques.known_empirical_interventions_or_tests && theoryData.empirics_and_critiques.known_empirical_interventions_or_tests !== 'Not specified' ? `
              <div class="field">
                <div class="field-label">${t('itemDetails.fields.knownEmpiricalTests')}</div>
                <div class="field-value">${theoryData.empirics_and_critiques.known_empirical_interventions_or_tests}</div>
              </div>
              ` : ''}
              <div class="field">
                <div class="field-label">${t('itemDetails.fields.criticismsTensions')}</div>
                <div class="field-value">${theoryData.empirics_and_critiques.criticisms_and_tensions}</div>
              </div>
              <div class="field">
                <div class="field-label">${t('itemDetails.fields.openQuestionsLimitations')}</div>
                <div class="field-value">${theoryData.empirics_and_critiques.open_questions_and_limitations}</div>
              </div>
              <div class="field">
                <div class="field-label">${t('itemDetails.fields.ontologicalCoherence')}</div>
                <div class="field-value">${theoryData.empirics_and_critiques.ontological_coherence}</div>
              </div>
            </div>
          </div>
          
          <!-- IV. Implications -->
          <div class="theory-section">
            <h2>${t('itemDetails.sections.implications')}</h2>
            <div class="section-content">
              <div class="implications-list">
                <div class="implication-item">
                  <div class="implication-header">
                    <div class="implication-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 1536 1536"><path d="M658.5 117.5c-22.2 3.1-43.2 14-59.6 31.1-12.8 13.4-20.3 27.3-25.6 47.2-2.5 9.5-2.5 38.8.1 48.2 3.1 11.5 7 20.7 12.9 30.5 10.6 17.6 34 36.3 53 42.4 7 2.3 6.7 1 6.7 33.9 0 17-.4 30.3-1 31.2-.8 1.3-19.2 1.6-152.2 2-149.3.6-151.4.6-158.8 2.6-11.6 3.3-16.9 5.2-25.2 9.4-30.9 15.4-52.5 42.1-61.5 75.7l-2.6 9.8-.4 56.3-.4 56.3-2.5 1c-1.4.5-8.5.9-15.9.9-22.6 0-38 3.2-54 11.1-9.5 4.7-10.2 5.1-18 10.8-23.9 17.5-39.1 42.7-44.6 73.6-1.7 10.2-1.9 16.3-1.9 81.5 0 78.2.3 81.9 6.9 101.3 10.8 31.7 37.9 59 69.1 69.7 13.3 4.6 17.3 5.2 37.5 5.7 11 .3 20.8.9 21.7 1.4 1.5.8 1.7 5.7 2 57.1.4 60.7.2 57.7 6 75.8 6.8 20.8 25.2 45.2 43.4 57.2 7.9 5.3 17.8 10.7 21.4 11.9 1.4.4 5 1.7 8 2.8 3 1.2 9.7 3 14.9 4.1 9.3 2 14.4 2 336.1 2 325.5 0 326.7 0 336.5-2.1 5.4-1.1 10.6-2.4 11.6-3 1-.5 2.5-.9 3.4-.9s5.8-2 10.8-4.5c33.3-16.1 55-42.2 64.5-77.5l2.5-9.5.4-56.3c.4-51.4.6-56.3 2.1-57.1.9-.5 10.7-1.1 21.7-1.4 20.2-.5 24.2-1.1 37.5-5.7 31.2-10.7 58.3-38 69.1-69.7 6.6-19.4 6.9-23.1 6.9-101.3s-.3-81.9-6.9-101.3c-13.2-38.8-48.2-68.1-88.6-74.3-4.9-.8-15.2-1.4-22.7-1.4s-14.8-.4-16.2-.9l-2.5-1-.4-56.3c-.4-59.6-.4-58.7-5.4-74.3-5.9-18.3-19.4-38.5-34.4-51.2-15.2-12.9-28.4-19.6-49.9-25.6-7.4-2.1-9.3-2.1-158.8-2.7-133-.4-151.4-.7-152.2-2-.6-.9-1-14.2-1-31.2 0-32.9-.3-31.6 6.7-33.8 18.7-6 42.6-25.2 53-42.5 3.4-5.7 7.5-14 9.2-18.7 4.8-13.1 5.5-17.6 5.5-36.3 0-17.5-.1-18.3-3.2-29-5.4-18-14.2-32.4-27.5-45.2-12.9-12.3-24.4-19.2-40.2-24.1-16.1-5-30-6.1-47-3.7m26.4 56.1c22.1 6.3 36.3 24.3 36.2 45.9 0 21.9-15.3 40.9-37.1 46.1-23.9 5.7-49.2-9.9-55.6-34.3-2.7-10.4-1.4-23.4 3.1-32.4 10.2-19.9 33.5-31 53.4-25.3m311.4 267.5c12.5 1.8 20.5 5.3 29.6 12.9 10.5 8.8 18 21.1 20.7 34 2.1 9.8 2.1 560.3 0 570.2-4.4 21.1-20.9 38.8-42.1 45.4-5.8 1.8-16.8 1.9-330.5 1.9-314.6 0-324.7-.1-330.5-1.9-8.2-2.5-12.9-5-20-10.4-7.8-5.8-12.7-11.9-17.2-21-6.8-14-6.3 7.6-6.3-299.2 0-307.3-.5-285.1 6.5-299.4 8.4-17.2 23.9-28.8 43-32.2 9.4-1.6 635.8-2 646.8-.3M243.5 773v120.5l-14 .3c-16 .4-23.1-.8-32.5-5.1-7.8-3.6-12.9-7.4-18.9-14-4.7-5.1-5.7-6.6-9.1-13.6-5.2-11.1-5.1-9.2-4.8-90.2.3-74.7.4-75.5 2.5-80.7 7.3-17.9 21.6-31 39.8-36.5 3.7-1.1 9.2-1.5 21-1.4l16 .2zm897.4-119.4c10.2 2.9 18.1 7.5 25.7 14.9 7.3 7.2 11 12.6 14.7 21.7 2.1 5.2 2.2 6 2.5 80.7.3 83.5.5 79.8-6.3 92.9-5.6 10.7-15 19.6-26.5 24.9-9.4 4.3-16.5 5.5-32.5 5.1l-14-.3-.3-119.5c-.1-65.7 0-120.1.3-120.8.7-1.9 29.2-1.7 36.4.4"/><path d="M507.5 601.6c-1.1.2-4.5.9-7.5 1.5-34.4 6.6-64.8 33.8-75.4 67.4-15 47.8 6.6 97.9 51.9 120.8 24.7 12.4 58.6 12.7 85 .7 23.2-10.4 44.9-34.3 52.9-58 5.1-15.3 6.7-36.6 3.7-51.5-7.7-39.1-36.8-69.3-76.1-79.2-5.5-1.3-30.7-2.6-34.5-1.7m26.1 58.1c11.7 3.9 21.4 13.1 26.4 25 2.6 6.1 3 8.4 3 16 0 10.1-1.7 16.1-6.8 24.1-13.1 20.2-38.9 26.1-59.1 13.4-6.9-4.3-10-7.4-14.3-14.3-14.7-23.4-4.5-53.1 22-63.9 6.2-2.5 21.7-2.7 28.8-.3M816 601.6c-19 3.3-29.6 7.4-44.4 17.2-16.6 11-32.4 31.9-38.5 50.9-11.7 36.5-2.3 75.1 24.9 102.3 29.6 29.6 74.8 37.4 112.7 19.4 11.5-5.5 16.1-8.6 25.1-16.9 22.5-20.8 33.5-48.2 31.9-78.9-2.4-44.9-32.6-80.8-77.7-92.3-5.4-1.3-29.1-2.6-34-1.7m26.8 58.4c26.5 10.1 37.3 40.3 22.7 63.5-14.9 23.7-45.3 28.5-65.8 10.5-5.4-4.8-10.6-12.6-13-19.5-2.3-6.7-2.3-20.4.1-27 4.6-13.1 14.7-23.4 27.2-27.8 6.9-2.4 22.2-2.2 28.8.3"/></svg>
</div>
                    <div class="implication-question">${t('itemDetails.implications.aiConsciousness')}</div>
                  </div>
                  <div class="implication-stance">${theoryData.implications.AI_consciousness.stance}</div>
                  <div class="implication-rationale">${theoryData.implications.AI_consciousness.rationale}</div>
                </div>
                <div class="implication-item">
                  <div class="implication-header">
                    <div class="implication-icon"><svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 512 512"><path d="M202.5 24.65c-43.8 7.9-80.75 38.7-96.45 80.5-7.9 21.05-7.4 12.25-8 136.35l-.55 111-19.5.5c-21.05.55-22.05.8-30.05 7.05-7.95 6.25-9.4 11-9.95 32.95l-.5 19.5-16.7.25C.3 413.1-4.75 416.4 2.4 424.7l2.45 2.8h440.3l2.45-2.8c7.15-8.3 2.1-11.6-18.4-11.95l-16.7-.25-.5-19.5c-.55-21.95-2-26.7-9.95-32.95-8-6.25-9-6.5-30.05-7.05l-19.5-.5-.55-111c-.6-124.1-.1-115.3-8-136.35-21.45-57.1-81.5-91.3-141.45-80.5m36.1 13.85c33.7 3.1 69.15 27.4 85.25 58.35 14.1 27.1 14.3 29.45 13.95 158.15l-.3 97.5h-225l-.3-97.5c-.25-100.95.2-118.05 3.7-132 11.55-46.05 52-80.75 99-84.95 8.4-.75 11.25-.7 23.7.45m151.2 331c6.85 4.15 7.7 6.95 7.7 26v17h-345v-17c0-21 1.75-25.1 12-27.6 8.25-2 321.9-.45 325.3 1.6"/><path d="M160 145c-1.1 1.1-2 3.35-2 5 0 7.35-3.45 7 67 7s67 .35 67-7 3.45-7-67-7c-61.65 0-63.05.05-65 2M160.65 182.05c-1.95 1.55-2.65 3-2.65 5.45 0 7.8-2.75 7.5 67 7.5 60.95 0 61.75-.05 64.35-2.05 3.65-2.9 3.65-8 0-10.9-4.15-3.25-124.55-3.25-128.7 0"/></svg></div>
                    <div class="implication-question">${t('itemDetails.implications.survivalBeyondDeath')}</div>
                  </div>
                  <div class="implication-stance">${theoryData.implications.survival_beyond_death.stance}</div>
                  <div class="implication-rationale">${theoryData.implications.survival_beyond_death.rationale}</div>
                </div>
                <div class="implication-item">
                  <div class="implication-header">
                    <div class="implication-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 300 300"><path d="M110.7 1.8c-1.5 1.7-1.7 7-1.7 55v53.1l-27.4 45.8c-15 25.2-39.4 66-54.1 90.7-14.8 24.8-27 46-27.3 47.2-.2 1.3.4 3 1.7 4.3L4 300h146c144.7 0 146 0 148-2 1.1-1.1 2-2.8 2-3.8s-15.1-24.8-33.6-52.8-40.8-61.8-49.6-75.1c-8.9-13.4-16.8-24.5-17.9-24.8-1-.4-2.8-.4-3.8 0-1.1.3-8 9.8-15.7 21.5-7.5 11.6-13.9 21-14.3 21-.3 0-10.4-16.5-22.3-36.6L121 110.8V76h37.8c35.4 0 38-.1 39.5-1.8 1-1 1.7-2.8 1.7-3.9 0-1.2-4.4-7-10.5-13.8-5.8-6.4-10.5-12-10.5-12.4 0-.3 4.7-5.9 10.5-12.4 10.9-12.3 12.2-14.9 8.7-18-1.7-1.5-5.9-1.7-39.5-1.7H121V8.9c0-7.4-6.2-11.7-10.3-7.1m68.1 23.9c-.8 1-4.2 5-7.6 8.9-4.1 4.7-6.2 7.9-6.2 9.6s2.4 5.2 7.5 10.9c4.1 4.6 7.5 8.7 7.5 9.1 0 .5-13.3.8-29.5.8H121V24h29.7c28.1 0 29.5.1 28.1 1.7m-48 124.5c7.8 13 14.3 24.1 14.4 24.7.2.6-1.9 2.4-4.7 4l-5 2.9-9.5-5.9c-5.2-3.2-10.3-5.9-11.2-5.9-1 0-6.1 2.7-11.5 6l-9.7 5.9-3.5-2.1c-7.2-4.3-7.8-2.3 8.9-30.3 12.3-20.5 15.5-25.4 16.5-24.3.7.7 7.6 11.9 15.3 25M225 200c15 22.8 34.2 52 42.6 64.7L283 288h-56.5l-5.4-9.3c-3-5-15.3-25.8-27.4-46l-22-36.8 12.7-19c7-10.5 12.9-18.9 13-18.7.2.1 12.6 19 27.6 41.8m-99.8-10.8 10 6.1 4.1-2.1c2.3-1.1 6.1-3.3 8.5-4.7l4.2-2.6 2 3.3c1.1 1.8 14.7 24.7 30.4 50.8l28.3 47.5-97.5.3c-53.6.1-97.7 0-97.9-.2-.4-.4 58-99 59.7-100.9.4-.5 4.1 1.2 8.1 3.7s7.8 4.6 8.4 4.6 5.6-2.7 11.1-6c5.4-3.3 10-6 10.2-6s4.9 2.8 10.4 6.2"/></svg>
                    </div>
                    <div class="implication-question">${t('itemDetails.implications.meaningPurpose')}</div>
                  </div>
                  <div class="implication-stance">${theoryData.implications.meaning_and_purpose.stance}</div>
                  <div class="implication-rationale">${theoryData.implications.meaning_and_purpose.rationale}</div>
                </div>
                <div class="implication-item">
                  <div class="implication-header">
                    <div class="implication-icon">
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 300 300"><path d="M72.2 84.1c-14 2.1-26.9 8.7-37.2 18.9-7.3 7.4-12.1 14.8-15.8 24.8-3.3 9-4.2 27.5-1.8 37.2 5.5 22.1 22.2 40.2 43.7 47.4 24.7 8.3 54.5.3 71.9-19.2 2.9-3.2 13.6-19.8 24.3-37.6 10.5-17.5 20.9-33.9 23.2-36.4 15.7-17.9 44.2-21.8 63.8-8.8 20 13.3 26.8 38.5 16.2 60.1-5.9 12.2-15.9 20.7-28.8 24.7-5.4 1.6-8.7 1.9-16 1.6-12.9-.5-22.2-4.9-31.7-14.8-7.5-7.8-10.8-9.2-15.8-6.6-4.3 2.2-5.9 7.3-3.7 12s13.1 15.3 19.8 19.4c13.7 8.3 32.2 11.3 48.1 7.7 18.8-4.1 36.2-17.6 44.4-34.5 5.5-11.1 7.2-18.3 7.2-30s-1.7-18.9-7.2-30c-8.2-16.9-25.6-30.4-44.4-34.5-16.9-3.8-37.1-.1-51.8 9.5-12.2 8-17.4 14.7-37.5 48.1-19.9 33-22.5 36.9-29.1 42.4-16 13.4-40.3 15.3-57.3 4.5-15.8-10-24.8-29.3-21.8-47.2 4.3-26 28.8-44.1 53.8-39.8 10.8 1.8 18.4 5.8 27 14.5 6.8 6.8 7.8 7.5 11.4 7.5 5.4 0 8.9-3.4 8.9-8.8 0-9.9-19.9-26.1-37.6-30.6-8.1-2-18.6-2.6-26.2-1.5"/></svg>  
</div>
                    <div class="implication-question">${t('itemDetails.implications.virtualImmortality')}</div>
                  </div>
                  <div class="implication-stance">${theoryData.implications.virtual_immortality.stance}</div>
                  <div class="implication-rationale">${theoryData.implications.virtual_immortality.rationale}</div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- V. Relations & Sources -->
          <div class="theory-section">
            <h2>${t('itemDetails.sections.relationsSources')}</h2>
            <div class="section-content">
              <div class="field">
                <div class="field-label">${t('itemDetails.fields.relatedTheories')}</div>
                <div class="field-value">
                  <div class="related-theories-list">
                    ${theoryData.relations_and_sources.related_theories.map(relation => {
        const target = resolveRelated(relation.name)
        const open = target?.kind === 'theory'
          ? `<a class="related-theory-item is-link" href="${target.href}" data-category="${target.category}" data-theory="${target.slug}">`
          : target ? `<button type="button" class="related-theory-item is-link" data-path="${target.path.join('|')}">` : `<div class="related-theory-item">`
        const close = target?.kind === 'theory' ? '</a>' : target ? '</button>' : '</div>'
        return `${open}
                        <div class="theory-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M18.5 9.5V8.7C18.5 7.57989 18.5 7.01984 18.282 6.59202C18.0903 6.21569 17.7843 5.90973 17.408 5.71799C16.9802 5.5 16.4201 5.5 15.3 5.5H7.7C6.57989 5.5 6.01984 5.5 5.59202 5.71799C5.21569 5.90973 4.90973 6.21569 4.71799 6.59202C4.5 7.01984 4.5 7.57989 4.5 8.7V12.3C4.5 13.4201 4.5 13.9802 4.71799 14.408C4.90973 14.7843 5.21569 15.0903 5.59202 15.282C6.01984 15.5 6.57989 15.5 7.7 15.5H13.5" stroke="#FFFFFF" stroke-linecap="round"/>
<path d="M7.5 12.5H11.5" stroke="#FFFFFF" stroke-linecap="round"/>
<path d="M7.5 8.5H14.5" stroke="#FFFFFF" stroke-linecap="round"/>
<circle cx="17.5" cy="13.5" r="2" stroke="#FFFFFF"/>
<path d="M19.5 18.5C19.5 18.5 19 17.5 17.5 17.5C16 17.5 15.5 18.5 15.5 18.5" stroke="#FFFFFF" stroke-linecap="round"/>
</svg>
</div>
                        <div class="theory-content">
                          <div class="theory-name">${relation.name}</div>
                          <div class="theory-relationship">${relation.relationship}</div>
                        </div>
                      ${close}`
      }).join('')}
                  </div>
                </div>
              </div>
          
              <div class="classification-tags">
                <h3>${t('itemDetails.fields.classification')}</h3>
                <div class="tags-container">
                  ${theoryData.id_and_class.classification_tags.map(tag =>
        `<span class="tag">${tag}</span>`
      ).join('')}
                </div>
              </div>

              <div class="field">
                <div class="field-label">${t('itemDetails.fields.sourcesReferences')}</div>
                <div class="field-value">
                  <div class="sources-list">
                    ${theoryData.relations_and_sources.sources_and_references.map(source =>
        `<div class="source-item">
                        <div class="source-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M20 12V17C20 18.8856 20 19.8284 19.4142 20.4142C18.8284 21 17.8856 21 16 21H6.5C5.11929 21 4 19.8807 4 18.5M20 12V7C20 5.11438 20 4.17157 19.4142 3.58579C18.8284 3 17.8856 3 16 3H8C6.11438 3 5.17157 3 4.58579 3.58579C4 4.17157 4 5.11438 4 7V18.5M20 12C20 13.8856 20 14.8284 19.4142 15.4142C18.8284 16 17.8856 16 16 16H6.5C5.11929 16 4 17.1193 4 18.5" stroke="#FFFFFF"/>
<path d="M9 8L15 8" stroke="#FFFFFF" stroke-linecap="round"/>
</svg>
</div>
                        <div class="source-content">
                          <div class="source-title">${source.title_with_names}</div>
                          ${source.year ? `<div class="source-year">${source.year}</div>` : ''}
                        </div>
                      </div>`
      ).join('')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `)
      this.removeEmptyBlocks(infoElement)
      this.wireRelatedLinks(infoElement)
    }

    this.attachLinkTracking()
  }

  private wireRelatedLinks(root: Element) {
    root.querySelectorAll<HTMLAnchorElement>('a.related-theory-item[data-theory]').forEach(link =>
      link.addEventListener('click', event => {
        if (!this.navigator || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
        event.preventDefault()
        analytics.trackClick('related_theory', undefined, link.getAttribute('href') || '')
        this.navigator.openTheory(link.dataset.category!, link.dataset.theory!)
        this.container.querySelector('.item-details-panel')?.scrollTo({ top: 0 })
      })
    )
    root.querySelectorAll<HTMLButtonElement>('button.related-theory-item[data-path]').forEach(button =>
      button.addEventListener('click', () => {
        if (!this.navigator) return
        analytics.trackClick('related_category', undefined, button.dataset.path)
        this.hide()
        this.onCloseCallback?.()
        this.navigator.openPath(button.dataset.path!.split('|'))
      })
    )
  }

  // MTTS uses "" for fields a theory doesn't address; drop them instead of
  // rendering a label over nothing, then drop any section left empty.
  private removeEmptyBlocks(root: Element) {
    root.querySelectorAll('.field').forEach(field => {
      if (!field.querySelector('.field-value')?.textContent?.trim()) field.remove()
    })
    root.querySelectorAll('.implication-item').forEach(item => {
      if (!item.querySelector('.implication-stance')?.textContent?.trim()) item.remove()
    })
    root.querySelectorAll('.theory-section').forEach(section => {
      if (!section.querySelector('.field, .implication-item, .tag')) section.remove()
    })
  }

  public showError(message: string) {
    this.isVisible = true
    const panel = this.container.querySelector('.item-details-panel')
    panel?.classList.add('visible')
    panel?.setAttribute('aria-hidden', 'false')

    const titleElement = this.container.querySelector('#item-title')
    if (titleElement) {
      titleElement.textContent = t('itemDetails.error.title')
    }

    const infoElement = this.container.querySelector('#item-info')
    if (infoElement) {
      infoElement.innerHTML = `
        <div class="error-content">
          <div class="error-icon">⚠️</div>
          <h3>${t('itemDetails.error.heading')}</h3>
          <p>${message}</p>
        </div>
      `
    }
  }

  // Arbitrary content in the panel shell (e.g. a category overview); returns
  // the content element so the caller can wire up links.
  public showContent(title: string, html: string): HTMLElement | null {
    this.isVisible = true
    const panel = this.container.querySelector('.item-details-panel')
    panel?.classList.add('visible')
    panel?.setAttribute('aria-hidden', 'false')
    const titleElement = this.container.querySelector('#item-title')
    if (titleElement) titleElement.textContent = title
    const infoElement = this.container.querySelector<HTMLElement>('#item-info')
    if (infoElement) {
      infoElement.innerHTML = html
      infoElement.scrollTop = 0
    }
    return infoElement
  }

  public showLoading(category: string, theory: string) {
    this.isVisible = true
    const panel = this.container.querySelector('.item-details-panel')
    panel?.classList.add('visible')
    panel?.setAttribute('aria-hidden', 'false')

    const theoryName = theory
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('-')

    const categoryName = category.charAt(0).toUpperCase() + category.slice(1)

    const titleElement = this.container.querySelector('#item-title')
    if (titleElement) {
      titleElement.textContent = theoryName
    }

    const infoElement = this.container.querySelector('#item-info')
    if (infoElement) {
      infoElement.innerHTML = `
        <div class="loading-content">
          <div class="theory-breadcrumb">${categoryName} • ${theoryName}</div>
          <div class="loading-spinner"></div>
          <h3>${t('itemDetails.loading.heading')}</h3>
          <p>${t('itemDetails.loading.body')}</p>
        </div>
      `
    }
  }

  // /compare?t={slug} for the theory in the URL (theory URLs are /{category}/{slug}).
  private compareHref(): string | null {
    const segments = parseLocaleFromPath(window.location.pathname).pathWithoutLocale.split('/').filter(Boolean)
    return segments.length === 2 && !groupPathFromSegments(segments) ? `/compare?t=${encodeURIComponent(segments[1])}` : null
  }

  public hide() {
    this.isVisible = false
    const panel = this.container.querySelector('.item-details-panel')
    panel?.classList.remove('visible')
    panel?.setAttribute('aria-hidden', 'true')
  }

  public isPanelVisible(): boolean {
    return this.isVisible
  }
}

