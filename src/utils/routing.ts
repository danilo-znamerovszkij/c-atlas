import type { TheoryData } from '../types/theory'
import { generateSlug } from './slugUtils'


async function loadTheoryByName(theoryName: string): Promise<TheoryData> {
  const fileName = `${theoryName}.json`
  const filePath = `/data/${fileName}`
  
  try {
    const response = await fetch(filePath)
    if (!response.ok) {
      throw new Error(`Failed to load theory data: ${response.statusText}`)
    }
    const theoryData = await response.json() as TheoryData
    return theoryData
  } catch (error) {
    throw new Error(`Failed to load theory data: ${error}`)
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
        this.onTheoryChange?.(null, error instanceof Error ? error.message : 'Unknown error')
      }
    } else {
      this.currentTheory = null
      this.onTheoryChange?.(null)
    }
  }

  private async loadTheory(category: string, theory: string): Promise<TheoryData> {
    const theoryName = theory.replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
    
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
