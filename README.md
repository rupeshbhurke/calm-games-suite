# Calm Games Suite

A collection of soothing, untimed, no-lose board and puzzle games, each with calming colours, music and nature sounds. They are made to help players unwind after a stressful day.

- **Plan:** [PLAN.md](PLAN.md)
- **Research:** [docs/research-report.md](docs/research-report.md) (snapshot of the [live research doc](https://claude.ai/code/artifact/0f7fd0b2-5f13-4308-90a4-1acb514acea7))
- **Credits:** [CREDITS.md](CREDITS.md)
- **Live test build:** https://rupeshbhurke.github.io/calm-games-suite/

## Status

Milestones **M0 Setup**, **M1 Shell** and **M2 First games** are done and live: the home Zen Garden, settings, breathing guide, mood check, offline install, and three games (Petal Mandala, River Stones, Quiet Grid). **M3** (Lotus Tiles, Slow Puzzle) and a shared Help system in every game are built and waiting to be merged. Next is **T1 Test round 1**, then **M4** (Grow a Valley).

## Tech stack

TypeScript, Vite, SVG and Canvas 2D, Howler.js, Vitest, Playwright, ESLint and Prettier. It is hosted on GitHub Pages and deployed by GitHub Actions. See [PLAN.md](PLAN.md) for the reasons behind each choice.

## Getting started

Prerequisites: Git, and Node.js 20 or later with npm.

```bash
git clone https://github.com/rupeshbhurke/calm-games-suite.git
cd calm-games-suite
npm install
npm run dev        # start the dev server at http://localhost:5173
npm run lint       # ESLint
npm run format     # Prettier (format:check in CI)
npm run typecheck  # TypeScript checks
npm test           # unit tests
npm run build      # production build into dist/
npm run preview    # serve the production build locally
```

## Deployment

Every push to `main` runs the **Deploy** workflow, which builds the app and publishes it to GitHub Pages. Pull requests and other branches run the **CI** workflow (lint, type-check, tests, build) without deploying.

To share a build with testers, merge to `main`, wait for the Deploy workflow to turn green in the **Actions** tab, then send the Pages link.

---

## Build and deploy log

Every step taken to build and deploy this project is recorded here in order, with the commands used, so anyone can reproduce the setup from scratch. **Add a new entry for each step.**

### Step 1: Create the project folder (2026-10-10)

The suite lives in `C:\RB\Workarea\Repo\RnD\calm-games-suite`.

```bash
cd C:\RB\Workarea\Repo\RnD
mkdir calm-games-suite
cd calm-games-suite
```

### Step 2: Initialise the local git repo (2026-10-10)

```bash
git init -b main
git config user.name "Rupesh Bhurke"
git config user.email "rupesh.bhurke@konsultera.in"
```

The identity is set for this repo only (no `--global`).

### Step 3: Add repo housekeeping files (2026-10-10)

- `.gitignore`: ignores `node_modules/`, `dist/`, logs, editor and OS files, `.env` files and Syncthing files.
- `.gitattributes`: stores all text files with LF line endings so Windows and Linux agree; marks images, audio and fonts as binary.
- `.editorconfig`: UTF-8, LF, 2-space indent.

### Step 4: Add the plan and this README (2026-10-10)

- `PLAN.md`: decisions, design rules, design system, game list, architecture, milestones, CI/CD and feedback loop.
- `README.md`: this file, including this log.

### Step 5: First commit (2026-10-10)

```bash
git add .
git commit -m "Add project plan, README and repo housekeeping"
```

### Step 6: Add the remote (2026-10-10)

GitHub repo created by Rupesh (public, empty: no README, .gitignore or licence).

```bash
git remote add origin https://github.com/rupeshbhurke/calm-games-suite.git
```

### Step 7: Add the research report to the repo (2026-10-10)

The live research doc was exported as Markdown to `docs/research-report.md`. Re-export it when the doc changes.

### Step 8: Scaffold the Vite + TypeScript app (2026-10-10)

```bash
# package.json written by hand: name, version 0.1.0, scripts, engines (Node >= 20)
npm install -D vite typescript vitest eslint @eslint/js typescript-eslint globals prettier @types/node
```

Versions installed: Vite 8.3, TypeScript 7.0, Vitest 5.0, ESLint 10.12, typescript-eslint 8.71, Prettier 3.9.

Files added:

- `package.json` scripts: `dev`, `build`, `preview`, `typecheck`, `lint`, `format`, `format:check`, `test`, `test:watch`.
- `tsconfig.json`: strict mode, bundler resolution, no emit (Vite builds).
- `vite.config.ts`: `base` from the `BASE_PATH` env var (for GitHub Pages), app version injected as `__APP_VERSION__`, Vitest config.
- `eslint.config.js`, `.prettierrc.json`, `.prettierignore`.
- `index.html`, `public/favicon.svg`.
- `src/styles/tokens.css`: colour, motion and theme tokens from PLAN.md; `src/styles/main.css`.
- `src/core/theme.ts`: Day / Dusk / Night by hour; `src/core/breath.ts`: 6 breaths/min cycle.
- `src/main.ts`: "Hello calm" page with a breathing circle and version number.
- `tests/theme.test.ts`, `tests/breath.test.ts`: 6 unit tests.
- `CREDITS.md`: asset licence register.

Checked locally:

```bash
npm run typecheck
npm run lint
npm run format:check
npm test                                   # 6 passed
BASE_PATH=/calm-games-suite/ npm run build # asset paths start with /calm-games-suite/
```

### Step 9: Add GitHub Actions workflows (2026-10-10)

- `.github/workflows/ci.yml`: on pushes to branches other than `main`, and on pull requests: install, lint, format check, type-check, test, build.
- `.github/workflows/deploy.yml`: on push to `main` (or run manually): the same checks, then builds with `BASE_PATH=/<repo-name>/` and publishes `dist/` to GitHub Pages using `actions/configure-pages`, `actions/upload-pages-artifact` and `actions/deploy-pages`.

### Step 10: First push (2026-10-10)

Pushed from Rupesh's Windows terminal, which is signed in with the GitHub CLI:

```bash
gh auth setup-git
git push -u origin main
```

The Deploy workflow ran: install, lint, format check, tests and build all passed, but `actions/configure-pages` failed with "Get Pages site failed ... Not Found" because GitHub Pages was not yet enabled on the repo. GitHub also warned that the v4/v5 actions run on the deprecated Node.js 20.

### Step 11: Update workflow actions (2026-10-10)

Bumped every action to its latest major version: `actions/checkout@v7`, `actions/setup-node@v7`, `actions/configure-pages@v6`, `actions/upload-pages-artifact@v5`, `actions/deploy-pages@v5`.

### Step 12: Enable GitHub Pages (2026-10-10)

Pages was already enabled with GitHub Actions as the source (set in **Settings > Pages**), so the API call returned `409 GitHub Pages is already enabled`. Either method works:

```bash
gh api -X POST repos/rupeshbhurke/calm-games-suite/pages -f build_type=workflow
```

### Step 13: Push the workflow update (2026-10-10)

```bash
git push
```

The Deploy workflow passed for commit `59d3482` and the `github-pages` deployment reported success.

### Step 14: Verify the live site (2026-10-10)

Opened https://rupeshbhurke.github.io/calm-games-suite/ in a browser: the page loads with its styles and script, the breathing circle animates, and the theme follows the local time (Night after 22:00).

### Step 15: Drop the online feedback form (2026-10-10)

Decided not to use an online form (Google Forms or Tally) for now. The app stays fully offline with no data leaving the device; tester feedback is gathered by message or in conversation. PLAN.md sections 1, 4, 5, 6 and 8 updated.

### Step 16: Build the M1 shell (2026-10-10)

On branch `feature/m1-shell`: Zen Garden home (rake sand, place stones, undo, smooth; saved on device), settings (theme, three volume sliders, mute, reduce motion, left-handed layout, version and what's new), guided breathing, before/after mood check, and PWA install with offline support (`public/sw.js`, manifest, generated icons). Audio is synthesised with Web Audio (rain bed, slow pentatonic pads, soft taps), so no audio files or Howler yet. Version bumped to 0.2.0.

Regenerate icons with `node scripts/make-icons.mjs`.

### Step 17: Improve the breathing guide (2026-10-10)

On branch `feature/breathing-guide`: a progress ring and a "next" label show each switch coming, with an optional seconds count. Patterns: Gentle (5/5), Relaxing (4/6) and Box (4/4/4/4, with a note that holds can feel tense). A pace slider (3 to 8 s) slows or speeds the breath, and optional 1, 3 or 5 minute sessions end with a soft gong. A synthesised gong marks each in and out (holds stay silent); it can be switched to a chime or off. Choices are saved in settings. Version bumped to 0.2.1.

### Step 18: Build M2, the first three games (2026-10-10)

On branch `feature/m2-first-games`: a hash router and a shared game interface (`CalmGame`) let the shell load, pause, save and resume any game; each game's state is auto-saved to `localStorage`. **Petal Mandala** (57 regions, 8 colours, tap or drag to colour, unlimited undo), **River Stones** (Kalah rules in pure functions, a deliberately gentle opponent that plays a sensible move about 60% of the time, hints, undo, two-player mode; the end is a quiet tally, not a win or loss) and **Quiet Grid** (nonograms with three nature pictures, drag to fill, mark-empty mode, hints that fill a correct cell). The Games button on the home screen opens the picker. Per-game nature sound beds are not built yet; the games use the shared chimes. Version bumped to 0.3.0.

### Step 19: Version the offline cache (2026-10-17)

On branch `feature/sw-versioned-cache`: M2 was merged and deployed, but returning visitors kept seeing the old build because the service worker served cached files first under a fixed cache name. The app now registers `sw.js?v=<version>`, and the worker names its cache `calm-games-<version>`, so each release gets a fresh cache and old ones are deleted on activate. Version bumped to 0.3.1.

### Step 20: Add a shared Help system (2026-10-17)

On branch `feature/m3-help-and-games`: every game now has one **Help** button in place of the old single Hint. It opens a panel with three steps, each asking a little more of the game: **Nudge me** (words only, such as "Row 2 says 2 2 in 5 cells, so the clue fills the whole line"), **Show me** (highlights the spot on the board) and **Do it for me** (makes the move). A **How to play** sheet opens the first time each game is played and is always reachable from the panel. Nothing is counted or penalised. The shared component is `src/ui/help.ts`; each game supplies the `HelpProvider` (rules plus the three steps), and the logic behind them lives in pure, tested functions: `helpTarget` for Quiet Grid (mistakes first, then lines the clue settles, then the best foothold), `moveKind` for River Stones, `nextBlank` for Petal Mandala, `suggestPair` for Lotus Tiles and `nextHelpPiece` for Slow Puzzle.

### Step 21: Grow the Zen Garden (2026-10-17)

New tools beside Rake and Stone: **Rings** (concentric ripples), **Moss**, **Lantern** and **Erase**. A **Customise** sheet tunes the rake (3, 5, 7 or 9 teeth; fine, medium or wide spacing; straight or wavy) and the stones (small, medium, large or mixed; round or flat; five colours). Choices are saved on the device (`calm.gardenOptions`). Each mark remembers the settings it was made with, so changing them never alters the garden already raked. **Undo** now restores the whole garden as it was before the last change, so it also reverses Smooth and Erase.

### Step 22: Build M3, Lotus Tiles and Slow Puzzle (2026-10-17)

**Lotus Tiles** is mahjong solitaire on an SVG board with two layouts (Bud, 28 tiles; Lotus, 48 tiles). The dealer removes free pairs one at a time and gives each pair a symbol, so every deal can be cleared. If no matching pair is left, the tiles reshuffle on their own (also solvable); a Shuffle button does the same on request. **Slow Puzzle** is a canvas jigsaw with 12, 24 or 48 pieces, three landscapes painted in code (no image files to license) and pieces that settle into place when dropped close to the right spot. Both games save and resume, and both use the shared Help. Version bumped to 0.4.0.

### How to deploy a new tester build

1. Commit your changes on a `feature/<name>` branch and push it; the CI workflow checks it.
2. Open a pull request into `main`. `main` is protected, so the `check` job must pass and the branch must be up to date before you can merge; use squash or rebase (history is linear).
3. The Deploy workflow publishes `main` to GitHub Pages in about a minute.
4. Bump `version` in `package.json` for each build you send to testers, and tag it: `git tag v0.1.0 && git push --tags`.

### Step 23: Protect main and format on edit (2026-10-18)

CI caught a Prettier failure in `.claude/skills/run-calm-games-suite/SKILL.md`, so two guards were added. **Branch protection on `main`** (set with `gh api -X PUT repos/rupeshbhurke/calm-games-suite/branches/main/protection`): a pull request is required (no approvals, so a solo maintainer can merge), the `check` CI job must pass on an up-to-date branch, history stays linear, review conversations must be resolved, and force pushes and deletion are blocked. Administrators are not included, so the owner can bypass in an emergency. Head branches are deleted after merge. A **Claude Code hook** (`.claude/settings.json` and `.claude/hooks/prettier.mjs`) runs Prettier on every file Claude edits or writes, so `format:check` stays green.
