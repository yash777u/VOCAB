import { generateGermanSpeech, validateSpeechText } from '../server/tts.js'

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed.' })
  const text = validateSpeechText(request.body?.text)
  if (!text) return response.status(400).json({ error: 'Provide text between 1 and 180 characters.' })

  try {
    const audio = await generateGermanSpeech(text)
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader('Content-Type', 'audio/mpeg')
    return response.status(200).send(audio)
  } catch (error) {
    console.error('German speech generation failed:', error)
    return response.status(502).json({ error: 'Speech generation is temporarily unavailable.' })
  }
}
