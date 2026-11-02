import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDownToLine, ArrowLeft, ArrowRight, BookOpen, Bookmark, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Headphones, Heart, Moon, Pause, Search, Sparkles, Sun, Volume2, X } from 'lucide-react'

type WorkbookSummary = { id: string; level: string; chapter: string; name: string }
type WordRow = { id: number; values: Record<string, string>; audio: { word: string | null; both: string | null } }
type WorkbookData = WorkbookSummary & {
  columns: string[]
  fields: Record<'german' | 'english' | 'hindi' | 'germanSentence' | 'englishSentence' | 'hindiSentence', string>
  rows: WordRow[]
  sentenceTracks: string[]
}
type SavedWord = { workbook: string; level: string; chapter: string; row: number; values: Record<string, string>; audio?: WordRow['audio'] }
type Section = 'study' | 'saved' | 'builder' | 'quiz'

const PAGE_SIZE = 20
const levelColors: Record<string, string> = { A1: 'mint', A2: 'cyan', B1: 'amber', B2: 'coral' }
const audioUrl = (file: string) => `/api/audio?path=${encodeURIComponent(file)}`
const clean = (value: string | undefined) => (value ?? '').trim()

export default function App() {
  const [library, setLibrary] = useState<WorkbookSummary[]>([])
  const [workbookId, setWorkbookId] = useState('')
  const [workbook, setWorkbook] = useState<WorkbookData | null>(null)
  const [section, setSection] = useState<Section>('study')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [audioMode, setAudioMode] = useState('Word → Both')
  const [savedWords, setSavedWords] = useState<Record<string, SavedWord>>({})
  const [expanded, setExpanded] = useState<number | null>(null)
  const [darkMode, setDarkMode] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [playingKey, setPlayingKey] = useState('')
  const [quizIndex, setQuizIndex] = useState(0)
  const [quizScore, setQuizScore] = useState(0)
  const [quizAnswers, setQuizAnswers] = useState<string[]>([])
  const [quizOptions, setQuizOptions] = useState<string[][]>([])
  const [selectedTextRows, setSelectedTextRows] = useState<number[]>([])
  const [selectedFields, setSelectedFields] = useState<string[]>([])
  const [fieldSeparator, setFieldSeparator] = useState(' — ')
  const [rowSeparator, setRowSeparator] = useState('\n')
  const [textOutput, setTextOutput] = useState('')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const playbackToken = useRef(0)
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  useEffect(() => {
    let active = true
    Promise.all([
      fetch('/api/library').then(async (response) => {
        if (!response.ok) throw new Error('The vocabulary library could not be loaded.')
        return response.json() as Promise<WorkbookSummary[]>
      }),
      fetch('/api/saved-words').then((response) => response.json() as Promise<Record<string, SavedWord>>),
    ]).then(([books, saved]) => {
      if (!active) return
      setLibrary(books)
      setSavedWords(saved)
      setWorkbookId(books[0]?.id ?? '')
      if (!books.length) setError('No A1, A2, B1, or B2 Excel workbooks were found beside the app.')
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : 'The vocabulary library could not be loaded.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!workbookId) return
    let active = true
    setWorkbook(null)
    fetch(`/api/workbook?id=${encodeURIComponent(workbookId)}`)
      .then(async (response) => {
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error ?? 'This workbook could not be loaded.')
        return payload as WorkbookData
      })
      .then((data) => {
        if (!active) return
        setWorkbook(data)
        setSelectedFields(data.columns.filter((column) => [data.fields.german, data.fields.english, data.fields.germanSentence, data.fields.hindi].includes(column)))
      })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'This workbook could not be loaded.') })
    return () => { active = false }
  }, [workbookId])

  const activeBook = library.find((book) => book.id === workbookId)
  const filteredRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    if (!query || !workbook) return workbook?.rows ?? []
    return workbook.rows.filter((row) => Object.values(row.values).some((value) => value.toLocaleLowerCase().includes(query)))
  }, [search, workbook])
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const visibleRows = filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const audioCount = workbook?.rows.filter((row) => row.audio.word || row.audio.both).length ?? 0
  const audioCoverage = workbook?.rows.length ? Math.round(audioCount / workbook.rows.length * 100) : 0
  const currentQuizRow = visibleRows[quizIndex]
  const savedEntries = Object.entries(savedWords)

  async function playSequence(paths: string[], key: string, rate = 1) {
    if (playingKey === key) {
      playbackToken.current += 1
      audioRef.current?.pause()
      setPlayingKey('')
      return
    }
    const token = ++playbackToken.current
    audioRef.current?.pause()
    setPlayingKey(key)
    try {
      for (const file of paths) {
        if (token !== playbackToken.current) break
        const audio = new Audio(audioUrl(file))
        audioRef.current = audio
        audio.playbackRate = rate
        await new Promise<void>((resolve) => {
          audio.onended = () => resolve()
          audio.onerror = () => resolve()
          audio.onpause = () => resolve()
          audio.play().catch(() => resolve())
        })
      }
    } finally {
      if (token === playbackToken.current) setPlayingKey('')
    }
  }

  function persistSaved(next: Record<string, SavedWord>) {
    setSavedWords(next)
    fetch('/api/saved-words', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) })
      .then((response) => { if (!response.ok) throw new Error() })
      .catch(() => setError('Saved words could not be written to disk.'))
  }

  function toggleSaved(row: WordRow, book: WorkbookSummary) {
    const key = `${book.id}::${row.id}`
    const next = { ...savedWords }
    if (next[key]) delete next[key]
    else next[key] = { workbook: book.id, level: book.level, chapter: book.chapter, row: row.id + 1, values: row.values, audio: row.audio }
    persistSaved(next)
  }

  function changeWorkbook(id: string) {
    setWorkbookId(id)
    setPage(1)
    setSearch('')
    setExpanded(null)
    setError('')
    setSection('study')
  }

  function startQuiz() {
    const meanings = [...new Set((workbook?.rows ?? []).map((row) => clean(row.values[workbook?.fields.english ?? ''])).filter(Boolean))]
    setQuizOptions(visibleRows.map((row) => {
      const correct = clean(row.values[workbook?.fields.english ?? ''])
      const wrong = meanings.filter((meaning) => meaning !== correct).sort(() => Math.random() - 0.5).slice(0, 3)
      return [correct, ...wrong].sort(() => Math.random() - 0.5)
    }))
    setQuizIndex(0)
    setQuizScore(0)
    setQuizAnswers([])
    setSection('quiz')
  }

  function answerQuiz(answer: string) {
    if (!workbook || !currentQuizRow || quizAnswers[quizIndex] !== undefined) return
    const correct = answer === clean(currentQuizRow.values[workbook.fields.english])
    setQuizAnswers((answers) => [...answers, answer])
    if (correct) setQuizScore((score) => score + 1)
  }

  function nextQuiz() {
    setQuizIndex((index) => Math.min(index + 1, visibleRows.length))
  }

  function buildText() {
    if (!workbook) return
    setTextOutput(selectedTextRows.map((rowId) => {
      const values = workbook.rows[rowId]?.values
      return selectedFields.map((field) => clean(values?.[field])).filter(Boolean).join(fieldSeparator)
    }).filter(Boolean).join(rowSeparator))
  }

  function downloadText() {
    const blob = new Blob([textOutput], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${activeBook?.level ?? 'vocabulary'}_words.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <main className="loading-screen"><span className="loader" /><p>Opening your German library…</p></main>
  if (error && !library.length) return <main className="loading-screen"><CircleHelp size={30} /><p>{error}</p></main>

  const levelBooks = library.filter((book) => book.level === (activeBook?.level ?? library[0]?.level))
  const pageStart = (safePage - 1) * PAGE_SIZE
  const isQuizDone = quizIndex >= visibleRows.length

  return (
    <div className={`app-shell${darkMode ? '' : ' light-mode'}`}>
      <header className="topbar">
        <a className="brand" href="#study" onClick={(event) => { event.preventDefault(); setSection('study') }}>
          <span className="brand-mark">DF</span><span className="brand-copy"><strong>DeutschFlash</strong><small>Vocabulary studio</small></span>
        </a>
        <nav className="main-nav" aria-label="Main sections">
          <button className={section === 'study' ? 'active' : ''} onClick={() => setSection('study')}><BookOpen size={16} /> Study</button>
          <button className={section === 'saved' ? 'active' : ''} onClick={() => setSection('saved')}><Bookmark size={16} /> Saved <span className="nav-count">{savedEntries.length}</span></button>
          <button className={section === 'builder' ? 'active' : ''} onClick={() => setSection('builder')}><ArrowDownToLine size={16} /> Text builder</button>
        </nav>
        <button className="theme-toggle" title="Toggle color theme" aria-label="Toggle color theme" onClick={() => setDarkMode((value) => !value)}>{darkMode ? <Sun size={18} /> : <Moon size={18} />}</button>
      </header>

      <main className="workspace">
        <section className="welcome-row">
          <div><div className="eyebrow">A listening-first vocabulary library</div><h1>Make German <span>stick.</span></h1><p>Browse your workbook, hear each word, and keep the ones worth revisiting.</p></div>
          <button className="quiz-launch" disabled={!workbook?.rows.length} onClick={startQuiz}><Sparkles size={17} /> Quick quiz <ArrowRight size={16} /></button>
        </section>

        <section className="library-bar" aria-label="Vocabulary selection">
          <div className="select-field level-select"><label htmlFor="level-picker">Level</label><div className="select-wrap"><span className={`level-dot ${levelColors[activeBook?.level ?? 'A1']}`} /><select id="level-picker" value={activeBook?.level ?? ''} onChange={(event) => changeWorkbook(library.find((book) => book.level === event.target.value)?.id ?? '')}>{[...new Set(library.map((book) => book.level))].map((level) => <option key={level}>{level}</option>)}</select><ChevronDown size={16} /></div></div>
          <div className="select-field chapter-select"><label htmlFor="chapter-picker">Workbook</label><div className="select-wrap"><select id="chapter-picker" value={workbookId} onChange={(event) => changeWorkbook(event.target.value)}>{levelBooks.map((book) => <option key={book.id} value={book.id}>{book.chapter}</option>)}</select><ChevronDown size={16} /></div></div>
          <label className="search-field"><Search size={17} /><input ref={searchInputRef} value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Search words, meanings, examples…" /><kbd>Ctrl K</kbd></label>
        </section>

        {error && <div className="inline-error" role="status">{error}<button onClick={() => setError('')} aria-label="Dismiss"><X size={15} /></button></div>}

        <section className="metric-strip" aria-label="Workbook overview">
          <div className="metric-cell"><span>WORDS IN WORKBOOK</span><strong>{workbook?.rows.length.toLocaleString() ?? '—'}</strong></div>
          <div className="metric-cell"><span>AUDIO COVERAGE</span><strong>{audioCoverage}<small>%</small></strong></div>
          <div className="metric-cell"><span>SAVED FOR LATER</span><strong>{savedEntries.length.toLocaleString()}</strong></div>
          <div className="metric-progress"><div><span>Listen as you learn</span><strong>{audioCount.toLocaleString()} clips matched</strong></div><i><b style={{ width: `${audioCoverage}%` }} /></i></div>
        </section>

        {section === 'study' && workbook && activeBook && <StudyView workbook={workbook} activeBook={activeBook} rows={visibleRows} totalRows={filteredRows.length} savedWords={savedWords} page={safePage} totalPages={totalPages} pageStart={pageStart} audioMode={audioMode} setAudioMode={setAudioMode} setPage={setPage} toggleSaved={toggleSaved} playingKey={playingKey} playSequence={playSequence} expanded={expanded} setExpanded={setExpanded} />}
        {section === 'saved' && <SavedView entries={savedEntries} onRemove={(key) => { const next = { ...savedWords }; delete next[key]; persistSaved(next) }} playSequence={playSequence} playingKey={playingKey} />}
        {section === 'builder' && workbook && <BuilderView workbook={workbook} rows={visibleRows} pageStart={pageStart} selectedRows={selectedTextRows} setSelectedRows={setSelectedTextRows} selectedFields={selectedFields} setSelectedFields={setSelectedFields} fieldSeparator={fieldSeparator} setFieldSeparator={setFieldSeparator} rowSeparator={rowSeparator} setRowSeparator={setRowSeparator} textOutput={textOutput} setTextOutput={setTextOutput} buildText={buildText} downloadText={downloadText} />}
        {section === 'quiz' && workbook && <QuizView rows={visibleRows} workbook={workbook} index={quizIndex} score={quizScore} answers={quizAnswers} options={quizOptions} isDone={isQuizDone} answer={answerQuiz} next={nextQuiz} back={() => setSection('study')} playSequence={playSequence} playingKey={playingKey} />}
        <footer className="app-footer"><span><Headphones size={14} /> Built for steady progress</span><span>DeutschFlash <i /> A1–B2</span></footer>
      </main>
    </div>
  )
}

function StudyView({ workbook, activeBook, rows, totalRows, savedWords, page, totalPages, pageStart, audioMode, setAudioMode, setPage, toggleSaved, playingKey, playSequence, expanded, setExpanded }: {
  workbook: WorkbookData; activeBook: WorkbookSummary; rows: WordRow[]; totalRows: number; savedWords: Record<string, SavedWord>; page: number; totalPages: number; pageStart: number; audioMode: string; setAudioMode: (mode: string) => void; setPage: (page: number) => void; toggleSaved: (row: WordRow, book: WorkbookSummary) => void; playingKey: string; playSequence: (paths: string[], key: string, rate?: number) => void; expanded: number | null; setExpanded: (id: number | null) => void
}) {
  return <section className="study-area">
    <div className="section-heading"><div><div className="eyebrow">{activeBook.level} · {activeBook.chapter}</div><h2>Vocabulary</h2></div><div className="list-tools"><label className="audio-mode">Row audio<select value={audioMode} onChange={(event) => setAudioMode(event.target.value)}><option>Word → Both</option><option>Word only</option><option>Both only</option></select><ChevronDown size={14} /></label><span className="result-total">{totalRows.toLocaleString()} words</span></div></div>
    {!rows.length ? <div className="empty-state"><Search size={22} /><strong>No matching words</strong><span>Try a shorter search or another workbook.</span></div> : <div className="word-list">{rows.map((row, index) => {
      const german = clean(row.values[workbook.fields.german]) || 'Untitled word'
      const english = clean(row.values[workbook.fields.english])
      const key = `${activeBook.id}::${row.id}`
      const isSaved = Boolean(savedWords[key])
      const rowAudio = audioMode === 'Word only' ? [row.audio.word] : audioMode === 'Both only' ? [row.audio.both] : [row.audio.word, row.audio.both]
      const paths = rowAudio.filter((file): file is string => Boolean(file))
      return <article className={`word-row${expanded === row.id ? ' expanded' : ''}`} key={key}>
        <div className="row-index">{String(pageStart + index + 1).padStart(2, '0')}</div>
        <div className="row-language"><div className="german-word">{german}<button className="audio-button" disabled={!paths.length} aria-label={`Play ${german}`} title={paths.length ? 'Play pronunciation' : 'No audio clip'} onClick={() => playSequence(paths, key)}>{playingKey === key ? <Pause size={15} /> : <Volume2 size={16} />}</button></div><span className="row-subtext">{clean(row.values[workbook.fields.germanSentence]) || 'German vocabulary'}</span></div>
        <div className="row-meaning"><span>{english || '—'}</span><small>{clean(row.values[workbook.fields.hindi])}</small></div>
        <div className="row-actions"><button className={`bookmark-button${isSaved ? ' saved' : ''}`} title={isSaved ? 'Remove saved word' : 'Save word'} aria-label={isSaved ? `Remove ${german} from saved words` : `Save ${german}`} onClick={() => toggleSaved(row, activeBook)}>{isSaved ? <Heart size={16} fill="currentColor" /> : <Bookmark size={16} />}</button><button className="expand-button" title="Show example translations" aria-label={`Show details for ${german}`} aria-expanded={expanded === row.id} onClick={() => setExpanded(expanded === row.id ? null : row.id)}>{expanded === row.id ? <X size={15} /> : <ChevronDown size={16} />}</button></div>
        {expanded === row.id && <div className="row-details">{[[workbook.fields.germanSentence, 'German example'], [workbook.fields.englishSentence, 'English translation'], [workbook.fields.hindiSentence, 'Hindi translation']].filter(([field]) => field).map(([field, label]) => <div key={field}><small>{label}</small><p>{clean(row.values[field]) || 'No example available.'}</p></div>)}</div>}
      </article>
    })}</div>}
    <div className="pagination"><span>Showing <b>{totalRows ? pageStart + 1 : 0}–{Math.min(pageStart + rows.length, totalRows)}</b> of {totalRows.toLocaleString()}</span><div><button title="Previous page" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft size={17} /></button><span>Page <b>{page}</b> of {totalPages}</span><button title="Next page" aria-label="Next page" disabled={page >= totalPages} onClick={() => setPage(page + 1)}><ChevronRight size={17} /></button></div></div>
    {workbook.sentenceTracks.length > 0 && <section className="sentence-tracks"><div><div className="eyebrow">Full recordings</div><h3>Sentence tracks</h3></div>{workbook.sentenceTracks.map((track) => <audio controls preload="none" key={track} src={audioUrl(track)} aria-label={track.split('/').pop()} />)}</section>}
  </section>
}

function SavedView({ entries, onRemove, playSequence, playingKey }: { entries: [string, SavedWord][]; onRemove: (key: string) => void; playSequence: (paths: string[], key: string, rate?: number) => void; playingKey: string }) {
  return <section className="content-panel saved-panel"><div className="section-heading"><div><div className="eyebrow">Your personal collection</div><h2>Saved words</h2></div><span className="result-total">{entries.length} saved</span></div>{entries.length ? <div className="word-list">{entries.map(([key, item]) => { const german = item.values['Verb'] || item.values['Vocab Word'] || Object.entries(item.values).find(([column]) => /word|verb|german/i.test(column))?.[1] || 'Saved word'; const english = Object.entries(item.values).find(([column]) => /english/i.test(column))?.[1] || ''; const audioPaths = [item.audio?.word, item.audio?.both].filter((file): file is string => Boolean(file)); return <article className="word-row" key={key}><div className="row-index"><Bookmark size={15} /></div><div className="row-language"><div className="german-word">{german}<button className="audio-button" disabled={!audioPaths.length} aria-label={`Play ${german}`} onClick={() => playSequence(audioPaths, key)}>{playingKey === key ? <Pause size={15} /> : <Volume2 size={16} />}</button></div><span className="row-subtext">{item.level} · {item.chapter}</span></div><div className="row-meaning"><span>{english || '—'}</span></div><div className="row-actions"><button className="bookmark-button saved" title="Remove saved word" aria-label={`Remove ${german}`} onClick={() => onRemove(key)}><Heart size={16} fill="currentColor" /></button></div></article>})}</div> : <div className="empty-state"><Bookmark size={22} /><strong>Your collection starts here</strong><span>Save words while studying and they’ll be ready to review here.</span></div>}</section>
}

function BuilderView({ workbook, rows, pageStart, selectedRows, setSelectedRows, selectedFields, setSelectedFields, fieldSeparator, setFieldSeparator, rowSeparator, setRowSeparator, textOutput, setTextOutput, buildText, downloadText }: {
  workbook: WorkbookData; rows: WordRow[]; pageStart: number; selectedRows: number[]; setSelectedRows: (rows: number[]) => void; selectedFields: string[]; setSelectedFields: (fields: string[]) => void; fieldSeparator: string; setFieldSeparator: (separator: string) => void; rowSeparator: string; setRowSeparator: (separator: string) => void; textOutput: string; setTextOutput: (text: string) => void; buildText: () => void; downloadText: () => void
}) {
  const toggleRow = (id: number) => setSelectedRows(selectedRows.includes(id) ? selectedRows.filter((item) => item !== id) : [...selectedRows, id])
  const toggleField = (field: string) => setSelectedFields(selectedFields.includes(field) ? selectedFields.filter((item) => item !== field) : [...selectedFields, field])
  return <section className="content-panel builder-panel"><div className="section-heading"><div><div className="eyebrow">Make your own study sheet</div><h2>Text builder</h2></div></div><p className="panel-intro">Pick words and the details you want, then edit or download the finished text.</p><div className="builder-layout"><div className="builder-options"><div className="builder-group"><div className="builder-label"><span>Words on this page</span><button type="button" onClick={() => setSelectedRows(selectedRows.length === rows.length ? [] : rows.map((row) => row.id))}>{selectedRows.length === rows.length ? 'Clear' : 'Select all'}</button></div><div className="choice-list">{rows.map((row, index) => <label key={row.id}><input type="checkbox" checked={selectedRows.includes(row.id)} onChange={() => toggleRow(row.id)} /><span>{clean(row.values[workbook.fields.german]) || `Word ${pageStart + index + 1}`}</span><small>{clean(row.values[workbook.fields.english])}</small></label>)}</div></div><div className="builder-group"><div className="builder-label"><span>Include fields</span><span>{selectedFields.length} selected</span></div><div className="field-choices">{workbook.columns.map((field) => <label key={field}><input type="checkbox" checked={selectedFields.includes(field)} onChange={() => toggleField(field)} />{field}</label>)}</div></div><div className="builder-separators"><label>Between fields<select value={fieldSeparator} onChange={(event) => setFieldSeparator(event.target.value)}><option value=" — ">Dash</option><option value=" | ">Vertical line</option><option value=": ">Colon</option><option value="\n">New line</option></select></label><label>Between words<select value={rowSeparator} onChange={(event) => setRowSeparator(event.target.value)}><option value="\n">New line</option><option value="\n\n">Blank line</option></select></label></div><button className="primary-button" onClick={buildText} disabled={!selectedRows.length || !selectedFields.length}><Sparkles size={16} /> Build text</button></div><div className="text-output"><div className="builder-label"><span>Editable output</span><span>{textOutput.length} characters</span></div><textarea value={textOutput} onChange={(event) => setTextOutput(event.target.value)} placeholder="Choose words and fields, then build your text…" aria-label="Generated text, editable" /><button className="secondary-button" onClick={downloadText} disabled={!textOutput.trim()}><ArrowDownToLine size={16} /> Download .txt</button></div></div></section>
}

function QuizView({ rows, workbook, index, score, answers, options, isDone, answer, next, back, playSequence, playingKey }: {
  rows: WordRow[]; workbook: WorkbookData; index: number; score: number; answers: string[]; options: string[][]; isDone: boolean; answer: (choice: string) => void; next: () => void; back: () => void; playSequence: (paths: string[], key: string, rate?: number) => void; playingKey: string
}) {
  if (!rows.length) return <section className="content-panel quiz-panel"><button className="back-link" onClick={back}><ArrowLeft size={15} /> Back to study</button><div className="empty-state"><CircleHelp size={22} /><strong>No words to quiz</strong><span>Choose a workbook with vocabulary first.</span></div></section>
  if (isDone) return <section className="content-panel quiz-panel"><div className="quiz-finish"><div className="finish-icon"><Check size={25} /></div><div className="eyebrow">Practice round complete</div><h2>Sehr gut.</h2><p>You got {score} out of {rows.length} words right.</p><div className="finish-score"><strong>{Math.round(score / rows.length * 100)}<small>%</small></strong><span>Accuracy</span></div><button className="primary-button" onClick={back}>Back to vocabulary <ArrowRight size={16} /></button></div></section>
  const row = rows[index]
  const german = clean(row.values[workbook.fields.german])
  const clips = [row.audio.word, row.audio.both].filter((file): file is string => Boolean(file))
  const selected = answers[index]
  const correct = clean(row.values[workbook.fields.english])
  return <section className="content-panel quiz-panel"><button className="back-link" onClick={back}><ArrowLeft size={15} /> Back to study</button><div className="quiz-topline"><div><div className="eyebrow">Quick recall</div><h2>Page quiz</h2></div><div className="quiz-score">{score}<small> / {index + (selected ? 1 : 0)} correct</small></div></div><div className="quiz-progress"><i style={{ width: `${index / rows.length * 100}%` }} /></div><div className="quiz-card"><div className="quiz-meta"><span>{workbook.level} · {workbook.chapter}</span><span>Word {index + 1} of {rows.length}</span></div><h3>{german}</h3><span className="quiz-hint">Choose the English meaning</span>{clips.length ? <div className="quiz-audio-controls"><button onClick={() => playSequence(clips, 'quiz-audio')}><Volume2 size={16} /> {playingKey === 'quiz-audio' ? 'Stop audio' : 'Listen'}</button><button onClick={() => playSequence(clips, 'quiz-slow', 0.75)}><Headphones size={16} /> Slow</button></div> : <span className="quiz-hint no-audio">No audio clip for this word</span>}<div className="quiz-options">{(options[index] ?? [correct]).map((choice) => <button key={choice} disabled={Boolean(selected)} className={selected ? choice === correct ? 'correct' : choice === selected ? 'incorrect' : '' : ''} onClick={() => answer(choice)}>{selected && choice === correct && <Check size={16} />}{choice}</button>)}</div>{selected && <div className={`quiz-feedback${selected === correct ? ' right' : ' wrong'}`}>{selected === correct ? 'Correct, gut gemacht!' : `Not quite. The answer is ${correct}.`}<button onClick={next}>{index === rows.length - 1 ? 'Finish round' : 'Next word'} <ArrowRight size={15} /></button></div>}</div><div className="quiz-footer"><span>{answers.length} answered</span><button className="skip-button" onClick={next} disabled={Boolean(selected)}>Skip word <ArrowRight size={14} /></button></div></section>
}
