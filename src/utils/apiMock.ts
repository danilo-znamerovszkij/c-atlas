export const mockApiSubmit = async (data: { name: string; email: string; message: string }) => {
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  console.log('📨 Mock form submission:', {
    name: data.name || 'Not provided',
    email: data.email || 'Not provided',
    message: data.message,
    timestamp: new Date().toISOString()
  })
  
  return {
    success: true,
    message: 'Form submitted successfully (mock)'
  }
}

export const isApiAvailable = () => {
  return typeof window !== 'undefined' && window.location.hostname !== 'localhost'
}
