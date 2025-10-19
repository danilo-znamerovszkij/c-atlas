import { baseData } from '../config/chartConfig'
import type { TheoryData } from '../types/theory'

interface ItemData {
  name: string
  heading: string
  text: string
  details: string
  tags: string[]
  category?: string
  subcategory?: string
}

export class ItemDetailsPanel {
  private container: HTMLElement
  private isVisible: boolean = false
  private itemData: Map<string, ItemData> = new Map()
  private onCloseCallback: (() => void) | null = null

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

  private initializeItemData() {
    // Sample data for some key items - you can expand this
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

    // Add more items as needed...
  }

  private render() {
    this.container.innerHTML = `
      <div class="item-details-panel ${this.isVisible ? 'visible' : ''}" 
           role="dialog" 
           aria-labelledby="item-title" 
           aria-hidden="${!this.isVisible}">
        <div class="panel-content">
          <button class="close-btn" 
                  id="close-panel" 
                  aria-label="Close panel"
                  title="Close panel">×</button>
          <div id="item-info">
            <div class="welcome-message">
              <div class="mystic-icon" aria-hidden="true">✦</div>
              <p>Select an item from the chart to explore its mysteries</p>
            </div>
          </div>
        </div>
      </div>
    `

    this.attachEventListeners()
  }

  private attachEventListeners() {
    const closeBtn = this.container.querySelector('#close-panel')
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hide()
        // Call the close callback to update URL
        this.onCloseCallback?.()
      })

      // Add keyboard support
      closeBtn.addEventListener('keydown', (e) => {
        const keyboardEvent = e as KeyboardEvent
        if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
          e.preventDefault()
          this.hide()
          this.onCloseCallback?.()
        }
      })
    }

    // Add escape key support
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
      // Update the content with modern scholarly layout
      const infoElement = this.container.querySelector('#item-info')
      if (infoElement) {
        infoElement.innerHTML = `
          <div class="scholarly-panel">
            <!-- Breadcrumb -->
            <div class="breadcrumb">
              ${this.buildBreadcrumb(itemName).split(' > ').map((item, index, array) => 
                `<span class="breadcrumb-item">${item}</span>${index < array.length - 1 ? '<span class="breadcrumb-separator">›</span>' : ''}`
              ).join('')}
            </div>
            
            <!-- Headline -->
            <h1 class="headline">${itemData.heading}</h1>
            
            <!-- Thinker Line -->
            <div class="thinker-line">
              <span class="thinker-name">${itemName}</span>
              <span class="thinker-role">Philosopher & Theorist</span>
            </div>
            
            <!-- Quote Block -->
            <blockquote class="summary-quote">
              <p>${itemData.text}</p>
            </blockquote>
            
            <!-- Shields Section -->
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
    } else {
      // Fallback for items without data
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
    
    // Attach FAQ event listeners
    this.attachFAQListeners()
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

  private buildBreadcrumb(itemName: string): string {
    // Search for the item in the imported baseData hierarchy
    for (const topLevel of baseData) {
      for (const secondLevel of topLevel.children) {
        if (secondLevel.name === itemName) {
          return `${topLevel.name}`
        }
        // Check if it's a third-level item
        if ('children' in secondLevel && secondLevel.children) {
          for (const thirdLevel of secondLevel.children) {
            if (thirdLevel.name === itemName) {
              return `${topLevel.name} > ${secondLevel.name}`
            }
          }
        }
      }
    }

    // Fallback for items not found in the hierarchy
    return 'Philosophy'
  }

  public showTheory(theoryData: TheoryData) {
    this.isVisible = true
    const panel = this.container.querySelector('.item-details-panel')
    panel?.classList.add('visible')
    panel?.setAttribute('aria-hidden', 'false')
    
    // Update the title
    const titleElement = this.container.querySelector('#item-title')
    if (titleElement) {
      titleElement.textContent = theoryData.id_and_class.theory_title
    }
    
    // Update the content with theory data using MTTS v5.0 format
    const infoElement = this.container.querySelector('#item-info')
    if (infoElement) {
      infoElement.innerHTML = `
        <div class="theory-content">
          <div class="theory-header">
            <h1 class="theory-title">${theoryData.id_and_class.theory_title}</h1>
            <div class="theory-category">
              ${theoryData.id_and_class.category}
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4.5 2L7.5 6L4.5 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              ${theoryData.id_and_class.subcategory}
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
          
          <!-- I. Conceptual Ground -->
          <div class="theory-section">
            <h2>I. Conceptual Ground</h2>
            <div class="section-content">
              <div class="field">
                <div class="field-label">Explanatory Identity Claim</div>
                <div class="field-value">${theoryData.conceptual_ground.explanatory_identity_claim}</div>
              </div>
              <div class="field">
                <div class="field-label">Mind-Body Relationship</div>
                <div class="field-value">${theoryData.conceptual_ground.mind_body_relationship}</div>
              </div>
              <div class="field">
                <div class="field-label">Subjectivity and Intentionality</div>
                <div class="field-value">${theoryData.conceptual_ground.subjectivity_and_intentionality}</div>
              </div>
              <div class="field">
                <div class="field-label">Qualia Account</div>
                <div class="field-value">${theoryData.conceptual_ground.qualia_account}</div>
              </div>
              <div class="field">
                <div class="field-label">Ontological Commitments</div>
                <div class="field-value">${theoryData.conceptual_ground.ontological_commitments}</div>
              </div>
              <div class="field">
                <div class="field-label">Epistemic Access</div>
                <div class="field-value">${theoryData.conceptual_ground.epistemic_access}</div>
              </div>
              <div class="field">
                <div class="field-label">Constituents and Structure</div>
                <div class="field-value">${theoryData.conceptual_ground.constituents_and_structure}</div>
              </div>
              
              <div class="field">
                <div class="field-label">Primitive or Emergent Status</div>
                <div class="field-value">${theoryData.conceptual_ground.primitive_or_emergent_status}</div>
              </div>
              ${theoryData.conceptual_ground.emergence_type && theoryData.conceptual_ground.emergence_type.trim() !== '' ? `
              <div class="field">
                <div class="field-label">Emergence Type</div>
                <div class="field-value">${theoryData.conceptual_ground.emergence_type}</div>
              </div>
              ` : ''}
              <div class="field">
                <div class="field-label">Ontological Status</div>
                <div class="field-value">${theoryData.conceptual_ground.ontological_status}</div>
              </div>
            </div>
          </div>
          
          <!-- II. Mechanism & Dynamics -->
          <div class="theory-section">
            <h2>II. Mechanism & Dynamics</h2>
            <div class="section-content">
              <div class="field">
                <div class="field-label">Scope of Consciousness</div>
                <div class="field-value">${theoryData.mechanism_and_dynamics.scope_of_consciousness}</div>
              </div>
              <div class="field">
                <div class="field-label">Distinctive Mechanism or Principle</div>
                <div class="field-value">${theoryData.mechanism_and_dynamics.distinctive_mechanism_or_principle}</div>
              </div>
              <div class="field">
                <div class="field-label">Dynamics of Emergence</div>
                <div class="field-value">${theoryData.mechanism_and_dynamics.dynamics_of_emergence}</div>
              </div>
              <div class="field">
                <div class="field-label">Location and Distribution</div>
                <div class="field-value">${theoryData.mechanism_and_dynamics.location_and_distribution}</div>
              </div>
              <div class="field">
                <div class="field-label">Causation and Functional Role</div>
                <div class="field-value">${theoryData.mechanism_and_dynamics.causation_and_functional_role}</div>
              </div>
              ${theoryData.mechanism_and_dynamics.integration_or_binding && theoryData.mechanism_and_dynamics.integration_or_binding !== 'Not specified' ? `
              <div class="field">
                <div class="field-label">Integration or Binding</div>
                <div class="field-value">${theoryData.mechanism_and_dynamics.integration_or_binding}</div>
              </div>
              ` : ''}
              <div class="field">
                <div class="field-label">Information Flow or Representation</div>
                <div class="field-value">${theoryData.mechanism_and_dynamics.information_flow_or_representation}</div>
              </div>
              <div class="field">
                <div class="field-label">Evolutionary Account</div>
                <div class="field-value">${theoryData.mechanism_and_dynamics.evolutionary_account}</div>
              </div>
              ${theoryData.mechanism_and_dynamics?.core_claims_and_evidence && theoryData.mechanism_and_dynamics.core_claims_and_evidence.length > 0 ? `
              <div class="field">
                <div class="field-label">Core Claims and Evidence</div>
                <div class="field-value">
                  <div class="claims-list">
                    ${theoryData.mechanism_and_dynamics.core_claims_and_evidence.map(claim => 
                      `<div class="claim-item">
                        <div class="claim-icon">⚡</div>
                        <div class="claim-text">${claim}</div>
                      </div>`
                    ).join('')}
                  </div>
                </div>
              </div>
              ` : ''}
              <div class="field">
                <div class="field-label">Basis of Belief or Evidence Type</div>
                <div class="field-value">${theoryData.mechanism_and_dynamics.basis_of_belief_or_evidence_type}</div>
              </div>
            </div>
          </div>
          
          <!-- III. Empirics & Critiques -->
          <div class="theory-section">
            <h2>III. Empirics & Critiques</h2>
            <div class="section-content">
              <div class="field">
                <div class="field-label">Testability Status</div>
                <div class="field-value">${theoryData.empirics_and_critiques.testability_status}</div>
              </div>
              ${theoryData.empirics_and_critiques.known_empirical_interventions_or_tests && theoryData.empirics_and_critiques.known_empirical_interventions_or_tests !== 'Not specified' ? `
              <div class="field">
                <div class="field-label">Known Empirical Interventions or Tests</div>
                <div class="field-value">${theoryData.empirics_and_critiques.known_empirical_interventions_or_tests}</div>
              </div>
              ` : ''}
              <div class="field">
                <div class="field-label">Criticisms and Tensions</div>
                <div class="field-value">${theoryData.empirics_and_critiques.criticisms_and_tensions}</div>
              </div>
              <div class="field">
                <div class="field-label">Open Questions and Limitations</div>
                <div class="field-value">${theoryData.empirics_and_critiques.open_questions_and_limitations}</div>
              </div>
              <div class="field">
                <div class="field-label">Ontological Coherence</div>
                <div class="field-value">${theoryData.empirics_and_critiques.ontological_coherence}</div>
              </div>
            </div>
          </div>
          
          <!-- IV. Implications -->
          <div class="theory-section">
            <h2>IV. Implications</h2>
            <div class="section-content">
              <div class="implications-list">
                <div class="implication-item">
                  <div class="implication-header">
                    <div class="implication-icon">🤖</div>
                    <div class="implication-question">AI Consciousness</div>
                  </div>
                  <div class="implication-stance">${theoryData.implications.AI_consciousness.stance}</div>
                  <div class="implication-rationale">${theoryData.implications.AI_consciousness.rationale}</div>
                </div>
                <div class="implication-item">
                  <div class="implication-header">
                    <div class="implication-icon">💀</div>
                    <div class="implication-question">Survival Beyond Death</div>
                  </div>
                  <div class="implication-stance">${theoryData.implications.survival_beyond_death.stance}</div>
                  <div class="implication-rationale">${theoryData.implications.survival_beyond_death.rationale}</div>
                </div>
                <div class="implication-item">
                  <div class="implication-header">
                    <div class="implication-icon">🎯</div>
                    <div class="implication-question">Meaning and Purpose</div>
                  </div>
                  <div class="implication-stance">${theoryData.implications.meaning_and_purpose.stance}</div>
                  <div class="implication-rationale">${theoryData.implications.meaning_and_purpose.rationale}</div>
                </div>
                <div class="implication-item">
                  <div class="implication-header">
                    <div class="implication-icon">♾️</div>
                    <div class="implication-question">Virtual Immortality</div>
                  </div>
                  <div class="implication-stance">${theoryData.implications.virtual_immortality.stance}</div>
                  <div class="implication-rationale">${theoryData.implications.virtual_immortality.rationale}</div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- V. Relations & Sources -->
          <div class="theory-section">
            <h2>V. Relations & Sources</h2>
            <div class="section-content">
              <div class="field">
                <div class="field-label">Related Theories</div>
                <div class="field-value">
                  <div class="related-theories-list">
                    ${theoryData.relations_and_sources.related_theories.map(relation => 
                      `<div class="related-theory-item">
                        <div class="theory-icon">🧠</div>
                        <div class="theory-content">
                          <div class="theory-name">${relation.name}</div>
                          <div class="theory-relationship">${relation.relationship}</div>
                        </div>
                      </div>`
                    ).join('')}
                  </div>
                </div>
              </div>
          
              <div class="classification-tags">
                <h3>Classification</h3>
                <div class="tags-container">
                  ${theoryData.id_and_class.classification_tags.map(tag => 
                    `<span class="tag">${tag}</span>`
                  ).join('')}
                </div>
              </div>

              <div class="field">
                <div class="field-label">Sources and References</div>
                <div class="field-value">
                  <div class="sources-list">
                    ${theoryData.relations_and_sources.sources_and_references.map(source => 
                      `<div class="source-item">
                        <div class="source-icon">📚</div>
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
      `
    }
  }

  public showError(message: string) {
    this.isVisible = true
    const panel = this.container.querySelector('.item-details-panel')
    panel?.classList.add('visible')
    panel?.setAttribute('aria-hidden', 'false')
    
    // Update the title
    const titleElement = this.container.querySelector('#item-title')
    if (titleElement) {
      titleElement.textContent = 'Error'
    }
    
    // Update the content with error message
    const infoElement = this.container.querySelector('#item-info')
    if (infoElement) {
      infoElement.innerHTML = `
        <div class="error-content">
          <div class="error-icon">⚠️</div>
          <h3>Failed to Load Theory</h3>
          <p>${message}</p>
        </div>
      `
    }
  }

  public showLoading(category: string, theory: string) {
    this.isVisible = true
    const panel = this.container.querySelector('.item-details-panel')
    panel?.classList.add('visible')
    panel?.setAttribute('aria-hidden', 'false')
    
    // Convert theory slug to display name, preserving dashes
    const theoryName = theory
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('-')
    
    // Convert category slug to display name
    const categoryName = category.charAt(0).toUpperCase() + category.slice(1)
    
    // Update the title
    const titleElement = this.container.querySelector('#item-title')
    if (titleElement) {
      titleElement.textContent = theoryName
    }
    
    // Update the content with loading message and breadcrumb
    const infoElement = this.container.querySelector('#item-info')
    if (infoElement) {
      infoElement.innerHTML = `
        <div class="loading-content">
          <div class="theory-breadcrumb">${categoryName} • ${theoryName}</div>
          <div class="loading-spinner"></div>
          <h3>Loading theory data...</h3>
          <p>Please wait while we fetch the detailed information.</p>
        </div>
      `
    }
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

