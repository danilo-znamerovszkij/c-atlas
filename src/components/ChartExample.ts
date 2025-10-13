import { ChartContainer } from './ChartContainer'
import { ItemDetailsPanel } from './ItemDetailsPanel'
import { getChartOptions } from '@/config/chartConfig'
import { getTheoryFullName } from '@/data/theoryNames'
import { Router } from '@/utils/routing'
import { generateSlug } from '@/utils/slugUtils'
import globalState from '@/utils/globalState'

export class TheoryChart {
  private chartContainer: ChartContainer
  private itemDetailsPanel: ItemDetailsPanel
  private router: Router

  constructor(containerId: string, router: Router) {
    this.chartContainer = new ChartContainer(containerId)
    this.router = router
    
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
      // Custom tooltip functionality
      const tooltip = document.getElementById('custom-tooltip')
      
      chart.on('mouseover', (params: any) => {
        // console.log('Mouseover:', params.data.parent)
        // Don't show tooltip if no parent or if parent is Materialism
        if (params.data && tooltip && params.data.parent !== undefined && params.data.parent !== 'Materialism') {
          const fullName = getTheoryFullName(params.data.name)
          tooltip.textContent = fullName || 'Unknown'
          tooltip.style.left = params.event.offsetX + 10 + 'px'
          tooltip.style.top = params.event.offsetY - 10 + 'px'
          tooltip.classList.add('visible')
        }
      })
      
      chart.on('mouseout', () => {
        if (tooltip) {
          tooltip.classList.remove('visible')
        }
      })
      
      chart.on('click', (params: any) => {
        if (params.data && params.data.name) {
          
          // If this is a parent item with children, hide the panel
          if (params.data.children) {
            this.itemDetailsPanel.hide()
            return
          }
          
          // Check if this is a theory with JSON data by trying to load it
          const theoryName = params.data.name
          const fileName = `${theoryName}.json`
          const filePath = `/data/${fileName}`
          
          // Try to fetch the theory data directly
          fetch(filePath)
            .then(response => {
              if (response.ok) {
                const slug = generateSlug(theoryName)
                const category = globalState.getTheoryCategory(theoryName) || params.data.parent?.toLowerCase() || 'neurobiological'
                this.router.navigateToTheory(category, slug)
              } else {
                // No JSON data, show generic item details
                this.itemDetailsPanel.show(params.data.name)
              }
            })
            .catch(() => {
              // Error loading, show generic item details
              this.itemDetailsPanel.show(params.data.name)
            })
        }
      })
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
