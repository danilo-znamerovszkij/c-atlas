import { ChartContainer } from './ChartContainer'
import { ItemDetailsPanel } from './ItemDetailsPanel'
import { getChartOptions } from '@/config/chartConfig'

export class ChartExample {
  private chartContainer: ChartContainer
  private itemDetailsPanel: ItemDetailsPanel

  constructor(containerId: string) {
    this.chartContainer = new ChartContainer(containerId)
    
    // Initialize item details panel
    this.itemDetailsPanel = new ItemDetailsPanel('item-details')
  }

  initialize() {
    // Initialize the chart with SVG renderer and dark theme
    this.chartContainer.init('canvas', 'dark')
    
    // Set the chart options
    this.chartContainer.setOption(getChartOptions())

    // Add click event listener
    this.setupChartEvents()
    
    // Add resize handler to refresh data when screen size changes
    this.setupResizeHandler()
  }

  updateData(newOptions: any) {
    this.chartContainer.setOption(newOptions)
  }

  destroy() {
    this.chartContainer.destroy()
  }

  getItemDetailsPanel() {
    return this.itemDetailsPanel
  }

  private setupChartEvents() {
    const chart = this.chartContainer.getChart()
    if (chart) {
      chart.on('click', (params: any) => {
        console.log('Chart clicked:', params)
        if (params.data) {
          console.log('Clicked data:', params.data)
          console.log('Parent:', params.data.parent, 'Name:', params.data.name)
          
          // Check if this is a specific theory item that has JSON data
          const theoryMapping = this.getTheoryMapping()
          const theoryKey = `${params.data.parent || ''}/${params.data.name}`.toLowerCase()
          console.log('Theory key:', theoryKey)
          console.log('Theory mapping:', theoryMapping)
          
          if (theoryMapping[theoryKey]) {
            console.log('Found theory mapping, navigating to:', theoryMapping[theoryKey])
            // Navigate to the specific theory
            const { category, theory } = theoryMapping[theoryKey]
            if ((window as any).router) {
              (window as any).router.navigateToTheory(category, theory)
            }
          } else if (!params.data.children) {
            console.log('Showing generic item details for:', params.data.name)
            // Show generic item details for other end items
            this.itemDetailsPanel.show(params.data.name)
          } else {
            console.log('Parent item clicked, hiding panel')
            // This is a parent item with children, close the panel
            this.itemDetailsPanel.hide()
          }
        }
      })
    }
  }

  private getTheoryMapping(): Record<string, {category: string, theory: string}> {
    return {
      'electromagnetic/zhang': { category: 'electromagnetic', theory: 'zhang' },
      'materialism/iit': { category: 'materialism', theory: 'iit' },
      'materialism/materialism': { category: 'materialism', theory: 'materialism' }
    }
  }

  private setupResizeHandler() {
    let resizeTimeout: number
    window.addEventListener('resize', () => {
      // Debounce resize events
      clearTimeout(resizeTimeout)
      resizeTimeout = window.setTimeout(() => {
        // Refresh the chart data to update label visibility based on screen size
        this.chartContainer.setOption(getChartOptions())
      }, 100)
    })
  }
}
