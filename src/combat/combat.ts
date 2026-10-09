import { TILE } from '../art/tiles';
import { FOCUS_MULT, PARTY_SKILLS, SKILLS, TEA_AP, TONIC_HEAL, type HeroId, type ItemId, type SkillId } from '../data';
import { t } from '../i18n';
import { mousePos, takeClicks, takePressed } from '../input';
import { generateLA, isLinalg } from '../math/linalg';
import { level } from '../math/mastery';
import { generate } from '../math/problems';
import type { Renderer } from '../render';
import { attuneMult, game, timerSeconds } from '../state';
import { wait } from '../ui/dom';
import { ask } from '../ui/question';
import { probeAny, sealLabel, unbindAny } from '../ui/seals';
import { askSteps } from '../ui/steps';
import { inRect, type EncounterDef, type WorldMap } from '../world/map';
import { tileCenter } from '../art/iso';
import { CombatHud } from './hud';
import { ENEMIES, makeEnemy, makeHero, occupies, unitDist, type Attack, type EnemyKind, type Unit } from './units';

interface Float {
  text: string;
  fx: number;
  fy: number;
  z: number;
  lift: number;
  t: number;
  color: string;
}

interface Reach {
  dist: Map<number, number>;
  prev: Map<number, number>;
}

const FIRE_TURNS = 2;
const FIRE_DMG = 3;
const REFLECT_DMG = 2;
const CHILL_AP = 2;
const MEND_AP = 2;
const HARDEN_MAX = 4;
const MEND_HEAL = 5;
const rand = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

export type CombatResult = 'win' | 'lose';

interface DamageOpts {
  /** a focused attack: ignores armor and reflection */
  pierce?: boolean;
}

export class Combat {
  units: Unit[] = [];
  order: Unit[] = [];
  turnIdx = 0;
  round = 1;
  state: 'player' | 'busy' | 'enemy' | 'over' = 'busy';
  selected: SkillId | null = null;
  /** the selected skill will be charged instead of cast */
  focusMode = false;
  fire = new Map<number, number>();
  floats: Float[] = [];
  log: string[] = [];
  /** Skills released with a right answer this fight (they stay attuned). */
  refreshed = new Set<SkillId>();
  hover: { x: number; y: number } | null = null;
  reach: Reach | null = null;
  hud: CombatHud;
  private anims: Array<{ u: Unit; path: Array<{ x: number; y: number }>; i: number; t: number; done: () => void }> = [];
  private shots: Array<{ x0: number; y0: number; z0: number; x1: number; y1: number; z1: number; t: number; color: string; done: () => void }> = [];

  constructor(
    readonly enc: EncounterDef,
    readonly world: WorldMap,
    readonly r: Renderer,
    heroes: Array<{ id: HeroId; x: number; y: number }>,
    readonly onEnd: (result: CombatResult, c: Combat) => void,
  ) {
    for (const h of heroes) this.units.push(makeHero(h.id, h.x, h.y));
    for (const e of enc.enemies) this.units.push(makeEnemy(e.kind as EnemyKind, e.x, e.y));
    // make sure heroes stand on valid tiles inside the arena
    for (const u of this.units) if (u.team === 'hero' && !this.canStand(u, u.x, u.y)) this.nudgeInside(u);
    this.hud = new CombatHud(this);
  }

  get active(): Unit {
    return this.order[this.turnIdx];
  }

  start(): void {
    this.order = [...this.units].sort((a, b) => b.init - a.init);
    this.addLog(t('combat.begin'));
    this.beginTurn();
  }

  destroy(): void {
    this.hud.destroy();
  }

  // ---------- grid helpers ----------

  key(x: number, y: number): number {
    return y * this.world.w + x;
  }

  alive(team?: Unit['team']): Unit[] {
    return this.units.filter((u) => !u.dead && (!team || u.team === team));
  }

  unitAt(x: number, y: number): Unit | undefined {
    return this.units.find((u) => !u.dead && occupies(u, x, y));
  }

  canStand(u: Unit, x: number, y: number): boolean {
    const h0 = this.world.height(x, y);
    for (let dy = 0; dy < u.size; dy++) {
      for (let dx = 0; dx < u.size; dx++) {
        const tx = x + dx;
        const ty = y + dy;
        if (!inRect(this.enc.region, tx, ty) || !this.world.walkable(tx, ty)) return false;
        if (this.world.height(tx, ty) !== h0) return false;
        const o = this.unitAt(tx, ty);
        if (o && o !== u) return false;
      }
    }
    return true;
  }

  private nudgeInside(u: Unit): void {
    const reg = this.enc.region;
    let best: { x: number; y: number; d: number } | null = null;
    for (let y = reg.y; y < reg.y + reg.h; y++) {
      for (let x = reg.x; x < reg.x + reg.w; x++) {
        if (!this.canStand(u, x, y)) continue;
        const d = Math.abs(x - u.x) + Math.abs(y - u.y);
        if (!best || d < best.d) best = { x, y, d };
      }
    }
    if (best) this.place(u, best.x, best.y);
  }

  private place(u: Unit, x: number, y: number): void {
    u.x = x;
    u.y = y;
    u.px = x * TILE;
    u.py = y * TILE;
  }

  /** Height of the ground a unit stands on. */
  z(u: { x: number; y: number }): number {
    return this.world.height(u.x, u.y);
  }

  /**
   * Movement range from a unit (8 directions). A step costs 1 tile of
   * movement, climbing up a level costs 1 more, and cliffs higher than one
   * level can't be climbed at all.
   */
  reachable(u: Unit, maxTiles: number): Reach {
    const dist = new Map<number, number>();
    const prev = new Map<number, number>();
    const start = this.key(u.x, u.y);
    dist.set(start, 0);
    const open: number[] = [start];
    while (open.length) {
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (dist.get(open[i])! < dist.get(open[bi])!) bi = i;
      const k = open.splice(bi, 1)[0];
      const d = dist.get(k)!;
      const x = k % this.world.w;
      const y = Math.floor(k / this.world.w);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (dx && dy && (!this.canStand(u, x + dx, y) || !this.canStand(u, x, y + dy))) continue;
          if (!this.canStand(u, nx, ny) || !this.world.canStep(x, y, nx, ny)) continue;
          const climb = this.world.height(nx, ny) > this.world.height(x, y) ? 1 : 0;
          const nd = d + 1 + climb;
          if (nd > maxTiles) continue;
          const nk = this.key(nx, ny);
          if (dist.has(nk) && dist.get(nk)! <= nd) continue;
          if (!dist.has(nk)) open.push(nk);
          dist.set(nk, nd);
          prev.set(nk, k);
        }
      }
    }
    return { dist, prev };
  }

  /** Height difference attacker − target (positive = attacker stands higher). */
  elevation(a: { x: number; y: number }, b: { x: number; y: number }): number {
    return this.z(a) - this.z(b);
  }

  /** High ground: +25% damage per level above (max +50%), −15% from below. */
  heightMult(a: Unit, b: Unit): number {
    const dz = this.elevation(a, b);
    if (dz > 0) return 1 + 0.25 * Math.min(dz, 2);
    if (dz < 0) return 0.85;
    return 1;
  }

  /** Ranged skills reach one tile further from higher ground. */
  rangeOf(u: Unit, id: SkillId, tx: number, ty: number): number {
    const r = SKILLS[id].range;
    return r > 1 && this.elevation(u, { x: tx, y: ty }) > 0 ? r + 1 : r;
  }

  pathTo(reach: Reach, u: Unit, x: number, y: number): Array<{ x: number; y: number }> {
    const out: Array<{ x: number; y: number }> = [];
    let k = this.key(x, y);
    const start = this.key(u.x, u.y);
    if (!reach.dist.has(k)) return out;
    while (k !== start) {
      out.unshift({ x: k % this.world.w, y: Math.floor(k / this.world.w) });
      k = reach.prev.get(k)!;
    }
    return out;
  }

  moveCost(u: Unit, tiles: number): number {
    return Math.ceil(Math.max(0, tiles - u.moveLeft) / u.speed);
  }

  maxTiles(u: Unit): number {
    return u.moveLeft + u.ap * u.speed;
  }

  // ---------- turn flow ----------

  private async beginTurn(): Promise<void> {
    if (this.state === 'over') return;
    const u = this.active;
    if (u.dead) {
      this.nextTurn();
      return;
    }
    for (const k of Object.keys(u.cooldowns) as SkillId[]) {
      if ((u.cooldowns[k] ?? 0) > 0) u.cooldowns[k]!--;
    }
    if (u.taunt > 0) u.taunt--;
    if (u.mark > 0) u.mark--;
    u.ap = Math.min(u.maxAp, u.ap + u.regen);
    if (u.chill > 0) {
      u.chill = 0;
      u.ap = Math.max(0, u.ap - CHILL_AP);
      this.float(u, t('combat.chillFloat'), '#73eff7');
      this.addLog(t('combat.chilled', { name: this.name(u) }));
    }
    u.moveLeft = 0;
    this.selected = null;
    this.focusMode = false;

    if (this.onFire(u)) {
      this.addLog(t('combat.burns', { name: this.name(u) }));
      this.damage(u, FIRE_DMG);
      if (this.checkEnd()) return;
      if (u.dead) {
        this.nextTurn();
        return;
      }
    }
    if (u.abilities.includes('harden') && u.armor < HARDEN_MAX) {
      u.armor++;
      this.float(u, t('combat.hardenFloat'), '#94b0c2');
    }
    if (u.abilities.includes('grow')) {
      u.maxHp += 3;
      u.hp += 3;
      this.float(u, t('combat.growFloat'), '#a7f070');
    }
    if (u.stagger) {
      u.stagger = false;
      this.addLog(t('combat.staggered', { name: this.name(u) }));
      this.float(u, t('combat.staggerFloat'), '#ffcd75');
      this.state = 'busy';
      this.hud.render();
      wait(700).then(() => this.nextTurn());
      return;
    }
    if (u.team === 'hero') {
      if (u.focus) {
        this.state = 'busy';
        this.hud.render();
        try {
          await this.releaseFocus(u);
        } catch (e) {
          console.error('focus release failed', e);
        }
        if (this.checkEnd()) return;
      }
      this.state = 'player';
      this.refreshReach();
    } else {
      this.state = 'enemy';
      this.reach = null;
      this.hud.render();
      this.runAI(u)
        .catch((e: unknown) => console.error('enemy turn failed', e))
        .then(() => {
          if (this.state !== 'over') this.nextTurn();
        });
      return;
    }
    this.hud.render();
  }

  endTurn(): void {
    if (this.state !== 'player') return;
    this.nextTurn();
  }

  private nextTurn(): void {
    if (this.state === 'over') return;
    this.turnIdx++;
    if (this.turnIdx >= this.order.length) {
      this.turnIdx = 0;
      this.round++;
      for (const [k, v] of [...this.fire]) {
        if (v <= 1) this.fire.delete(k);
        else this.fire.set(k, v - 1);
      }
    }
    void this.beginTurn();
  }

  private refreshReach(): void {
    const u = this.active;
    this.reach = this.state === 'player' && u.team === 'hero' ? this.reachable(u, this.maxTiles(u)) : null;
  }

  private checkEnd(): boolean {
    if (this.state === 'over') return true;
    if (this.alive('enemy').length === 0) {
      this.state = 'over';
      this.hud.render();
      wait(900).then(() => this.onEnd('win', this));
      return true;
    }
    if (this.alive('hero').length === 0) {
      this.state = 'over';
      this.hud.render();
      wait(900).then(() => this.onEnd('lose', this));
      return true;
    }
    return false;
  }

  // ---------- effects ----------

  name(u: Unit): string {
    return t(`chars.${u.kind}`);
  }

  addLog(s: string): void {
    this.log.unshift(s);
    if (this.log.length > 8) this.log.pop();
  }

  float(u: Unit | { x: number; y: number; size?: number }, text: string, color: string, lift = 0): void {
    const size = (u as Unit).size ?? 1;
    const off = (size - 1) / 2;
    this.floats.push({ text, fx: u.x + off, fy: u.y + off, z: this.z(u), lift: lift + size * 14, t: 0, color });
  }

  onFire(u: Unit): boolean {
    for (let dy = 0; dy < u.size; dy++) for (let dx = 0; dx < u.size; dx++) if (this.fire.has(this.key(u.x + dx, u.y + dy))) return true;
    return false;
  }

  /**
   * Deal damage. Order: high ground, mark (+50%), seal (absorbs all), armor
   * (unless pierced), shield, then HP. Returns the HP actually lost.
   */
  damage(target: Unit, amount: number, from?: Unit, opts: DamageOpts = {}): number {
    if (target.dead) return 0;
    if (from) {
      const hm = this.heightMult(from, target);
      const label = t('combat.highGround');
      const shown = this.floats.some((f) => f.text === label && f.t < 0.8);
      if (hm > 1 && !target.seal && !shown) this.float(target, label, '#ffcd75', 10);
      amount *= hm;
    }
    if (target.mark > 0) amount *= 1.5;
    if (target.seal) {
      this.float(target, t('combat.sealedFloat'), '#73eff7');
      this.addLog(t('combat.sealAbsorbs', { name: this.name(target) }));
      return 0;
    }
    let dmg = Math.max(1, Math.round(amount));
    if (target.armor && !opts.pierce) {
      dmg = Math.max(0, dmg - target.armor);
      if (dmg === 0) {
        this.float(target, t('combat.armorFloat'), '#94b0c2');
        return 0;
      }
    }
    if (target.shield > 0) {
      const absorbed = Math.min(target.shield, dmg);
      target.shield -= absorbed;
      dmg -= absorbed;
      this.float(target, t('combat.shieldFloat', { n: absorbed }), '#73a8ff', 8);
      if (dmg === 0) return 0;
    }
    target.hp -= dmg;
    target.flash = 0.25;
    this.float(target, `-${dmg}`, opts.pierce ? '#ffcd75' : '#ef7d57');
    if (target.focus) target.focus.disrupted = true;
    // crystals bite back at learned (unfocused) attacks
    if (from && from.team === 'hero' && target.abilities.includes('reflect') && !opts.pierce && !from.dead) {
      from.hp = Math.max(0, from.hp - REFLECT_DMG);
      from.flash = 0.2;
      this.float(from, `-${REFLECT_DMG}`, '#73eff7');
      this.addLog(t('combat.reflect', { name: this.name(target), target: this.name(from) }));
      if (from.hp <= 0) this.kill(from);
    }
    const seals = ENEMIES[target.kind as EnemyKind]?.seals;
    const thresholds = ENEMIES[target.kind as EnemyKind]?.thresholds;
    if (seals && thresholds && target.sealPhase < seals.length - 1) {
      const th = thresholds[target.sealPhase];
      if (target.hp <= th) {
        target.hp = th;
        target.sealPhase++;
        target.seal = seals[target.sealPhase];
        target.probeLog = [];
        this.float(target, t('combat.resealFloat'), '#73eff7', 12);
        this.addLog(t('combat.reseal', { eq: sealLabel(target.seal) }));
      }
    }
    if (target.hp <= 0) this.kill(target);
    return dmg;
  }

  private kill(u: Unit): void {
    u.hp = 0;
    u.dead = true;
    u.focus = null;
    this.addLog(t(u.team === 'hero' ? 'combat.down' : 'combat.defeated', { name: this.name(u) }));
    if (u.abilities.includes('split')) this.split(u);
  }

  /** A splitter slime bursts into two droplets on the nearest free tiles. */
  private split(u: Unit): void {
    let made = 0;
    for (let r = 1; r <= 2 && made < 2; r++) {
      for (let dy = -r; dy <= r && made < 2; dy++) {
        for (let dx = -r; dx <= r && made < 2; dx++) {
          const d = makeEnemy('droplet', u.x + dx, u.y + dy);
          if (!this.canStand(d, d.x, d.y)) continue;
          d.ap = 0;
          this.units.push(d);
          this.order.push(d);
          made++;
        }
      }
    }
    if (made) {
      this.float(u, t('combat.splitFloat'), '#a7f070', 6);
      this.addLog(t('combat.split', { name: this.name(u) }));
    }
  }

  heal(target: Unit, amount: number): void {
    const v = Math.min(target.maxHp - target.hp, Math.round(amount));
    target.hp += v;
    this.float(target, `+${v}`, '#a7f070');
  }

  breakSeal(target: Unit): void {
    target.seal = null;
    target.stagger = true;
    target.flash = 0.4;
    this.float(target, t('combat.shatterFloat'), '#ffcd75', 12);
    this.addLog(t('combat.shatter', { name: this.name(target) }));
  }

  // ---------- animation ----------

  moveAlong(u: Unit, path: Array<{ x: number; y: number }>): Promise<void> {
    if (!path.length) return Promise.resolve();
    return new Promise((done) => this.anims.push({ u, path, i: 0, t: 0, done }));
  }

  shoot(from: Unit, to: { x: number; y: number }, color: string): Promise<void> {
    return new Promise((done) =>
      this.shots.push({
        x0: from.x + (from.size - 1) / 2,
        y0: from.y + (from.size - 1) / 2,
        z0: this.z(from),
        x1: to.x + ((to as Unit).size ? ((to as Unit).size - 1) / 2 : 0),
        y1: to.y + ((to as Unit).size ? ((to as Unit).size - 1) / 2 : 0),
        z1: this.z(to),
        t: 0,
        color,
        done,
      }),
    );
  }

  update(dt: number): void {
    for (const a of [...this.anims]) {
      a.t += dt * 9;
      while (a.t >= 1 && a.i < a.path.length) {
        a.t -= 1;
        a.u.x = a.path[a.i].x;
        a.u.y = a.path[a.i].y;
        a.i++;
      }
      if (a.i >= a.path.length) {
        a.u.px = a.u.x * TILE;
        a.u.py = a.u.y * TILE;
        this.anims.splice(this.anims.indexOf(a), 1);
        a.done();
      } else {
        const n = a.path[a.i];
        a.u.px = (a.u.x + (n.x - a.u.x) * a.t) * TILE;
        a.u.py = (a.u.y + (n.y - a.u.y) * a.t) * TILE;
      }
    }
    for (const s of [...this.shots]) {
      s.t += dt * 3.5;
      if (s.t >= 1) {
        this.shots.splice(this.shots.indexOf(s), 1);
        s.done();
      }
    }
    for (const u of this.units) {
      if (!this.anims.some((a) => a.u === u)) {
        u.px = u.x * TILE;
        u.py = u.y * TILE;
      }
      if (u.flash > 0) u.flash -= dt;
    }
    for (const f of this.floats) f.t += dt;
    this.floats = this.floats.filter((f) => f.t < 1.3);

    const mp = mousePos();
    this.hover = mp ? this.pick(mp.x, mp.y) : null;

    const clicks = takeClicks();
    const keys = takePressed();
    if (this.state !== 'player') return;

    for (const k of keys) this.onKey(k);
    for (const c of clicks) {
      const tile = this.pick(c.x, c.y);
      if (c.button === 2) this.select(null);
      else void this.onClick(tile.x, tile.y);
    }
  }

  // ---------- player input ----------

  /** Tile under the mouse; clicking a character's body counts as its tile. */
  pick(clientX: number, clientY: number): { x: number; y: number } {
    const p = this.r.toLogical(clientX, clientY);
    const units = this.alive().sort((a, b) => b.x + b.y + b.size - (a.x + a.y + a.size));
    for (const u of units) {
      const c = tileCenter(u.px / TILE + (u.size - 1) / 2, u.py / TILE + (u.size - 1) / 2, this.z(u));
      const w = u.size * 16;
      if (p.x >= c.x - w / 2 && p.x <= c.x + w / 2 && p.y >= c.y - w + 2 && p.y <= c.y + 2) return { x: u.x, y: u.y };
    }
    return this.r.screenToTile(clientX, clientY, this.world);
  }

  skillsOf(u: Unit): SkillId[] {
    if (u.team !== 'hero') return [];
    return PARTY_SKILLS[game.campaign][u.kind as HeroId] ?? [];
  }

  canUse(u: Unit, id: SkillId): boolean {
    return game.learned.has(id) && u.ap >= SKILLS[id].ap && !(u.cooldowns[id] ?? 0);
  }

  /** Focusing costs one extra AP and needs a skill with a focus puzzle. */
  canFocus(u: Unit, id: SkillId): boolean {
    return !!SKILLS[id].focus && this.canUse(u, id) && u.ap >= SKILLS[id].ap + 1 && !u.focus;
  }

  select(id: SkillId | null): void {
    if (this.state !== 'player') return;
    if (id && !this.canUse(this.active, id)) return;
    this.selected = this.selected === id ? null : id;
    if (!this.selected || !this.canFocus(this.active, this.selected)) this.focusMode = false;
    // self skills fire straight away
    if (this.selected && SKILLS[this.selected].target === 'self' && !this.focusMode) {
      const s = this.selected;
      void this.useSkill(s, this.active.x, this.active.y);
      return;
    }
    this.hud.render();
  }

  toggleFocus(): void {
    if (this.selected && this.canFocus(this.active, this.selected)) {
      this.focusMode = !this.focusMode;
      if (this.focusMode && SKILLS[this.selected].target === 'self') {
        void this.useSkill(this.selected, this.active.x, this.active.y);
        return;
      }
      this.hud.render();
    }
  }

  private onKey(k: string): void {
    const n = Number(k);
    if (n >= 1 && n <= 4) {
      const id = this.skillsOf(this.active)[n - 1];
      if (id) this.select(id);
    } else if (k === 'f') this.toggleFocus();
    else if (k === 'q') void this.autoTurn();
    else if (k === 'Escape') this.select(null);
    else if (k === ' ' || k === 'Enter') this.endTurn();
  }

  /** Is (x, y) a valid target for the selected skill? */
  validTarget(id: SkillId, x: number, y: number): boolean {
    const u = this.active;
    const def = SKILLS[id];
    const tu = this.unitAt(x, y);
    const d = unitDist(u, { x, y, size: tu?.size ?? 1 });
    if (def.target === 'self') return x === u.x && y === u.y;
    if (def.target === 'enemy') {
      if (!tu || tu.team !== 'enemy') return false;
      if (def.effect.kind === 'unbind' && !tu.seal) return false;
      return unitDist(u, tu) <= this.rangeOf(u, id, tu.x, tu.y);
    }
    if (def.target === 'ally') return !!tu && tu.team === 'hero' && unitDist(u, tu) <= def.range;
    if (def.target === 'emptyTile') return !tu && this.canStand(u, x, y) && d <= def.range;
    return inRect(this.enc.region, x, y) && this.world.walkable(x, y) && unitDist(u, { x, y, size: 1 }) <= this.rangeOf(u, id, x, y);
  }

  private async onClick(x: number, y: number): Promise<void> {
    if (this.state !== 'player') return;
    const u = this.active;
    if (this.selected) {
      if (this.validTarget(this.selected, x, y)) await this.useSkill(this.selected, x, y);
      return;
    }
    const tu = this.unitAt(x, y);
    if (tu && tu.team === 'enemy') {
      // quick basic attack
      const basic = this.skillsOf(u)[0];
      if (this.validTarget(basic, x, y) && this.canUse(u, basic)) await this.useSkill(basic, x, y);
      else this.addLog(t('combat.outOfRange'));
      this.hud.render();
      return;
    }
    if (!this.reach) return;
    const d = this.reach.dist.get(this.key(x, y));
    if (d === undefined || d === 0) return;
    const cost = this.moveCost(u, d);
    if (cost > u.ap) return;
    await this.walk(u, x, y, d, cost);
    this.afterAction();
  }

  private async walk(u: Unit, x: number, y: number, d: number, cost: number): Promise<void> {
    this.state = 'busy';
    this.hud.render();
    const path = this.pathTo(this.reach ?? this.reachable(u, this.maxTiles(u)), u, x, y);
    u.ap -= cost;
    u.moveLeft = u.moveLeft + cost * u.speed - d;
    await this.moveAlong(u, path);
  }

  private afterAction(): void {
    if (this.checkEnd()) return;
    if (this.active.dead) {
      this.nextTurn();
      return;
    }
    this.state = 'player';
    this.refreshReach();
    this.hud.render();
  }

  /**
   * Cast a skill (the learned way: no math), or start focusing it. Focusing
   * costs one more AP and ends the turn; the skill fires at the start of the
   * hero's next turn, after a puzzle.
   */
  async useSkill(id: SkillId, x: number, y: number): Promise<void> {
    const u = this.active;
    const def = SKILLS[id];
    // one action at a time (a double click must not start two)
    if (this.state !== 'player' || !this.canUse(u, id)) return;
    const focusing = this.focusMode && this.canFocus(u, id);
    const target = this.unitAt(x, y);
    this.state = 'busy';
    this.selected = null;
    this.focusMode = false;
    this.hud.render();
    if (focusing) {
      u.ap -= def.ap + 1;
      u.focus = { skill: id, x, y, targetUid: target?.uid ?? null, disrupted: false };
      this.float(u, t('combat.focusFloat'), '#ffcd75', 6);
      this.addLog(t('combat.focusStart', { name: this.name(u), skill: t(`skills.${id}.name`) }));
      await wait(500);
      this.nextTurn();
      return;
    }
    u.ap -= def.ap;
    if (def.cooldown) u.cooldowns[id] = def.cooldown;
    this.addLog(t('combat.uses', { name: this.name(u), skill: t(`skills.${id}.name`) }));
    await this.perform(u, id, x, y, def.basic ? 1 : attuneMult(id), false, 0);
    this.afterAction();
  }

  /** Solve the focus puzzle and fire the charged skill. */
  private async releaseFocus(u: Unit): Promise<void> {
    const f = u.focus!;
    u.focus = null;
    const def = SKILLS[f.skill];
    const name = t(`skills.${f.skill}.name`);
    this.addLog(t('combat.focusRelease', { name: this.name(u), skill: name }));
    const oc = def.focus!;
    let mult = FOCUS_MULT.miss;
    let pierce = false;
    let extraHits = 0;
    const title = t('combat.focusTitle', { skill: name });
    const tag = t(f.disrupted ? 'combat.focusDisrupted' : 'combat.focusTag');
    if (def.effect.kind === 'multi' && oc.timed) {
      // ninja chain: every quick right answer adds a hit
      for (let i = 0; i < 4; i++) {
        const ok = isLinalg(oc.topic)
          ? (await askSteps(generateLA(oc.topic, level(oc.topic)), { title, tag, seconds: timerSeconds(14), quick: true })).correct
          : (await ask(generate(oc.topic, level(oc.topic)), { title, tag, seconds: timerSeconds(8), quick: true })).correct;
        if (!ok) break;
        extraHits++;
      }
      if (extraHits > 0) this.refreshed.add(f.skill);
      pierce = extraHits >= 2;
      this.addLog(t('combat.combo', { n: def.effect.hits + extraHits }));
    } else if (isLinalg(oc.topic)) {
      const r = await askSteps(generateLA(oc.topic, level(oc.topic)), { title, tag });
      if (r.correct) {
        mult = f.disrupted ? FOCUS_MULT.disrupted : FOCUS_MULT.perfect;
        pierce = true;
        this.refreshed.add(f.skill);
      } else if (r.steps) {
        // the working counts: partial credit for right steps
        mult = 1 + 0.5 * (r.stepsRight / r.steps);
      }
    } else {
      const r = await ask(generate(oc.topic, level(oc.topic)), { title, tag, seconds: oc.timed ? timerSeconds(8) : 0, hint: !oc.timed });
      if (r.correct) {
        mult = f.disrupted ? FOCUS_MULT.disrupted : FOCUS_MULT.perfect;
        pierce = true;
        this.refreshed.add(f.skill);
      }
    }
    // aim: the chosen unit if it is still close enough, else the nearest enemy in reach
    let x = f.x;
    let y = f.y;
    if (def.target === 'enemy' || def.target === 'ally') {
      const team = def.target === 'enemy' ? 'enemy' : 'hero';
      let tgt = this.units.find((o) => o.uid === f.targetUid && !o.dead);
      const reach = def.range + 2;
      if (!tgt || unitDist(u, tgt) > reach) tgt = this.alive(team).filter((o) => unitDist(u, o) <= reach).sort((a, b) => unitDist(u, a) - unitDist(u, b))[0];
      if (!tgt) {
        this.float(u, t('combat.fizzle'), '#94b0c2');
        this.addLog(t('combat.fizzleLog', { skill: name }));
        return;
      }
      x = tgt.x;
      y = tgt.y;
    } else if (def.target === 'self') {
      x = u.x;
      y = u.y;
    }
    if (def.cooldown) u.cooldowns[f.skill] = def.cooldown;
    if (mult > 1) this.float(u, `×${mult.toFixed(1)}`, '#ffcd75', 14);
    await this.perform(u, f.skill, x, y, attuneMult(f.skill) * mult, pierce, extraHits);
  }

  /** Apply a skill's effect. `mult` scales damage/healing; `pierce` ignores armor. */
  private async perform(u: Unit, id: SkillId, x: number, y: number, mult: number, pierce: boolean, extraHits: number): Promise<void> {
    const def = SKILLS[id];
    const e = def.effect;
    const target = this.unitAt(x, y);
    const hiddenMult = () => {
      if (u.hidden) {
        u.hidden = false;
        return 1.5;
      }
      return 1;
    };
    switch (e.kind) {
      case 'hit': {
        if (!target) return;
        if (e.projectile) await this.shoot(u, target, e.projectile);
        this.damage(target, rand(e.min, e.max) * mult * hiddenMult(), u, { pierce });
        break;
      }
      case 'multi': {
        if (!target) return;
        const hm = hiddenMult();
        for (let i = 0; i < e.hits + extraHits && !target.dead; i++) {
          this.damage(target, e.dmg * mult * hm, u, { pierce });
          await wait(150);
        }
        break;
      }
      case 'aoe': {
        const cx = def.target === 'self' ? u.x : x;
        const cy = def.target === 'self' ? u.y : y;
        if (def.target !== 'self') await this.shoot(u, { x: cx, y: cy }, e.fire ? '#ef7d57' : '#a992ff');
        const hit = new Set<Unit>();
        for (let dy = -def.area; dy <= def.area; dy++) {
          for (let dx = -def.area; dx <= def.area; dx++) {
            const tx = cx + dx;
            const ty = cy + dy;
            if (!inRect(this.enc.region, tx, ty) || !this.world.walkable(tx, ty)) continue;
            if (e.fire) this.fire.set(this.key(tx, ty), FIRE_TURNS);
            const tu = this.unitAt(tx, ty);
            // quakes around yourself don't hit you; fireballs hit everyone
            if (tu && !(def.target === 'self' && tu.team === 'hero')) hit.add(tu);
          }
        }
        for (const tu of hit) this.damage(tu, e.dmg * mult, u, { pierce });
        break;
      }
      case 'heal':
        if (target) this.heal(target, e.amount * mult);
        break;
      case 'teleport':
        this.place(u, x, y);
        u.moveLeft = 0;
        this.float(u, t('combat.stepFloat'), '#94b0c2');
        break;
      case 'probe':
        if (!target) return;
        if (target.seal) {
          const res = await probeAny(target.seal, target.probeLog);
          if (res.shattered) this.breakSeal(target);
        }
        this.damage(target, e.dmg * mult * hiddenMult(), u, { pierce });
        break;
      case 'unbind':
        if (target?.seal) {
          const ok = await unbindAny(target.seal);
          if (ok) this.breakSeal(target);
          else {
            this.float(target, t('combat.holdsFloat'), '#73eff7');
            this.addLog(t('combat.sealHolds'));
          }
        }
        break;
      case 'shield':
        if (target) {
          const n = Math.round(e.amount * mult);
          target.shield += n;
          this.float(target, t('combat.shieldGain', { n }), '#73a8ff', 6);
        }
        break;
      case 'taunt':
        u.taunt = e.turns + (mult > 1 ? 1 : 0);
        this.float(u, t('combat.tauntFloat'), '#ef7d57', 6);
        break;
      case 'mark':
        if (target) {
          target.mark = e.turns + 1; // ticks down on its own turn
          this.float(target, t('combat.markFloat'), '#ef7d57', 6);
        }
        break;
    }
  }

  async useItem(id: ItemId): Promise<void> {
    const u = this.active;
    if (this.state !== 'player' || game.inv[id] <= 0) return;
    if (id === 'tonic') {
      if (u.ap < 1) return;
      u.ap -= 1;
      game.inv.tonic--;
      this.heal(u, TONIC_HEAL);
    } else if (id === 'tea') {
      game.inv.tea--;
      u.ap += TEA_AP;
      this.float(u, `+${TEA_AP} AP`, '#41a6f6');
    }
    this.addLog(t('combat.usesItem', { name: this.name(u), item: t(`items.${id}.name`) }));
    this.afterAction();
  }

  // ---------- AI (enemies, and heroes on Auto) ----------

  /** Walk toward the closest of `targets`, keeping `keepAp` for an attack if possible. */
  private async approach(u: Unit, targets: Unit[], wantRange: number, keepAp: number): Promise<boolean> {
    if (!targets.length || (u.ap <= 0 && u.moveLeft <= 0)) return false;
    const reach = this.reachable(u, this.maxTiles(u));
    const cur = Math.min(...targets.map((h) => unitDist(u, h)));
    let best: { k: number; score: number; cost: number } | null = null;
    for (const [k, d] of reach.dist) {
      const cost = this.moveCost(u, d);
      if (cost > u.ap) continue;
      const x = k % this.world.w;
      const y = Math.floor(k / this.world.w);
      const dist = Math.min(...targets.map((h) => unitDist({ x, y, size: u.size }, h)));
      // being in range matters most, then keeping AP, then distance
      const inRange = dist <= wantRange ? 0 : 1;
      const short = u.ap - cost < keepAp ? 1 : 0;
      const score = inRange * 100 + short * 10 + dist;
      if (!best || score < best.score || (score === best.score && cost < best.cost)) best = { k, score, cost };
    }
    if (!best) return false;
    const x = best.k % this.world.w;
    const y = Math.floor(best.k / this.world.w);
    const d = reach.dist.get(best.k)!;
    if (d === 0 || Math.min(...targets.map((h) => unitDist({ x, y, size: u.size }, h))) >= cur) return false;
    u.ap -= best.cost;
    u.moveLeft = u.moveLeft + best.cost * u.speed - d;
    await this.moveAlong(u, this.pathTo(reach, u, x, y));
    await wait(120);
    return true;
  }

  /** Enemies attack a taunting hero if they can, otherwise the weakest in reach. */
  private pickTargets(): Unit[] {
    const heroes = this.alive('hero');
    const taunters = heroes.filter((h) => h.taunt > 0);
    return taunters.length ? taunters : heroes;
  }

  private async enemyAttack(u: Unit, atk: Attack, tgt: Unit): Promise<void> {
    u.ap -= atk.ap;
    this.addLog(t('combat.enemyAttack', { name: this.name(u), attack: t(`combat.attacks.${atk.id}`), target: this.name(tgt) }));
    if (atk.range > 1) await this.shoot(u, tgt, '#94b0c2');
    else {
      u.flash = 0.15;
      await wait(250);
    }
    const victims = atk.aoe ? this.alive('hero').filter((h) => unitDist(h, tgt) <= atk.aoe!) : [tgt];
    for (const v of victims) {
      const dealt = this.damage(v, rand(atk.min, atk.max), u);
      if (u.abilities.includes('drain') && dealt > 0) this.heal(u, Math.ceil(dealt / 2));
      if (u.abilities.includes('push') && !v.dead) this.push(u, v);
      if (u.abilities.includes('pull') && !v.dead) this.pull(u, v);
      if (u.abilities.includes('chill') && !v.dead && dealt > 0) {
        v.chill = 1;
        this.float(v, t('combat.chillFloat'), '#73eff7', 4);
      }
    }
  }

  /** Drag `v` one tile toward `u` (a frog's tongue). */
  private pull(u: Unit, v: Unit): void {
    if (unitDist(u, v) <= 1) return;
    const nx = v.x + Math.sign(u.x - v.x);
    const ny = v.y + Math.sign(u.y - v.y);
    if (!this.canStand(v, nx, ny) || Math.abs(this.world.height(nx, ny) - this.z(v)) > 1) return;
    this.place(v, nx, ny);
    this.float(v, t('combat.pullFloat'), '#a7f070', 4);
  }

  /** A shade spends its turn healing the most hurt ally nearby; true if it did. */
  private async mendAlly(u: Unit): Promise<boolean> {
    if (u.abilityCd > 0) {
      u.abilityCd--;
      return false;
    }
    if (u.ap < MEND_AP) return false;
    const hurt = this.alive('enemy')
      .filter((e) => e !== u && e.hp < e.maxHp * 0.6 && unitDist(u, e) <= 4)
      .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    if (!hurt) return false;
    u.ap -= MEND_AP;
    u.flash = 0.2;
    await this.shoot(u, hurt, '#a992ff');
    this.heal(hurt, MEND_HEAL);
    u.abilityCd = 1;
    this.addLog(t('combat.mendLog', { name: this.name(u), target: this.name(hurt) }));
    await wait(300);
    return true;
  }

  /** Shove `v` two tiles directly away from `u` (stopping at obstacles). */
  private push(u: Unit, v: Unit): void {
    const dx = Math.sign(v.x - (u.x + (u.size - 1) / 2));
    const dy = Math.sign(v.y - (u.y + (u.size - 1) / 2));
    let moved = 0;
    for (let i = 0; i < 2; i++) {
      const nx = v.x + dx;
      const ny = v.y + dy;
      if (!this.canStand(v, nx, ny) || Math.abs(this.world.height(nx, ny) - this.z(v)) > 1) break;
      this.place(v, nx, ny);
      moved++;
    }
    if (moved) this.float(v, t('combat.pushFloat'), '#a992ff', 4);
  }

  /** Wisps hop away after acting. */
  private blink(u: Unit): void {
    const heroes = this.alive('hero');
    let best: { x: number; y: number; d: number } | null = null;
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const x = u.x + dx;
        const y = u.y + dy;
        if (!this.canStand(u, x, y)) continue;
        const d = Math.min(...heroes.map((h) => unitDist({ x, y, size: 1 }, h)));
        if (d > 4) continue; // stay close enough to keep zapping
        if (!best || d > best.d) best = { x, y, d };
      }
    }
    if (best && (best.x !== u.x || best.y !== u.y)) {
      this.place(u, best.x, best.y);
      this.float(u, t('combat.blinkFloat'), '#73eff7', 4);
    }
  }

  private async runAI(u: Unit): Promise<void> {
    await wait(400);
    const attacks = ENEMIES[u.kind as EnemyKind].attacks;
    if (u.abilities.includes('mend')) await this.mendAlly(u);
    for (let guard = 0; guard < 6 && this.state !== 'over'; guard++) {
      const targets = this.pickTargets();
      if (!targets.length) return;
      let acted = false;
      for (const atk of attacks) {
        if (u.ap < atk.ap) continue;
        const inReach = targets
          .filter((h) => {
            const d = unitDist(u, h);
            const range = atk.range > 1 && this.elevation(u, h) > 0 ? atk.range + 1 : atk.range;
            return d <= range && d >= atk.minRange;
          })
          .sort((a, b) => a.hp - b.hp);
        if (!inReach.length) continue;
        await this.enemyAttack(u, atk, inReach[0]);
        if (this.checkEnd()) return;
        await wait(380);
        acted = true;
        break;
      }
      if (acted) continue;
      const minAp = Math.min(...attacks.map((a) => a.ap));
      if (!(await this.approach(u, targets, Math.max(...attacks.map((a) => a.range)), minAp))) break;
    }
    if (u.abilities.includes('blink') && !u.dead) this.blink(u);
  }

  /**
   * Auto: the hero plays its turn with learned skills only (no math, no
   * focus) — heal a hurt ally, otherwise walk up and use the strongest
   * attack it can afford.
   */
  async autoTurn(): Promise<void> {
    if (this.state !== 'player') return;
    const u = this.active;
    this.state = 'busy';
    this.selected = null;
    this.focusMode = false;
    this.hud.render();
    this.addLog(t('combat.autoLog', { name: this.name(u) }));
    const skills = this.skillsOf(u).filter((id) => game.learned.has(id));
    const damaging = skills.filter((id) => ['hit', 'multi', 'aoe'].includes(SKILLS[id].effect.kind));
    for (let guard = 0; guard < 8 && !this.isOver(); guard++) {
      // heal first
      const heal = skills.find((id) => SKILLS[id].effect.kind === 'heal' && this.canUse(u, id));
      const hurt = this.alive('hero').filter((h) => h.hp < h.maxHp * 0.5 && unitDist(u, h) <= SKILLS[heal ?? 'bolt'].range).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (heal && hurt) {
        await this.castAuto(u, heal, hurt.x, hurt.y);
        continue;
      }
      const enemies = this.alive('enemy');
      if (!enemies.length) break;
      // prefer unsealed enemies; sealed ones only absorb learned hits
      const open = enemies.filter((e) => !e.seal);
      const pool = open.length ? open : enemies;
      const usable = damaging.filter((id) => this.canUse(u, id)).sort((a, b) => this.expected(b) - this.expected(a));
      let done = false;
      for (const id of usable) {
        const def = SKILLS[id];
        if (def.target === 'self') {
          if (pool.some((e) => unitDist(u, e) <= def.area)) {
            await this.castAuto(u, id, u.x, u.y);
            done = true;
            break;
          }
          continue;
        }
        const tgt = pool.filter((e) => unitDist(u, e) <= this.rangeOf(u, id, e.x, e.y)).sort((a, b) => a.hp - b.hp)[0];
        if (tgt) {
          await this.castAuto(u, id, tgt.x, tgt.y);
          done = true;
          break;
        }
      }
      if (done) continue;
      const basic = skills[0];
      const want = Math.max(1, SKILLS[basic].range);
      if (!(await this.approach(u, pool, want, SKILLS[basic].ap))) break;
    }
    if (this.isOver()) return;
    await wait(250);
    this.nextTurn();
  }

  /** Read the state fresh (TypeScript narrows `state` after assignments). */
  private isOver(): boolean {
    return this.state === 'over';
  }

  private expected(id: SkillId): number {
    const e = SKILLS[id].effect;
    if (e.kind === 'hit') return (e.min + e.max) / 2;
    if (e.kind === 'multi') return e.hits * e.dmg;
    if (e.kind === 'aoe') return e.dmg;
    return 0;
  }

  private async castAuto(u: Unit, id: SkillId, x: number, y: number): Promise<void> {
    const def = SKILLS[id];
    u.ap -= def.ap;
    if (def.cooldown) u.cooldowns[id] = def.cooldown;
    this.addLog(t('combat.uses', { name: this.name(u), skill: t(`skills.${id}.name`) }));
    await this.perform(u, id, x, y, def.basic ? 1 : attuneMult(id), false, 0);
    await wait(250);
    this.hud.render();
  }

  // ---------- drawing ----------

  draw(): void {
    const r = this.r;
    const ctx = r.ctx;
    const reg = this.enc.region;
    const frame = r.frame;
    const u = this.active;

    // arena grid
    for (let y = reg.y; y < reg.y + reg.h; y++) {
      for (let x = reg.x; x < reg.x + reg.w; x++) if (this.world.walkable(x, y)) r.addOverlay(x, y, 'rgba(0,0,0,0)', 'rgba(26,28,44,0.4)');
    }
    // fire
    for (const k of this.fire.keys()) {
      const x = k % this.world.w;
      const y = Math.floor(k / this.world.w);
      r.addOverlay(x, y, 'rgba(239,125,87,0.45)');
      const z = this.world.height(x, y);
      r.addSprite(x, y, () => {
        const c = tileCenter(x, y, z);
        ctx.fillStyle = (frame + x * 3 + y) % 12 < 6 ? '#ffcd75' : '#b13e53';
        ctx.fillRect(c.x - 5 + ((frame >> 2) % 3), c.y - 5, 2, 4);
        ctx.fillRect(c.x + 3, c.y - 7 + ((frame >> 3) % 2), 2, 4);
      });
    }

    if (this.state === 'player' && u) {
      if (this.selected) {
        const def = SKILLS[this.selected];
        for (let y = reg.y; y < reg.y + reg.h; y++) {
          for (let x = reg.x; x < reg.x + reg.w; x++) {
            if (!this.world.walkable(x, y)) continue;
            if (this.validTarget(this.selected, x, y)) r.addOverlay(x, y, 'rgba(255,205,117,0.35)', 'rgba(255,205,117,0.9)');
            else if (unitDist(u, { x, y, size: 1 }) <= this.rangeOf(u, this.selected, x, y)) r.addOverlay(x, y, 'rgba(255,205,117,0.12)');
          }
        }
        if (this.hover && def.area && this.validTarget(this.selected, this.hover.x, this.hover.y)) {
          for (let dy = -def.area; dy <= def.area; dy++)
            for (let dx = -def.area; dx <= def.area; dx++) r.addOverlay(this.hover.x + dx, this.hover.y + dy, 'rgba(177,62,83,0.45)', '#ef7d57');
        }
      } else if (this.reach) {
        for (const [k, d] of this.reach.dist) {
          if (d === 0) continue;
          const cost = this.moveCost(u, d);
          if (cost > u.ap) continue;
          r.addOverlay(k % this.world.w, Math.floor(k / this.world.w), cost === 0 ? 'rgba(115,239,247,0.35)' : 'rgba(65,166,246,0.28)');
        }
        if (this.hover) {
          const d = this.reach.dist.get(this.key(this.hover.x, this.hover.y));
          if (d !== undefined && d > 0 && this.moveCost(u, d) <= u.ap) {
            for (const p of this.pathTo(this.reach, u, this.hover.x, this.hover.y)) r.addOverlay(p.x, p.y, 'rgba(255,205,117,0.4)');
            const hx = this.hover.x;
            const hy = this.hover.y;
            const hz = this.world.height(hx, hy);
            r.addLate(() => {
              const c = tileCenter(hx, hy, hz);
              const climb = hz > this.z(u) ? ` ▲${hz}` : '';
              r.text(t('combat.apCost', { n: this.moveCost(u, d) }) + climb, c.x, c.y - 14, { size: 15, color: '#ffcd75' });
            });
          }
        }
      }
    }

    // units
    for (const unit of this.units.filter((x) => !x.dead)) {
      const anim = this.anims.find((a) => a.u === unit);
      const fx = unit.px / TILE;
      const fy = unit.py / TILE;
      // while walking, sort by the further-forward tile so floors never cover the walker
      const next = anim && anim.i < anim.path.length ? anim.path[anim.i] : null;
      const sx = Math.max(unit.x, next?.x ?? unit.x) + unit.size - 1;
      const sy = Math.max(unit.y, next?.y ?? unit.y) + unit.size - 1;
      const z0 = this.z(unit);
      const z = next ? z0 + (this.world.height(next.x, next.y) - z0) * anim!.t : z0;
      const bob = unit === this.active && Math.sin(frame / 6) > 0 ? -1 : 0;
      r.addSprite(sx, sy, () => {
        if (unit.focus) {
          const c = tileCenter(fx, fy, z);
          ctx.strokeStyle = `rgba(255,205,117,${(0.5 + 0.4 * Math.sin(frame / 5)).toFixed(2)})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.ellipse(c.x, c.y, 9, 4.5, 0, 0, Math.PI * 2);
          ctx.stroke();
          r.addLight(c.x, c.y - 8, 26, '255,205,117', 0.4);
        }
        r.drawSpriteAt(unit.kind, fx, fy, z, { flash: unit.flash > 0, bob, alpha: unit.hidden ? 0.55 : 1, size: unit.size });
        if (unit.seal) {
          const c = tileCenter(fx + (unit.size - 1) / 2, fy + (unit.size - 1) / 2, z);
          r.addLight(c.x, c.y - unit.size * 8, 34 * unit.size, '90,200,255', 0.6);
          ctx.strokeStyle = frame % 20 < 10 ? 'rgba(115,239,247,0.9)' : 'rgba(65,166,246,0.9)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(c.x, c.y - unit.size * 7, unit.size * 11, unit.size * 9, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      });
      // HP bar, seal equation and turn marker drawn on top of everything
      r.addLate(() => {
        // heroes stay faintly visible through walls and big enemies
        if (unit.team === 'hero') r.drawSpriteAt(unit.kind, fx, fy, z, { alpha: 0.3, bob });
        const c = tileCenter(fx + (unit.size - 1) / 2, fy + (unit.size - 1) / 2, z);
        const top = c.y - unit.size * 16 - 1;
        const w = unit.size * 14;
        ctx.fillStyle = '#1a1c2c';
        ctx.fillRect(c.x - w / 2, top, w, 2);
        ctx.fillStyle = unit.team === 'hero' ? '#a7f070' : '#ef7d57';
        ctx.fillRect(c.x - w / 2, top, Math.max(0, (w * unit.hp) / unit.maxHp), 2);
        if (unit.seal) r.text(sealLabel(unit.seal), c.x, top - 7, { size: 18, color: '#73eff7', bold: true });
        // status badges: armor, shield, mark, taunt, focusing
        const badges: Array<[string, string]> = [];
        if (unit.armor) badges.push([`⛨${unit.armor}`, '#94b0c2']);
        if (unit.shield) badges.push([`◈${unit.shield}`, '#73a8ff']);
        if (unit.mark) badges.push(['◎', '#ef7d57']);
        if (unit.taunt) badges.push(['!', '#ef7d57']);
        if (unit.focus) badges.push(['✦', '#ffcd75']);
        badges.forEach(([txt, color], i) => r.text(txt, c.x - (badges.length - 1) * 6 + i * 12, c.y + 6, { size: 13, color, bold: true }));
        if (unit === u && this.state !== 'over') {
          const ay = top - (unit.seal ? 16 : 4) + (Math.sin(frame / 5) > 0 ? -1 : 0);
          ctx.fillStyle = '#ffcd75';
          ctx.beginPath();
          ctx.moveTo(c.x - 3, ay - 3);
          ctx.lineTo(c.x + 3, ay - 3);
          ctx.lineTo(c.x, ay + 1);
          ctx.fill();
        }
      });
    }

    r.addLate(() => {
      for (const sh of this.shots) {
        const a = tileCenter(sh.x0, sh.y0, sh.z0);
        const b = tileCenter(sh.x1, sh.y1, sh.z1);
        const x = a.x + (b.x - a.x) * sh.t;
        const y = a.y - 8 + (b.y - a.y) * sh.t - Math.sin(sh.t * Math.PI) * 10;
        ctx.fillStyle = sh.color;
        ctx.fillRect(x - 2, y - 2, 4, 4);
        ctx.fillStyle = '#f4f4f4';
        ctx.fillRect(x - 1, y - 1, 2, 2);
      }
      for (const f of this.floats) {
        const c = tileCenter(f.fx, f.fy, f.z);
        r.text(f.text, c.x, c.y - f.lift - f.t * 14, { color: f.color, size: 20, bold: true });
      }
    });
  }
}
