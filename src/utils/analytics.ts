import mixpanel from 'mixpanel-browser'

interface AnalyticsConfig {
  token: string
  enabled: boolean
}

class Analytics {
  private mixpanel: typeof mixpanel | null = null
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

  private initialize() {
    try {
      mixpanel.init(this.config.token, {
        debug: !import.meta.env.PROD,
        track_pageview: false, // We'll handle page views manually
        persistence: 'localStorage'
      })
      this.mixpanel = mixpanel
    } catch (error) {
      console.error('Failed to initialize Mixpanel:', error)
    }
  }

  private track(event: string, properties?: Record<string, any>) {
    if (!this.mixpanel || !this.config.enabled) {
      return
    }

    try {
      this.mixpanel.track(event, {
        ...properties,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        user_agent: navigator.userAgent
      })
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
