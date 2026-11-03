import { findWorkbooks, hasValidSupabaseSession, workbookData } from '../server/library.js'

export default async function handler(request, response) {
  const id = typeof request.query.id === 'string' ? request.query.id : ''
  const workbook = findWorkbooks().find((item) => item.id === id)
  if (!workbook) return response.status(404).json({ error: 'Workbook not found.' })

  try {
    const authenticated = await hasValidSupabaseSession(request)
    response.setHeader('Cache-Control', 'private, no-store')
    return response.status(200).json(await workbookData(workbook, { maxRows: authenticated ? undefined : 1 }))
  } catch (error) {
    console.error(`Could not read ${workbook.id}:`, error)
    return response.status(500).json({ error: 'This workbook could not be read.' })
  }
}