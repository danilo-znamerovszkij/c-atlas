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
const theoryChart = new TheoryChart('main', router)
theoryChart.initialize()

const itemDetailsPanel = theoryChart.getItemDetailsPanel()
const formPopup = new FormPopup('form-popup')

;(window as any).router = router

new SearchBar('search-container', router)

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

  // Handle scroll behavior - fade out when scrolling down
  let lastScrollY = window.scrollY
  let ticking = false

  const updateAboutButton = () => {
    const currentScrollY = window.scrollY
    const scrollThreshold = 100 // Start fading after 100px scroll

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

itemDetailsPanel.setCloseCallback(() => router.goHome())

// Add click tracking for external links
const addLinkTracking = () => {
  // GitHub link
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

  // Kuhn paper links
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

  // Twitter/X link
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

// Initialize link tracking after DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addLinkTracking)
} else {
  addLinkTracking()
}

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
