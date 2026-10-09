# Calm Games Suite: Project Plan

Six short, untimed, no-lose board and puzzle games with a Zen garden home screen, in one soft visual and sound world. They are designed to help players unwind after a stressful day.

Research basis: [Calm Games Suite: Research Report](https://claude.ai/code/artifact/0f7fd0b2-5f13-4308-90a4-1acb514acea7)

---

## 1. Decisions

| Area | Decision | Why |
| --- | --- | --- |
| Platform | Installable web app (PWA) for phone, tablet and desktop | One codebase; testers just open a link; works offline |
| Language | TypeScript | Safer game-rule code; good editor support |
| Build tool | Vite | Fast dev server; simple static build |
| UI | Vanilla TS + Web Components (no heavy framework) | Small bundle; full control of animation |
| Rendering | SVG for board games, Canvas 2D for sand garden and jigsaw | Crisp tiles; smooth free-form drawing |
| Audio | Howler.js | Reliable looping, fading and mobile audio unlock |
| State and saves | `localStorage` with a versioned save schema | No accounts; resume anywhere |
| Tests | Vitest (rules and logic), Playwright (smoke test) | Fast unit tests, one end-to-end check |
| Lint and format | ESLint + Prettier | Consistent code |
| Hosting | GitHub Pages, deployed by GitHub Actions | Free; deploys on every push to `main` |
| Feedback | In-app feedback sheet that posts to a Google Form (or Tally) | Comparable tester data with no backend |

Open: native app wrappers (Capacitor) can come later if the web app tests well.

---

## 2. Design rules (apply to every game)

1. No timers or countdowns.
2. No losing; dead ends offer shuffle, undo or a hint.
3. No scores to beat by default; show quiet progress instead.
4. Unlimited undo and hints, no penalty.
5. A round fits in 5 to 15 minutes; auto-save and resume.
6. Repetitive, tactile actions (match, sow, place, colour).
7. Gentle feedback: soft glow and a low chime; no red flashes, shakes or buzzers.
8. Eased motion of 300 to 600 ms; respect `prefers-reduced-motion`.
9. No notifications, ads, streaks or purchases.
10. AI opponents play softly and can be turned off.

---

## 3. Shared design system

### Colour tokens

| Token | Hex | Use |
| --- | --- | --- |
| `--mist` | `#EEF3F1` | Day background |
| `--dusk-slate` | `#26323A` | Evening background (never pure black) |
| `--sage` | `#9DB8A8` | Primary: boards, buttons |
| `--still-water` | `#8FB3C4` | Secondary: highlights, selection |
| `--sand` | `#E6D5B8` | Warm accent: tiles, wood, paper |
| `--lavender-haze` | `#B8B0CF` | Soft accent: hints, special tiles |
| `--soft-gold` | `#E8C98A` | Success glow |
| `--deep-moss` | `#3E4A44` | Text on light backgrounds |

Themes: Day, Dusk and Night (auto after 7 pm). Text contrast at least WCAG AA (4.5:1). Tiles carry symbols as well as colour, so they stay colour-blind safe.

### Motion

- Durations: 300 ms (small), 450 ms (moves), 600 ms (scene changes).
- Easing: `cubic-bezier(0.4, 0, 0.2, 1)`.
- Ambient idle motion (ripples, drifting petals) is slow and optional.

### Sound

| Layer | Spec |
| --- | --- |
| Music | Ambient piano, pads, bansuri or santoor; 55 to 70 BPM; 20 to 60 s of near-silence between tracks |
| Nature bed | One per game (rain, stream, birds, chimes, ocean, meadow) |
| Interaction | Wood clicks, stone taps, pentatonic chimes |
| Errors | None, or a single low muted tap |
| Controls | Separate music, nature and effects sliders; mute all |

All audio must be CC0 or royalty-free and is listed in `CREDITS.md`.

---

## 4. Suite contents

| # | Game | Mechanic | Nature sound | Theme |
| --- | --- | --- | --- | --- |
| Home | Zen Garden | Rake sand, place stones, breathing guide | Rain | Sand |
| 1 | Petal Mandala | Colour-by-region | Wind chimes | Lavender haze |
| 2 | River Stones | Mancala (Kalah rules) vs gentle AI or 2 players | Stream | Still water |
| 3 | Quiet Grid | Nonograms that reveal nature pictures | Forest birds | Sage |
| 4 | Lotus Tiles | Mahjong solitaire with auto-shuffle when stuck | Pond and frogs | Sage |
| 5 | Slow Puzzle | Jigsaw of calm landscapes | Ocean | Still water |
| 6 | Grow a Valley | Tile-laying garden builder | Meadow | Sand |

Suite-wide features: breathing guide (about 6 breaths/min), before/after mood check (5 faces, stored on device), wind-down prompt after 20 to 30 minutes, settings (theme, audio, reduced motion, left-handed layout), feedback sheet, and version + "what's new" note.

---

## 5. Architecture

```
calm-games-suite/
├─ .github/workflows/
│  ├─ ci.yml            # lint, type-check, test on every push and PR
│  └─ deploy.yml        # build and publish to GitHub Pages on push to main
├─ public/
│  ├─ audio/            # music, nature beds, effects (CC0 / royalty-free)
│  ├─ images/
│  └─ manifest.webmanifest
├─ src/
│  ├─ main.ts           # boot, router, service worker registration
│  ├─ core/
│  │  ├─ router.ts      # hash router between home and games
│  │  ├─ audio.ts       # music, nature and effects mixer (Howler)
│  │  ├─ storage.ts     # versioned saves, settings, mood log
│  │  ├─ theme.ts       # Day / Dusk / Night tokens
│  │  ├─ motion.ts      # easing helpers, reduced-motion support
│  │  └─ feedback.ts    # feedback sheet and form submission
│  ├─ ui/               # shared components: buttons, sheets, sliders, breathing circle
│  ├─ games/
│  │  ├─ zen-garden/
│  │  ├─ petal-mandala/
│  │  ├─ river-stones/
│  │  ├─ quiet-grid/
│  │  ├─ lotus-tiles/
│  │  ├─ slow-puzzle/
│  │  └─ grow-a-valley/
│  └─ styles/tokens.css
├─ tests/               # Vitest unit tests and Playwright smoke test
├─ CREDITS.md
├─ PLAN.md
└─ README.md
```

Each game implements one interface so the shell can load, pause, save and resume any game the same way:

```ts
interface CalmGame {
  id: string;
  title: string;
  mount(root: HTMLElement, ctx: GameContext): void;
  pause(): void;
  resume(): void;
  save(): unknown;          // serialisable state
  load(state: unknown): void;
  unmount(): void;
}
```

Game rules (Mancala sowing, Mahjong free-tile checks, nonogram solving) live in pure functions with no DOM access, so they are unit-tested.

---

## 6. Milestones

| Milestone | Scope | Exit criteria |
| --- | --- | --- |
| M0 Setup | Repo, Vite + TS scaffold, lint, tests, CI, Pages deploy, README log | A "Hello calm" page is live on GitHub Pages from `main` |
| M1 Shell | Design tokens, home Zen Garden, settings, audio mixer, breathing guide, mood check, feedback sheet, PWA install/offline | Shell is live; a tester can install it and send feedback |
| M2 First games | Petal Mandala, River Stones, Quiet Grid | Three games playable end to end, saved and resumed |
| T1 Test round 1 | 5 to 10 testers after a work day | Feedback and mood data collected; top issues logged as GitHub issues |
| M3 More games | Lotus Tiles, Slow Puzzle | Playable, tested |
| M4 Garden builder | Grow a Valley | Playable, tested |
| T2 Test round 2 | Same testers plus new ones | Compare mood deltas with round 1 |
| M5 Polish | Fixes from feedback, accessibility pass, performance | Lighthouse 90+ on performance and accessibility |

---

## 7. CI/CD

- **`ci.yml`** runs on every push and pull request: `npm ci`, lint, type-check, unit tests, build.
- **`deploy.yml`** runs on push to `main`: builds with `base` set to the repo name and publishes `dist/` with `actions/deploy-pages`.
- **Branching:** work on `feature/<name>` branches, merge to `main` via PR once CI passes; `main` is always the tester build.
- **Versioning:** semantic version in `package.json`, shown in Settings with a short "what's new" note; each tester build is tagged `vX.Y.Z`.

---

## 8. Feedback loop

1. Tester opens the link (or installed app) and does the mood check.
2. Plays one or more games.
3. Does the closing mood check; the feedback sheet asks:
   - Which game did you play, and for how long?
   - How calm did you feel before and after (1 to 5)?
   - Did anything feel stressful, confusing or too fast?
   - Music and sound: too loud, too quiet, just right?
   - Anything you would add or remove?
4. The sheet submits to a Google Form with the app version and game ID attached; no personal data beyond what the tester types.
5. We review responses after each round and turn them into GitHub issues.

---

## 9. Open questions

- [ ] GitHub repo name and visibility (public is needed for free GitHub Pages on a personal account).
- [ ] Google Form or Tally for feedback?
- [ ] Final game titles and suite name.
- [ ] Music source: commission, CC0 library, or generated in-app with Web Audio.
