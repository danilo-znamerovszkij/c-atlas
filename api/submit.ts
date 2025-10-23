import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { name, email, message } = req.body

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' })
    }

    const tgToken = process.env.TG_BOT_TOKEN
    const chatId = process.env.TG_CHAT_ID

    const randomEmojis = ['🧠', '💭', '🤔', '💡', '💥', '🔍', '🔦', '🔬', '🔭', '🔮', '🔥', '🔒', '🔖', '🔗']
    const randomIndex = Math.floor(Math.random() * randomEmojis.length)
    const randomEmoji = randomEmojis[randomIndex]
    
    if (tgToken && chatId) {
      const telegramMessage = `
      ${randomEmoji} 📨 ${message}
      ${name ? `From: ${name}` : ''}${email ? `(${email})` : ''}
      `

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
      console.log('Form submission received:', {
        name: name || 'Not provided',
        email: email || 'Not provided',
        message,
        timestamp: new Date().toISOString()
      })
    }

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
