// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

import handler from '../api/tts.js'
import { validateSpeechText } from './tts.js'

function mockResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(name, value) { this.headers[name] = value; return this },
    status(code) { this.statusCode = code; return this },
    json(value) { this.body = value; return this },
    send(value) { this.body = value; return this },
  }
}

describe('German TTS endpoint', () => {
  it('accepts short text and rejects empty or overlong input', () => {
    expect(validateSpeechText('  guten Tag  ')).toBe('guten Tag')
    expect(validateSpeechText(' ')).toBe('')
    expect(validateSpeechText('x'.repeat(181))).toBe('')
  })

  it('returns generated MPEG audio for valid text', async () => {
    const audio = Buffer.from('fake-mpeg-audio')
    const fetchMock = vi.fn().mockResolvedValue(new Response(audio, { status: 200, headers: { 'Content-Type': 'audio/mpeg' } }))
    vi.stubGlobal('fetch', fetchMock)
    const response = mockResponse()
    await handler({ method: 'POST', body: { text: 'guten Tag' } }, response)

    expect(response.statusCode).toBe(200)
    expect(response.headers['Content-Type']).toBe('audio/mpeg')
    expect(response.body).toEqual(audio)
    const [url] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('tl=de')
    expect(String(url)).toContain('q=guten+Tag')
    vi.unstubAllGlobals()
  })

  it('rejects invalid input without calling the speech provider', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const response = mockResponse()
    await handler({ method: 'POST', body: { text: '' } }, response)

    expect(response.statusCode).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})
