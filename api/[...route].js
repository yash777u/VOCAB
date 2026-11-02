import { findWorkbooks, workbookData } from '../server/library.js'

export default async function handler(request, response) {
  const pathname = new URL(request.url, 'https://vercel.local').pathname

  if (request.method === 'GET' && pathname === '/api/library') {
    response.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')
    return response.status(200).json(findWorkbooks())
  }

  if (request.method === 'GET' && pathname === '/api/workbook') {
    const id = typeof request.query.id === 'string' ? request.query.id : ''
    const workbook = findWorkbooks().find((item) => item.id === id)
    if (!workbook) return response.status(404).json({ error: 'Workbook not found.' })
    try {
      response.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
      return response.status(200).json(await workbookData(workbook))
    } catch (error) {
      console.error(`Could not read ${workbook.id}:`, error)
      return response.status(500).json({ error: 'This workbook could not be read.' })
    }
  }

  if (request.method === 'GET' && pathname === '/api/saved-words') {
    return response.status(200).json({})
  }

  if (request.method === 'PUT' && pathname === '/api/saved-words') {
    return response.sendStatus(204)
  }

  return response.status(404).json({ error: 'API route not found.' })
}