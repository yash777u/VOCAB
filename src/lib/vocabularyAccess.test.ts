import { describe, expect, it } from 'vitest'
import { filterRowsByQuery, rowsAvailableToUser, savedWordsForWorkbook } from './vocabularyAccess'

const rows = [
  { id: 0, values: { German: 'Guten Tag', English: 'hello, good day' } },
  { id: 1, values: { German: 'sprechen', English: 'to speak' } },
  { id: 2, values: { German: 'der Alltag', English: 'everyday life' } },
]

describe('workbook search', () => {
  it('matches multiple terms across fields without depending on case', () => {
    expect(filterRowsByQuery(rows, 'SPRECHEN speak').map((row) => row.id)).toEqual([1])
  })

  it('returns all rows for an empty query and none for an unmatched query', () => {
    expect(filterRowsByQuery(rows, '   ')).toHaveLength(3)
    expect(filterRowsByQuery(rows, 'not-a-word')).toEqual([])
  })
})

describe('guest access', () => {
  it('limits unauthenticated users to the first workbook row', () => {
    expect(rowsAvailableToUser(rows, false).map((row) => row.id)).toEqual([0])
  })

  it('keeps every row available to authenticated users', () => {
    expect(rowsAvailableToUser(rows, true)).toEqual(rows)
  })
})

describe('saved workbook filtering', () => {
  const saved = [
    ['a1-verbs::0', { workbook: 'A1/verbs.xlsx', level: 'A1' }],
    ['a1-chapter::0', { workbook: 'A1/chapter.xlsx', level: 'A1' }],
    ['a2-verbs::0', { workbook: 'A2/verbs.xlsx', level: 'A2' }],
  ] as [string, { workbook: string; level: string }][]

  it('returns only the selected workbook within the selected level', () => {
    expect(savedWordsForWorkbook(saved, 'A1', 'A1/chapter.xlsx').map(([key]) => key)).toEqual(['a1-chapter::0'])
    expect(savedWordsForWorkbook(saved, 'A2', 'A2/verbs.xlsx').map(([key]) => key)).toEqual(['a2-verbs::0'])
  })

  it('never combines every workbook when a workbook is selected', () => {
    expect(savedWordsForWorkbook(saved, 'A1', 'A1/verbs.xlsx')).toHaveLength(1)
  })
})
