import { spriteUrl } from '../art/sprites';
import { SKILLS, type ItemId, type SkillId } from '../data';
import { t } from '../i18n';
import { attunement, game } from '../state';
import { h, hudRoot, img } from '../ui/dom';
import type { Combat } from './combat';

export function skillTooltip(id: SkillId): HTMLElement {
  const def = SKILLS[id];
  const learned = game.learned.has(id);
  const lines: Array<HTMLElement | null> = [
    h('h3', { text: t(`skills.${id}.name`) }),
    h('p', { text: t(`skills.${id}.desc`) }),
    h('p.muted', {
      text: [t('skills.ap', { n: def.ap }), t('skills.range', { n: def.range }), def.cooldown ? t('skills.cooldown', { n: def.cooldown }) : null].filter(Boolean).join(' · '),
    }),
    def.overcharge ? h('p.accent', { text: t(`skills.${id}.oc`) }) : null,
    learned && !def.basic ? h('p', { text: t('skills.attunement', { n: Math.round(attunement(id) * 100) }) }) : null,
    !learned ? h('p.bad', { text: t('skills.notLearned', { who: t(`chars.${def.trainer}`) }) }) : null,
  ];
  return h('div', {}, lines);
}

export class CombatHud {
  root: HTMLElement;
  private tooltip: HTMLElement | null = null;

  constructor(readonly c: Combat) {
    this.root = h('div', { style: 'position:absolute;inset:0;pointer-events:none' });
    hudRoot().append(this.root);
  }

  destroy(): void {
    this.root.remove();
  }

  private showTip(el: HTMLElement): void {
    this.hideTip();
    this.tooltip = h('div.panel.tooltip', {}, [el]);
    this.root.append(this.tooltip);
  }

  private hideTip(): void {
    this.tooltip?.remove();
    this.tooltip = null;
  }

  render(): void {
    const c = this.c;
    const u = c.active;
    this.hideTip();
    const order = h(
      'div.turn-order',
      {},
      c.order
        .filter((x) => !x.dead)
        .map((x) => h(`div.slot${x.team === 'enemy' ? '.enemy' : ''}${x === u ? '.active' : ''}`, { title: c.name(x) }, [img(spriteUrl(x.kind, 2))])),
    );
    const roundLabel = h('div.round-label', { text: t('combat.round', { n: c.round }) });
    const log = h('div.combat-log', {}, c.log.map((l) => h('div', { text: l })));
    const children: HTMLElement[] = [order, roundLabel, log];

    if (u && u.team === 'hero' && c.state !== 'over') {
      const myTurn = c.state === 'player';
      const pips = h('div.ap-pips', { title: t('combat.apTitle') });
      for (let i = 0; i < Math.max(u.maxAp, u.ap); i++) {
        const preview = c.selected && i >= u.ap - SKILLS[c.selected].ap && i < u.ap;
        pips.append(h(`span${i < u.ap ? (preview ? '.preview' : '.on') : ''}`));
      }
      const unitPanel = h('div.combat-unit', {}, [
        h('div.row', {}, [img(spriteUrl(u.kind, 2)), h('b', { text: c.name(u) })]),
        h('div', { text: `${t('combat.hp')} ${u.hp}/${u.maxHp}` }),
        h('div.bar', {}, [h('div', { style: `width:${(100 * u.hp) / u.maxHp}%` })]),
        pips,
        u.moveLeft > 0 ? h('div.muted', { text: t('combat.moveLeft', { n: u.moveLeft }), style: 'font-size:0.8em' }) : null,
      ]);

      const skills = h('div.skills');
      c.skillsOf(u).forEach((id, i) => {
        const def = SKILLS[id];
        const learned = game.learned.has(id);
        const cd = u.cooldowns[id] ?? 0;
        const usable = myTurn && c.canUse(u, id);
        const att = attunement(id);
        const btn = h(
          `button.skill-btn${c.selected === id ? '.selected' : ''}${learned ? '' : '.locked'}`,
          {
            disabled: !usable && c.selected !== id,
            onclick: () => c.select(id),
            onmouseenter: () => this.showTip(skillTooltip(id)),
            onmouseleave: () => this.hideTip(),
          },
          [
            h('span.key', { text: String(i + 1) }),
            h('span', { text: t(`skills.${id}.name`) }),
            h('span.cost', { text: `${def.ap}` }),
            learned && !def.basic && att < 1 ? h('span.fade', { text: `${Math.round(att * 100)}%` }) : null,
            cd > 0 ? h('span.cd', { text: String(cd) }) : null,
          ],
        );
        skills.append(btn);
      });

      const sel = c.selected ? SKILLS[c.selected] : null;
      const ocBtn = h(`button.oc-toggle${c.overcharge ? '.on' : ''}`, {
        disabled: !myTurn || !sel?.overcharge,
        onclick: () => c.toggleOvercharge(),
        text: `⚡ ${t('skills.overcharge')} (O)`,
        onmouseenter: () => this.showTip(h('p', { text: t('skills.overchargeDesc') })),
        onmouseleave: () => this.hideTip(),
      });
      const items = (['tonic', 'tea'] as ItemId[]).map((id) =>
        h('button', {
          disabled: !myTurn || game.inv[id] <= 0 || (id === 'tonic' && u.ap < 1),
          onclick: () => void c.useItem(id),
          text: `${t(`items.${id}.short`)} ×${game.inv[id]}`,
          onmouseenter: () => this.showTip(h('div', {}, [h('h3', { text: t(`items.${id}.name`) }), h('p', { text: t(`items.${id}.desc`) })])),
          onmouseleave: () => this.hideTip(),
        }),
      );
      const endBtn = h('button.primary', { disabled: !myTurn, onclick: () => c.endTurn(), text: t('combat.endTurn') });
      const actions = h('div.actions', {}, [ocBtn, endBtn, ...items]);
      const hint = c.selected ? t('combat.hintTarget') : t('combat.hintMove');
      children.push(
        h('div.combat-bar', {}, [unitPanel, h('div.col', {}, [h('div.muted', { text: hint, style: 'font-size:0.8em' }), skills]), actions]),
      );
    } else if (c.state === 'enemy') {
      children.push(h('div.combat-bar', {}, [h('div.panel', { text: t('combat.enemyTurn', { name: c.name(u) }) })]));
    }
    this.root.replaceChildren(...children);
  }
}
