import express from 'express'
import fs from 'node:fs'
import { createServer as createHttpServer } from 'node:http'
import path from 'node:path'
import { findWorkbooks, workbookData } from './library.js'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const savedWordsFile = path.join(root, 'saved_words.json')
const audioExtensions = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.mpga'])
const levels = ['A1', 'A2', 'B1', 'B2']
const app = express()
app.use(express.json({ limit: '2mb' }))

app.get('/api/library', (_request, response) => response.json(findWorkbooks()))

app.get('/api/workbook', async (request, response) => {
  const workbook = findWorkbooks().find((item) => item.id === request.query.id)
  if (!workbook) return response.status(404).json({ error: 'Workbook not found.' })
  try {
    response.json(await workbookData(workbook, { includeAudio: true }))
  } catch (error) {
    console.error(`Could not read ${workbook.id}:`, error)
    response.status(500).json({ error: 'This workbook could not be read.' })
  }
})

app.get('/api/audio', (request, response) => {
  const fullPath = path.resolve(root, String(request.query.path ?? ''))
  const relativePath = path.relative(root, fullPath)
  if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath) || !audioExtensions.has(path.extname(fullPath).toLowerCase())) return response.sendStatus(404)
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) return response.sendStatus(404)
  response.type(path.extname(fullPath)).sendFile(fullPath)
})

app.get('/api/saved-words', (_request, response) => {
  try {
    const words = JSON.parse(fs.readFileSync(savedWordsFile, 'utf8'))
    response.json(words && typeof words === 'object' && !Array.isArray(words) ? words : {})
  } catch {
    response.json({})
  }
})

app.put('/api/saved-words', (request, response) => {
  if (!request.body || typeof request.body !== 'object' || Array.isArray(request.body)) return response.status(400).json({ error: 'Saved words must be an object.' })
  const temporaryPath = `${savedWordsFile}.tmp`
  fs.writeFileSync(temporaryPath, JSON.stringify(request.body, null, 2), 'utf8')
  fs.renameSync(temporaryPath, savedWordsFile)
  response.sendStatus(204)
})

const port = Number(process.env.PORT ?? 5173)
const httpServer = createHttpServer(app)
if (process.env.NODE_ENV === 'production' || process.argv.includes('--production')) {
  const output = path.join(root, 'dist')
  app.use(express.static(output))
  app.get('*path', (_request, response) => response.sendFile(path.join(output, 'index.html')))
} else {
  const { createServer } = await import('vite')
  const vite = await createServer({ configFile: path.join(root, 'vite.config.ts'), server: { middlewareMode: true, hmr: { server: httpServer } }, appType: 'spa' })
  app.use(vite.middlewares)
}

httpServer.listen(port, '127.0.0.1', () => console.log(`German Vocab Studio is ready at http://127.0.0.1:${port}`))
