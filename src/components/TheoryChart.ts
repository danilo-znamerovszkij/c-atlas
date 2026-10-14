import { ChartContainer } from './ChartContainer'
import { ItemDetailsPanel } from './ItemDetailsPanel'
import { ChartLevelBar, type LevelBarItem } from './ChartLevelBar'
import { getChartOptions, getChartLevels, getAllTheoryNames, setMobileLabelVisibility, setHighlightedTheories, refreshChartData, baseData, getDisplayLabel } from '@/config/chartConfig'
import { getTheoryFullName } from '@/data/theoryNames'
import { Router, loadTheoryByName } from '@/utils/routing'
import { generateSlug } from '@/utils/slugUtils'
import globalState from '@/utils/globalState'
import analytics from '@/utils/analytics'
import { t } from '@/utils/i18n'

export class TheoryChart {
  private chartContainer: ChartContainer
  private itemDetailsPanel: ItemDetailsPanel
  private levelBar: ChartLevelBar
  private onPathChange: ((path: string[]) => void) | null = null
  private router: Router
  private currentTheoryIndex: number = 0
  private allTheoryNames: string[] = []
  private currentPath: string[] = []
  // openPath() steps through several levels; report only where it ends up.
  private batching = false

  constructor(containerId: string, router: Router) {
    this.chartContainer = new ChartContainer(containerId)
    this.router = router
    this.itemDetailsPanel = new ItemDetailsPanel('item-details')
    this.itemDetailsPanel.setNavigator({
      openTheory: (category, slug) => this.router.navigateToTheory(category, slug),
      openPath: path => this.openPath(path)
    })
    this.levelBar = new ChartLevelBar('chart-level-bar', {
      onSelect: (name) => this.selectFromLevelBar(name),
      onBack: () => this.goBack()
    })
  }

  initialize() {
    this.chartContainer.init('canvas', 'dark')
    this.chartContainer.setOption(getChartOptions())
    this.allTheoryNames = getAllTheoryNames()
    this.setupChartEvents()
    this.setupResizeHandler()
    this.setupKeyboardNavigation()
    this.syncLevelBar()
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
          tooltip.textContent = fullName || t('misc.unknown')
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
          this.goBack()
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
        this.chartContainer.setOption(getChartOptions(this.currentPath.length === 0))
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
      } else {
        this.chartContainer.setOption({ series: [{ levels: getChartLevels(false) }] })
      }

      const chart = this.chartContainer.getChart()
      if (chart) {
        chart.dispatchAction({
          type: 'sunburstRootToNode',
          targetNodeId: theoryData.name
        })
      }

      this.itemDetailsPanel.hide()
      // Full ancestry, not just the clicked node: a subcategory ring can be
      // clicked straight from the overview (e.g. Materialism > Computational).
      this.currentPath = this.pathToGroup(theoryData.name) ?? [...this.currentPath, theoryData.name]
      this.syncLevelBar()
      return
    }

    setMobileLabelVisibility(false)

    const theoryName = theoryData.name
    loadTheoryByName(theoryName, this.router.getCurrentLocale())
      .then(() => {
        const slug = generateSlug(theoryName)
        const category = globalState.getTheoryCategory(theoryName) || theoryData.parent?.toLowerCase() || 'neurobiological'
        // Page view is tracked by the router, for every way a theory opens.
        this.router.navigateToTheory(category, slug)
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

  // Highlights the given leaves (dims the rest); null clears the filter.
  // Re-setting the data resets ECharts' drill-down, so re-enter the current node.
  applyFilter(names: Set<string> | null) {
    setHighlightedTheories(names)
    const overview = this.currentPath.length === 0
    this.chartContainer.setOption(getChartOptions(overview))
    if (!overview) {
      this.chartContainer.getChart()?.dispatchAction({
        type: 'sunburstRootToNode',
        targetNodeId: this.currentPath[this.currentPath.length - 1]
      })
    }
  }

  private refreshChartWithNewData() {
    const newOptions = getChartOptions(false)
    if (newOptions.series && Array.isArray(newOptions.series) && newOptions.series[0]) {
      (newOptions.series[0] as any).data = refreshChartData()
    }
    this.chartContainer.setOption(newOptions)
  }

  // Path of chart keys to the category/subcategory with this name. Only nodes
  // with children match ('Computational' is both a subcategory and a leaf).
  private pathToGroup(name: string, nodes: any[] = baseData, prefix: string[] = []): string[] | null {
    for (const node of nodes) {
      if (!node.children) continue
      const path = [...prefix, node.name]
      if (node.name === name) return path
      const found = this.pathToGroup(name, node.children, path)
      if (found) return found
    }
    return null
  }

  private getNodeAtPath(path: string[]): any | null {
    let nodes: any[] = baseData
    let node: any = null
    for (const segment of path) {
      node = nodes.find((n: any) => n.name === segment)
      if (!node) return null
      nodes = node.children || []
    }
    return node
  }

  private getChildrenAtPath(path: string[]): any[] {
    if (path.length === 0) return baseData
    return this.getNodeAtPath(path)?.children || []
  }

  private buildLevelBarItems(path: string[]): LevelBarItem[] {
    return this.getChildrenAtPath(path).map((child: any) => ({
      name: child.name,
      label: child.children ? getDisplayLabel(child.name) : (getTheoryFullName(child.name) || child.name),
      hasChildren: !!child.children
    }))
  }

  private syncLevelBar() {
    if (this.batching) return
    const label = this.currentPath.length === 0
      ? 'Overview'
      : getDisplayLabel(this.currentPath[this.currentPath.length - 1])
    this.levelBar.setState(label, this.currentPath.length > 0, this.buildLevelBarItems(this.currentPath))
    this.onPathChange?.([...this.currentPath])
  }

  // Notified on every drill-down/back with the current category path.
  setPathChangeCallback(callback: (path: string[]) => void) {
    this.onPathChange = callback
    callback([...this.currentPath])
  }

  // Drill into a category/subcategory by chart key path (e.g. from the sidebar).
  openPath(path: string[]) {
    if (path.join('/') === this.currentPath.join('/')) return
    this.batching = true
    try {
      while (this.currentPath.length > 0) this.goBack()
      for (const name of path) this.selectFromLevelBar(name)
    } finally {
      this.batching = false
    }
    this.syncLevelBar()
  }

  private selectFromLevelBar(name: string) {
    const node = this.getNodeAtPath([...this.currentPath, name])
    if (!node) return
    this.chartContainer.resetZoomPan()
    this.handleTheoryClick({ ...node, parent: this.currentPath[this.currentPath.length - 1] })
  }

  private goBack() {
    if (this.currentPath.length === 0) return

    this.chartContainer.resetZoomPan()
    this.currentPath.pop()
    const chart = this.chartContainer.getChart()

    if (this.currentPath.length === 0) {
      setMobileLabelVisibility(false)
      chart?.setOption(getChartOptions(), true)
    } else {
      const parentName = this.currentPath[this.currentPath.length - 1]
      if (parentName !== 'Materialism') {
        setMobileLabelVisibility(true)
        this.refreshChartWithNewData()
      } else {
        setMobileLabelVisibility(false)
      }
      chart?.dispatchAction({
        type: 'sunburstRootToNode',
        targetNodeId: parentName
      })
    }

    this.itemDetailsPanel.hide()
    this.syncLevelBar()
  }

}
