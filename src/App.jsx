import { useEffect, useRef, useState } from 'react'

const API = 'https://api.github.com/search/repositories'
const RESULTS_PER_PAGE = 8
const DEBOUNCE_MS = 300
const RECENT_KEY = 'repo-palette:recent'
const MAX_RECENT = 5
const THEME_KEY = 'repo-palette:theme'

function loadRecent() {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveRecent(recent) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent))
  } catch {
    /* storage may be unavailable; the palette still works */
  }
}

const prefersDark = () =>
  window.matchMedia('(prefers-color-scheme: dark)').matches

function loadTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    /* fall through to system preference */
  }
  return prefersDark() ? 'dark' : 'light'
}

function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    /* storage may be unavailable; the palette still works */
  }
}

function Shortcut({ children }) {
  return <kbd className="kbd">{children}</kbd>
}

function Highlight({ text, query }) {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

function ThemeToggle({ theme, onToggle }) {
  return (
    <button
      className="theme-toggle"
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={onToggle}
    />
  )
}

function openRepo(url, newTab) {
  if (newTab) {
    window.open(url, '_blank', 'noopener')
  } else {
    window.location.href = url
  }
}

export default function App() {
  const triggerRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [theme, setTheme] = useState(loadTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    saveTheme(theme)
  }, [theme])

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    function onSystemChange() {
      setTheme(loadTheme())
    }
    mql.addEventListener('change', onSystemChange)
    return () => mql.removeEventListener('change', onSystemChange)
  }, [])

  useEffect(() => {
    function onKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (!open) triggerRef.current?.focus()
  }, [open])

  return (
    <div className="page">
      <header className="topbar">
        <span className="brand" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="26" height="26">
            <path
              fill="currentColor"
              d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"
            />
          </svg>
        </span>
        <span className="topbar-title">repo-palette</span>
        <button
          ref={triggerRef}
          className="trigger"
          onClick={() => setOpen(true)}
        >
          &#128269; Search or jump to a repository&hellip;
          <span className="trigger-hint">
            <Shortcut>Ctrl</Shortcut> <Shortcut>K</Shortcut>
          </span>
        </button>
        <ThemeToggle theme={theme} onToggle={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} />
      </header>

      <main className="content">
        <h1>Repository Switcher</h1>
        <p className="lead">
          A rebuild of GitHub&rsquo;s <em>command palette</em>: press{' '}
          <Shortcut>Ctrl</Shortcut> <Shortcut>K</Shortcut>, type, and jump to
          any public repository &mdash; entirely from the keyboard.
        </p>
        <div className="hints">
          <span><Shortcut>&#8593;</Shortcut> <Shortcut>&#8595;</Shortcut> navigate</span>
          <span><Shortcut>Enter</Shortcut> open</span>
          <span><Shortcut>Esc</Shortcut> close</span>
        </div>
        <button className="open-button" onClick={() => setOpen(true)}>
          Open the palette
        </button>
      </main>

      {open && <Palette onClose={() => setOpen(false)} />}
    </div>
  )
}

function Palette({ onClose }) {
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | error | success
  const [items, setItems] = useState([])
  const [errorMsg, setErrorMsg] = useState('')
  const [selected, setSelected] = useState(0)
  const [recent, setRecent] = useState(loadRecent)

  const visible = status === 'idle' ? recent : items

  useEffect(() => {
    inputRef.current?.focus()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setStatus('idle')
      setItems([])
      setSelected(0)
      return
    }

    setStatus('loading')
    let cancelled = false
    const timer = setTimeout(run, DEBOUNCE_MS)

    async function run() {
      try {
        const url = `${API}?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=${RESULTS_PER_PAGE}`
        const res = await fetch(url)
        if (cancelled) return
        if (!res.ok) {
          if (res.status === 403) {
            throw new Error('GitHub API rate limit reached (60/hr unauthenticated)')
          }
          if (res.status === 422) {
            throw new Error('That query could not be understood by the GitHub API')
          }
          throw new Error(`The GitHub API responded with status ${res.status}`)
        }
        const data = await res.json()
        if (cancelled) return
        setItems(data.items.map(strip))
        setStatus('success')
        setSelected(0)
      } catch (err) {
        if (cancelled) return
        setErrorMsg(err.message)
        setStatus('error')
        setSelected(0)
      }
    }

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  useEffect(() => {
    setSelected((s) => {
      const n = visible.length
      if (n === 0) return -1
      if (s > n - 1) return n - 1
      return s
    })
  }, [visible.length])

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selected}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  function choose(repo) {
    pushRecent(repo)
    openRepo(repo.url, true)
    onClose()
  }

  function pushRecent(repo) {
    setRecent((prev) => {
      const next = [repo, ...prev.filter((r) => r.id !== repo.id)].slice(0, MAX_RECENT)
      saveRecent(next)
      return next
    })
  }

  function onKeyDown(e) {
    const count = visible.length
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (count > 0) setSelected((s) => Math.min(s + 1, count - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (count > 0) setSelected((s) => Math.max(s - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (status === 'error') {
        setQuery((q) => q)
        return
      }
      const repo = visible[selected]
      if (repo) choose(repo)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div
        className="palette"
        role="combobox"
        aria-expanded="true"
        aria-haspopup="listbox"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="search-row">
          <span className="search-icon" aria-hidden="true">
            &#128269;
          </span>
          <input
            ref={inputRef}
            role="searchbox"
            aria-label="Search repositories"
            placeholder="Search repositories..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            spellCheck={false}
          />
          {query && (
            <button className="clear" aria-label="Clear search" onClick={() => setQuery('')}>
              &#10005;
            </button>
          )}
        </div>

        <div className="list" ref={listRef} role="listbox" aria-label="Results">
          {status === 'idle' && <IdleRow recent={recent} query={query} onKeyDown={onKeyDown} selected={selected} onSelect={choose} />}
          {status === 'loading' && <LoadingRow />}
          {status === 'error' && <ErrorRow query={query} message={errorMsg} onRetry={() => setQuery((q) => q + '')} />}
          {status === 'success' &&
            (visible.length === 0 ? (
              <EmptyRow query={query.trim()} />
            ) : (
              <ul>
                {visible.map((repo, i) => (
                  <li key={repo.id}>
                    <Row
                      index={i}
                      selected={i === selected}
                      query={query.trim()}
                      repo={repo}
                      onMouseEnter={() => setSelected(i)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => choose(repo)}
                    />
                  </li>
                ))}
              </ul>
            ))}
        </div>

        <footer className="footer">
          <span><Shortcut>&#8593;</Shortcut> <Shortcut>&#8595;</Shortcut> navigate</span>
          <span><Shortcut>Enter</Shortcut> open in new tab</span>
          <span><Shortcut>Esc</Shortcut> close</span>
        </footer>
      </div>
    </div>
  )
}

function Row({ index, selected, query, repo, onMouseEnter, onMouseDown, onClick }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      data-index={index}
      className={'row' + (selected ? ' selected' : '')}
      onMouseEnter={onMouseEnter}
      onMouseDown={onMouseDown}
      onClick={onClick}
    >
      <span className="row-icon" aria-hidden="true">
        repo
      </span>
      <span className="row-main">
        <span className="row-name">
          <Highlight text={repo.full_name} query={query} />
        </span>
        {repo.description && <span className="row-desc">{repo.description}</span>}
      </span>
      {repo.stars > 0 && (
        <span className="row-stars" title="Stars">
          &#9733; {repo.stars >= 1000 ? `${(repo.stars / 1000).toFixed(1)}k` : repo.stars}
        </span>
      )}
    </button>
  )
}

function IdleRow({ recent, onSelect }) {
  if (recent.length === 0) {
    return (
      <div className="row hint-row">
        <span>Start typing to search public repositories on GitHub.</span>
      </div>
    )
  }
  return (
    <>
      <div className="section-label">Recent</div>
      {recent.map((repo, i) => (
        <Row
          key={repo.id}
          index={i}
          selected={i === 0}
          query=""
          repo={repo}
          onMouseEnter={() => {}}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onSelect(repo)}
        />
      ))}
    </>
  )
}

function LoadingRow() {
  return (
    <div className="row status-row" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>Searching repositories&hellip;</span>
    </div>
  )
}

function ErrorRow({ message, onRetry }) {
  return (
    <div className="row status-row error-row">
      <div className="error-main">
        <strong>Request failed</strong>
        <span>{message}. Check your connection and try again.</span>
      </div>
      <button type="button" className="retry" onMouseDown={(e) => e.preventDefault()} onClick={onRetry}>
        Retry &#8635;
      </button>
    </div>
  )
}

function EmptyRow({ query }) {
  return (
    <div className="row status-row empty-row">
      <div className="error-main">
        <strong>No repositories found</strong>
        <span>
          The search for <em>&ldquo;{query}&rdquo;</em> succeeded &mdash; GitHub just
          has nothing by that name. Try different keywords.
        </span>
      </div>
    </div>
  )
}

function strip(repo) {
  return {
    id: repo.id,
    full_name: repo.full_name,
    description: repo.description,
    stars: repo.stargazers_count,
    url: repo.html_url,
  }
}