import express from 'express'
import fs from 'node:fs'
import { createServer as createHttpServer } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readSheet } from 'read-excel-file/node'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const savedWordsFile = path.join(root, 'saved_words.json')
const audioExtensions = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.mpga'])
const levels = ['A1', 'A2', 'B1', 'B2']
const app = express()
app.use(express.json({ limit: '2mb' }))

function findWorkbooks() {
  const found = []
  for (const level of levels) {
    const levelPath = path.join(root, level)
    if (!fs.existsSync(levelPath)) continue
    const visit = (directory) => {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const entryPath = path.join(directory, entry.name)
        if (entry.isDirectory()) visit(entryPath)
        else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.xlsx' && !entry.name.startsWith('~$') && !entry.name.startsWith('.~')) {
          const chapter = path.relative(levelPath, directory).split(path.sep).join('/')
          found.push({ id: path.relative(root, entryPath).split(path.sep).join('/'), level, chapter, name: path.basename(directory) })
        }
      }
    }
    visit(levelPath)
  }
  return found.sort((left, right) => left.level.localeCompare(right.level) || left.chapter.localeCompare(right.chapter))
}

function discoverAudio(directory) {
  const audio = { word: {}, both: {}, sentenceTracks: [] }
  const visit = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        visit(fullPath)
        continue
      }
      if (!entry.isFile() || !audioExtensions.has(path.extname(entry.name).toLowerCase())) continue
      const relativePath = path.relative(root, fullPath).split(path.sep).join('/')
      const folder = path.basename(current).toLowerCase()
      if (folder === 'sentences') {
        audio.sentenceTracks.push(relativePath)
        continue
      }
      const match = path.basename(entry.name).match(/^(\d+)[_\s]+(.+)$/)
      if (!match) continue
      const category = folder === 'both' ? 'both' : 'word'
      audio[category][Number(match[1])] ??= relativePath
    }
  }
  visit(directory)
  audio.sentenceTracks.sort()
  return audio
}

async function workbookData(workbook) {
  const sheetRows = await readSheet(path.join(root, workbook.id))
  const headers = (sheetRows[0] ?? []).map((value, index) => String(value ?? '').trim() || `Unnamed: ${index + 1}`)
  const rows = sheetRows.slice(1).map((cells) => Object.fromEntries(headers.map((header, index) => [header, String(cells[index] ?? '').trim()])))
    .filter((row) => Object.values(row).some(Boolean))
  const columns = [...new Set(headers)].filter((column) => !column.startsWith('Unnamed'))
  const pickColumn = (terms, fallback = columns[0] ?? '') => columns.find((column) => terms.some((term) => column.toLowerCase().includes(term))) ?? fallback
  const fields = {
    german: pickColumn(['vocab word', 'verb', 'word', 'german']),
    english: pickColumn(['english meaning', 'english']),
    hindi: pickColumn(['hindi meaning', 'hindi', 'devanagari']),
    germanSentence: pickColumn(['example sentence (german', 'sentence (german'], ''),
    englishSentence: pickColumn(['example sentence (english', 'sentence (english'], ''),
    hindiSentence: pickColumn(['example sentence (hindi', 'sentence (hindi'], ''),
  }
  const audio = discoverAudio(path.dirname(path.join(root, workbook.id)))
  return {
    ...workbook,
    columns,
    fields,
    rows: rows.map((values, index) => ({
      id: index,
      values,
      audio: { word: audio.word[index + 1] ?? null, both: audio.both[index + 1] ?? null },
    })),
    sentenceTracks: audio.sentenceTracks,
  }
}

app.get('/api/library', (_request, response) => response.json(findWorkbooks()))

app.get('/api/workbook', async (request, response) => {
  const workbook = findWorkbooks().find((item) => item.id === request.query.id)
  if (!workbook) return response.status(404).json({ error: 'Workbook not found.' })
  try {
    response.json(await workbookData(workbook))
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
