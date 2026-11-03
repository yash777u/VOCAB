// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { findWorkbooks, hasValidSupabaseSession, workbookData } from './library.js'

describe('workbook API access boundary', () => {
  const workbook = findWorkbooks().find((item) => item.id === 'A1/A1 - All Verbs/A1 - All Verbs.xlsx')

  it('returns only the preview row to a guest while retaining total-row metadata', async () => {
    const result = await workbookData(workbook, { maxRows: 1 })
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].id).toBe(0)
    expect(result.totalRows).toBeGreaterThan(1)
    expect(result.sentenceTracks).toEqual([])
  })

  it('returns the full workbook after the request token is validated', async () => {
    const previousUrl = process.env.VITE_SUPABASE_URL
    const previousKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    process.env.VITE_SUPABASE_URL = 'https://supabase.example'
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test'
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    try {
      const authenticated = await hasValidSupabaseSession({ headers: { authorization: 'Bearer valid-token' } })
      const result = await workbookData(workbook, { maxRows: authenticated ? undefined : 1 })
      expect(authenticated).toBe(true)
      expect(fetchMock).toHaveBeenCalledWith('https://supabase.example/auth/v1/user', expect.objectContaining({
        headers: { apikey: 'sb_publishable_test', Authorization: 'Bearer valid-token' },
      }))
      expect(result.rows).toHaveLength(result.totalRows)
    } finally {
      vi.unstubAllGlobals()
      if (previousUrl === undefined) delete process.env.VITE_SUPABASE_URL
      else process.env.VITE_SUPABASE_URL = previousUrl
      if (previousKey === undefined) delete process.env.VITE_SUPABASE_PUBLISHABLE_KEY
      else process.env.VITE_SUPABASE_PUBLISHABLE_KEY = previousKey
    }
  })

  it('rejects a missing or invalid bearer token', async () => {
    const previousUrl = process.env.VITE_SUPABASE_URL
    const previousKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    process.env.VITE_SUPABASE_URL = 'https://supabase.example'
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })))
    try {
      await expect(hasValidSupabaseSession({ headers: {} })).resolves.toBe(false)
      await expect(hasValidSupabaseSession({ headers: { authorization: 'Bearer invalid-token' } })).resolves.toBe(false)
    } finally {
      vi.unstubAllGlobals()
      if (previousUrl === undefined) delete process.env.VITE_SUPABASE_URL
      else process.env.VITE_SUPABASE_URL = previousUrl
      if (previousKey === undefined) delete process.env.VITE_SUPABASE_PUBLISHABLE_KEY
      else process.env.VITE_SUPABASE_PUBLISHABLE_KEY = previousKey
    }
  })
})
