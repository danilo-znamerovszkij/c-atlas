// Mock API for development when not using Vercel CLI
export const mockApiSubmit = async (data: { name: string; email: string; message: string }) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // Log to console for development
  console.log('📨 Mock form submission:', {
    name: data.name || 'Not provided',
    email: data.email || 'Not provided',
    message: data.message,
    timestamp: new Date().toISOString()
  })
  
  // Simulate success response
  return {
    success: true,
    message: 'Form submitted successfully (mock)'
  }
}

// Check if we're in development and API is not available
export const isApiAvailable = () => {
  return typeof window !== 'undefined' && window.location.hostname !== 'localhost'
}
