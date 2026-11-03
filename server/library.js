import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readSheet } from 'read-excel-file/node'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const levels = ['A1', 'A2', 'B1', 'B2']

export function findWorkbooks() {
  const found = []
  for (const level of levels) {
    const levelPath = path.join(ROOT, level)
    if (!fs.existsSync(levelPath)) continue
    const visit = (directory) => {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const entryPath = path.join(directory, entry.name)
        if (entry.isDirectory()) visit(entryPath)
        else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.xlsx' && !entry.name.startsWith('~$') && !entry.name.startsWith('.~')) {
          const chapter = path.relative(levelPath, directory).split(path.sep).join('/')
          found.push({ id: path.relative(ROOT, entryPath).split(path.sep).join('/'), level, chapter, name: path.basename(directory) })
        }
      }
    }
    visit(levelPath)
  }
  return found.sort((left, right) => left.level.localeCompare(right.level) || left.chapter.localeCompare(right.chapter))
}

export async function hasValidSupabaseSession(request) {
  const authorization = request.headers?.authorization ?? request.headers?.Authorization ?? ''
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1]
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!token || !supabaseUrl || !publishableKey) return false

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: publishableKey, Authorization: `Bearer ${token}` },
    })
    return response.ok
  } catch {
    return false
  }
}

function discoverAudio(directory) {
  const audioExtensions = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.mpga'])
  const audio = { word: {}, both: {}, sentenceTracks: [] }
  const visit = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        visit(fullPath)
        continue
      }
      if (!entry.isFile() || !audioExtensions.has(path.extname(entry.name).toLowerCase())) continue
      const relativePath = path.relative(ROOT, fullPath).split(path.sep).join('/')
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

export async function workbookData(workbook, { includeAudio = false, includeSentenceTracks = true, maxRows } = {}) {
  const sheetRows = await readSheet(path.join(ROOT, workbook.id))
  const headers = (sheetRows[0] ?? []).map((value, index) => String(value ?? '').trim() || `Unnamed: ${index + 1}`)
  const allRows = sheetRows.slice(1).map((cells) => Object.fromEntries(headers.map((header, index) => [header, String(cells[index] ?? '').trim()])))
    .filter((row) => Object.values(row).some(Boolean))
  const totalRows = allRows.length
  const rows = maxRows === undefined ? allRows : allRows.slice(0, maxRows)
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
  const audio = includeAudio ? discoverAudio(path.dirname(path.join(ROOT, workbook.id))) : { word: {}, both: {}, sentenceTracks: [] }
  return {
    ...workbook,
    columns,
    fields,
    totalRows,
    rows: rows.map((values, index) => ({
      id: index,
      values,
      audio: { word: audio.word[index + 1] ?? null, both: audio.both[index + 1] ?? null },
    })),
    sentenceTracks: includeSentenceTracks ? audio.sentenceTracks : [],
  }
}