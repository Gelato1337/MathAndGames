# Numerola

A prototype math RPG. Your party unlocks skills by solving math problems. The world is drawn in 2.5D (isometric, with real height levels). Combat is turn-based on a grid with action points and high ground, in the style of Divinity: Original Sin and Baldur's Gate 3.

**Learn once, cast many.** You solve a short trial once to learn a skill. After that the skill works without any math, and **Auto** can play a whole turn with learned skills. For real power you **Focus** a skill: it charges for a turn and fires after you solve a puzzle of the kind you learned it with. A right answer gives ×2.5 power and pierces armor.

**A journey across lands.** Each land is one campaign for one level of math, shown on an overview **world map** (see [docs/CURRICULUM.md](docs/CURRICULUM.md) for the tiers behind them). Every journey starts in Numerola, the tutorial land, where you learn the game; then you travel on to harder lands. Each land has **three increasingly hard areas, then a final boss**. Your progress in a land is kept while you travel; cleared lands are remembered in the browser.

| Land | Level | Stages 1 → 3 | Final boss |
|---|---|---|---|
| **Numerola** (tutorial) | Primary school (ages 7–12) | Forest Clearing → Times-Table Marsh → Echo Caves | The Riddle Golem (equation seals) |
| **Eigenvale** | Linear algebra (upper secondary → university) | Vector Plains → Matrix Mines → Shear Glacier | The Eigenwarden (matrix seals) |
| Chancewood, Fluxreach, Bitforge, Forcehold | Probability, calculus, computer science, physics | coming later (in fog on the map) | |

Eigenvale is recommended after Numerola, but the map lets experienced players "travel anyway".

Linear algebra puzzles are **step puzzles**: you fill in the working (each step is checked and earns partial credit), with colour-coded formulas (hover a coloured term to see what it means), a vector/unit-square plot, and a **Notebook** for your own notes and the formulas you have learned.

Fully playable in **English and Finnish**. All text lives in `src/lang/en.json` and `src/lang/fi.json`.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # language parity, problem generators, linear algebra, maps, sprites, seals
npm run build      # static build in dist/
```

Controls:

- **Exploring:**
  - Click where to go; the dots show the path.
  - Click a person or the gate to walk over and talk.
  - Or walk freely in any direction with WASD / the arrow keys. Up on the keyboard is up on the screen.
- **Battle:** turn-based on a grid. Click tiles to move and enemies to attack; WASD pans the camera. `1`–`4` pick a skill, `F` toggles Focus, `Q` plays the turn on Auto, `Space` ends the turn.
- **Notebook:** `N` (also inside every untimed puzzle).
- **Everywhere:** mouse wheel or + / − zooms.

Dev shortcuts (only with `npm run dev`):

- `?dev` unlocks every skill (Numerola).
- `?dev=forest` also starts you next to the first battle.
- `?dev=boss` also opens the rune gate and puts you at the boss.
- `?dev=marsh`, `?dev=caves`, `?dev=gate` jump to Numerola's later stages.
- `?dev&campaign=eigenvale` does the same for Eigenvale; `dev=plains`, `dev=mines`, `dev=glacier`, `dev=door` and `dev=boss` jump to its areas.

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

## Numerola (primary school)

| Place | What you do | Math |
|---|---|---|
| Elder Vesa | Story, main quest | – |
| Master Ren's dojo (ninja) | Trials for Flurry, Shadow Step, Probe Strike | Mental arithmetic, times tables, order of operations, guess & check |
| Sage Lumi's library (mage) | Trials for Fireball, Mend, Unbind | Area, missing numbers, balance-scale puzzle, equations |
| Helmi's farm (side quest) | Plan an L-shaped field, buy seeds | Area by counting, splitting, or subtracting; multiplication; rounding up to whole bags |
| Pekka's shop | Buy tonics, tea and seed bags; haggle once | Money; percentages |
| Stage 1: Forest Clearing | Tutorial battle against three Number Slimes | – (optional Focus) |
| Stage 2: Times-Table Marsh (forest path south) | Tongue Frogs pull heroes in; Splitter Slimes burst into two droplets | Fireball's area hits groups |
| Stage 3: Echo Caves (east of the marsh) | Shell Beetles (armor 2) and a Cave Shade that heals its friends | Focus to pierce armor; pick targets |
| Rune gate | Logic puzzle on the sequence 7, 10, 13, … | Patterns, nth term, the inverse question |
| Ruins | Boss: the Riddle Golem | `x + 7 = 15` → `3x + 4 = 25` → `2x + 5 = x + 12` |

The boss requires a specific tactic. While sealed, the golem takes no damage. You break a seal in one of two ways:

- **Probe Strike** (ninja, brute force): pick a value for x, calculate both sides yourself, then adjust bigger or smaller.
- **Unbind** (mage, algebra): solve the equation directly, shown as a balance scale.

## Eigenvale (linear algebra)

Party of four: Kai (ninja), Aino (mage), **Sana** (ranger) and **Otso** (shieldbearer).

| Place | What you do | Math |
|---|---|---|
| Ilona the cartographer | Story; trains Sana (Aimed Shot, Volley, Mark) | Dot product, adding vectors, perpendicular test |
| Ren | Vector Dash, Flurry, Probe Strike | Adding vectors, dot products (timed), determinants, guess-and-check eigenvalues |
| Archmage Kerttu | Matrix Beam, Mend, Unbind | Matrix × vector, scaling, eigenvalues and eigenvectors step by step |
| Captain Vera | Ward, Taunt, Quake | Determinants, scaling, matrix × matrix |
| Ilona's survey (side quest) | Where did the warp move the landmarks? | Matrix × vector |
| Vector Plains (stage 1) | Vector Wisps blink around; Scalar Slimes grow each round | – (Auto works, Focus helps) |
| Matrix Mines (stage 2, south) | Crystal Golems (armor 4, reflect damage), Shear Bats (heal by biting) | Focus needed to pierce armor |
| Shear Glacier (stage 3, south-east) | Ice Sentries gain armor every turn, Frost Wraiths chill heroes (−2 AP), the Frost Knight has a one-step eigenvalue seal (a triangular matrix) | A preview of the boss |
| Determinant Door | Three locks: compute each determinant, pick the invertible matrix | det ≠ 0 ⇔ invertible |
| Eigen Spire | Boss: the Eigenwarden, three matrix seals, armor 3, pushes heroes | Eigenvalue → eigenvector → eigenvalue |

Each seal is a 2×2 matrix. **Probe Strike** guesses λ and computes det(A − λI) (zero breaks it); **Unbind** solves it with trace and determinant. The second seal asks for an eigenvector: any multiple counts.

See [docs/DESIGN.md](docs/DESIGN.md) for the design rationale and tuning knobs, and [docs/CURRICULUM.md](docs/CURRICULUM.md) for curriculum research and ideas for further campaigns (calculus, probability, CS, physics).

## Code map

```
src/
  main.ts            game loop, mode switching (title / explore / combat)
  campaign.ts        the Campaign interface (map, stages, NPCs, story hooks, objectives)
  journey.ts         lands on the world map, cleared lands, per-land saved state
  campaigns/         numerola.ts, eigenvale.ts, registry.ts
  i18n.ts            t(key, params), language switch, Finnish decimal comma
  lang/en.json       every string in the game
  lang/fi.json       Finnish translation (same keys, enforced by tests)
  data.ts            skills, heroes, items
  state.ts           game state, attunement, settings
  math/              problem generators, answer parsing, mastery, seal equations,
                     linalg.ts (step problems), eigenseal.ts (matrix seals)
  art/               pixel-art sprites (as strings) and procedural tiles
  world/             map layout, exploration movement and interaction
  combat/            grid combat, AP, AI, combat HUD
  story/             NPC dialogue scripts, skill trials
  ui/                dialog, question modal, balance scale, rune gate, farm, shop, menus, tutor chat,
                     steps.ts (step puzzles), eq.ts (colour-coded formulas), plot.ts, notebook.ts,
                     worldmap.ts (the overview map)
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
