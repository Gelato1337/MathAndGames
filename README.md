# Numerola: The Riddle Golem

A prototype math RPG. You play a ninja and a mage who unlock skills by solving math problems. Combat is turn-based on a grid with action points, in the style of Divinity: Original Sin and Baldur's Gate 3.

**Learn once, cast many.** You solve a short trial once to learn a skill. After that the skill works without any math. You can also *overcharge* a skill in battle: answer a quick question for a stronger effect.

Fully playable in **English and Finnish**. All text lives in `src/lang/en.json` and `src/lang/fi.json`.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # language parity, problem generators, map, sprites, seals
npm run build      # static build in dist/
```

Dev shortcuts (only with `npm run dev`):

- `?dev` unlocks every skill.
- `?dev=forest` also starts you next to the first battle.
- `?dev=boss` also opens the rune gate and puts you at the boss.

## What's in the prototype

| Place | What you do | Math |
|---|---|---|
| Elder Vesa | Story, main quest | – |
| Master Ren's dojo (ninja) | Trials for Flurry, Shadow Step, Probe Strike | Mental arithmetic, times tables, order of operations, guess & check |
| Sage Lumi's library (mage) | Trials for Fireball, Mend, Unbind | Area, missing numbers, balance-scale puzzle, equations |
| Helmi's farm (side quest) | Plan an L-shaped field, buy seeds | Area by counting, splitting, or subtracting; multiplication; rounding up to whole bags |
| Pekka's shop | Buy tonics, tea and seed bags; haggle once | Money; percentages |
| Forest clearing | Tutorial battle against two Number Slimes | – (optional overcharges) |
| Rune gate | Logic puzzle on the sequence 7, 10, 13, … | Patterns, nth term, the inverse question |
| Ruins | Boss: the Riddle Golem | `x + 7 = 15` → `3x + 4 = 25` → `2x + 5 = x + 12` |

The boss requires a specific tactic. While sealed, the golem takes no damage. You break a seal in one of two ways:

- **Probe Strike** (ninja, brute force): pick a value for x, calculate both sides yourself, then adjust bigger or smaller.
- **Unbind** (mage, algebra): solve the equation directly, shown as a balance scale.

See [docs/DESIGN.md](docs/DESIGN.md) for the design rationale and tuning knobs.

## Code map

```
src/
  main.ts            game loop, mode switching (title / explore / combat)
  i18n.ts            t(key, params), language switch, Finnish decimal comma
  lang/en.json       every string in the game
  lang/fi.json       Finnish translation (same keys, enforced by tests)
  data.ts            skills, heroes, items
  state.ts           game state, attunement, settings
  math/              problem generators, answer parsing, mastery, seal equations
  art/               pixel-art sprites (as strings) and procedural tiles
  world/             map layout, exploration movement and interaction
  combat/            grid combat, AP, AI, combat HUD
  story/             NPC dialogue scripts, skill trials
  ui/                dialog, question modal, balance scale, rune gate, farm, shop, menus
tests/game.test.ts
```

### Adding or changing text

1. Add the key to **both** `src/lang/en.json` and `src/lang/fi.json`.
2. Use it with `t('section.key', { param: 1 })`.
3. Run `npm test`. It fails if:
   - a key is missing from either language,
   - the placeholders differ between languages,
   - or the code uses a key that doesn't exist.

To add a new language, copy `en.json` to `xx.json`, translate it, and register it in `src/i18n.ts`.
