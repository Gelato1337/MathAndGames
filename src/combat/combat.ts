import { TILE } from '../art/tiles';
import { HERO_SKILLS, SKILLS, TEA_AP, TONIC_HEAL, type HeroId, type ItemId, type SkillId } from '../data';
import { t } from '../i18n';
import { mousePos, takeClicks, takePressed } from '../input';
import { level } from '../math/mastery';
import { generate } from '../math/problems';
import { fmtSeal, GOLEM_SEALS } from '../math/seal';
import type { Renderer } from '../render';
import { attuneMult, game, timerSeconds } from '../state';
import { wait } from '../ui/dom';
import { ask } from '../ui/question';
import { probeSeal, unbindSeal } from '../ui/seals';
import { inRect, type EncounterDef, type WorldMap } from '../world/map';
import { tileCenter } from '../art/iso';
import { CombatHud } from './hud';
import { ENEMY_ATTACKS, GOLEM_THRESHOLDS, makeEnemy, makeHero, occupies, unitDist, type Unit } from './units';

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
const rand = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

export type CombatResult = 'win' | 'lose';

export class Combat {
  units: Unit[] = [];
  order: Unit[] = [];
  turnIdx = 0;
  round = 1;
  state: 'player' | 'busy' | 'enemy' | 'over' = 'busy';
  selected: SkillId | null = null;
  overcharge = false;
  fire = new Map<number, number>();
  floats: Float[] = [];
  log: string[] = [];
  /** Skills overcharged successfully this fight (they stay attuned). */
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
    for (const e of enc.enemies) this.units.push(makeEnemy(e.kind, e.x, e.y));
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
    if (best) {
      u.x = best.x;
      u.y = best.y;
      u.px = u.x * TILE;
      u.py = u.y * TILE;
    }
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
      // small grids: a linear scan for the cheapest open node is plenty
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

  private beginTurn(): void {
    if (this.state === 'over') return;
    const u = this.active;
    if (u.dead) {
      this.nextTurn();
      return;
    }
    for (const k of Object.keys(u.cooldowns) as SkillId[]) {
      if ((u.cooldowns[k] ?? 0) > 0) u.cooldowns[k]!--;
    }
    u.ap = Math.min(u.maxAp, u.ap + u.regen);
    u.moveLeft = 0;
    this.selected = null;
    this.overcharge = false;

    if (this.onFire(u)) {
      this.addLog(t('combat.burns', { name: this.name(u) }));
      this.damage(u, FIRE_DMG);
      if (this.checkEnd()) return;
      if (u.dead) {
        this.nextTurn();
        return;
      }
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
      this.state = 'player';
      this.refreshReach();
    } else {
      this.state = 'enemy';
      this.reach = null;
      this.hud.render();
      this.runAI(u).then(() => {
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
    this.beginTurn();
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

  damage(target: Unit, amount: number, from?: Unit): void {
    if (target.dead) return;
    if (from) {
      const hm = this.heightMult(from, target);
      const label = t('combat.highGround');
      const shown = this.floats.some((f) => f.text === label && f.t < 0.8);
      if (hm > 1 && !target.seal && !shown) this.float(target, label, '#ffcd75', 10);
      amount *= hm;
    }
    if (target.seal) {
      this.float(target, t('combat.sealedFloat'), '#73eff7');
      this.addLog(t('combat.sealAbsorbs', { name: this.name(target) }));
      return;
    }
    const dmg = Math.max(1, Math.round(amount));
    target.hp -= dmg;
    target.flash = 0.25;
    this.float(target, `-${dmg}`, '#ef7d57');
    if (target.kind === 'golem' && target.sealPhase < GOLEM_SEALS.length - 1) {
      const th = GOLEM_THRESHOLDS[target.sealPhase];
      if (target.hp <= th) {
        target.hp = th;
        target.sealPhase++;
        target.seal = GOLEM_SEALS[target.sealPhase];
        target.probeLog = [];
        this.float(target, t('combat.resealFloat'), '#73eff7', 12);
        this.addLog(t('combat.reseal', { eq: fmtSeal(target.seal) }));
      }
    }
    if (target.hp <= 0) {
      target.hp = 0;
      target.dead = true;
      this.addLog(t(target.team === 'hero' ? 'combat.down' : 'combat.defeated', { name: this.name(target) }));
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
    return HERO_SKILLS[u.kind as HeroId];
  }

  canUse(u: Unit, id: SkillId): boolean {
    return game.learned.has(id) && u.ap >= SKILLS[id].ap && !(u.cooldowns[id] ?? 0);
  }

  select(id: SkillId | null): void {
    if (this.state !== 'player') return;
    if (id && !this.canUse(this.active, id)) return;
    this.selected = this.selected === id ? null : id;
    if (!this.selected || !SKILLS[this.selected].overcharge) this.overcharge = false;
    this.hud.render();
  }

  toggleOvercharge(): void {
    if (this.selected && SKILLS[this.selected].overcharge) {
      this.overcharge = !this.overcharge;
      this.hud.render();
    }
  }

  private onKey(k: string): void {
    const n = Number(k);
    if (n >= 1 && n <= 4) {
      const id = this.skillsOf(this.active)[n - 1];
      if (id) this.select(id);
    } else if (k === 'o') this.toggleOvercharge();
    else if (k === 'Escape') this.select(null);
    else if (k === ' ' || k === 'Enter') this.endTurn();
  }

  /** Is (x, y) a valid target for the selected skill? */
  validTarget(id: SkillId, x: number, y: number): boolean {
    const u = this.active;
    const def = SKILLS[id];
    const tu = this.unitAt(x, y);
    const d = unitDist(u, { x, y, size: tu?.size ?? 1 });
    if (def.target === 'enemy') {
      if (!tu || tu.team !== 'enemy') return false;
      if (id === 'unbind' && !tu.seal) return false;
      return unitDist(u, tu) <= this.rangeOf(u, id, tu.x, tu.y);
    }
    if (def.target === 'ally') return !!tu && tu.team === 'hero' && unitDist(u, tu) <= def.range;
    if (def.target === 'emptyTile') return !tu && this.canStand(u, x, y) && d <= def.range;
    return inRect(this.enc.region, x, y) && this.world.walkable(x, y) && unitDist(u, { x, y, size: 1 }) <= this.rangeOf(u, id, x, y);
  }

  private async onClick(x: number, y: number): Promise<void> {
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
    const k = this.key(x, y);
    const d = this.reach.dist.get(k);
    if (d === undefined || d === 0) return;
    const cost = this.moveCost(u, d);
    if (cost > u.ap) return;
    this.state = 'busy';
    this.hud.render();
    const path = this.pathTo(this.reach, u, x, y);
    u.ap -= cost;
    u.moveLeft = u.moveLeft + cost * u.speed - d;
    await this.moveAlong(u, path);
    this.afterAction();
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

  /** Run an overcharge question; true if answered correctly. */
  private async overchargeQuestion(id: SkillId): Promise<boolean> {
    const oc = SKILLS[id].overcharge!;
    const p = generate(oc.topic, level(oc.topic));
    const r = await ask(p, {
      title: t('combat.ocTitle', { skill: t(`skills.${id}.name`) }),
      tag: t('skills.overcharge'),
      seconds: oc.timed ? timerSeconds(8) : 0,
      quick: true,
    });
    if (r.correct) this.refreshed.add(id);
    return r.correct;
  }

  async useSkill(id: SkillId, x: number, y: number): Promise<void> {
    const u = this.active;
    const def = SKILLS[id];
    if (!this.canUse(u, id)) return;
    const target = this.unitAt(x, y);
    this.state = 'busy';
    this.selected = null;
    this.hud.render();
    u.ap -= def.ap;
    if (def.cooldown) u.cooldowns[id] = def.cooldown;
    const oc = this.overcharge && !!def.overcharge;
    this.overcharge = false;
    const mult = def.basic ? 1 : attuneMult(id);
    const hiddenMult = () => {
      if (u.hidden) {
        u.hidden = false;
        return 1.5;
      }
      return 1;
    };
    const sname = t(`skills.${id}.name`);
    this.addLog(t('combat.uses', { name: this.name(u), skill: sname }));

    switch (id) {
      case 'strike': {
        this.damage(target!, rand(6, 8) * hiddenMult(), u);
        break;
      }
      case 'flurry': {
        let hits = 2;
        if (oc) {
          for (let i = 0; i < 4; i++) {
            if (!(await this.overchargeQuestion(id))) break;
            hits++;
          }
          this.addLog(t('combat.combo', { n: hits }));
        }
        const hm = hiddenMult();
        for (let i = 0; i < hits && !target!.dead; i++) {
          this.damage(target!, 4 * mult * hm, u);
          await wait(160);
        }
        break;
      }
      case 'shadowStep': {
        const good = oc ? await this.overchargeQuestion(id) : false;
        u.x = x;
        u.y = y;
        u.px = x * TILE;
        u.py = y * TILE;
        u.moveLeft = 0;
        this.float(u, t('combat.stepFloat'), '#94b0c2');
        if (good) {
          u.hidden = true;
          this.float(u, t('combat.hiddenFloat'), '#ffcd75', 10);
        }
        break;
      }
      case 'probe': {
        if (target!.seal) {
          const res = await probeSeal(target!.seal, target!.probeLog);
          if (res.shattered) this.breakSeal(target!);
        }
        this.damage(target!, 5 * mult * hiddenMult(), u);
        break;
      }
      case 'bolt': {
        await this.shoot(u, target!, '#73eff7');
        this.damage(target!, rand(5, 7), u);
        break;
      }
      case 'fireball': {
        const good = oc ? await this.overchargeQuestion(id) : false;
        await this.shoot(u, { x, y }, '#ef7d57');
        const dmg = 9 * mult * (good ? 1.5 : 1);
        const hit = new Set<Unit>();
        for (let dy = -def.area; dy <= def.area; dy++) {
          for (let dx = -def.area; dx <= def.area; dx++) {
            const tx = x + dx;
            const ty = y + dy;
            if (!inRect(this.enc.region, tx, ty) || !this.world.walkable(tx, ty)) continue;
            this.fire.set(this.key(tx, ty), FIRE_TURNS);
            const tu = this.unitAt(tx, ty);
            if (tu) hit.add(tu);
          }
        }
        for (const tu of hit) this.damage(tu, dmg, u);
        break;
      }
      case 'mend': {
        const good = oc ? await this.overchargeQuestion(id) : false;
        this.heal(target!, (good ? 16 : 10) * mult);
        break;
      }
      case 'unbind': {
        if (target!.seal) {
          const ok = await unbindSeal(target!.seal);
          if (ok) this.breakSeal(target!);
          else {
            this.float(target!, t('combat.holdsFloat'), '#73eff7');
            this.addLog(t('combat.sealHolds'));
          }
        }
        break;
      }
    }
    this.afterAction();
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

  // ---------- enemy AI ----------

  private async runAI(u: Unit): Promise<void> {
    await wait(450);
    const attacks = ENEMY_ATTACKS[u.kind as 'slime' | 'golem'];
    for (let guard = 0; guard < 6 && this.state !== 'over'; guard++) {
      const heroes = this.alive('hero');
      if (!heroes.length) return;
      // attack if possible
      let acted = false;
      for (const atk of attacks) {
        if (u.ap < atk.ap) continue;
        const targets = heroes
          .filter((h) => {
            const d = unitDist(u, h);
            const range = atk.range > 1 && this.elevation(u, h) > 0 ? atk.range + 1 : atk.range;
            return d <= range && d >= atk.minRange;
          })
          .sort((a, b) => a.hp - b.hp);
        if (!targets.length) continue;
        const tgt = targets[0];
        u.ap -= atk.ap;
        this.addLog(t('combat.enemyAttack', { name: this.name(u), attack: t(`combat.attacks.${atk.id}`), target: this.name(tgt) }));
        if (atk.range > 1) await this.shoot(u, tgt, '#94b0c2');
        else {
          u.flash = 0.15;
          await wait(250);
        }
        this.damage(tgt, rand(atk.min, atk.max), u);
        if (this.checkEnd()) return;
        await wait(400);
        acted = true;
        break;
      }
      if (acted) continue;
      // move closer
      if (u.ap <= 0 && u.moveLeft <= 0) return;
      const reach = this.reachable(u, this.maxTiles(u));
      let best: { k: number; score: number; cost: number } | null = null;
      const curScore = Math.min(...heroes.map((h) => unitDist(u, h)));
      for (const [k, d] of reach.dist) {
        const cost = this.moveCost(u, d);
        if (cost > u.ap) continue;
        const x = k % this.world.w;
        const y = Math.floor(k / this.world.w);
        const score = Math.min(...heroes.map((h) => unitDist({ x, y, size: u.size }, h)));
        if (!best || score < best.score || (score === best.score && cost < best.cost)) best = { k, score, cost };
      }
      if (!best || best.score >= curScore) return;
      const x = best.k % this.world.w;
      const y = Math.floor(best.k / this.world.w);
      const d = reach.dist.get(best.k)!;
      u.ap -= best.cost;
      u.moveLeft = u.moveLeft + best.cost * u.speed - d;
      await this.moveAlong(u, this.pathTo(reach, u, x, y));
      await wait(150);
    }
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
        if (unit.seal) r.text(fmtSeal(unit.seal), c.x, top - 7, { size: 20, color: '#73eff7', bold: true });
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
