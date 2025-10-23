import { mockApiSubmit, isApiAvailable } from '@/utils/apiMock'
import analytics from '@/utils/analytics'

export class FormPopup {
  private container: HTMLElement
  private overlay!: HTMLElement
  private form!: HTMLFormElement
  private isVisible: boolean = false

  constructor(containerId: string) {
    const element = document.getElementById(containerId)
    if (!element) {
      throw new Error(`Container with id '${containerId}' not found`)
    }
    this.container = element
    this.render()
    this.attachEventListeners()
  }

  private render() {
    this.container.innerHTML = `
      <div class="form-overlay" id="form-overlay">
        <div class="form-popup">
          <div class="form-header">
            <h3>Send Feedback</h3>
            <button class="form-close" id="form-close" aria-label="Close form">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <form class="form-content" id="feedback-form">
            <div class="form-group">
              <label for="feedback-name">Name (optional)</label>
              <input 
                type="text" 
                id="feedback-name" 
                name="name" 
                placeholder="Your name"
                aria-label="Your name"
              />
            </div>
            <div class="form-group">
              <label for="feedback-email">Email (optional)</label>
              <input 
                type="email" 
                id="feedback-email" 
                name="email" 
                placeholder="your@email.com"
                aria-label="Your email"
              />
            </div>
            <div class="form-group">
              <label for="feedback-message">Message *</label>
              <textarea 
                id="feedback-message" 
                name="message" 
                placeholder="Share your thoughts, suggestions, or questions..."
                rows="4"
                required
                aria-label="Your message"
              ></textarea>
            </div>
            <div class="form-actions">
              <button type="button" class="form-cancel" id="form-cancel">Cancel</button>
              <button type="submit" class="form-submit" id="form-submit">
                <span class="submit-text">Send Message</span>
                <span class="submit-loading" style="display: none;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 12a9 9 0 11-6.219-8.56"/>
                  </svg>
                  Sending...
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    `

    this.overlay = this.container.querySelector('#form-overlay') as HTMLElement
    this.form = this.container.querySelector('#feedback-form') as HTMLFormElement
  }

  private attachEventListeners() {
    const closeBtn = this.container.querySelector('#form-close') as HTMLElement
    closeBtn.addEventListener('click', () => this.hide())

    const cancelBtn = this.container.querySelector('#form-cancel') as HTMLElement
    cancelBtn.addEventListener('click', () => this.hide())

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.hide()
      }
    })

    this.form.addEventListener('submit', (e) => this.handleSubmit(e))

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide()
      }
    })
  }

  private async handleSubmit(e: Event) {
    e.preventDefault()
    
    const submitBtn = this.container.querySelector('#form-submit') as HTMLButtonElement
    const submitText = this.container.querySelector('.submit-text') as HTMLElement
    const submitLoading = this.container.querySelector('.submit-loading') as HTMLElement
    
    const formData = new FormData(this.form)
    const data = {
      name: formData.get('name') as string || '',
      email: formData.get('email') as string || '',
      message: formData.get('message') as string
    }

    if (!data.message.trim()) {
      this.showError('Please enter a message')
      return
    }

    submitBtn.disabled = true
    submitText.style.display = 'none'
    submitLoading.style.display = 'flex'

    try {
      let response: any
      
      if (isApiAvailable()) {
        const apiResponse = await fetch('/api/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data)
        })
        
        if (apiResponse.ok) {
          response = await apiResponse.json()
        } else {
          throw new Error('Failed to send message')
        }
      } else {
        response = await mockApiSubmit(data)
      }

      if (response.success) {
        analytics.trackFormSubmission('feedback', true)
        this.showSuccess('Message sent successfully!')
        this.form.reset()
        setTimeout(() => this.hide(), 1500)
      } else {
        throw new Error('Failed to send message')
      }
    } catch (error) {
      console.error('Form submission error:', error)
      analytics.trackFormSubmission('feedback', false, error instanceof Error ? error.message : 'Unknown error')
      this.showError('Failed to send message. Please try again.')
    } finally {
      submitBtn.disabled = false
      submitText.style.display = 'flex'
      submitLoading.style.display = 'none'
    }
  }

  private showError(message: string) {
    const existingError = this.container.querySelector('.form-error')
    if (existingError) {
      existingError.remove()
    }

    const errorDiv = document.createElement('div')
    errorDiv.className = 'form-error'
    errorDiv.textContent = message
    
    this.form.parentNode?.insertBefore(errorDiv, this.form.nextSibling)
    
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.remove()
      }
    }, 5000)
  }

  private showSuccess(message: string) {
    const existingMessage = this.container.querySelector('.form-success')
    if (existingMessage) {
      existingMessage.remove()
    }

    const successDiv = document.createElement('div')
    successDiv.className = 'form-success'
    successDiv.textContent = message
    
    this.form.parentNode?.insertBefore(successDiv, this.form.nextSibling)
  }

  show() {
    this.isVisible = true
    this.overlay.classList.add('visible')
    document.body.style.overflow = 'hidden'
    
    const firstInput = this.form.querySelector('input, textarea') as HTMLElement
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100)
    }
  }

  hide() {
    this.isVisible = false
    this.overlay.classList.remove('visible')
    document.body.style.overflow = ''
    
    this.form.reset()
    
    const errorMsg = this.container.querySelector('.form-error')
    const successMsg = this.container.querySelector('.form-success')
    if (errorMsg) errorMsg.remove()
    if (successMsg) successMsg.remove()
  }

  isOpen(): boolean {
    return this.isVisible
  }
}
