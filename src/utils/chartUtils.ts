import type { ChartDataItem } from '@/types/chart'

export const chartUtils = {
  calculateTotal(data: ChartDataItem[]): number {
    return data.reduce((total, item) => {
      const itemValue = item.value || 0
      const childrenValue = item.children ? this.calculateTotal(item.children) : 0
      return total + itemValue + childrenValue
    }, 0)
  },

  flattenData(data: ChartDataItem[]): ChartDataItem[] {
    const result: ChartDataItem[] = []
    
    const flatten = (items: ChartDataItem[]) => {
      items.forEach(item => {
        result.push(item)
        if (item.children) {
          flatten(item.children)
        }
      })
    }
    
    flatten(data)
    return result
  },

  findItem(data: ChartDataItem[], name: string): ChartDataItem | null {
    for (const item of data) {
      if (item.name === name) {
        return item
      }
      if (item.children) {
        const found = this.findItem(item.children, name)
        if (found) return found
      }
    }
    return null
  },

  generateRandomData(depth: number = 3, maxChildren: number = 5): ChartDataItem[] {
    const generateNode = (currentDepth: number): ChartDataItem => {
      const name = `Node_${Math.random().toString(36).substr(2, 5)}`
      
      if (currentDepth >= depth) {
        return {
          name,
          value: Math.floor(Math.random() * 100) + 1
        }
      }
      
      const numChildren = Math.floor(Math.random() * maxChildren) + 1
      const children: ChartDataItem[] = []
      
      for (let i = 0; i < numChildren; i++) {
        children.push(generateNode(currentDepth + 1))
      }
      
      return {
        name,
        children
      }
    }
    
    return [generateNode(0)]
  }
}
