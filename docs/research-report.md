# Calm Games Suite — Research Report

Oct 10, 2026 · @Rupesh

> Snapshot of the live research doc: https://claude.ai/code/artifact/0f7fd0b2-5f13-4308-90a4-1acb514acea7. Re-export it here when the doc changes.

## Summary

The Calm Games Suite should be six short, no-lose, untimed board and puzzle games wrapped in one soft visual and sound world, played in 5–15 minute sessions after work.

- **Evidence is encouraging but modest.** A randomized study found a casual matching game (Bejeweled) cut physiological stress 54% versus a control task; nature sounds sped stress recovery 9–37%; slow music and silence lowered heart rate and breathing; slow breathing near 6 breaths/min raised relaxation markers. Most studies are small, so the suite should promise "a calmer evening," not therapy.
- **What makes a game calming** is less the genre and more the removal of threat: no timers, no failure states, no scores to beat, gentle feedback, and repetitive, satisfying hand actions (matching, sowing, placing, colouring).
- **Best-fit games:** Mahjong solitaire, Mancala, a tile-laying garden builder, mandala colouring, jigsaw, and nonograms. Chess, speed games and anything with sudden loss are out.
- **Senses:** muted blue-green and warm-neutral colours at low saturation, 55–70 BPM ambient music, nature sound beds around 40–50 dB, soft rounded interaction sounds, and an optional 6-breaths-per-minute breathing guide.

## Why games can calm

Calming play works by giving the mind effortless, gentle focus while removing threat and pressure.

| Finding | What it means for the suite | Source |
| --- | --- | --- |
| Bejeweled 2 reduced physical stress (HRV) 54% vs a matched control; Peggle and Bookworm improved tension and mood | Simple matching and puzzle play can lower both body stress and mood tension | [ECU / PopCap RCT, 2008](https://news.ecu.edu/2008/04/28/ecu-study-shows-casual-video-games-relieve-stress/) |
| Restorative settings offer "being away", extent, compatibility and *soft fascination* (effortless attention, like watching water) | Games should feel like a separate place and hold attention without effort | [Attention Restoration Theory](https://en.wikipedia.org/wiki/Attention_restoration_theory) |
| Coziness = safety, abundance and softness; avoid threats, compulsory tasks, notifications, intense stimuli | Direct design checklist for every game in the suite | [Lost Garden / Project Horseshoe, 2018](https://lostgarden.com/2018/01/24/cozy-games/comment-page-1/) |
| Colouring a mandala reduced anxiety more than a plaid pattern or blank paper; replicated in 2012 | Structured, symmetrical colouring is a strong candidate mode | [Curry & Kasser 2005, replication atlas](https://forrt.org/flora-replication-atlas/doi/10.1080/07421656.2005.10129441/) |
| Cozy-game research is still early and mostly qualitative | Treat calm as a design goal to test with users, not a medical claim | [Utrecht thesis](https://studenttheses.uu.nl/handle/20.500.12932/47430) |

## Design principles

Every game in the suite must pass these ten rules; a game that breaks one is redesigned or dropped.

1. **No timers or countdowns.** The player sets the pace.
2. **No losing.** Dead ends offer a gentle shuffle, undo or hint, never a "Game Over" screen.
3. **No scores to beat by default.** Show quiet progress (tiles placed, garden grown) instead of points; leaderboards off.
4. **Unlimited undo and hints**, with no penalty.
5. **Short sessions.** One round fits in 5–15 minutes; the game saves and resumes anywhere.
6. **Repetitive, tactile actions.** Matching, sowing stones, placing tiles and colouring give a soothing rhythm.
7. **Gentle feedback only.** Soft glow and a low chime for success; no red flashes, shakes or buzzers for mistakes.
8. **Slow, eased motion.** Animations of 300–600 ms with ease-in-out; nothing pops or flashes.
9. **No interruptions.** No notifications, ads, streaks, daily-login pressure or purchases mid-play.
10. **Opponents are kind.** Where a game has an AI, it plays softly and the player can turn it off.

## Candidate games

Thirteen games were screened against the design principles; seven score 4 or 5 for calm: six become the games and the Zen sand garden becomes the suite's home screen. Calm fit is our judgement (1–5) based on the principles above.

| Game | Type | Why it calms | Players | Round (min) | Build effort | Calm fit (1–5) |
| --- | --- | --- | --- | --- | --- | --- |
| Mahjong solitaire | Tile matching | Matching like Bejeweled, the game with the strongest stress result; beautiful tiles; no clock | Solo | 5–15 | Medium | 5 |
| Mandala colouring | Colour-by-region | Evidence that mandala colouring lowers anxiety; no right answer | Solo | 5–20 | Low | 5 |
| Tile-laying garden | Place tiles to grow a landscape (Carcassonne / Dorfromantik style) | Creating abundance; every placement is valid; slow growth | Solo | 10–20 | High | 5 |
| Jigsaw puzzle | Piece placement | Soft fascination; steady sense of completion | Solo | 5–30 | Medium | 5 |
| Mancala (Pallanguzhi / Kalah) | Sowing stones | Rhythmic, tactile sowing; familiar in India; gentle AI | Solo vs AI or 2 | 5–10 | Low | 4 |
| Nonograms | Picture logic | Quiet focus that reveals a picture; mistakes undo freely | Solo | 5–15 | Low | 4 |
| Zen sand garden | Sandbox (rake, place stones) | Pure soft fascination; no goal | Solo | Open | Medium | 4 |
| Peg solitaire | Jump-and-remove | Simple, meditative; needs a soft "restart" when stuck | Solo | 5–10 | Low | 3 |
| Tangram | Shape fitting | Calm spatial play; can frustrate without hints | Solo | 5–10 | Medium | 3 |
| Go 9×9 (no clock, soft AI) | Territory | Beautiful stones, but competition adds pressure | Solo vs AI or 2 | 15–30 | High | 3 |
| Sudoku | Number logic | Popular, but errors and difficulty can stress | Solo | 10–30 | Low | 3 |
| Chess | Strategy duel | Win/lose pressure, deep calculation | 2 | 20+ | High | 1 |
| Minesweeper / speed games | Risk or reflex | Sudden loss and time pressure | Solo | 2–10 | Low | 1 |

## Colour palette

Use low-saturation, medium-to-high-brightness colours: brightness raises pleasure and lowers arousal, while saturation raises arousal most ([Valdez & Mehrabian, 1994](https://pubmed.ncbi.nlm.nih.gov/7996122/)). Blue, blue-green and green were among the most pleasant hues; one small study found lower heart rate while walking in a green environment ([Frontiers in Psychology, 2019](https://www.frontiersin.org/articles/10.3389/fpsyg.2019.00252/full)). Lost Garden adds warm, soft, natural materials and low-intensity light.

| Role | Name | Hex | Use |
| --- | --- | --- | --- |
| Background (day) | Mist | #EEF3F1 | Main canvas, soft off-white with a green tint |
| Background (evening) | Dusk slate | #26323A | Default after 7 pm; never pure black |
| Primary | Sage | #9DB8A8 | Boards, buttons, garden |
| Secondary | Still water | #8FB3C4 | Highlights, water, selection |
| Warm accent | Sand | #E6D5B8 | Tiles, wood, paper textures |
| Soft accent | Lavender haze | #B8B0CF | Hints, special tiles |
| Success glow | Soft gold | #E8C98A | Matches and completion (no green-red pass/fail) |
| Text | Deep moss | #3E4A44 | Body text on light backgrounds |

- Avoid saturated red, bright yellow and pure white; keep contrast at WCAG AA (4.5:1) for text.
- Offer three themes (Day, Dusk, Night) and a colour-blind-safe check, since green and blue tiles sit close together.

## Sound and music

Keep music slow (55–70 BPM), leave regular silences, and layer quiet nature sounds underneath.

- **Tempo drives the body, not genre.** Faster tempo raised breathing, heart rate and blood pressure; a 55 BPM raga produced the largest fall in heart rate; a 2-minute pause relaxed listeners even more than the quiet baseline ([Bernardi et al., *Heart*](https://pmc.ncbi.nlm.nih.gov/articles/PMC1860846/)).
- **Nature sound speeds recovery.** Fountain and birdsong at 50 dB brought skin-conductance stress back to baseline fastest, about 101 s half-life vs 160 s for 80 dB traffic ([Alvarsson et al., 2010](https://www.mdpi.com/1660-4601/7/3/1036)).
- **Cozy audio** is continuous, soft and diegetic: water, fire, rain, birds; distant or muted threats ([Lost Garden](https://lostgarden.com/2018/01/24/cozy-games/comment-page-1/)).

| Layer | Spec |
| --- | --- |
| Music | Ambient piano, soft pads, bansuri or santoor; 55–70 BPM; major or modal keys; 3–4 min tracks with 20–60 s of near-silence between |
| Nature bed | One per game: rain, stream, forest birds, wind chimes, ocean; mixed quieter than music |
| Interaction sounds | Wood clicks, stone taps, soft chimes in a pentatonic scale so any sequence sounds harmonious; no harsh or high-pitched tones |
| Error sound | None, or a single low muted tap |
| Controls | Separate sliders for music, nature and effects; mute-all; default volume moderate |

Binaural beats are popular but the evidence is mixed; offer them, if at all, as an optional extra rather than a core feature.

## Calming extras

A short breathing ritual at the start and end of each session ties the games together.

- **Breathing guide.** A slowly expanding circle at about 6 breaths/min (5 s in, 5 s out) for 1–3 minutes. A 15-study review links slow breathing to higher heart-rate variability, more relaxation and lower arousal, though results were inconsistent ([Zaccaro et al., 2018](https://www.frontiersin.org/articles/10.3389/fnhum.2018.00353/full)).
- **Arrival ritual.** Open on the Zen sand garden with rain sound; ask "How are you feeling?" on a 5-face scale before and after play, stored only on the device.
- **Wind-down.** After 20–30 minutes, a soft prompt suggests a breathing minute or finishing for the night; evening mode dims colours automatically.
- **Accessibility.** Large touch targets, reduced-motion setting, colour-blind-safe tile symbols, one-hand play, offline use.
- **Privacy and trust.** No accounts, ads, streaks or push notifications in the first version.

## Recommended line-up and next steps

Build the suite as a web app (works on phone and desktop) with a Zen garden home screen and six games, starting with the three cheapest to build.

| Order | Game (working title) | Nature sound | Theme colour |
| --- | --- | --- | --- |
| Home | Zen Garden — rake sand, place stones, breathing guide | Rain | Sand |
| 1 | Petal Mandala — colouring | Wind chimes | Lavender haze |
| 2 | River Stones — Mancala vs gentle AI | Stream | Still water |
| 3 | Quiet Grid — nonograms that reveal nature pictures | Forest birds | Sage |
| 4 | Lotus Tiles — Mahjong solitaire, auto-shuffle when stuck | Pond and frogs | Sage |
| 5 | Slow Puzzle — jigsaw of calm landscapes | Ocean | Still water |
| 6 | Grow a Valley — tile-laying garden builder | Meadow | Sand |

**Next steps**

1. Confirm platform, target devices and tech stack.
2. Define the shared design system: palette, typography, motion and sound kit.
3. Build the shell (home garden, settings, breathing guide, mood check), then games 1–3.
4. Test with 5–10 people after a work day; compare before/after mood ratings.
5. Build games 4–6 and refine from feedback.

## Sources

- [ECU study shows casual video games relieve stress (2008)](https://news.ecu.edu/2008/04/28/ecu-study-shows-casual-video-games-relieve-stress/)
- [Attention restoration theory](https://en.wikipedia.org/wiki/Attention_restoration_theory)
- [Lost Garden — Cozy games (Project Horseshoe report)](https://lostgarden.com/2018/01/24/cozy-games/comment-page-1/)
- [Can Coloring Mandalas Reduce Anxiety? — replication atlas](https://forrt.org/flora-replication-atlas/doi/10.1080/07421656.2005.10129441/)
- [Cozy Games for Mood Repair, Stress Reduction, and Well-Being — Utrecht thesis](https://studenttheses.uu.nl/handle/20.500.12932/47430)
- [Valdez & Mehrabian — Effects of color on emotions (1994)](https://pubmed.ncbi.nlm.nih.gov/7996122/)
- [Colour environments, heart rate and arousal — Frontiers in Psychology (2019)](https://www.frontiersin.org/articles/10.3389/fpsyg.2019.00252/full)
- [Bernardi, Porta & Sleight — music tempo and pauses, *Heart*](https://pmc.ncbi.nlm.nih.gov/articles/PMC1860846/)
- [Alvarsson, Wiens & Nilsson — Stress recovery with nature sound (2010)](https://www.mdpi.com/1660-4601/7/3/1036)
- [Zaccaro et al. — How breath-control can change your life (2018)](https://www.frontiersin.org/articles/10.3389/fnhum.2018.00353/full)
