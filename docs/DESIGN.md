# Design notes

## Core loop: learn once, cast many

Balancing character learning against player learning is the central problem. Every skill has three layers:

| Layer | When | Math |
|---|---|---|
| **Learn** | Once, at a trainer | A short, untimed trial with hints. Wrong answers show the worked steps and never fail you; you just get another problem. |
| **Cast** | Any time after | None. It costs AP and has a cooldown, like any RPG. |
| **Overcharge** | Optional (⚡ / `O`) | One question, or a chain of them for Flurry. Right gives a stronger effect. Wrong gives a normal cast, never a miss. |

**Attunement** is spaced repetition dressed up as lore. After each battle, every learned skill that wasn't successfully overcharged loses 25% attunement. Its power scales from 100% down to a 60% floor; the skill is never lost. A correct overcharge, or one practice question at the trainer, restores it to 100%.

Wrong answers never block progress. Trials keep generating new problems until you pass. Losing a battle restarts it at full health.

## Two ways of thinking

| | Ninja (Kai) | Mage (Aino) |
|---|---|---|
| Style | Fast, fluent, timed | Deep, structured, untimed |
| Overcharge | 8 s timer (doubled with "Relaxed", off with "Off") | No timer |
| Topics | Addition and subtraction, times tables, order of operations | Area, missing numbers, equations |
| Seal-breaker | **Probe Strike**: guess and check | **Unbind**: solve directly |

Timers can be relaxed or switched off in Settings, so the ninja is never the only path for players who dislike time pressure.

## One concept, many angles

The boss's second seal is `3x + 4 = 25`. The game approaches that one idea from five directions before and during the fight:

1. **Arithmetic:** order-of-operations problems in Ren's Probe Strike trial (`3 × 4 + 2`).
2. **Guess & check:** the Probe Strike practice seal `2x + 1 = 11`, where each miss tells you to go bigger or smaller.
3. **Balance scale:** in Lumi's Unbind trial, physically remove weights and bags from both pans. The equation updates live underneath the scale.
4. **Sequences:** the rune gate shows 7, 10, 13, 16, … (rule `3n + 4`). It asks for the next term, the 10th term, and finally *which rune shows 25*. Aino then points out that this is the golem's seal.
5. **Symbols:** Unbind shows the seal as an equation *and* as a balance-scale picture.

## Elementary → algebra progression

```
counting/adding → times tables → area (rows × columns)
  → missing number (□ + 6 = 13) → order of operations
  → balance scale → x + a = b → ax + b = c → ax + b = cx + d (boss phase 3)
```

Problem generators (`src/math/problems.ts`) have three levels per topic. `src/math/mastery.ts` adapts the level to the last six answers: it starts at level 1, climbs after a correct streak, and eases off after misses.

## Real-life quest: the crooked field

Helmi's field is an 8 × 6 rectangle with a 3 × 2 corner missing (42 m²), at 3 seeds per m². The field drawn on the map has exactly the same shape as the one in the planner.

- **Three valid approaches:** count the squares, split into rectangles A + B, or take the big rectangle minus the corner. The game remembers which ones you tried and shows them on the ending screen.
- **Rounding up:** seeds come in bags of 10, so 126 seeds means 13 bags. The planner doesn't tell you that; you decide in the shop.
- **Consequences instead of a red X:**
  - Too few bags: Helmi offers to wait while you buy more, or plants part of the field for a smaller reward.
  - A whole bag or more extra: wasted gold and a smaller reward.
  - Exact: best reward.

## 2.5D world and elevation

The renderer (`src/render.ts`, `src/art/iso.ts`) projects the tile map isometrically. Each tile is a 32 × 16 diamond, and one height level is 8 px. The 16 × 16 pixel-art tiles are re-sampled onto diamond tops and shaded side faces, so all art is still defined as strings. Everything is painted back to front, one diagonal at a time, so houses, walls, trees and characters hide each other correctly. Heroes stay faintly visible behind big objects.

Heights (`buildHeights` in `src/world/map.ts`):

| Place | Height |
|---|---|
| River | −0.5 |
| Village, road, farm | 0 |
| Hills behind the village | 1–2 |
| House roofs | step up from 2 to a ridge at 3 |
| Forest clearing | 0, with two mounds of 1–2 |
| Ruins floor | 1 |
| Golem's dais | 2 |

Rules:

- You can step up or down one level at a time.
- Climbing up costs one extra tile of movement.
- From higher ground: +25% damage per level (max +50%), and ranged skills reach 1 tile further.
- From lower ground: −15% damage.
- The golem holds the dais, so the players have a reason to climb it.

## Combat (DOS2 / BG3-style)

- Grid, 8-directional movement, initiative order shown at the top.
- **AP:** +4 per turn, store up to 6. Movement costs 1 AP per 3 tiles; leftover tiles carry over within the turn.
- Cooldowns, area effects with friendly fire (Fireball), surfaces (fire that burns for 2 rounds).
- **Boss seals:** a sealed golem takes no damage. Breaking a seal staggers it for a turn. At 50 and 25 HP a new, harder seal forms.

## Tuning knobs

| What | Where |
|---|---|
| Skill AP / cooldown / range | `src/data.ts` → `SKILLS` |
| Damage numbers | `src/combat/combat.ts` → `useSkill` |
| Enemy stats / attacks | `src/combat/units.ts` |
| Golem seals | `src/math/seal.ts` → `GOLEM_SEALS` |
| Seal thresholds | `src/combat/units.ts` → `GOLEM_THRESHOLDS` |
| Attunement fade / floor | `src/state.ts` → `fadeAttunement`, `attuneMult` |
| Trial lengths | `SKILLS[*].trial.need` |
| Overcharge timer | `combat.ts` → `timerSeconds(8)` |
| Field shape / seed rate | `src/world/map.ts` → `FIELD`, `src/data.ts` → `SEEDS_PER_M2` |

## AI tutor

The main problem is balancing *character learning* against *player learning*. The tutor sits on the player side: it is help for thinking, never a way around the thinking.

- Owl only appears on untimed questions. Overcharges are about fluency, so no help appears there.
- Escalation goes in-game hint → Owl level 1 (nudge) → level 2 (strategy) → level 3 (analogous example or first step).
- The model never sees the answer. The client checks every reply for the answer and asks for a rewrite, or hides the number (`src/tutor/guard.ts`).
- The system prompt is a plain file (`tutor/rules.md`) so a teacher can tune tone and strictness.

## Ideas for next steps

- Save/load (state is already a single object in `state.ts`).
- Rotate the camera, and cut away walls in front of the party like BG3.
- Tutor memory across problems (e.g. "you often forget the corner"), using `mastery.ts`.
- More "angles" puzzles: area models for multiplication, number-line movement, magic squares.
- Grid tactics that use math, e.g. aiming Fireball by coordinates, or a vector-based Shadow Step for older players.
- Teacher-facing report: export per-topic accuracy from `mastery.ts`.
- Optional story choices that change which approach a quest rewards.
