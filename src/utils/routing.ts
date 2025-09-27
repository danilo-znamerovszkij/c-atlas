// Lazy loading - no imports at startup

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

export class Router {
  private static instance: Router
  private currentTheory: TheoryData | null = null
  private onTheoryChange: ((theory: TheoryData | null, error?: string) => void) | null = null

  private constructor() {
    this.setupPopstateListener()
    this.parseCurrentURL()
  }

  public static getInstance(): Router {
    if (!Router.instance) {
      Router.instance = new Router()
    }
    return Router.instance
  }

  public setTheoryChangeCallback(callback: (theory: TheoryData | null, error?: string) => void) {
    this.onTheoryChange = callback
  }

  private setupPopstateListener() {
    window.addEventListener('popstate', () => {
      this.parseCurrentURL()
    })
  }

  private async parseCurrentURL() {
    const path = window.location.pathname
    const segments = path.split('/').filter(segment => segment.length > 0)
    
    if (segments.length >= 2) {
      const category = segments[0]
      const theory = segments[1]
      
      try {
        const theoryData = await this.loadTheory(category, theory)
        this.currentTheory = theoryData
        this.onTheoryChange?.(theoryData)
      } catch (error) {
        console.error('Failed to load theory:', error)
        this.currentTheory = null
        // Pass error to callback for display
        this.onTheoryChange?.(null, error instanceof Error ? error.message : 'Unknown error')
      }
    } else {
      this.currentTheory = null
      this.onTheoryChange?.(null)
    }
  }

  private async loadTheory(category: string, theory: string): Promise<TheoryData> {
    // Map URL segments to file paths for lazy loading
    const theoryMap: Record<string, Record<string, string>> = {
      'materialism': {
        'iit': '/src/data/IIT.json',
        'materialism': '/src/data/Materialism.json'
      },
      'electromagnetic': {
        'zhang': '/src/data/Zhang.json'
      }
    }

    const filePath = theoryMap[category]?.[theory]
    if (!filePath) {
      throw new Error(`Theory not found: ${category}/${theory}`)
    }

    try {
      // Dynamically fetch the JSON file
      const response = await fetch(filePath)
      if (!response.ok) {
        throw new Error(`Failed to load theory data: ${response.statusText}`)
      }
      const theoryData = await response.json() as TheoryData
      return theoryData
    } catch (error) {
      console.error(`Error loading theory ${category}/${theory}:`, error)
      throw new Error(`Failed to load theory data: ${error}`)
    }
  }

  public navigateToTheory(category: string, theory: string) {
    const newPath = `/${category}/${theory}`
    window.history.pushState({}, '', newPath)
    this.parseCurrentURL()
  }

  public getCurrentTheory(): TheoryData | null {
    return this.currentTheory
  }

  public goHome() {
    window.history.pushState({}, '', '/')
    this.parseCurrentURL()
  }

  public getAllTheories(): Array<{category: string, theory: string, title: string}> {
    return [
      { category: 'materialism', theory: 'iit', title: 'Integrated Information Theory (IIT)' },
      { category: 'materialism', theory: 'materialism', title: 'Materialism' },
      { category: 'electromagnetic', theory: 'zhang', title: 'Zhang\'s Long-Distance Light-Speed Telecommunications' }
    ]
  }
}
