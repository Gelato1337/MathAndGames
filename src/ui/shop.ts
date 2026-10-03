import { ITEMS, type ItemId } from '../data';
import { t } from '../i18n';
import { parseAnswer } from '../math/answer';
import { level } from '../math/mastery';
import { generate } from '../math/problems';
import { game } from '../state';
import { h, openModal } from './dom';
import { ask } from './question';

/** Pekka's shop. Resolves when closed. */
export function openShop(onChange: () => void): Promise<void> {
  return new Promise((resolve) => {
    const goldEl = h('div.hud-gold');
    const list = h('div.list');
    const msg = h('div.feedback');
    const haggleBtn = h('button', { text: t('shop.haggle') }) as HTMLButtonElement;
    const closeBtn = h('button.primary', { text: t('common.leave') });
    const content = h('div.col', { style: 'min-width:30em' }, [
      h('div.row', {}, [h('h2', { text: t('shop.title') }), h('div.spacer'), goldEl]),
      h('p.muted', { text: t('shop.greeting') }),
      list,
      msg,
      h('div.row', {}, [haggleBtn, h('div.spacer'), closeBtn]),
    ]);
    const modal = openModal(content);

    const render = () => {
      goldEl.textContent = t('common.gold', { n: game.gold });
      haggleBtn.disabled = game.flags.haggled;
      list.replaceChildren(
        ...(Object.keys(ITEMS) as ItemId[]).map((id) => {
          const def = ITEMS[id];
          const qty = h('input', { type: 'text', inputmode: 'numeric', value: '1', 'aria-label': t('shop.qty'), style: 'width:3.5em;font-size:1em' }) as HTMLInputElement;
          const buy = h('button.primary', { text: t('shop.buy') });
          buy.addEventListener('click', () => {
            const n = parseAnswer(qty.value);
            if (n === null || n < 1 || !Number.isInteger(n)) {
              msg.className = 'feedback bad';
              msg.textContent = t('shop.badQty');
              return;
            }
            const cost = n * def.price;
            if (cost > game.gold) {
              msg.className = 'feedback bad';
              msg.textContent = t('shop.noGold', { cost, gold: game.gold });
              return;
            }
            game.gold -= cost;
            game.inv[id] += n;
            msg.className = 'feedback good';
            msg.textContent = t('shop.bought', { n, item: t(`items.${id}.name`), cost });
            onChange();
            render();
          });
          return h('div.item', {}, [
            h('div.grow', {}, [
              h('div', { text: `${t(`items.${id}.name`)} — ${t('common.gold', { n: def.price })}` }),
              h('div.desc', { text: t(`items.${id}.desc`) }),
            ]),
            h('span.muted', { text: t('shop.owned', { n: game.inv[id] }) }),
            qty,
            buy,
          ]);
        }),
      );
    };

    haggleBtn.addEventListener('click', async () => {
      const p = generate('percent', level('percent'));
      const r = await ask(p, { title: t('shop.haggleTitle'), story: t('shop.haggleStory'), hint: true });
      game.flags.haggled = true;
      if (r.correct) {
        game.inv.tonic += 1;
        msg.className = 'feedback good';
        msg.textContent = t('shop.haggleWin');
      } else {
        msg.className = 'feedback muted';
        msg.textContent = t('shop.haggleLose');
      }
      onChange();
      render();
    });
    closeBtn.addEventListener('click', () => {
      modal.close();
      resolve();
    });
    render();
  });
}
