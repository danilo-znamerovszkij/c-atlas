// Define the interface locally to avoid import issues
interface TheoryData {
  theoryTitle: string
  category: string
  summary: string
  overview: {
    purpose: string
    focus: string
    approach: string
  }
  components: {
    ontologicalStatus: string
    explanatoryIdentity: string
    functionAndEvolution: {
      function: string
      evolution: string
    }
    causation: string
    location: string
    arguments: Array<{
      id: string
      description: string
      tags: string[]
      clarity_rationality: string
      philosophical_tensions: string[]
    }>
  }
  bigQuestions: {
    ultimateMeaning: string
    aiConsciousness: string
    virtualImmortality: string
    survivalBeyondDeath: string
  }
  philosophicalFocus: {
    mindBodyProblem: string
    consciousnessNature: string
    primitiveVsEmergent: string
    reductionism: string
  }
}

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
      <div class="item-details-panel ${this.isVisible ? 'visible' : ''}">
        <div class="panel-header">
          <h3 id="item-title">Item Details</h3>
          <button class="close-btn" id="close-panel">×</button>
        </div>
        <div class="panel-content">
          <div id="item-info">
            <div class="welcome-message">
              <div class="mystic-icon">✦</div>
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
    }
  }

  public show(itemName: string) {
    this.isVisible = true
    this.container.querySelector('.item-details-panel')?.classList.add('visible')
    
    const itemData = this.itemData.get(itemName)
    
    if (itemData) {
      // Update the title
      const titleElement = this.container.querySelector('#item-title')
      if (titleElement) {
        titleElement.textContent = itemData.heading
      }
      
      // Update the content with rich data
      const infoElement = this.container.querySelector('#item-info')
      if (infoElement) {
        infoElement.innerHTML = `
          <div class="item-content">
            <div class="item-header">
              <h4 class="item-heading">${itemData.heading}</h4>
              ${itemData.category ? `<div class="item-category">${itemData.category}${itemData.subcategory ? ` • ${itemData.subcategory}` : ''}</div>` : ''}
            </div>
            
            <div class="item-description">
              <p class="item-text">${itemData.text}</p>
            </div>
            
            <div class="item-details">
              <h5>Details</h5>
              <p>${itemData.details}</p>
            </div>
            
            <div class="item-tags">
              <h5>Tags</h5>
              <div class="tags-container">
                ${itemData.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
              </div>
            </div>
          </div>
        `
      }
    } else {
      // Fallback for items without data
      const titleElement = this.container.querySelector('#item-title')
      if (titleElement) {
        titleElement.textContent = itemName
      }
      
      const infoElement = this.container.querySelector('#item-info')
      if (infoElement) {
        infoElement.innerHTML = `
          <div class="item-content">
            <div class="item-header">
              <h4 class="item-heading">${itemName}</h4>
            </div>
            <div class="item-description">
              <p class="item-text">Information about this item is being gathered from the depths of knowledge...</p>
            </div>
          </div>
        `
      }
    }
  }

  public showTheory(theoryData: TheoryData) {
    this.isVisible = true
    this.container.querySelector('.item-details-panel')?.classList.add('visible')
    
    // Update the title
    const titleElement = this.container.querySelector('#item-title')
    if (titleElement) {
      titleElement.textContent = theoryData.theoryTitle
    }
    
    // Update the content with theory data
    const infoElement = this.container.querySelector('#item-info')
    if (infoElement) {
      infoElement.innerHTML = `
        <div class="theory-content">
          <div class="theory-header">
            <h1 class="theory-title">${theoryData.theoryTitle}</h1>
            <div class="theory-category">${theoryData.category}</div>
          </div>
          
          <div class="theory-summary">
            <p class="theory-summary-text">${theoryData.summary}</p>
          </div>
          
          <div class="theory-overview">
            <h3>Overview</h3>
            <div class="overview-grid">
              <div class="overview-item">
                <h4>Purpose</h4>
                <p>${theoryData.overview.purpose}</p>
              </div>
              <div class="overview-item">
                <h4>Focus</h4>
                <p>${theoryData.overview.focus}</p>
              </div>
              <div class="overview-item">
                <h4>Approach</h4>
                <p>${theoryData.overview.approach}</p>
              </div>
            </div>
          </div>
          
          <div class="theory-components">
            <h3>Key Components</h3>
            <div class="component-item">
              <h4>Ontological Status</h4>
              <p>${theoryData.components.ontologicalStatus}</p>
            </div>
            <div class="component-item">
              <h4>Explanatory Identity</h4>
              <p>${theoryData.components.explanatoryIdentity}</p>
            </div>
          </div>
        </div>
      `
    }
  }

  public showError(message: string) {
    this.isVisible = true
    this.container.querySelector('.item-details-panel')?.classList.add('visible')
    
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

  public hide() {
    this.isVisible = false
    this.container.querySelector('.item-details-panel')?.classList.remove('visible')
  }

  public isPanelVisible(): boolean {
    return this.isVisible
  }
}

