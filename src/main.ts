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
import analytics from '@/utils/analytics'

import './components/ItemDetailsPanel.scss'
import './components/FormPopup.scss'
import './components/MetainfoContainer.scss'

echarts.use([TitleComponent, SunburstChart, SVGRenderer, CanvasRenderer])

globalState.initialize()
analytics.trackPageView('Home', 'landing', 'overview')

const router = Router.getInstance()

const showLoader = () => {
  const loader = document.getElementById('chart-loader')
  if (loader) {
    loader.style.display = 'flex'
  }
}

const hideLoader = () => {
  const loader = document.getElementById('chart-loader')
  if (loader) {
    loader.style.display = 'none'
  }
}

const initializeChart = () => {
  const container = document.getElementById('main')
  if (container && container.clientWidth > 0 && container.clientHeight > 0) {
    try {
      const theoryChart = new TheoryChart('main', router)
      theoryChart.initialize()
      
      hideLoader()
      
      return theoryChart
    } catch (error) {
      console.error('Failed to initialize chart:', error)
      hideLoader()
      return null
    }
  }
  return null
}

showLoader()

let theoryChart = initializeChart()

if (!theoryChart) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      theoryChart = initializeChart()
      if (!theoryChart) {
        setTimeout(() => {
          theoryChart = initializeChart()
        }, 100)
      }
    })
  } else {
    setTimeout(() => {
      theoryChart = initializeChart()
    }, 100)
  }
}

const initializeComponents = () => {
  if (theoryChart) {
    const itemDetailsPanel = theoryChart.getItemDetailsPanel()
    const formPopup = new FormPopup('form-popup')
    
    ;(window as any).router = router
    
    new SearchBar('search-container', router)
    
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
    
    itemDetailsPanel.setCloseCallback(() => router.goHome())
    
    const feedbackButton = document.getElementById('feedback-button')
    if (feedbackButton) {
      feedbackButton.addEventListener('click', (event) => {
        const rect = feedbackButton.getBoundingClientRect()
        analytics.trackClick('feedback_button', {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top
        })
        formPopup.show()
      })
    }
    
    const aboutButton = document.getElementById('about-button')
    if (aboutButton) {
      aboutButton.addEventListener('click', () => {
        window.scrollBy({
          top: window.innerHeight,
          behavior: 'smooth'
        })
      })

      let lastScrollY = window.scrollY
      let ticking = false

      const updateAboutButton = () => {
        const currentScrollY = window.scrollY
        const scrollThreshold = 100

        if (currentScrollY > scrollThreshold) {
          aboutButton.classList.add('fade-out')
        } else {
          aboutButton.classList.remove('fade-out')
        }

        lastScrollY = currentScrollY
        ticking = false
      }

      const onScroll = () => {
        if (!ticking) {
          requestAnimationFrame(updateAboutButton)
          ticking = true
        }
      }

      window.addEventListener('scroll', onScroll, { passive: true })
    }
    
    const logoContainer = document.querySelector('.logo-container')
    if (logoContainer) {
      logoContainer.addEventListener('click', () => {
        if ((window as any).router) {
          (window as any).router.goHome()
        }
      })
    }
    
    const addLinkTracking = () => {
      const githubLink = document.querySelector('.github-link')
      if (githubLink) {
        githubLink.addEventListener('click', (event) => {
          const rect = githubLink.getBoundingClientRect()
          analytics.trackClick('github_link', {
            x: (event as MouseEvent).clientX - rect.left,
            y: (event as MouseEvent).clientY - rect.top
          }, 'https://github.com')
        })
      }

      const kuhnLinks = document.querySelectorAll('a[href*="sciencedirect.com"]')
      kuhnLinks.forEach(link => {
        link.addEventListener('click', (event) => {
          const rect = link.getBoundingClientRect()
          analytics.trackClick('kuhn_paper_link', {
            x: (event as MouseEvent).clientX - rect.left,
            y: (event as MouseEvent).clientY - rect.top
          }, link.getAttribute('href') || '')
        })
      })

      const twitterLink = document.querySelector('a[href*="x.com"]')
      if (twitterLink) {
        twitterLink.addEventListener('click', (event) => {
          const rect = twitterLink.getBoundingClientRect()
          analytics.trackClick('twitter_link', {
            x: (event as MouseEvent).clientX - rect.left,
            y: (event as MouseEvent).clientY - rect.top
          }, twitterLink.getAttribute('href') || '')
        })
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', addLinkTracking)
    } else {
      addLinkTracking()
    }
  }
}

if (theoryChart) {
  initializeComponents()
} else {
  const checkChartReady = () => {
    if (theoryChart) {
      initializeComponents()
    } else {
      setTimeout(checkChartReady, 50)
    }
  }
  checkChartReady()
}


