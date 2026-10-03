# Numerola: The Riddle Golem

A prototype math RPG. You play a ninja and a mage who unlock skills by solving math problems. The world is drawn in 2.5D (isometric, with real height levels). Combat is turn-based on a grid with action points and high ground, in the style of Divinity: Original Sin and Baldur's Gate 3.

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

## AI tutor (optional)

Owl the tutor helps a stuck player think, using an AI command-line tool already installed on the same computer: [Claude Code](https://docs.claude.com/en/docs/claude-code), Gemini CLI or Codex CLI.

```bash
npm run tutor                         # uses the first CLI it finds
npm run tutor -- --provider claude    # or gemini, codex, mock (no AI, canned hints)
npm run tutor -- --model haiku        # optional: a faster/cheaper model
npm run dev                           # in a second terminal, then play on this computer
```

When the tutor is running, every untimed question gets an **Ask Owl the tutor** button. This covers trials, Unbind, Probe Strike, the rune gate, the balance scale and the farm planner. Settings shows whether it is connected.

How Owl is kept from solving things for the player:

- **Rules.** [`tutor/rules.md`](tutor/rules.md) is the system prompt. Owl never gives or confirms the answer, never writes the full solution, gives one step at a time and ends with a question. Teachers can edit this file.
- **Graded help.** "I'm still stuck" raises the help level:
  1. A nudge.
  2. A named strategy, using the game's own pictures.
  3. A worked example with different numbers, or only the first step.
- **The answer never leaves the game.** The bridge only receives what the player sees. If a reply contains the answer anyway, the game asks Owl to rephrase. If the second reply still contains it, the number is hidden.
- **No tools, no files.** The CLI runs with tools disabled (`--tools ""` for Claude Code), in an empty temporary folder.
- **Local only.** The bridge listens on `127.0.0.1` and refuses pages that aren't served from this computer.

Only the Claude Code command line has been tested end to end. The Gemini and Codex command lines are in `tutor/server.mjs` (`PROVIDERS`) if their flags need adjusting.

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
  ui/                dialog, question modal, balance scale, rune gate, farm, shop, menus, tutor chat
  tutor/             tutor client and answer-leak guard
  art/iso.ts         isometric projection, diamond tops and shaded side faces
tutor/               local bridge to Claude Code / Gemini / Codex (server.mjs, rules.md)
tests/
```

### Adding or changing text

1. Add the key to **both** `src/lang/en.json` and `src/lang/fi.json`.
2. Use it with `t('section.key', { param: 1 })`.
3. Run `npm test`. It fails if:
   - a key is missing from either language,
   - the placeholders differ between languages,
   - or the code uses a key that doesn't exist.

To add a new language, copy `en.json` to `xx.json`, translate it, and register it in `src/i18n.ts`.
