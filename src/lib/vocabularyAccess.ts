export type VocabularyRow = { id: number; values: Record<string, string> }
export type SavedVocabularyEntry = { workbook: string; level: string }

export function filterRowsByQuery<T extends VocabularyRow>(rows: T[], query: string): T[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
  if (!terms.length) return rows

  return rows.filter((row) => {
    const searchableText = Object.values(row.values).join(' ').toLocaleLowerCase()
    return terms.every((term) => searchableText.includes(term))
  })
}

export function rowsAvailableToUser<T extends { id: number }>(rows: T[], authenticated: boolean): T[] {
  return authenticated ? rows : rows.filter((row) => row.id === 0)
}

export function savedWordsForWorkbook<T extends SavedVocabularyEntry>(entries: [string, T][], level: string, workbookId: string): [string, T][] {
  return entries.filter(([, entry]) => entry.level === level && entry.workbook === workbookId)
}
