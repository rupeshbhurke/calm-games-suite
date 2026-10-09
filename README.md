# Calm Games Suite

A collection of soothing, untimed, no-lose board and puzzle games, each with calming colours, music and nature sounds. They are made to help players unwind after a stressful day.

- **Plan:** [PLAN.md](PLAN.md)
- **Research:** [Calm Games Suite: Research Report](https://claude.ai/code/artifact/0f7fd0b2-5f13-4308-90a4-1acb514acea7)
- **Live test build:** _not deployed yet_ (will be `https://<github-user>.github.io/<repo-name>/`)

## Status

Milestone **M0 Setup** is in progress. The local repo and plan are ready; the GitHub remote, app scaffold, CI and deployment are next.

## Tech stack

TypeScript, Vite, SVG and Canvas 2D, Howler.js, Vitest, Playwright, ESLint and Prettier. It is hosted on GitHub Pages and deployed by GitHub Actions. See [PLAN.md](PLAN.md) for the reasons behind each choice.

## Getting started

> These commands become available once the app scaffold is added (step 6 in the log below).

Prerequisites: Git, and Node.js 20 or later with npm.

```bash
git clone <remote-url>
cd calm-games-suite
npm install
npm run dev        # start the dev server at http://localhost:5173
npm run lint       # check code style
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

### Next steps (to do)

- [ ] **Step 6:** Scaffold the Vite + TypeScript app, ESLint, Prettier and Vitest.
- [ ] **Step 7:** Create the GitHub repo (owner: Rupesh) and add the remote:
  ```bash
  git remote add origin <remote-url>
  git push -u origin main
  ```
- [ ] **Step 8:** Add `.github/workflows/ci.yml` and `.github/workflows/deploy.yml`.
- [ ] **Step 9:** In GitHub, go to **Settings > Pages > Build and deployment** and set **Source** to **GitHub Actions**.
- [ ] **Step 10:** Push to `main`, confirm the Deploy workflow passes, and record the live URL at the top of this README.
