import { spriteUrl } from '../art/sprites';
import { skillTooltip } from '../combat/hud';
import { HERO_SKILLS, HEROES, ITEMS, type HeroId, type ItemId } from '../data';
import { getLang, LANGS, setLang, t, type Lang } from '../i18n';
import { summary } from '../math/mastery';
import { game, setTimers, settings, type TimerMode } from '../state';
import { objective, sideObjective } from '../story/story';
import { checkTutor, tutorStatus } from '../tutor/client';
import { FIELD_SEEDS } from './farm';
import { h, hudRoot, img, openModal, uiRoot } from './dom';

// ---------- exploration HUD ----------

export function renderExploreHud(prompt: string | null, onButton: (b: 'quests' | 'skills' | 'bag' | 'menu') => void): void {
  const party = h(
    'div.hud-party',
    {},
    (['kai', 'aino'] as HeroId[]).map((id) =>
      h('div.hud-member', {}, [
        img(spriteUrl(id, 2)),
        h('div.col', { style: 'gap:0.1em' }, [
          h('div', { text: `${t(`chars.${id}`)} · ${t(`classes.${id}`)}` }),
          h('div.bar', {}, [h('div', { style: 'width:100%' })]),
          h('div.muted', { text: `${t('combat.hp')} ${HEROES[id].hp}/${HEROES[id].hp}`, style: 'font-size:0.75em' }),
        ]),
      ]),
    ),
  );
  const btn = (b: 'quests' | 'skills' | 'bag' | 'menu', key: string) => h('button', { text: `${t(`hud.${b}`)} (${key})`, onclick: () => onButton(b) });
  const right = h('div.hud-top-right', {}, [h('div.hud-gold', { text: t('common.gold', { n: game.gold }) }), btn('quests', 'Q'), btn('skills', 'K'), btn('bag', 'I'), btn('menu', 'Esc')]);
  const side = sideObjective();
  const obj = h('div.hud-objective', {}, [h('div.accent', { text: t('hud.objective') }), h('div', { text: objective() }), side ? h('div.muted', { text: `${t('hud.side')}: ${side}`, style: 'margin-top:0.3em' }) : null]);
  hudRoot().replaceChildren(party, right, obj, prompt ? h('div.hud-prompt', { text: prompt }) : h('span'));
}

export function clearHud(): void {
  hudRoot().replaceChildren();
}

// ---------- screens ----------

function screen(title: string, body: HTMLElement[], extraButtons: HTMLElement[] = []): Promise<void> {
  return new Promise((resolve) => {
    const close = h('button.primary', { text: t('common.close') });
    const content = h('div.col', { style: 'min-width:34em' }, [h('h2', { text: title }), ...body, h('div.row', {}, [...extraButtons, h('div.spacer'), close])]);
    const modal = openModal(content);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        done();
      }
    };
    const done = () => {
      window.removeEventListener('keydown', onKey, true);
      modal.close();
      resolve();
    };
    close.addEventListener('click', done);
    window.addEventListener('keydown', onKey, true);
    requestAnimationFrame(() => close.focus());
  });
}

export function skillsScreen(): Promise<void> {
  const cols = (['kai', 'aino'] as HeroId[]).map((hero) =>
    h('div.col', { style: 'flex:1' }, [
      h('div.row', {}, [img(spriteUrl(hero, 3)), h('div', {}, [h('h3', { text: `${t(`chars.${hero}`)} — ${t(`classes.${hero}`)}`, style: 'margin:0' }), h('div.muted', { text: t(`classes.${hero}Desc`), style: 'font-size:0.85em' })])]),
      h('div.list', {}, HERO_SKILLS[hero].map((id) => h(`div.item${game.learned.has(id) ? '' : '.muted'}`, {}, [skillTooltip(id)]))),
    ]),
  );
  return screen(t('menu.skills'), [h('p.muted', { text: t('menu.skillsHelp') }), h('div.row', { style: 'align-items:flex-start' }, cols)]);
}

export function bagScreen(): Promise<void> {
  const items = (Object.keys(ITEMS) as ItemId[]).map((id) =>
    h('div.item', {}, [h('div.grow', {}, [h('div', { text: t(`items.${id}.name`) }), h('div.desc', { text: t(`items.${id}.desc`) })]), h('b', { text: `×${game.inv[id]}` })]),
  );
  return screen(t('menu.bag'), [h('div.hud-gold', { text: t('common.gold', { n: game.gold }), style: 'align-self:flex-start' }), h('div.list', {}, items)]);
}

export function questsScreen(): Promise<void> {
  const f = game.flags;
  const step = (done: boolean, text: string) => h(`div${done ? '.good' : ''}`, { text: `${done ? '✔' : '○'} ${text}` });
  const main = h('div.col', {}, [
    h('h3', { text: t('quests.main.title') }),
    h('p.muted', { text: t('quests.main.desc') }),
    step(f.metElder, t('quests.main.s1')),
    step(game.learned.has('probe') || game.learned.has('unbind'), t('quests.main.s2')),
    step(f.gateOpen, t('quests.main.s3')),
    step(f.golemDone, t('quests.main.s4')),
  ]);
  const farm =
    f.farmStage > 0
      ? h('div.col', {}, [
          h('h3', { text: t('quests.farm.title') }),
          h('p.muted', { text: t('quests.farm.desc') }),
          step(f.farmStage >= 2, t('quests.farm.s1')),
          step(f.farmStage >= 3, t('quests.farm.s2')),
          step(f.farmStage >= 4 || game.inv.seeds * 10 >= FIELD_SEEDS, t('quests.farm.s3')),
          step(f.farmStage >= 4, t('quests.farm.s4')),
        ])
      : null;
  return screen(t('menu.quests'), [main, farm ?? h('p.muted', { text: t('quests.none') })]);
}

function langButtons(onChange?: () => void): HTMLElement {
  const row = h('div.row.lang-switch');
  const render = () =>
    row.replaceChildren(
      ...LANGS.map((l: Lang) =>
        h(`button${getLang() === l ? '.on' : ''}`, {
          text: t(`langs.${l}`),
          onclick: () => {
            setLang(l);
            render();
            onChange?.();
          },
        }),
      ),
    );
  render();
  return row;
}

export function settingsScreen(onChange: () => void): Promise<void> {
  const timerRow = h('div.row.lang-switch');
  const modes: TimerMode[] = ['normal', 'relaxed', 'off'];
  const renderTimers = () =>
    timerRow.replaceChildren(
      ...modes.map((m) =>
        h(`button${settings.timers === m ? '.on' : ''}`, {
          text: t(`settings.timers.${m}`),
          onclick: () => {
            setTimers(m);
            renderTimers();
          },
        }),
      ),
    );
  renderTimers();
  const tutorLine = h('p');
  const renderTutor = () => {
    const st = tutorStatus();
    tutorLine.className = st.online ? 'good' : 'muted';
    tutorLine.textContent = st.online ? t('settings.tutorOnline', { provider: st.provider ?? '?' }) : t('settings.tutorOffline');
  };
  renderTutor();
  void checkTutor().then(renderTutor);
  const checkBtn = h('button', { text: t('settings.tutorCheck'), onclick: () => void checkTutor().then(renderTutor) });
  return screen(t('menu.settings'), [
    h('h3', { text: t('settings.language') }),
    langButtons(onChange),
    h('h3', { text: t('settings.timersTitle') }),
    h('p.muted', { text: t('settings.timersHelp') }),
    timerRow,
    h('h3', { text: t('settings.tutorTitle') }),
    h('div.row', {}, [tutorLine, checkBtn]),
    h('p.muted', { text: t('settings.tutorHelp') }),
  ]);
}

export function helpScreen(): Promise<void> {
  const keys = ['move', 'talk', 'menu', 'combat1', 'combat2', 'combat3', 'combat4', 'combat5', 'learn1', 'learn2', 'learn3', 'tutor'];
  return screen(t('help.title'), keys.map((k) => h('p', { text: t(`help.${k}`) })));
}

export function pauseMenu(onChange: () => void, onTitle: () => void): Promise<void> {
  return new Promise((resolve) => {
    const content = h('div.col', { style: 'min-width:16em' }, [h('h2', { text: t('menu.title') })]);
    const modal = openModal(content);
    const close = () => {
      window.removeEventListener('keydown', onKey, true);
      modal.close();
      resolve();
    };
    const then = (fn: () => Promise<void>) => async () => {
      close();
      await fn();
    };
    const items: Array<[string, () => void]> = [
      ['menu.resume', close],
      ['menu.quests', then(questsScreen)],
      ['menu.skills', then(skillsScreen)],
      ['menu.bag', then(bagScreen)],
      ['menu.settings', then(() => settingsScreen(onChange))],
      ['menu.help', then(helpScreen)],
      [
        'menu.toTitle',
        () => {
          close();
          onTitle();
        },
      ],
    ];
    for (const [k, fn] of items) content.append(h('button', { text: t(k), onclick: fn }));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener('keydown', onKey, true);
    requestAnimationFrame(() => content.querySelector('button')?.focus());
  });
}

// ---------- title & ending ----------

export function titleScreen(onNew: (dev: boolean) => void): void {
  const el = h('div.title-screen');
  const render = () => {
    el.replaceChildren(
      h('div.sprites', {}, [img(spriteUrl('kai', 5)), img(spriteUrl('golem', 3)), img(spriteUrl('aino', 5))]),
      h('h1', { text: t('meta.title') }),
      h('div.subtitle', { text: t('meta.subtitle') }),
      h('div.menu', {}, [
        h('button.primary', {
          text: t('title.newGame'),
          onclick: () => {
            el.remove();
            onNew(false);
          },
        }),
        h('button', { text: t('title.help'), onclick: () => void helpScreen() }),
        langButtons(render),
      ]),
      h('p.muted', { text: t('title.tagline'), style: 'margin-top:1.5em' }),
    );
    requestAnimationFrame(() => el.querySelector<HTMLElement>('button.primary')?.focus());
  };
  render();
  uiRoot().append(el);
}

export function introSlides(): Promise<void> {
  return new Promise((resolve) => {
    const slides = ['intro.p1', 'intro.p2', 'intro.p3'];
    let i = 0;
    const content = h('div.col', { style: 'max-width:36em' });
    const modal = openModal(content);
    const render = () => {
      const last = i === slides.length - 1;
      const btn = h('button.primary', {
        text: last ? t('intro.start') : t('common.next'),
        onclick: () => {
          if (last) {
            modal.close();
            resolve();
          } else {
            i++;
            render();
          }
        },
      });
      content.replaceChildren(h('h2', { text: t('meta.title') }), h('p', { text: t(slides[i]), style: 'font-size:1.2em' }), h('div.row', {}, [h('span.muted', { text: `${i + 1}/${slides.length}` }), h('div.spacer'), btn]));
      requestAnimationFrame(() => btn.focus());
    };
    render();
  });
}

export function endingScreen(onTitle: () => void): void {
  const s = summary();
  const pct = s.attempts ? Math.round((100 * s.correct) / s.attempts) : 0;
  const approaches = [...game.approaches].map((a) => t(`farm.approach.${a}`)).join(', ') || '—';
  const content = h('div.col.ending', { style: 'max-width:38em' }, [
    h('h1', { text: t('ending.title') }),
    h('p', { text: t('ending.p1') }),
    h('p', { text: t('ending.p2') }),
    h('div.stats.panel', {}, [
      h('p', { text: t('ending.solved', { n: s.correct, total: s.attempts, pct }) }),
      h('p', { text: t('ending.skills', { n: game.learned.size }) }),
      h('p', { text: t('ending.farm', { result: game.flags.farmResult ? t(`ending.farmResult.${game.flags.farmResult}`) : t('ending.farmResult.none') }) }),
      h('p', { text: t('ending.approaches', { list: approaches }) }),
    ]),
    h('p.muted', { text: t('ending.thanks') }),
  ]);
  const modal = openModal(content);
  content.append(
    h('div.row', {}, [
      h('div.spacer'),
      h('button.primary', {
        text: t('menu.toTitle'),
        onclick: () => {
          modal.close();
          onTitle();
        },
      }),
    ]),
  );
}
