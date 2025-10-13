import { baseData } from '@/config/chartConfig'

interface TheoryMapping {
  name: string
  category: string
  subcategory?: string
}

class GlobalState {
  private theoryMappings: Map<string, TheoryMapping> = new Map()
  private initialized = false

  public initialize(): void {
    if (this.initialized) return

    this.extractTheoryMappings()
    this.initialized = true
  }

  private extractTheoryMappings(): void {
    for (const mainCategory of baseData) {
      if (mainCategory.children) {
        for (const subcategory of mainCategory.children) {
          if ('children' in subcategory && subcategory.children) {
            for (const theory of subcategory.children) {
              this.theoryMappings.set(theory.name, {
                name: theory.name,
                category: mainCategory.name.toLowerCase(),
                subcategory: subcategory.name.toLowerCase()
              })
            }
          } else {
            // Theory directly under main category
            this.theoryMappings.set(subcategory.name, {
              name: subcategory.name,
              category: mainCategory.name.toLowerCase()
            })
          }
        }
      }
    }
  }

  public getTheoryCategory(theoryName: string): string | null {
    if (!this.initialized) {
      this.initialize()
    }
    
    const mapping = this.theoryMappings.get(theoryName)
    return mapping?.category || null
  }

  public getAllMappings(): Map<string, TheoryMapping> {
    if (!this.initialized) {
      this.initialize()
    }
    
    return new Map(this.theoryMappings)
  }
}

// Create singleton instance
const globalState = new GlobalState()

// Make it available on window for global access
;(window as any).globalState = globalState

export default globalState
