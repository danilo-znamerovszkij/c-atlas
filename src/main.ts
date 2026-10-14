import * as echarts from 'echarts/core'
import { TitleComponent } from 'echarts/components'
import { SunburstChart } from 'echarts/charts'
import { SVGRenderer } from 'echarts/renderers'
import { CanvasRenderer } from 'echarts/renderers'
import { TheoryChart } from '@/components/TheoryChart'
import { SearchBar } from '@/components/SearchBar'
import { AtlasTools } from '@/components/AtlasTools'
import { AtlasSidebar } from '@/components/AtlasSidebar'
import { ShareButton } from '@/components/ShareButton'
import { WelcomeTour } from '@/components/WelcomeTour'
import { FormPopup } from '@/components/FormPopup'
import { LanguagePopup } from '@/components/LanguagePopup'
import { Router } from '@/utils/routing'
import globalState from '@/utils/globalState'
import analytics from '@/utils/analytics'
import { initI18n, t } from '@/utils/i18n'
import { parseLocaleFromPath } from '@/shared/site'

import './components/ItemDetailsPanel.scss'
import './components/FormPopup.scss'
import './components/MetainfoContainer.scss'

echarts.use([TitleComponent, SunburstChart, SVGRenderer, CanvasRenderer])

;(async () => {
  await initI18n()

  globalState.initialize()
  // Theory URLs are tracked by the router (as their theory); only count the
  // landing itself as 'Home', so a direct theory visit isn't logged twice.
  if (parseLocaleFromPath(window.location.pathname).pathWithoutLocale === '/') {
    analytics.trackPageView('Home', 'landing', 'overview')
  }

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
      const languagePopup = new LanguagePopup('language-popup')

      const languageButton = document.getElementById('language-button')
      if (languageButton) {
        languageButton.addEventListener('click', () => {
          analytics.trackClick('language_button')
          languagePopup.toggle()
        })
      }

      ;(window as any).router = router

      new SearchBar('search-container', router)
      new ShareButton('share-button')
      const chart = theoryChart
      const tools = new AtlasTools('atlas-tools', 'theory-list', router, names => chart.applyFilter(names))
      const sidebar = new AtlasSidebar('atlas-sidebar', router, itemDetailsPanel, path => chart.openPath(path))
      // /materialism, /materialism/neurobiological: the URL and the chart's
      // drill-down follow each other (the group callback fires first, for the
      // page's own URL).
      router.setGroupChangeCallback(path => chart.openPath(path))
      chart.setPathChangeCallback(path => {
        sidebar.setPath(path)
        router.showGroup(path)
      })
      // ?filter= and ?view= from hub page links go to the tools.
      tools.applyUrlParams(new URLSearchParams(window.location.search))

      // First visit to the home page: offer the tour (theory links skip it, the
      // reader came for that theory). The footer link replays it.
      const tour = new WelcomeTour()
      if (!WelcomeTour.seen() && !window.location.search && parseLocaleFromPath(window.location.pathname).pathWithoutLocale === '/') {
        setTimeout(() => tour.start(), 600)
      }
      setupCitation()

      document.getElementById('start-tour')?.addEventListener('click', event => {
        event.preventDefault()
        window.scrollTo({ top: 0, behavior: 'smooth' })
        tour.start()
      })

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

      // Direct visit to /{category}/{theory} (search result, shared link): open
      // the theory full-screen; closing it reveals the atlas.
      if (!router.isGroupUrl() && parseLocaleFromPath(window.location.pathname).pathWithoutLocale.split('/').filter(Boolean).length === 2) {
        itemDetailsPanel.showFullscreenForDirectVisit()
      }

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

      // Fade the chart's fixed controls (logo, search, zoom, level pill,
      // feedback) once the user scrolls down into the About content below the
      // chart, so that content reads cleanly. Mobile-only via the `scrolled`
      // class + media-query CSS; on desktop the class toggles but matches no
      // rules. rAF-throttled to keep scrolling smooth.
      let chromeTicking = false
      const updateScrolledState = () => {
        document.body.classList.toggle(
          'scrolled',
          window.scrollY > window.innerHeight * 0.35
        )
        chromeTicking = false
      }
      window.addEventListener(
        'scroll',
        () => {
          if (!chromeTicking) {
            requestAnimationFrame(updateScrolledState)
            chromeTicking = true
          }
        },
        { passive: true }
      )

      // Source citation tooltip with debounce
      const sourceCitation = document.querySelector('.source-citation')
      const sourceTooltip = document.querySelector('.source-tooltip')
      if (sourceCitation && sourceTooltip) {
        let hideTimeout: NodeJS.Timeout | null = null
        const debounceDelay = 300

        const showTooltip = () => {
          if (hideTimeout) {
            clearTimeout(hideTimeout)
            hideTimeout = null
          }
          sourceCitation.classList.add('tooltip-visible')
        }

        const hideTooltip = () => {
          hideTimeout = setTimeout(() => {
            sourceCitation.classList.remove('tooltip-visible')
            hideTimeout = null
          }, debounceDelay)
        }

        sourceCitation.addEventListener('mouseenter', showTooltip)
        sourceCitation.addEventListener('mouseleave', hideTooltip)
        sourceTooltip.addEventListener('mouseenter', showTooltip)
        sourceTooltip.addEventListener('mouseleave', hideTooltip)
      }

      const logoContainer = document.querySelector('.logo-container')
      if (logoContainer) {
        logoContainer.addEventListener('click', () => {
          if ((window as any).router) {
            (window as any).router.goToOverview()
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

          const img = githubLink?.querySelector('img');

          img?.addEventListener('load', () => {
            if (img?.naturalWidth && img.naturalWidth > 30) {
              img.style.display = 'none';
            }
          });
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
})()

// "How to Cite": fill the accessed date (every locale's text has one [..]
// placeholder) and copy the citation with one click.
function setupCitation() {
  const text = document.getElementById('cite-text')
  const button = document.getElementById('cite-copy')
  if (!text || !button) return
  const accessed = new Intl.DateTimeFormat(document.documentElement.lang || 'en', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
  text.textContent = (text.textContent || '').trim().replace(/\[[^\]]+\]/, accessed)

  const label = button.querySelector('span')!
  let reset: number | undefined
  button.addEventListener('click', async () => {
    const citation = text.textContent || ''
    try {
      await navigator.clipboard.writeText(citation)
    } catch {
      // Clipboard API blocked: select the text so Cmd/Ctrl+C works.
      const range = document.createRange()
      range.selectNodeContents(text)
      window.getSelection()?.removeAllRanges()
      window.getSelection()?.addRange(range)
      return
    }
    analytics.trackClick('cite_copy')
    button.classList.add('copied')
    label.textContent = t('about.footer.citeCopied')
    clearTimeout(reset)
    reset = window.setTimeout(() => {
      button.classList.remove('copied')
      label.textContent = t('about.footer.citeCopy')
    }, 2000)
  })
}
