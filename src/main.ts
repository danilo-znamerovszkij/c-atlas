import * as echarts from 'echarts/core'
import { TitleComponent } from 'echarts/components'
import { SunburstChart } from 'echarts/charts'
import { SVGRenderer } from 'echarts/renderers'
import { CanvasRenderer } from 'echarts/renderers'
import { ChartExample } from '@/components/ChartExample'
import { SearchBar } from '@/components/SearchBar'
import { Router } from '@/utils/routing'

// Import styles
import './components/ItemDetailsPanel.scss'

// Register the required components
echarts.use([TitleComponent, SunburstChart, SVGRenderer, CanvasRenderer])

// Initialize the chart using the component
const chartExample = new ChartExample('main')
chartExample.initialize()

// Initialize routing
const router = Router.getInstance()
const itemDetailsPanel = chartExample.getItemDetailsPanel()

// Make router globally accessible for navigation buttons
;(window as any).router = router

// Initialize search bar
const searchBar = new SearchBar('search-container', router)

// Set up close callback to navigate to home when panel is closed
itemDetailsPanel.setCloseCallback(() => {
  router.goHome()
})

// Set up routing callback to show theory data when URL changes
router.setTheoryChangeCallback((theory, error) => {
  if (theory) {
    itemDetailsPanel.showTheory(theory)
  } else if (error) {
    itemDetailsPanel.showError(error)
  } else {
    // Home page - hide the panel
    itemDetailsPanel.hide()
  }
})
