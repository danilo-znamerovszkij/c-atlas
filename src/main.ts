import * as echarts from 'echarts/core'
import { TitleComponent } from 'echarts/components'
import { SunburstChart } from 'echarts/charts'
import { SVGRenderer } from 'echarts/renderers'
import { CanvasRenderer } from 'echarts/renderers'
import { TheoryChart } from '@/components/TheoryChart'
import { SearchBar } from '@/components/SearchBar'
import { FormPopup } from '@/components/FormPopup'
import { Router } from '@/utils/routing'
import globalState from '@/utils/globalState'

import './components/ItemDetailsPanel.scss'
import './components/FormPopup.scss'
import './components/MetainfoContainer.scss'

echarts.use([TitleComponent, SunburstChart, SVGRenderer, CanvasRenderer])

globalState.initialize()

const router = Router.getInstance()
const theoryChart = new TheoryChart('main', router)
theoryChart.initialize()

const itemDetailsPanel = theoryChart.getItemDetailsPanel()
const formPopup = new FormPopup('form-popup')

;(window as any).router = router

new SearchBar('search-container', router)

const feedbackButton = document.getElementById('feedback-button')
if (feedbackButton) {
  feedbackButton.addEventListener('click', () => formPopup.show())
}

const logoContainer = document.querySelector('.logo-container')
if (logoContainer) {
  logoContainer.addEventListener('click', () => {
    if ((window as any).router) {
      (window as any).router.goHome()
    }
  })
}

itemDetailsPanel.setCloseCallback(() => router.goHome())

router.setLoadingCallback((category, theory) => {
  itemDetailsPanel.showLoading(category, theory)
})

router.setTheoryChangeCallback((theory, error) => {
  if (theory) {
    itemDetailsPanel.showTheory(theory)
  } else if (error) {
    itemDetailsPanel.showError(error)
  } else {
    itemDetailsPanel.hide()
  }
})
