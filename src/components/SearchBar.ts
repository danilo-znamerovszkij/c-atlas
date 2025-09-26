export class SearchBar {
  private container: HTMLElement
  private input!: HTMLInputElement
  private dropdown!: HTMLElement
  private router: any
  private allTheories: Array<{category: string, theory: string, title: string}> = []

  constructor(containerId: string, router: any) {
    const element = document.getElementById(containerId)
    if (!element) {
      throw new Error(`Container with id '${containerId}' not found`)
    }
    this.container = element
    this.router = router
    this.allTheories = router.getAllTheories()
    this.render()
    this.attachEventListeners()
  }

  private render() {
    this.container.innerHTML = `
      <div class="search-container">
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
      // Delay hiding to allow clicks on dropdown items
      setTimeout(() => {
        this.hideDropdown()
      }, 200)
    })

    // Add keyboard navigation
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

    // Prevent dropdown from closing when clicking on it
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
      theory.category.toLowerCase().includes(query) ||
      theory.theory.toLowerCase().includes(query)
    )

    this.showDropdown(filteredTheories)
  }

  private showDropdown(theories?: Array<{category: string, theory: string, title: string}>) {
    const theoriesToShow = theories || this.allTheories
    
    if (theoriesToShow.length === 0) {
      this.hideDropdown()
      return
    }

    this.dropdown.innerHTML = theoriesToShow
      .slice(0, 8) // Limit to 8 results
      .map((theory) => `
        <div class="search-item" 
             data-category="${theory.category}" 
             data-theory="${theory.theory}"
             role="option"
             tabindex="0"
             aria-selected="false">
          <div class="search-item-title">${theory.title}</div>
          <div class="search-item-category">${theory.category}</div>
        </div>
      `).join('')

    this.dropdown.classList.add('visible')
    this.input.setAttribute('aria-expanded', 'true')

    // Add click handlers to dropdown items
    this.dropdown.querySelectorAll('.search-item').forEach((item, index) => {
      item.addEventListener('click', () => {
        const category = item.getAttribute('data-category')
        const theory = item.getAttribute('data-theory')
        if (category && theory) {
          this.router.navigateToTheory(category, theory)
          this.input.value = ''
          this.hideDropdown()
        }
      })

      // Add keyboard navigation
      item.addEventListener('keydown', (e) => {
        const keyboardEvent = e as KeyboardEvent
        if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
          e.preventDefault()
          const category = item.getAttribute('data-category')
          const theory = item.getAttribute('data-theory')
          if (category && theory) {
            this.router.navigateToTheory(category, theory)
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
