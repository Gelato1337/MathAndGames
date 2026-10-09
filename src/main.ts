import './style.css';
import { TILE } from './art/tiles';
import type { CampaignCtx } from './campaign';
import { campaign } from './campaigns/registry';
import { Combat, type CombatResult } from './combat/combat';
import type { CampaignId } from './data';
import { getLang, onLangChange, setLang, t } from './i18n';
import { clearInput, initInput, isHeld, takeWheel } from './input';
import { COMBAT_ZOOM, Renderer } from './render';
import { hasJourney, journey, markCleared, resetJourney } from './journey';
import { devUnlockAll, fadeAttunement, game, newGame, restoreGame } from './state';
import { checkTutor } from './tutor/client';
import { isBlocking, toast, uiRoot } from './ui/dom';
import { bagScreen, clearHud, endingScreen, introSlides, notebookScreen, pauseMenu, questsScreen, renderExploreHud, skillsScreen, titleScreen } from './ui/menus';
import { messageBox } from './ui/question';
import { worldMap } from './ui/worldmap';
import { Explore, type Target } from './world/explore';
import { chimneys, type EncounterDef, type WorldMap } from './world/map';

const canvas = document.getElementById('view') as HTMLCanvasElement;
const r = new Renderer(canvas);
initInput(canvas);
setLang(getLang());

let world: WorldMap = campaign().buildWorld();
r.setChimneys(chimneys(world));
let mode: 'title' | 'map' | 'explore' | 'combat' = 'title';
let busy = false;
let combat: Combat | null = null;
let lastPrompt: string | null | undefined;
let savedZoom: number | null = null;

/** Enemies still standing in the world (shown before their fight). */
function enemySprites(): Array<{ sprite: string; x: number; y: number }> {
  const out: Array<{ sprite: string; x: number; y: number }> = [];
  for (const e of campaign().encounters) {
    if (campaign().encounterCleared(e.id)) continue;
    for (const en of e.enemies) out.push({ sprite: en.kind, x: en.x, y: en.y });
  }
  return out;
}

const ctx: CampaignCtx = {
  refresh: () => refreshHud(true),
  world: () => world,
};

let explore = makeExplore();

function makeExplore(): Explore {
  return new Explore(
    world,
    r,
    {
      interact: (tg) => void runInteract(tg),
      encounter: (e) => void startEncounter(e, true),
      encounterActive: (e) => campaign().encounterActive(e.id),
      enemySprites,
      menu: () => void openPause(),
      hotkey: (k) => {
        if (k === 'q') void guard(questsScreen);
        else if (k === 'k') void guard(skillsScreen);
        else if (k === 'i') void guard(bagScreen);
        else if (k === 'n') void guard(notebookScreen);
      },
    },
    campaign(),
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
      () => void openWorldMap(true),
    ),
  );
}

async function runInteract(tg: Target): Promise<void> {
  await guard(async () => {
    if (tg.kind === 'npc') await campaign().talk(tg.npc, ctx);
    else await campaign().examine(tg.obj.id, ctx);
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
    else if (b === 'notebook') void guard(notebookScreen);
    else void guard(bagScreen);
  });
}

async function startEncounter(e: EncounterDef, intro: boolean): Promise<void> {
  busy = true;
  clearHud();
  if (intro) await campaign().beforeBattle(e.id);
  mode = 'combat';
  if (savedZoom === null) {
    savedZoom = r.zoomIndex;
    r.zoomIndex = Math.min(r.zoomIndex, COMBAT_ZOOM);
  }
  const entry = campaign().entry[e.id];
  const party = explore.party();
  const heroes = campaign().party.map((id, i) => {
    const p = intro ? { x: party[i].x, y: party[i].y } : (entry[i] ?? entry[0]);
    return { id, ...p };
  });
  combat = new Combat(e, world, r, heroes, (res, c) => void endEncounter(res, c));
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
  const heroes = campaign().party.map((id) => c.units.find((u) => u.kind === id)!);
  explore.placeParty(heroes.map((u) => ({ x: u.x, y: u.y })));
  mode = 'explore';
  const finished = await campaign().afterBattle(e.id, ctx);
  if (finished) {
    clearHud();
    markCleared(game.campaign);
    endingScreen(
      campaign().ending(),
      () => toTitle(),
      () => void openWorldMap(false),
    );
    return;
  }
  busy = false;
  refreshHud(true);
}

function toTitle(): void {
  saveLand();
  combat?.destroy();
  combat = null;
  mode = 'title';
  busy = false;
  clearHud();
  uiRoot().replaceChildren();
  titleScreen({
    onNew: () => {
      resetJourney();
      void openWorldMap(false);
    },
    onContinue: hasJourney() ? () => void openWorldMap(false) : null,
  });
}

/** Remember where the party is, so travelling away and back loses nothing. */
function saveLand(): void {
  if (mode !== 'explore' || !journey.current) return;
  const a = explore.leader;
  journey.sessions.set(journey.current, { state: game, x: a.x, y: a.y });
}

/** The overview map. `fromLand`: opened from the pause menu (can be closed). */
async function openWorldMap(fromLand: boolean): Promise<void> {
  saveLand();
  const prev = mode;
  busy = true;
  clearHud();
  if (!fromLand) {
    combat?.destroy();
    combat = null;
    uiRoot().replaceChildren();
  }
  mode = 'map';
  const id = await worldMap(fromLand);
  if (id === null) {
    mode = prev;
    busy = false;
    refreshHud(true);
    return;
  }
  if (fromLand && id === journey.current) {
    mode = 'explore';
    busy = false;
    refreshHud(true);
    return;
  }
  await startGame(id, false);
}

async function startGame(id: CampaignId, dev: boolean): Promise<void> {
  const saved = dev ? undefined : journey.sessions.get(id);
  if (saved) restoreGame(saved.state);
  else newGame(id);
  journey.current = id;
  void checkTutor();
  world = campaign().buildWorld();
  campaign().prepareWorld(world);
  r.setChimneys(chimneys(world));
  explore = makeExplore();
  mode = 'explore';
  busy = true;
  const params = new URLSearchParams(location.search);
  if (dev) {
    devUnlockAll();
    campaign().dev(params.get('dev'), (x, y) => explore.placeParty([{ x, y }, ...campaign().party.slice(1).map((_, i) => ({ x: x - 1 - i, y }))]), world);
  } else if (saved) {
    explore.placeParty(campaign().party.map(() => ({ x: saved.x, y: saved.y })));
    toast(t('worldmap.welcomeBack', { land: t(`campaigns.${id}.name`) }));
  } else {
    clearHud();
    await introSlides(campaign().intro);
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
  } else if (mode === 'title' || mode === 'map') {
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
  Object.defineProperty(window, '__numerola', {
    value: {
      get combat() {
        return combat;
      },
      get explore() {
        return explore;
      },
      game: () => game,
    },
  });
}

toTitle();
const params = new URLSearchParams(location.search);
if (params.has('dev')) {
  uiRoot().replaceChildren();
  const id = params.get('campaign') === 'eigenvale' ? 'eigenvale' : 'numerola';
  void startGame(id, true);
}
requestAnimationFrame(loop);
