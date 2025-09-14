export class SearchBar {
  private container: HTMLElement
  private input: HTMLInputElement
  private dropdown: HTMLElement
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
        />
        <div class="search-dropdown" id="search-dropdown"></div>
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
      .map(theory => `
        <div class="search-item" data-category="${theory.category}" data-theory="${theory.theory}">
          <div class="search-item-title">${theory.title}</div>
          <div class="search-item-category">${theory.category}</div>
        </div>
      `).join('')

    this.dropdown.classList.add('visible')

    // Add click handlers to dropdown items
    this.dropdown.querySelectorAll('.search-item').forEach(item => {
      item.addEventListener('click', () => {
        const category = item.getAttribute('data-category')
        const theory = item.getAttribute('data-theory')
        if (category && theory) {
          this.router.navigateToTheory(category, theory)
          this.input.value = ''
          this.hideDropdown()
        }
      })
    })
  }

  private hideDropdown() {
    this.dropdown.classList.remove('visible')
  }
}
