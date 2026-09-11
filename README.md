# repo-palette

A keyboard-first rebuild of **GitHub's repository switcher** — the palette
you get with `Ctrl`/`Cmd` + `K`. Type part of a repository name, jump with
`Enter`. No mouse required.

This is a single-feature rebuild: one feature of a product I use every day,
built to a standard I would defend.

## What it does

Press `Ctrl+K` and a palette opens. Start typing and it searches **real,
live data** from the [GitHub Search API](https://docs.github.com/en/rest/search).
Navigate with the arrow keys, open with `Enter`, close with `Esc`.

The palette has four distinct screens, each styled and worded differently:

| State         | What you see                                                          |
| ------------- | --------------------------------------------------------------------- |
| Recents       | When the input is empty — your last-opened repos, saved locally       |
| Searching     | A small progress spinner plus "Searching repositories…"              |
| Request failed| A red panel naming what failed and offering a `Retry` button         |
| No results    | A green panel saying the search succeeded but nothing matched        |

The last one is the important one. A query that matches nothing is still a
**successful search result**, so it is presented as a result — never as an
error.

## Running locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (default http://localhost:5173). No API key needed —
GitHub's search API works anonymously at 10 requests/minute for search (60/hr
overall), which is plenty for a demo.

### Keyboard map

| Key                 | Action                                              |
| ------------------- | --------------------------------------------------- |
| `Ctrl`/`Cmd` + `K`  | Open / close the palette                            |
| Type                | Search (debounced, 300 ms)                          |
| `↑` / `↓`           | Move the selection (infinite arrow keying supported)|
| `Enter`             | Open the selected repository (new tab)              |
| `Enter` on error    | Retry the failed request                            |
| `Esc`               | Close                                               |
| `⌫` / clear button  | Clear the query, back to recents                    |

Clicking the backdrop also closes. The whole thing is operable by keyboard
alone — there is no mouse-only path.

### Seeing the screens

- **Recents:** open the palette without typing.
- **Searching:** type anything; the 300 ms debounce plus a spinner are visible
  on a normal connection. A slow network makes it clearer.
- **Request failed:** search repeatedly past the rate limit, or toggle your
  Wi-Fi off, or reload with DevTools set to *Offline*.
- **No results:** type `zzz-no-repo-abc-123` (or any gibberish).
- **Results:** type `vite` or `react`.

## Why this feature

The switcher is one of the most-used surfaces in my daily workflow, and it is
a deceptively hard thing to rebuild well: it depends on a remote API, demands
a flawless keyboard model, and has to say something honest when the network
fails. That is the whole brief in miniature.

## Comparison with the original

GitHub's command palette does a lot. This rebuild deliberately does just the
repository-switching slice.

### What I did not implement, and why

| Original capability                         | In this rebuild            | Reason                                                                 |
| ------------------------------------------- | -------------------------- | ---------------------------------------------------------------------- |
| Results for issues, PRs, files, people, actions, discussions | Omitted | Out of scope — the brief is one feature, and repository switching is the one |
| Recents, pinned, starred, and all-repos driven by your signed-in account | Recents only, stored locally | No auth backend; local storage is the honest equivalent without one     |
| Fuzzy ranking over your full repository list | API name search, sorted by stars | The API is the real data source; hitting a rate-limit-targeting algorithm on top of its own ranking adds scope, not correctness |
| `owner/name` scoping, `#`/`>`/`@` command prefixes | Omitted | Same reasoning — narrow scope                                            |
| In-app navigation to settings, issues, etc.  | Opens repository links in a new tab | Keeps the demo usable instead of navigating the demo away (deliberate deviation, documented) |
| Theme sync, i18n, memorized query on reopen  | Not included                | Cosmetic, not load-bearing                                                 |

Everything I kept in is implemented, and the states a failure can reach are
implemented too.

### Where this version is better

**It never fails silently.** When GitHub's palette hits a network problem or
rate limit, it quietly shows an empty list — you cannot tell "no matches" from
"something is broken." This rebuild distinguishes them:

- a failed request shows a **red** "Request failed" panel naming the cause
  (HTTP status, rate limit, offline), with a keyboard-accessible `Retry`;
- a successful-but-empty search shows a **green** "No repositories found"
  panel and explicitly says the search succeeded.

Two states that look identical in the original are visually and textually
distinct here, and both tell you what to do next.

## Deliberately out of scope

- Issue/PR/file/people search and the rest of the command palette.
- Authentication, private repositories, and server-side per-account recents.
- Client-side fuzzy ranking on top of the API.
- Persisted preference/theme settings and localization.

This project is a narrow, finished slice on purpose. A reviewer can run it in
about thirty seconds, exercise every state, and read exactly what was left out
and why.

## Demonstration

[Hosted versions and recordings will be linked here — or run the `npm run dev`
steps above to see it live in about thirty seconds.]