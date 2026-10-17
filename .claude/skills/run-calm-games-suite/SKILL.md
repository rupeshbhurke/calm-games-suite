---
name: run-calm-games-suite
description: Build, run, and drive Calm Games Suite (the Vite/TypeScript web app). Use when asked to start the app, take a screenshot of it or one of its games, verify a UI change renders, or run its lint/typecheck/test/build.
---

Calm Games Suite is a static, framework-free Vite + TypeScript single-page app
(no backend, hash-based routing). Drive it with the Playwright script at
`.claude/skills/run-calm-games-suite/driver.mjs` against a running
`npm run dev` server — it navigates the app, dismisses the mood/rules
dialogs, and writes screenshots to prove the page actually rendered.

All paths below are relative to the repo root.

## Prerequisites

Playwright is a devDependency (`npm install` pulls it in). Its Chromium
binary is a separate download and is **not** restored by `npm ci`/`npm
install` — fetch it once per machine:

```bash
npx playwright install chromium
```

On a bare Linux container you'd also need `--with-deps` for the shared
libs Chromium needs; this box already had everything Chromium required
for headless launch.

## Setup

```bash
npm install
```

## Run (agent path)

1. Start the dev server in the background and wait for it to serve:

   ```bash
   npm run dev &
   echo $! > /tmp/calm-games-dev.pid
   timeout 30 bash -c 'until curl -sf http://localhost:5173 >/dev/null; do sleep 1; done'
   ```

2. Drive it with the script. With no argument it screenshots the home
   (Zen Garden) screen and the "Choose a game" sheet opened via the real
   UI button. Pass a game id to jump into that game and screenshot its
   board instead:

   ```bash
   node .claude/skills/run-calm-games-suite/driver.mjs
   node .claude/skills/run-calm-games-suite/driver.mjs lotus-tiles
   ```

   Game ids (from `src/games/index.ts`): `petal-mandala`, `river-stones`,
   `quiet-grid`, `lotus-tiles`, `slow-puzzle`.

   The script prints `screenshot: <name>.png` for each shot and
   `no console errors` (or dumps any page console errors and exits
   non-zero). Screenshots land in
   `.claude/skills/run-calm-games-suite/screenshots/`.

3. Stop the dev server when done: `kill $(cat /tmp/calm-games-dev.pid)`.

The driver is a thin, modifiable script — add more `page.` calls to it
to reach deeper interactions (clicking a tile, dragging a puzzle piece,
etc.) instead of writing a one-off script elsewhere.

## Run (human path)

```bash
npm run dev       # → http://localhost:5173, Ctrl-C to stop
npm run build && npm run preview   # production build + local preview
```

## Test

```bash
npm run typecheck
npm run lint
npm test          # vitest run — unit tests only, no browser tests exist
npm run build
```

## Gotchas

- **Every fresh page load opens a blocking mood check-in `<dialog>`**
  ("How are you feeling right now?") before anything else is usable —
  `main.ts` fires `askMood()` unconditionally on startup. The driver
  clicks its "Skip" button (`getByRole('button', { name: 'Skip' })`)
  immediately after `goto()`. Any new script driving this app must do
  the same before interacting with the home screen.
- **The first time a given game is opened on a "device" (browser
  profile), a "How to play" modal auto-opens** over the board
  (`src/ui/help.ts`, gated by `localStorage['calm.rulesSeen']`). The
  driver pre-seeds that key before jumping to a game, but seeding it
  with a plain JSON array does nothing — `core/storage.ts`'s
  `readStored`/`writeStored` wrap values in an envelope
  `{ v: SCHEMA_VERSION, data }` (currently `v: 1`) and silently ignore
  anything that doesn't match. The driver seeds
  `localStorage.setItem('calm.rulesSeen', JSON.stringify({ v: 1, data: ids }))`
  and also clicks "Got it" as a fallback if the modal shows up anyway
  (e.g. after a schema version bump).
- **Hash-routing lets you skip the menu entirely.** `location.hash =
'#/game/<id>'` (via `page.evaluate`) jumps straight into a game — no
  need to click "Games" then a `.game-card`. The driver uses this for
  the `[gameId]` path and only exercises the real menu-click flow for
  the no-argument (home) path.
- **No `data-testid` attributes anywhere in `src/`.** Select by visible
  text, `class` (e.g. `.game-card`, `.game-head h1`), or ARIA role/name
  — that's what the driver does throughout.
- **Prefer `npm run dev` over `npm run build && npm run preview` for
  driving.** The service worker (`src/main.ts`'s
  `navigator.serviceWorker.register(...)`) only registers in production
  builds (`import.meta.env.PROD`); the dev server never installs it, so
  there's no stale-cache risk between runs.
