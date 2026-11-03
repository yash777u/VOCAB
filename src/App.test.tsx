import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signOut: vi.fn(),
  from: vi.fn(),
}))

vi.mock('./lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
      signOut: mocks.signOut,
    },
    from: mocks.from,
  },
}))

import App from './App'

const book = { id: 'A1/verbs.xlsx', level: 'A1', chapter: 'Verbs', name: 'Verbs' }
const workbook = {
  ...book,
  columns: ['Verb', 'English Meaning'],
  totalRows: 2,
  fields: { german: 'Verb', english: 'English Meaning', hindi: '', germanSentence: '', englishSentence: '', hindiSentence: '' },
  rows: [
    { id: 0, values: { Verb: 'sprechen', 'English Meaning': 'to speak' }, audio: { word: null, both: null } },
    { id: 1, values: { Verb: 'gehen', 'English Meaning': 'to go' }, audio: { word: null, both: null } },
  ],
  sentenceTracks: [],
}

function jsonResponse(data: unknown) {
  return Promise.resolve({
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    json: async () => data,
  })
}

describe('signed-in account menu', () => {
  beforeEach(() => {
    window.localStorage.clear()
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: 'test-token', user: { id: 'user-1', email: 'learner@example.com' } } },
      error: null,
    })
    mocks.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
    mocks.signOut.mockResolvedValue({ error: null })
    mocks.from.mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    })
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      return url.includes('/api/library') ? jsonResponse([book]) : jsonResponse(workbook)
    }))
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('opens the username menu without signing out, then signs out only on explicit selection', async () => {
    const user = userEvent.setup()
    render(<App />)

    const accountButton = await screen.findByRole('button', { name: 'Account: learner@example.com' })
    expect(screen.getByTestId('account-person-icon')).toBeTruthy()
    await user.click(accountButton)

    expect(mocks.signOut).not.toHaveBeenCalled()
    expect(await screen.findByRole('menu')).toBeTruthy()
    expect(screen.getByText('learner@example.com')).toBeTruthy()

    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }))
    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledTimes(1))
  })

  it('hides the global workbook controls and metrics only in Saved', async () => {
    const user = userEvent.setup()
    render(<App />)

    await screen.findByRole('button', { name: /Save sprechen/ })
    expect(screen.getByRole('region', { name: 'Vocabulary selection' })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Workbook overview' })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: /Saved/ }))
    expect(screen.queryByRole('region', { name: 'Vocabulary selection' })).toBeNull()
    expect(screen.queryByRole('region', { name: 'Workbook overview' })).toBeNull()
    expect(screen.getByLabelText('Level')).toBeTruthy()
    expect(screen.getByLabelText('Workbook')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Study' }))
    expect(screen.getByRole('region', { name: 'Vocabulary selection' })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Workbook overview' })).toBeTruthy()
  })

  it('restores the last tab and workbook after reload', async () => {
    window.localStorage.setItem('german-vocab-last-location', JSON.stringify({
      workbookId: book.id,
      section: 'saved',
      search: 'sprech',
      page: 1,
    }))
    window.localStorage.setItem('german-vocab-saved-filters', JSON.stringify({ level: 'A1', workbookId: book.id }))
    const user = userEvent.setup()
    render(<App />)

    await screen.findByRole('heading', { name: 'Saved words' })
    expect(screen.getByRole('button', { name: /Saved/ }).classList.contains('active')).toBe(true)
    expect((screen.getByLabelText('Level') as HTMLSelectElement).value).toBe('A1')
    expect((screen.getByLabelText('Workbook') as HTMLSelectElement).value).toBe(book.id)

    await user.click(screen.getByRole('button', { name: 'Study' }))
    expect((await screen.findByRole('textbox', { name: /Ctrl K/ }) as HTMLInputElement).value).toBe('sprech')
    expect((screen.getByLabelText('Workbook') as HTMLSelectElement).value).toBe(book.id)
  })

  it('requests server-generated pronunciation for a guest preview without a recorded clip', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null })
    const previewWorkbook = {
      ...workbook,
      rows: [{ ...workbook.rows[0], audio: { word: null, both: null } }],
      totalRows: 2,
    }
    const audio = new Blob(['fake-mpeg'], { type: 'audio/mpeg' })
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/library')) return jsonResponse([book])
      if (url.includes('/api/workbook')) return jsonResponse(previewWorkbook)
      if (url.includes('/api/tts')) return Promise.resolve(new Response(audio, { status: 200, headers: { 'Content-Type': 'audio/mpeg' } }))
      return Promise.reject(new Error(`Unexpected request: ${url}`))
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:test-audio'), revokeObjectURL: vi.fn() })
    class MockAudio {
      onended: (() => void) | null = null
      onerror: (() => void) | null = null
      onpause: (() => void) | null = null
      playbackRate = 1
      pause() {}
      play() { this.onended?.(); return Promise.resolve() }
    }
    vi.stubGlobal('Audio', MockAudio)

    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Play sprechen' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/tts', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ text: 'sprechen' }),
    })))
  })
})
