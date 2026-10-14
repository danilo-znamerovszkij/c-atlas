import type { Mixpanel } from 'mixpanel-browser'
import { parseLocaleFromPath } from '@/shared/site'

interface AnalyticsConfig {
  token: string
  enabled: boolean
}

class Analytics {
  private mixpanel: Mixpanel | null = null
  // Events fired before the library has loaded; sent once it's ready.
  private queue: Array<[string, Record<string, any>]> = []
  private config: AnalyticsConfig

  constructor() {
    this.config = {
      token: import.meta.env.VITE_MIXPANEL_TOKEN || '',
      enabled: !!import.meta.env.VITE_MIXPANEL_TOKEN && import.meta.env.PROD
    }

    if (this.config.enabled) {
      this.initialize()
    }
  }

  // mixpanel-browser is ~100 KB; load it after the page is up instead of on
  // the critical path.
  private initialize() {
    const load = () => import('mixpanel-browser')
      .then(({ default: mixpanel }) => {
        mixpanel.init(this.config.token, {
          debug: !import.meta.env.PROD,
          track_pageview: false,
          persistence: 'localStorage',
          ignore_dnt: true
        })
        this.mixpanel = mixpanel
        for (const [event, properties] of this.queue.splice(0)) mixpanel.track(event, properties)
      })
      .catch(error => console.error('Failed to initialize Mixpanel:', error))
    // Wait for the page to finish loading, then a little longer, so the
    // library never competes with the first paint or the chart.
    const idle = () => ('requestIdleCallback' in window ? requestIdleCallback(load, { timeout: 5000 }) : setTimeout(load, 1500))
    const later = () => setTimeout(idle, 2000)
    if (document.readyState === 'complete') later()
    else window.addEventListener('load', later, { once: true })
  }

  private track(event: string, properties?: Record<string, any>) {
    if (!this.config.enabled) {
      return
    }

    // Captured now, so queued events keep the page and time they happened on.
    const payload = {
      ...properties,
      locale: parseLocaleFromPath(window.location.pathname).locale,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      user_agent: navigator.userAgent
    }
    if (!this.mixpanel) {
      this.queue.push([event, payload])
      return
    }

    try {
      this.mixpanel.track(event, payload)
    } catch (error) {
      console.error('Failed to track event:', error)
    }
  }

  // Page view tracking for theory navigation
  trackPageView(theoryName: string, category: string, subcategory?: string) {
    this.track('Page View', {
      theory_name: theoryName,
      category: category,
      subcategory: subcategory,
      page_type: 'theory'
    })
  }

  // Click tracking for various elements
  trackClick(element: string, position?: { x: number; y: number }, linkUrl?: string) {
    this.track('Click', {
      element: element,
      position: position,
      link_url: linkUrl,
      click_type: 'interaction'
    })
  }

  // Non-theory page views: family/subcategory map URLs ('category').
  trackView(pageType: string, properties?: Record<string, any>) {
    this.track('Page View', { ...properties, page_type: pageType })
  }

  // Form submission tracking
  trackFormSubmission(formType: string, success: boolean, errorMessage?: string) {
    this.track('Form Submission', {
      form_type: formType,
      success: success,
      error_message: errorMessage,
      submission_type: 'feedback'
    })
  }

  // Identify user (optional, for future use)
  identify(userId: string, properties?: Record<string, any>) {
    if (!this.mixpanel || !this.config.enabled) {
      return
    }

    try {
      this.mixpanel.identify(userId)
      if (properties) {
        this.mixpanel.people.set(properties)
      }
    } catch (error) {
      console.error('Failed to identify user:', error)
    }
  }
}

// Create singleton instance
const analytics = new Analytics()

export default analytics
