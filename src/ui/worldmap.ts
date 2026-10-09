import { PALETTE as P, spriteUrl } from '../art/sprites';
import { CAMPAIGNS } from '../campaigns/registry';
import type { CampaignId } from '../data';
import { t } from '../i18n';
import { journey, land, LANDS, recommended, ROADS, type Land, type LandId } from '../journey';
import { freshGame } from '../state';
import { h, img, uiRoot, wait } from './dom';

export const MAP_W = 192;
export const MAP_H = 112;

/** Ground colours per land, so each region reads as its own place. */
const BIOME: Record<LandId, { grass: string; dark: string }> = {
  numerola: { grass: '#38b764', dark: '#2a8a52' },
  eigenvale: { grass: '#3fa69a', dark: '#257179' },
  chancewood: { grass: '#2a8a52', dark: '#1e5e3c' },
  fluxreach: { grass: '#d9b06a', dark: '#b08440' },
  bitforge: { grass: '#7d8ea3', dark: '#566c86' },
  forcehold: { grass: '#9a5a44', dark: '#6e3a2c' },
};

function rng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

/** Distance from p to the segment a–b. */
function segDist(px: number, py: number, a: Land, b: Land): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const k = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (a.x + k * dx), py - (a.y + k * dy));
}

/** Cheap smooth noise from a few sine waves (deterministic). */
const noise = (x: number, y: number) => Math.sin(x * 0.21 + Math.sin(y * 0.13) * 2) * 0.5 + Math.sin(y * 0.27 + x * 0.05) * 0.35 + Math.sin((x + y) * 0.41) * 0.15;

/** Draw the pixel-art map of the known lands (192 × 112, scaled up with CSS). */
export function drawWorld(frame = 0): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = MAP_W;
  cv.height = MAP_H;
  const ctx = cv.getContext('2d')!;
  const px = (c: string, x: number, y: number, w = 1, hh = 1) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, hh);
  };
  // which pixels are land, and whose
  const owner: Array<LandId | null> = new Array(MAP_W * MAP_H).fill(null);
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      let best: LandId | null = null;
      let bestV = 0;
      for (const l of LANDS) {
        const v = 1 - Math.hypot(x - l.x, (y - l.y) * 1.25) / 30 + noise(x, y) * 0.18;
        if (v > bestV) {
          bestV = v;
          best = l.id;
        }
      }
      // land bridges along the roads
      if (!best) {
        for (const [a, b] of ROADS) {
          if (segDist(x, y, land(a), land(b)) < 7 + noise(x * 1.7, y * 1.3) * 3) best = Math.hypot(x - land(a).x, y - land(a).y) < Math.hypot(x - land(b).x, y - land(b).y) ? a : b;
        }
      }
      owner[y * MAP_W + x] = best;
    }
  }
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H ? null : owner[y * MAP_W + x]);
  const r = rng(77);
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const o = at(x, y);
      if (!o) {
        const nearShore = [-2, -1, 1, 2].some((d) => at(x + d, y) || at(x, y + d));
        px(nearShore ? '#29366f' : '#1d2b53', x, y);
        continue;
      }
      const shore = !at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1);
      const b = BIOME[o];
      px(shore ? '#e4c88a' : (x * 3 + y * 5) % 7 === 0 || noise(x * 2, y * 2) > 0.7 ? b.dark : b.grass, x, y);
    }
  }
  // waves
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(r() * MAP_W);
    const y = Math.floor(r() * MAP_H);
    if (!at(x, y) && !at(x + 2, y)) px((i + frame) % 3 ? '#3b5dc9' : '#41a6f6', x, y, 3, 1);
  }
  // decorations per land
  for (let i = 0; i < 900; i++) {
    const x = Math.floor(r() * MAP_W);
    const y = Math.floor(r() * MAP_H);
    const o = at(x, y);
    if (!o || !at(x - 2, y) || !at(x + 2, y) || !at(x, y + 2) || !at(x, y - 2)) continue;
    const l = land(o);
    if (Math.hypot(x - l.x, y - l.y) < 8) continue; // keep the town marker clear
    if ((o === 'numerola' || o === 'chancewood') && r() < 0.25) {
      px(P.k, x, y + 1, 3, 2);
      px(o === 'chancewood' ? '#1e5e3c' : P.G, x, y, 3, 2);
      px(P.l, x, y, 1, 1);
    } else if (o === 'eigenvale' && r() < 0.08) {
      px(P.i, x, y, 1, 2);
      px(P.c, x + 1, y + 1, 1, 1);
    } else if (o === 'fluxreach' && r() < 0.1) {
      px('#f0d090', x, y, 4, 1);
    } else if (o === 'bitforge' && r() < 0.06) {
      px(P.f, x, y, 2, 2);
      px(P.s, x, y, 1, 1);
    } else if (o === 'forcehold' && r() < 0.06) {
      px(P.o, x, y, 1, 1);
    }
  }
  // the mountains between Numerola and Eigenvale ("beyond the mountains…"), with a pass for the road
  const ridge = (cx: number, cy: number) => {
    for (let i = 0; i < 4; i++) px(P.m, cx - i, cy + i, i * 2 + 1, 1);
    px(P.w, cx, cy, 1, 1);
    px(P.f, cx - 3, cy + 4, 7, 1);
  };
  for (let k = -3; k <= 3; k++) {
    if (k === 0) continue;
    ridge(70 + k * 5, 58 + k * 4);
  }
  // a volcano in Forcehold
  const fh = land('forcehold');
  for (let i = 0; i < 5; i++) px('#6e3a2c', fh.x + 8 - i, fh.y - 8 + i, i * 2 + 1, 1);
  px(P.o, fh.x + 8, fh.y - 9, 1, 1);
  // roads: dashed tan lines
  for (const [a, b] of ROADS) {
    const A = land(a);
    const B = land(b);
    const n = Math.ceil(Math.hypot(B.x - A.x, B.y - A.y));
    for (let i = 0; i <= n; i++) {
      if (i % 4 > 1) continue;
      const x = Math.round(A.x + ((B.x - A.x) * i) / n);
      const y = Math.round(A.y + ((B.y - A.y) * i) / n);
      if (at(x, y)) px('#c79a62', x, y, 1, 1);
      else px('#94b0c2', x, y, 1, 1); // a ferry route over water
    }
  }
  // town markers
  for (const l of LANDS) {
    const open = !!l.campaign;
    const roof = open ? P.r : P.m;
    px(P.k, l.x - 4, l.y - 3, 9, 7);
    px(open ? P.e : P.s, l.x - 3, l.y, 7, 3);
    px(roof, l.x - 3, l.y - 2, 7, 2);
    px(roof, l.x - 2, l.y - 3, 5, 1);
    px(P.U, l.x, l.y + 1, 1, 2);
    if (journey.cleared.has(l.id as CampaignId)) {
      px(P.y, l.x + 3, l.y - 6, 1, 3);
      px(P.y, l.x + 4, l.y - 6, 2, 1);
    }
  }
  // fog over lands that are coming later
  for (const l of LANDS) {
    if (l.campaign) continue;
    for (let y = l.y - 16; y < l.y + 14; y++) {
      for (let x = l.x - 22; x < l.x + 22; x++) {
        if (Math.hypot((x - l.x) / 22, (y - l.y) / 15) > 1) continue;
        if ((x + y) % 2 === 0) px('rgba(220,228,240,0.45)', x, y, 1, 1);
      }
    }
  }
  return cv;
}

type Status = 'cleared' | 'here' | 'open' | 'early' | 'later';

function status(l: Land): Status {
  if (!l.campaign) return 'later';
  if (journey.cleared.has(l.campaign)) return 'cleared';
  if (journey.current === l.campaign) return 'here';
  return recommended(l) ? 'open' : 'early';
}

/**
 * The overview map: pick a land and travel there. Resolves with the chosen
 * campaign, or null when the player closes the map (only offered when they
 * are already in a land).
 */
export function worldMap(canClose: boolean): Promise<CampaignId | null> {
  return new Promise((resolve) => {
    const el = h('div.worldmap');
    const stage = h('div.wm-stage');
    let canvas = drawWorld();
    canvas.className = 'wm-canvas';
    stage.append(canvas);
    const here = journey.current ? land(journey.current) : land('numerola');
    const party = img(spriteUrl('kai', 3), 'px wm-party');
    const place = (node: HTMLElement, l: Land) => {
      node.style.left = `${(l.x / MAP_W) * 100}%`;
      node.style.top = `${(l.y / MAP_H) * 100}%`;
    };
    place(party, here);
    const card = h('div.wm-card.panel');
    let selected: Land = journey.current ? here : (LANDS.find((l) => status(l) === 'open') ?? here);
    let busy = false;

    const finish = (v: CampaignId | null) => {
      window.removeEventListener('keydown', onKey, true);
      clearInterval(waves);
      el.remove();
      resolve(v);
    };

    const travel = async (l: Land) => {
      if (busy || !l.campaign) return;
      busy = true;
      if (journey.current !== l.campaign) {
        party.classList.add('moving');
        place(party, l);
        await wait(1300);
      }
      finish(l.campaign);
    };

    const markers = LANDS.map((l) => {
      const b = h(`button.wm-marker.${status(l)}`, { onclick: () => select(l), 'aria-label': t(`campaigns.${l.id}.name`) }, [h('span.wm-label', { text: t(`campaigns.${l.id}.name`) })]);
      place(b, l);
      stage.append(b);
      return { l, b };
    });
    stage.append(party);

    const select = (l: Land) => {
      selected = l;
      for (const m of markers) m.b.classList.toggle('selected', m.l === l);
      renderCard();
    };

    const renderCard = () => {
      const l = selected;
      const st = status(l);
      const parts: Array<HTMLElement | null> = [
        l.sprites.length ? h('div.camp-sprites', {}, l.sprites.map((sp) => img(spriteUrl(sp, sp === 'golem' || sp === 'warden' ? 2 : 3)))) : null,
        h('h2', { text: t(`campaigns.${l.id}.name`) }),
        h('div.camp-tier', { text: t(`campaigns.${l.id}.tier`) }),
        h('p', { text: t(`campaigns.${l.id}.desc`) }),
        h('div.wm-status', { text: st === 'cleared' && journey.current === l.campaign ? `${t('worldmap.status.cleared')} · ${t('worldmap.status.here')}` : t(`worldmap.status.${st}`) }),
      ];
      if (l.campaign) {
        const saved = journey.sessions.get(l.campaign)?.state ?? freshGame(l.campaign);
        const stages = CAMPAIGNS[l.campaign].stages(saved);
        parts.push(
          h(
            'ol.wm-stages',
            {},
            stages.map((s, i) => h(`li${s.done ? '.good' : ''}`, { text: `${s.done ? '✔' : '○'} ${s.boss ? t('worldmap.boss') : t('worldmap.stage', { n: i + 1 })}: ${t(s.name)}` })),
          ),
        );
        const here = journey.current === l.campaign;
        const go = h('button.primary', { text: here ? t('worldmap.stay') : t('worldmap.travel'), onclick: () => void travel(l) });
        if (st === 'early') {
          const need = l.after.map((a) => t(`campaigns.${a}.name`)).join(', ');
          parts.push(h('p.muted', { text: t('worldmap.earlyNote', { lands: need }) }));
          go.textContent = t('worldmap.travelAnyway');
          go.className = '';
        }
        parts.push(h('div.row', {}, [h('div.spacer'), go]));
        requestAnimationFrame(() => go.focus());
      } else {
        parts.push(h('p.muted', { text: t('worldmap.laterNote') }));
      }
      card.replaceChildren(...parts.filter((p): p is HTMLElement => !!p));
    };

    const header = h('div.wm-head', {}, [
      h('div', {}, [h('h1', { text: t('worldmap.title') }), h('div.muted', { text: t(journey.current ? 'worldmap.subtitle' : 'worldmap.subtitleNew') })]),
      h('div.spacer'),
      canClose ? h('button', { text: t('worldmap.close'), onclick: () => finish(null) }) : null,
    ]);
    el.append(header, h('div.wm-body', {}, [stage, card]));
    uiRoot().append(el);
    select(selected);

    // gently animate the waves
    const waves = setInterval(() => {
      const next = drawWorld(Math.floor(performance.now() / 600));
      next.className = 'wm-canvas';
      canvas.replaceWith(next);
      canvas = next;
    }, 1200);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && canClose) {
        e.preventDefault();
        finish(null);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const i = LANDS.indexOf(selected);
        select(LANDS[(i + (e.key === 'ArrowRight' ? 1 : LANDS.length - 1)) % LANDS.length]);
      }
    };
    window.addEventListener('keydown', onKey, true);
  });
}
