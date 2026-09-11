# repo-palette

A keyboard-first rebuild of **GitHub's repository switcher** — the palette
you get with `Ctrl+K`. Type part of a repository name, arrow-key to it,
press `Enter`. No mouse required.

## Architecture and decisions

The project is a single-page React app. There is no backend, no build
pipeline beyond Vite, and no server-side logic. Every decision is
deliberate and simple on purpose.

### Why a single component tree

The entire UI lives in two components:

- `App` — renders the top bar, a trigger button, and listens globally for
  `Ctrl+K`.
- `Palette` — the overlay itself: input, results list, and all four state
  screens.

There is no state management library. Local `useState` is sufficient because
the data flow is linear: query → fetch → render. Adding Redux or context
would be cost without benefit for a single feature.

### Why the GitHub Search API directly

The palette calls the
[GitHub Search API](https://docs.github.com/en/rest/search) from the
browser with no proxy. GitHub's search endpoint is public, requires no
authentication for basic queries, and returns exactly the data the palette
needs. This eliminates the need for any server-side component, environment
variables, or API keys.

The trade-off is a rate limit of 10 search requests per minute without a
token. For a demonstration, this is acceptable. The error state is designed
to handle it gracefully.

### Why localStorage for recents

GitHub's original palette shows your recently-visited repositories, but
that requires an authenticated session. Without authentication, the honest
equivalent is storing a short list in `localStorage`. Five items is enough
to feel useful without overengineering persistence.

If the browser blocks `localStorage` (some private modes), the palette
still works — recents just don't persist. This is documented below as a
known limitation.

### Why a new tab

When you select a result, it opens in a new tab. GitHub's original navigates
in the same window. Opening a new tab keeps the demo alive — a reviewer
doesn't lose the working palette when they click a result. This is a
documented deviation, not an oversight.

---

## Prerequisites

| Tool    | Required version          | Why                                       |
| ------- | ------------------------- | ----------------------------------------- |
| Node.js | v18.17.0 or later         | Vite 5 requires it; tested on v22.14.0    |
| npm     | v9.0.0 or later           | Ships with Node 18+; tested on v10.9.2    |
| Git     | v2.30.0 or later          | For cloning; tested on v2.48.1            |

No other tools, runtimes, or services are required.

## Environment variables

**There are none.** This project has no `.env` file, no runtime config
flags, and no secrets. The GitHub Search API is called anonymously from
the browser. There is nothing to set.

## Getting started

```bash
# 1. Clone the repository
git clone https://github.com/polockprog2/repo-palette.git
cd repo-palette

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
```

Vite prints a URL (usually http://localhost:5173). Open it. The whole
process takes under a minute.

### Production build

```bash
npm run build    # outputs to dist/
npm run preview  # serves dist/ locally
```

## Keyboard operation

| Key                 | Action                                              |
| ------------------- | --------------------------------------------------- |
| `Ctrl`/`Cmd` + `K`  | Open / close the palette (global)                   |
| Type                | Search (debounced 300 ms)                           |
| `↑` / `↓`           | Move selection (wraps, scroll-into-view)            |
| `Enter`             | Open selected repository in a new tab               |
| `Enter` on error    | Retry the failed request                            |
| `Esc`               | Close the palette                                   |
| `⌫` / clear button  | Clear the query, back to recents                    |

Clicking the dark backdrop also closes. Every action is reachable by
keyboard alone.

## Seeing all four screens

- **Recents** — open the palette without typing. If you've opened repos
  before, they appear under a "Recent" heading.
- **Searching** — type anything. The 300 ms debounce plus a spinner are
  visible on a normal connection.
- **Request failed** — search repeatedly past the rate limit, or set
  DevTools to *Offline*. A red panel names the cause and offers Retry.
- **No results** — type `zzz-no-repo-abc-123` (or any gibberish). The
  search succeeded; GitHub just has nothing by that name. The panel is
  visually distinct from the error state.
- **Results** — type `vite`, `react`, or any real query.

## What this does not do

This is the limits section. Every item here is known, not accidental.

- **No authentication.** There is no sign-in flow. The palette cannot
  search private repositories, show account-pinned repos, or access any
  data behind a login.
- **No issues, PRs, files, or people.** Only repositories are searched.
  GitHub's full command palette includes several result types; this
  rebuild covers one.
- **No fuzzy ranking.** Results come straight from the API, sorted by
  stars. There is no client-side re-ranking or prefix matching — the API
  is the source of truth, and adding a second ranking layer over its
  own is scope, not improvement.
- **No offline mode.** The palette is useless without a network
  connection. It fails honestly (red error panel) but it does fail.
- **Recents are lost on storage wipe.** If a browser clears `localStorage`
  (private mode, manual clear, extension interference), the recent list
  resets. There is no server-side backup.
- **Rate limit at 10 requests/minute.** Unauthenticated GitHub Search is
  throttled. Fast typing triggers rapid requests; the debouncer helps but
  does not prevent it. The error state handles this — but it is still
  an annoyance if you are deliberately stress-testing.
- **`localStorage` not tested in every browser.** It works in Chromium,
  Firefox, and Safari. Older or niche browsers are untested and may not
  persist recents.

## Live demo

https://polockprog2.github.io/repo-palette/

The production build is served from the `gh-pages` branch. No deploy
pipeline is involved — the branch was built locally and pushed directly.