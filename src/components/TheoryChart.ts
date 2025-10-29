import { ChartContainer } from './ChartContainer'
import { ItemDetailsPanel } from './ItemDetailsPanel'
import { getChartOptions, getAllTheoryNames, setMobileLabelVisibility, refreshChartData } from '@/config/chartConfig'
import { getTheoryFullName } from '@/data/theoryNames'
import { Router } from '@/utils/routing'
import { generateSlug } from '@/utils/slugUtils'
import globalState from '@/utils/globalState'
import analytics from '@/utils/analytics'

export class TheoryChart {
  private chartContainer: ChartContainer
  private itemDetailsPanel: ItemDetailsPanel
  private router: Router
  private currentTheoryIndex: number = 0
  private allTheoryNames: string[] = []

  constructor(containerId: string, router: Router) {
    this.chartContainer = new ChartContainer(containerId)
    this.router = router
    this.itemDetailsPanel = new ItemDetailsPanel('item-details')
  }

  initialize() {
    this.chartContainer.init('canvas', 'dark')
    this.chartContainer.setOption(getChartOptions())
    this.allTheoryNames = getAllTheoryNames()
    this.setupChartEvents()
    this.setupResizeHandler()
    this.setupKeyboardNavigation()
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
      const tooltip = document.getElementById('custom-tooltip')
      
      chart.on('mouseover', (params: any) => {
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
          this.handleTheoryClick(params.data)
        } else {
          setMobileLabelVisibility(false)
          this.refreshChartWithNewData()

        }
      })
    }
  }


  private setupResizeHandler() {
    let resizeTimeout: number
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = window.setTimeout(() => {
        setMobileLabelVisibility(false)
        this.chartContainer.setOption(getChartOptions())
      }, 100)
    })
  }

  private setupKeyboardNavigation() {
    document.addEventListener('keydown', (event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault()
        this.navigateToNextTheory()
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        this.navigateToPreviousTheory()
      }
    })
  }

  private navigateToNextTheory() {
    if (this.allTheoryNames.length === 0) return
    
    this.clearHighlight()
    this.currentTheoryIndex = (this.currentTheoryIndex + 1) % this.allTheoryNames.length
    this.selectTheory(this.allTheoryNames[this.currentTheoryIndex])
  }

  private navigateToPreviousTheory() {
    if (this.allTheoryNames.length === 0) return
    
    this.clearHighlight()
    this.currentTheoryIndex = this.currentTheoryIndex === 0 
      ? this.allTheoryNames.length - 1 
      : this.currentTheoryIndex - 1
    this.selectTheory(this.allTheoryNames[this.currentTheoryIndex])
  }

  private selectTheory(theoryName: string) {
    const chart = this.chartContainer.getChart()
    if (!chart) return

    const option = chart.getOption() as any
    const seriesData = option.series?.[0]?.data

    if (!seriesData) return

    const theoryData = this.findTheoryInData(seriesData, theoryName)
    if (!theoryData) return

    this.highlightTheory(theoryName)
    this.handleTheoryClick(theoryData)
  }

  private highlightTheory(theoryName: string) {
    const chart = this.chartContainer.getChart()
    if (!chart) return

    chart.dispatchAction({
      type: 'highlight',
      seriesIndex: 0,
      dataIndex: this.getTheoryDataIndex(theoryName)
    })
  }

  private getTheoryDataIndex(theoryName: string): number {
    return this.currentTheoryIndex
  }

  private clearHighlight() {
    const chart = this.chartContainer.getChart()
    if (!chart) return

    chart.dispatchAction({
      type: 'downplay',
      seriesIndex: 0
    })
  }

  private findTheoryInData(data: any[], theoryName: string): any | null {
    for (const item of data) {
      if (item.name === theoryName && !item.children) {
        return item
      }
      if (item.children) {
        const found = this.findTheoryInData(item.children, theoryName)
        if (found) return found
      }
    }
    return null
  }

  private handleTheoryClick(theoryData: any) {
    if (theoryData.children) {
      if (theoryData.name !== 'Materialism') {
        setMobileLabelVisibility(true)
        this.refreshChartWithNewData()
      }
      
      const chart = this.chartContainer.getChart()
      if (chart) {
        chart.dispatchAction({
          type: 'sunburstRootToNode',
          targetNodeId: theoryData.name
        })
      }
      
      this.itemDetailsPanel.hide()
      return
    }
    
    setMobileLabelVisibility(false)

    const theoryName = theoryData.name
    const fileName = `${theoryName}.json`
    const filePath = `/data/${fileName}`
    fetch(filePath)
      .then(response => {
        if (response.ok) {
          const slug = generateSlug(theoryName)
          const category = globalState.getTheoryCategory(theoryName) || theoryData.parent?.toLowerCase() || 'neurobiological'
          
          // Track page view for theory navigation
          analytics.trackPageView(theoryName, category, theoryData.parent)
          
          this.router.navigateToTheory(category, slug)
        } else {
          // Track page view for generic theory display
          const category = theoryData.parent?.toLowerCase() || 'unknown'
          analytics.trackPageView(theoryName, category, theoryData.parent)
          this.itemDetailsPanel.show(theoryData.name)
        }
      })
      .catch(() => {
        // Track page view for error case
        const category = theoryData.parent?.toLowerCase() || 'unknown'
        analytics.trackPageView(theoryName, category, theoryData.parent)
        this.itemDetailsPanel.show(theoryData.name)
      })
  }

  private isMobile(): boolean {
    return window.innerWidth <= 768
  }

  private refreshChartWithNewData() {
    const newOptions = getChartOptions()
    if (newOptions.series && Array.isArray(newOptions.series) && newOptions.series[0]) {
      (newOptions.series[0] as any).data = refreshChartData()
    }
    this.chartContainer.setOption(newOptions)
  }

}
