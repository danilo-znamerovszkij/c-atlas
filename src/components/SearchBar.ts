import { generateSlug } from '../utils/slugUtils'
import globalState from '../utils/globalState'

export class SearchBar {
  private container: HTMLElement
  private input!: HTMLInputElement
  private dropdown!: HTMLElement
  private router: any
  private allTheories: Array<{name: string, title: string}> = []

  constructor(containerId: string, router: any) {
    const element = document.getElementById(containerId)
    if (!element) {
      throw new Error(`Container with id '${containerId}' not found`)
    }
    this.container = element
    this.router = router
    this.loadTheories()
    this.render()
    this.attachEventListeners()
  }

  private async loadTheories() {
    try {
      const { theoryFullNames } = await import('../data/theoryNames')
      this.allTheories = Object.entries(theoryFullNames).map(([name, title]) => ({
        name,
        title
      }))
    } catch (error) {
      console.error('Failed to load theory names:', error)
      this.allTheories = []
    }
  }

  private async loadAndNavigateToTheory(theoryName: string) {
    const fileName = `${theoryName}.json`
    const filePath = `/data/${fileName}`
    
    try {
      const response = await fetch(filePath)
      if (response.ok) {
        const slug = generateSlug(theoryName)
        const category = globalState.getTheoryCategory(theoryName) || 'neurobiological'
        this.router.navigateToTheory(category, slug)
      } else {
        console.warn(`Theory ${theoryName} not found`)
      }
    } catch (error) {
      console.error(`Error loading theory ${theoryName}:`, error)
    }
  }

  private render() {
    this.container.innerHTML = `
      <div class="search-container">
        <div class="search-input-wrapper">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input 
            type="text" 
            id="theory-search" 
            placeholder="Search theories..." 
            autocomplete="off"
            aria-label="Search theories"
            aria-describedby="search-dropdown"
            role="combobox"
            aria-expanded="false"
            aria-haspopup="listbox"
          />
        </div>
        <div class="search-dropdown" 
             id="search-dropdown" 
             role="listbox" 
             aria-label="Search results"></div>
      </div>
    `

    this.input = this.container.querySelector('#theory-search') as HTMLInputElement
    this.dropdown = this.container.querySelector('#search-dropdown') as HTMLElement
  }

  private attachEventListeners() {
    this.input.addEventListener('input', (e) => {
      const query = (e.target as HTMLInputElement).value.toLowerCase().trim()
      this.handleSearch(query)
    })

    this.input.addEventListener('focus', () => {
      if (this.input.value.trim()) {
        this.showDropdown()
      }
    })

    this.input.addEventListener('blur', () => {
      setTimeout(() => {
        this.hideDropdown()
      }, 200)
    })

    this.input.addEventListener('keydown', (e) => {
      const keyboardEvent = e as KeyboardEvent
      if (keyboardEvent.key === 'ArrowDown') {
        e.preventDefault()
        this.focusFirstItem()
      } else if (keyboardEvent.key === 'Escape') {
        this.hideDropdown()
        this.input.blur()
      }
    })

    this.dropdown.addEventListener('mousedown', (e) => {
      e.preventDefault()
    })
  }

  private handleSearch(query: string) {
    if (query.length < 2) {
      this.hideDropdown()
      return
    }

    const filteredTheories = this.allTheories.filter(theory => 
      theory.title.toLowerCase().includes(query) ||
      theory.name.toLowerCase().includes(query)
    )

    this.showDropdown(filteredTheories)
  }

  private showDropdown(theories?: Array<{name: string, title: string}>) {
    const theoriesToShow = theories || this.allTheories
    
    if (theoriesToShow.length === 0) {
      this.hideDropdown()
      return
    }

    this.dropdown.innerHTML = theoriesToShow
      .slice(0, 8)
      .map((theory) => `
        <div class="search-item" 
             data-theory="${theory.name}"
             role="option"
             tabindex="0"
             aria-selected="false">
          <div class="search-item-title">${theory.title}</div>
          <div class="search-item-name">${theory.name}</div>
        </div>
      `).join('')

    this.dropdown.classList.add('visible')
    this.input.setAttribute('aria-expanded', 'true')

    // Add click handlers to dropdown items
    this.dropdown.querySelectorAll('.search-item').forEach((item, index) => {
      item.addEventListener('click', () => {
        const theoryName = item.getAttribute('data-theory')
        if (theoryName) {
          // Try to load the theory directly and let the router handle category detection
          this.loadAndNavigateToTheory(theoryName)
          this.input.value = ''
          this.hideDropdown()
        }
      })

      // Add keyboard navigation
      item.addEventListener('keydown', (e) => {
        const keyboardEvent = e as KeyboardEvent
        if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
          e.preventDefault()
          const theoryName = item.getAttribute('data-theory')
          if (theoryName) {
            this.loadAndNavigateToTheory(theoryName)
            this.input.value = ''
            this.hideDropdown()
          }
        } else if (keyboardEvent.key === 'ArrowDown') {
          e.preventDefault()
          const nextItem = this.dropdown.querySelectorAll('.search-item')[index + 1] as HTMLElement
          if (nextItem) {
            nextItem.focus()
          }
        } else if (keyboardEvent.key === 'ArrowUp') {
          e.preventDefault()
          if (index === 0) {
            this.input.focus()
          } else {
            const prevItem = this.dropdown.querySelectorAll('.search-item')[index - 1] as HTMLElement
            if (prevItem) {
              prevItem.focus()
            }
          }
        }
      })
    })
  }

  private hideDropdown() {
    this.dropdown.classList.remove('visible')
    this.input.setAttribute('aria-expanded', 'false')
  }

  private focusFirstItem() {
    const firstItem = this.dropdown.querySelector('.search-item') as HTMLElement
    if (firstItem) {
      firstItem.focus()
    }
  }

}
