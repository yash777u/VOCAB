import { findWorkbooks } from '../server/library.js'

export default function handler(_request, response) {
  response.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')
  return response.status(200).json(findWorkbooks())
}