import './style.css';
import { TILE } from './art/tiles';
import { Combat, type CombatResult } from './combat/combat';
import { onLangChange, setLang, getLang, t } from './i18n';
import { clearInput, initInput, isHeld, takeWheel } from './input';
import { COMBAT_ZOOM, Renderer } from './render';
import { checkTutor } from './tutor/client';
import { devUnlockAll, fadeAttunement, game, newGame } from './state';
import { beforeBattle, examineGate, talk, type StoryCtx } from './story/story';
import { isBlocking, toast, uiRoot } from './ui/dom';
import { bagScreen, clearHud, endingScreen, introSlides, pauseMenu, questsScreen, renderExploreHud, skillsScreen, titleScreen } from './ui/menus';
import { messageBox } from './ui/question';
import { Explore, type Target } from './world/explore';
import { chimneys, ENCOUNTERS, PLAYER_START, WorldMap, type EncounterDef } from './world/map';

const canvas = document.getElementById('view') as HTMLCanvasElement;
const r = new Renderer(canvas);
initInput(canvas);
setLang(getLang());

let world = new WorldMap();
r.setChimneys(chimneys(world));
let mode: 'title' | 'explore' | 'combat' = 'title';
let busy = false;
let combat: Combat | null = null;
let lastPrompt: string | null | undefined;
let savedZoom: number | null = null;

const ENTRY: Record<EncounterDef['id'], Array<{ x: number; y: number }>> = {
  forest: [
    { x: 38, y: 14 },
    { x: 37, y: 15 },
  ],
  ruins: [
    { x: 49, y: 14 },
    { x: 49, y: 15 },
  ],
};

function enemySprites(): Array<{ sprite: string; x: number; y: number }> {
  const out: Array<{ sprite: string; x: number; y: number }> = [];
  for (const e of ENCOUNTERS) {
    if (e.id === 'forest' && game.flags.forestDone) continue;
    if (e.id === 'ruins' && game.flags.golemDone) continue;
    for (const en of e.enemies) out.push({ sprite: en.kind, x: en.x, y: en.y });
  }
  return out;
}

const story: StoryCtx = {
  refresh: () => refreshHud(true),
  openGate: () => world.openGate(),
};

let explore = makeExplore();

function makeExplore(): Explore {
  return new Explore(
    world,
    r,
    {
      interact: (tg) => void runInteract(tg),
      encounter: (e) => void startEncounter(e, true),
      encounterActive: (e) => (e.id === 'forest' ? !game.flags.forestDone : game.flags.gateOpen && !game.flags.golemDone),
      enemySprites,
      menu: () => void openPause(),
      hotkey: (k) => {
        if (k === 'q') void guard(questsScreen);
        else if (k === 'k') void guard(skillsScreen);
        else if (k === 'i') void guard(bagScreen);
      },
    },
    PLAYER_START,
  );
}

async function guard(fn: () => Promise<void>): Promise<void> {
  if (busy) return;
  busy = true;
  try {
    await fn();
  } finally {
    busy = false;
    clearInput();
    refreshHud(true);
  }
}

function openPause(): Promise<void> {
  return guard(() =>
    pauseMenu(
      () => refreshHud(true),
      () => toTitle(),
    ),
  );
}

async function runInteract(tg: Target): Promise<void> {
  await guard(async () => {
    if (tg.kind === 'npc') await talk(tg.npc, story);
    else await examineGate(story);
  });
}

function refreshHud(force = false): void {
  if (mode !== 'explore') return;
  const tg = busy ? null : explore.target();
  const prompt = tg ? (tg.kind === 'npc' ? t('hud.talk', { name: t(`chars.${tg.npc.id}`) }) : t('hud.examine')) : null;
  if (!force && prompt === lastPrompt) return;
  lastPrompt = prompt;
  renderExploreHud(prompt, (b) => {
    if (b === 'menu') void openPause();
    else if (b === 'quests') void guard(questsScreen);
    else if (b === 'skills') void guard(skillsScreen);
    else void guard(bagScreen);
  });
}

async function startEncounter(e: EncounterDef, intro: boolean): Promise<void> {
  busy = true;
  clearHud();
  if (intro) await beforeBattle(e.id);
  mode = 'combat';
  if (savedZoom === null) {
    savedZoom = r.zoomIndex;
    r.zoomIndex = Math.min(r.zoomIndex, COMBAT_ZOOM);
  }
  const [a, b] = ENTRY[e.id];
  const lead = intro ? { x: explore.leader.x, y: explore.leader.y } : a;
  const foll = intro ? { x: explore.follower.x, y: explore.follower.y } : b;
  combat = new Combat(
    e,
    world,
    r,
    [
      { id: 'kai', ...lead },
      { id: 'aino', ...foll },
    ],
    (res, c) => void endEncounter(res, c),
  );
  clearInput();
  combat.start();
  busy = false;
}

async function endEncounter(res: CombatResult, c: Combat): Promise<void> {
  busy = true;
  c.destroy();
  combat = null;
  const e = c.enc;
  if (res === 'lose') {
    await messageBox(t('combat.loseTitle'), [t('combat.loseText')], t('combat.retry'));
    busy = false;
    await startEncounter(e, false);
    return;
  }
  if (savedZoom !== null) {
    r.zoomIndex = savedZoom;
    savedZoom = null;
  }
  fadeAttunement(c.refreshed);
  const kai = c.units.find((u) => u.kind === 'kai')!;
  const aino = c.units.find((u) => u.kind === 'aino')!;
  explore.placeParty(kai.x, kai.y, aino.x, aino.y);
  if (e.id === 'forest') {
    game.flags.forestDone = true;
    game.gold += 10;
    await messageBox(t('combat.winTitle'), [t('combat.winForest'), t('combat.attuneNote')]);
    mode = 'explore';
    busy = false;
    toast(t('combat.goldGained', { n: 10 }));
    refreshHud(true);
  } else {
    game.flags.golemDone = true;
    await messageBox(t('combat.winTitle'), [t('combat.winGolem')]);
    mode = 'explore';
    busy = true;
    clearHud();
    endingScreen(() => toTitle());
  }
}

function toTitle(): void {
  combat?.destroy();
  combat = null;
  mode = 'title';
  busy = false;
  clearHud();
  uiRoot().replaceChildren();
  titleScreen((dev) => void startGame(dev));
}

async function startGame(dev: boolean): Promise<void> {
  newGame();
  void checkTutor();
  world = new WorldMap();
  explore = makeExplore();
  mode = 'explore';
  busy = true;
  const params = new URLSearchParams(location.search);
  const devMode = dev || params.has('dev');
  if (devMode) {
    devUnlockAll();
    const where = params.get('dev');
    if (where === 'boss') {
      game.flags.gateOpen = true;
      game.flags.forestDone = true;
      world.openGate();
      explore.placeParty(46, 14, 45, 14);
    } else if (where === 'forest') {
      explore.placeParty(35, 14, 34, 14);
    }
  } else {
    clearHud();
    await introSlides();
  }
  busy = false;
  refreshHud(true);
}

onLangChange(() => {
  if (mode === 'explore') refreshHud(true);
  if (combat) combat.hud.render();
});

// ---------- main loop ----------

let last = performance.now();
let titleCam = 0;
let lastActive: unknown = null;

/** Mouse wheel / +− zoom everywhere; in battle WASD and arrow keys pan the camera (BG3-style). */
function cameraControls(dt: number): void {
  const w = takeWheel();
  if (w) r.zoom(-w);
  if (isHeld('+') || isHeld('=')) {
    r.zoom(1);
    clearInput();
  } else if (isHeld('-')) {
    r.zoom(-1);
    clearInput();
  }
  if (mode !== 'combat') return; // while exploring, the keys walk
  const speed = 160 * dt;
  if (isHeld('w', 'ArrowUp')) r.pan.y -= speed;
  if (isHeld('s', 'ArrowDown')) r.pan.y += speed;
  if (isHeld('a', 'ArrowLeft')) r.pan.x -= speed;
  if (isHeld('d', 'ArrowRight')) r.pan.x += speed;
  r.pan.x = Math.max(-260, Math.min(260, r.pan.x));
  r.pan.y = Math.max(-180, Math.min(180, r.pan.y));
}

function loop(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  r.frame++;
  if (mode !== 'title') cameraControls(dt);
  // a new combat turn re-centres on whoever acts
  if (combat && combat.active !== lastActive) {
    lastActive = combat.active;
    r.pan = { x: 0, y: 0 };
  }

  if (mode === 'explore') {
    if (!busy && !isBlocking()) explore.update(dt);
    const a = explore.leader;
    r.follow(a.px / TILE, a.py / TILE, explore.actorZ(a), 1);
    refreshHud();
  } else if (mode === 'combat' && combat) {
    combat.update(dt);
    const u = combat.active;
    if (u) r.follow(u.px / TILE + (u.size - 1) / 2, u.py / TILE + (u.size - 1) / 2, world.height(u.x, u.y), 0.08);
  } else if (mode === 'title') {
    titleCam += dt * 0.5;
    r.follow(5 + titleCam, 14, 0, 1);
    if (titleCam > 40) titleCam = 0;
  }

  r.begin(dt);
  if (mode === 'combat' && combat) combat.draw();
  else explore.draw();
  r.flush(world, dt);
  requestAnimationFrame(loop);
}

if (import.meta.env.DEV) {
  Object.defineProperty(window, '__numerola', { value: { get combat() { return combat; }, get explore() { return explore; }, game: () => game } });
}

toTitle();
const params = new URLSearchParams(location.search);
if (params.has('dev')) {
  uiRoot().replaceChildren();
  void startGame(true);
}
requestAnimationFrame(loop);
