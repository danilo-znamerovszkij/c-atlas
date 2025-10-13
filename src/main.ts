import * as echarts from 'echarts/core'
import { TitleComponent } from 'echarts/components'
import { SunburstChart } from 'echarts/charts'
import { SVGRenderer } from 'echarts/renderers'
import { CanvasRenderer } from 'echarts/renderers'
import { TheoryChart } from '@/components/ChartExample'
import { SearchBar } from '@/components/SearchBar'
import { FormPopup } from '@/components/FormPopup'
import { Router } from '@/utils/routing'
import globalState from '@/utils/globalState'

// Import styles
import './styles/main.scss'
import './components/ItemDetailsPanel.scss'
import './components/FormPopup.scss'

// Register the required components
echarts.use([TitleComponent, SunburstChart, SVGRenderer, CanvasRenderer])

// Initialize global state first
globalState.initialize()

// Initialize routing
const router = Router.getInstance()

// Initialize the chart using the component with router
const theoryChart = new TheoryChart('main', router)
theoryChart.initialize()

const itemDetailsPanel = theoryChart.getItemDetailsPanel()

// Make router globally accessible for navigation buttons
;(window as any).router = router

// Initialize search bar
new SearchBar('search-container', router)

// Initialize form popup
const formPopup = new FormPopup('form-popup')

// Connect feedback button
const feedbackButton = document.getElementById('feedback-button')
if (feedbackButton) {
  feedbackButton.addEventListener('click', () => {
    formPopup.show()
  })
}

// Connect logo click to navigate home
const logoContainer = document.querySelector('.logo-container')
if (logoContainer) {
  logoContainer.addEventListener('click', () => {
    if ((window as any).router) {
      (window as any).router.goHome()
    }
  })
}

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
