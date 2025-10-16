import type { TheoryData } from '../types/theory'
import { generateSlug } from './slugUtils'

// Simple cache for theory data
const theoryCache = new Map<string, TheoryData>()

async function loadTheoryByName(theoryName: string): Promise<TheoryData> {
  // Check cache first
  if (theoryCache.has(theoryName)) {
    return theoryCache.get(theoryName)!
  }
  const fileName = `${theoryName}.json`
  const filePath = `/data/${fileName}`
  
  try {
    const response = await fetch(filePath)
    if (!response.ok) {
      throw new Error(`Failed to load theory data: ${response.statusText}`)
    }
    const theoryData = await response.json() as TheoryData
    // Cache the result
    theoryCache.set(theoryName, theoryData)
    return theoryData
  } catch (error) {
    throw new Error(`Failed to load theory data: ${error}`)
  }
}

export class Router {
  private static instance: Router
  private currentTheory: TheoryData | null = null
  private onTheoryChange: ((theory: TheoryData | null, error?: string) => void) | null = null
  private onLoading: ((category: string, theory: string) => void) | null = null

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

  public setLoadingCallback(callback: (category: string, theory: string) => void) {
    this.onLoading = callback
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
      
      // Convert slug back to theory name for loading and callback
      const theoryName = theory
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('-')
      
      // Show loading state with category and theory info
      this.onLoading?.(category, theory)
      
      try {
        const theoryData = await this.loadTheory(category, theory)
        this.currentTheory = theoryData
        this.onTheoryChange?.(theoryData)
      } catch (error) {
        console.error('Failed to load theory:', error)
        this.currentTheory = null
        this.onTheoryChange?.(null, error instanceof Error ? error.message : 'Unknown error')
      }
    } else {
      this.currentTheory = null
      this.onTheoryChange?.(null)
    }
  }

  private async loadTheory(category: string, theory: string): Promise<TheoryData> {
    // Convert slug back to theory name, preserving dashes
    const theoryName = theory
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('-')
    
    return await loadTheoryByName(theoryName)
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

  public async getAllTheories(): Promise<Array<{category: string, theory: string, title: string}>> {
    return []
  }
}
