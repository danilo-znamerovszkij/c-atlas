import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { name, email, message } = req.body

    // Validate required fields
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' })
    }

    // Get environment variables
    const tgToken = process.env.TG_BOT_TOKEN
    const chatId = process.env.TG_CHAT_ID

    // If Telegram is configured, send message
    if (tgToken && chatId) {
      const telegramMessage = `📨 New form submission from C-Atlas
${name ? `Name: ${name}` : 'Name: Not provided'}
${email ? `Email: ${email}` : 'Email: Not provided'}
Message: ${message}

Timestamp: ${new Date().toISOString()}`

      const telegramResponse = await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: telegramMessage,
          parse_mode: 'Markdown'
        }),
      })

      if (!telegramResponse.ok) {
        console.error('Telegram API error:', await telegramResponse.text())
        return res.status(500).json({ error: 'Failed to send notification' })
      }
    } else {
      // Log to console if Telegram is not configured
      console.log('Form submission received:', {
        name: name || 'Not provided',
        email: email || 'Not provided',
        message,
        timestamp: new Date().toISOString()
      })
    }

    // Return success response
    return res.status(200).json({ 
      success: true, 
      message: 'Form submitted successfully' 
    })

  } catch (error) {
    console.error('Form submission error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to process form submission'
    })
  }
}
