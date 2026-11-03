export function validateSpeechText(value) {
  if (typeof value !== 'string') return ''
  const text = value.trim()
  return text.length > 0 && text.length <= 180 ? text : ''
}

export async function generateGermanSpeech(text) {
  const url = new URL('https://translate.google.com/translate_tts')
  url.searchParams.set('ie', 'UTF-8')
  url.searchParams.set('client', 'tw-ob')
  url.searchParams.set('tl', 'de')
  url.searchParams.set('q', text)
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  if (!response.ok || !response.headers.get('content-type')?.includes('audio')) {
    throw new Error(`Speech provider returned HTTP ${response.status}`)
  }
  return Buffer.from(await response.arrayBuffer())
}
