#!/usr/bin/env node
// Drives the Calm Games Suite dev server with Playwright and writes a
// screenshot to prove the page actually rendered.
//
// Usage (from the repo root, with `npm run dev` already running on :5173):
//   node .claude/skills/run-calm-games-suite/driver.mjs [gameId]
//
// With no gameId, it screenshots the home (Zen Garden) screen. Pass one of
// the GAMES ids (petal-mandala, river-stones, quiet-grid, lotus-tiles,
// slow-puzzle) to screenshot that game instead.
//
// Screenshots land in .claude/skills/run-calm-games-suite/screenshots/.

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const shotDir = join(here, 'screenshots');
mkdirSync(shotDir, { recursive: true });

const BASE_URL = process.env.CALM_GAMES_URL ?? 'http://localhost:5173';
const gameId = process.argv[2] ?? null;

const GAME_IDS = ['petal-mandala', 'river-stones', 'quiet-grid', 'lotus-tiles', 'slow-puzzle'];

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(String(err)));

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

  // Every fresh session opens a blocking "how are you feeling" modal first.
  const skip = page.getByRole('button', { name: 'Skip' });
  await skip.waitFor({ state: 'visible', timeout: 10_000 });
  await skip.click();

  await page.getByRole('heading', { name: 'Calm Games Suite' }).waitFor({ state: 'visible' });
  await page.screenshot({ path: join(shotDir, 'home.png') });
  console.log('screenshot: home.png');

  if (gameId) {
    if (!GAME_IDS.includes(gameId)) {
      throw new Error(`Unknown game id "${gameId}". Known ids: ${GAME_IDS.join(', ')}`);
    }

    // Suppress the per-game first-visit "How to play" modal so the
    // screenshot shows the board, not an instructional overlay. The key
    // mirrors core/storage.ts's envelope: { v: SCHEMA_VERSION, data }.
    await page.evaluate((ids) => {
      localStorage.setItem('calm.rulesSeen', JSON.stringify({ v: 1, data: ids }));
    }, GAME_IDS);

    await page.evaluate((id) => {
      location.hash = `#/game/${id}`;
    }, gameId);

    await page.locator('.game-head h1').waitFor({ state: 'visible' });
    // Some games may still show "How to play" (e.g. schema drift); dismiss if present.
    const gotIt = page.getByRole('button', { name: 'Got it' });
    if (await gotIt.isVisible({ timeout: 1000 }).catch(() => false)) await gotIt.click();
    // Let each game's mount-time animation/layout settle.
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(shotDir, `${gameId}.png`) });
    console.log(`screenshot: ${gameId}.png`);
  } else {
    // Drive one representative flow on the home screen: open the Games
    // sheet via the UI (not a hash jump) to prove the menu itself works.
    await page.getByRole('button', { name: 'Games', exact: true }).click();
    await page.getByRole('heading', { name: 'Choose a game' }).waitFor({ state: 'visible' });
    await page.screenshot({ path: join(shotDir, 'games-sheet.png') });
    console.log('screenshot: games-sheet.png');
    await page.getByRole('button', { name: 'Close', exact: true }).click();
  }

  if (consoleErrors.length) {
    console.error('console errors:\n' + consoleErrors.join('\n'));
    process.exitCode = 1;
  } else {
    console.log('no console errors');
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
