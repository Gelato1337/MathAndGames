import { spriteUrl } from '../art/sprites';
import { skillTooltip } from '../combat/hud';
import { campaign } from '../campaigns/registry';
import { HEROES, ITEMS, PARTY_SKILLS, type ItemId } from '../data';
import { getLang, LANGS, setLang, t, type Lang } from '../i18n';
import { summary } from '../math/mastery';
import { game, setTimers, settings, type TimerMode } from '../state';
import { checkTutor, tutorStatus } from '../tutor/client';
import { notebookPanel } from './notebook';
import { h, hudRoot, img, openModal, uiRoot } from './dom';

// ---------- exploration HUD ----------

type HudButton = 'quests' | 'skills' | 'bag' | 'notebook' | 'menu';

export function renderExploreHud(prompt: string | null, onButton: (b: HudButton) => void): void {
  const party = h(
    'div.hud-party',
    {},
    campaign().party.map((id) =>
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
  const btn = (b: HudButton, key: string) => h('button', { text: `${t(`hud.${b}`)} (${key})`, onclick: () => onButton(b) });
  const right = h('div.hud-top-right', {}, [h('div.hud-gold', { text: t('common.gold', { n: game.gold }) }), btn('quests', 'Q'), btn('skills', 'K'), btn('notebook', 'N'), btn('bag', 'I'), btn('menu', 'Esc')]);
  const side = campaign().sideObjective();
  const obj = h('div.hud-objective', {}, [h('div.accent', { text: t('hud.objective') }), h('div', { text: campaign().objective() }), side ? h('div.muted', { text: `${t('hud.side')}: ${side}`, style: 'margin-top:0.3em' }) : null]);
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
  const cols = campaign().party.map((hero) =>
    h('div.col', { style: 'flex:1' }, [
      h('div.row', {}, [img(spriteUrl(hero, 3)), h('div', {}, [h('h3', { text: `${t(`chars.${hero}`)} — ${t(`classes.${hero}`)}`, style: 'margin:0' }), h('div.muted', { text: t(`classes.${hero}Desc`), style: 'font-size:0.85em' })])]),
      h('div.list', {}, (PARTY_SKILLS[game.campaign][hero] ?? []).map((id) => h(`div.item${game.learned.has(id) ? '' : '.muted'}`, {}, [skillTooltip(id)]))),
    ]),
  );
  return screen(t('menu.skills'), [h('p.muted', { text: t('menu.skillsHelp') }), h('div.skill-cols', {}, cols)]);
}

export function bagScreen(): Promise<void> {
  const items = (Object.keys(ITEMS) as ItemId[]).map((id) =>
    h('div.item', {}, [h('div.grow', {}, [h('div', { text: t(`items.${id}.name`) }), h('div.desc', { text: t(`items.${id}.desc`) })]), h('b', { text: `×${game.inv[id]}` })]),
  );
  return screen(t('menu.bag'), [h('div.hud-gold', { text: t('common.gold', { n: game.gold }), style: 'align-self:flex-start' }), h('div.list', {}, items)]);
}

export function questsScreen(): Promise<void> {
  return screen(t('menu.quests'), campaign().quests());
}

export function notebookScreen(): Promise<void> {
  return screen(t('notebook.title'), [notebookPanel()]);
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
  const keys = ['move', 'talk', 'menu', 'combat1', 'combat2', 'combat3', 'combat4', 'combat5', 'combat6', 'learn1', 'learn2', 'learn3', 'notebook', 'tutor'];
  return screen(t('help.title'), keys.map((k) => h('p', { text: t(`help.${k}`) })));
}

export function pauseMenu(onChange: () => void, onTitle: () => void, onWorldMap: () => void): Promise<void> {
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
      ['notebook.title', then(notebookScreen)],
      ['menu.settings', then(() => settingsScreen(onChange))],
      ['menu.help', then(helpScreen)],
      [
        'menu.worldMap',
        () => {
          close();
          onWorldMap();
        },
      ],
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

/** Title: start a new journey or continue on the world map. */
export function titleScreen(opts: { onNew: () => void; onContinue: (() => void) | null }): void {
  const el = h('div.title-screen');
  const render = () => {
    const start = h('button.primary.big', {
      text: t('title.newJourney'),
      onclick: () => {
        el.remove();
        opts.onNew();
      },
    });
    const cont = opts.onContinue
      ? h('button.big', {
          text: t('title.continue'),
          onclick: () => {
            el.remove();
            opts.onContinue!();
          },
        })
      : null;
    el.replaceChildren(
      h('h1', { text: t('meta.title') }),
      h('div.subtitle', { text: t('title.tagline') }),
      h('div.camp-sprites.title-sprites', {}, ['kai', 'aino', 'sana', 'otso'].map((sp) => img(spriteUrl(sp, 4)))),
      h('div.col.title-buttons', {}, [cont, start].filter(Boolean) as HTMLElement[]),
      h('div.row', { style: 'justify-content:center' }, [h('button', { text: t('title.help'), onclick: () => void helpScreen() }), langButtons(render)]),
      h('p.muted', { text: t('title.journeyNote'), style: 'margin-top:1em' }),
    );
    requestAnimationFrame(() => el.querySelector<HTMLElement>('.title-buttons button')?.focus());
  };
  render();
  uiRoot().append(el);
}

export function introSlides(slides: string[]): Promise<void> {
  return new Promise((resolve) => {
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
      content.replaceChildren(h('h2', { text: t(`campaigns.${game.campaign}.name`) }), h('p', { text: t(slides[i]), style: 'font-size:1.2em' }), h('div.row', {}, [h('span.muted', { text: `${i + 1}/${slides.length}` }), h('div.spacer'), btn]));
      requestAnimationFrame(() => btn.focus());
    };
    render();
  });
}

/** Ending: the campaign's own lines (first one is the title), then shared stats. */
export function endingScreen(lines: string[], onTitle: () => void, onTravel: () => void): void {
  const s = summary();
  const pct = s.attempts ? Math.round((100 * s.correct) / s.attempts) : 0;
  const total = Object.values(PARTY_SKILLS[game.campaign]).reduce((n, l) => n + (l?.length ?? 0), 0);
  const [title, ...rest] = lines;
  const content = h('div.col.ending', { style: 'max-width:38em' }, [
    h('h1', { text: title }),
    ...rest.slice(0, 2).map((l) => h('p', { text: l })),
    h('div.stats.panel', {}, [
      h('p', { text: t('ending.solved', { n: s.correct, total: s.attempts, pct }) }),
      h('p', { text: t('ending.skills', { n: game.learned.size, total }) }),
      ...rest.slice(2).map((l) => h('p', { text: l })),
    ]),
    h('p.muted', { text: t('ending.thanks') }),
  ]);
  const modal = openModal(content);
  content.append(
    h('div.row', {}, [
      h('button', {
        text: t('menu.toTitle'),
        onclick: () => {
          modal.close();
          onTitle();
        },
      }),
      h('div.spacer'),
      h('button.primary', {
        text: t('ending.travelOn'),
        onclick: () => {
          modal.close();
          onTravel();
        },
      }),
    ]),
  );
}
