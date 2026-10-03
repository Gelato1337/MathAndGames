type Child = Node | string | null | undefined | false;
type Attrs = Record<string, string | number | boolean | EventListener | undefined>;

/** Tiny element builder: h('div.panel', {onclick}, [children]). */
export function h(tag: string, attrs: Attrs = {}, children: Child[] | Child = []): HTMLElement {
  const [name, ...classes] = tag.split('.');
  const el = document.createElement(name || 'div');
  if (classes.length) el.className = classes.join(' ');
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') {
      el.addEventListener(k.slice(2), v as EventListener);
    } else if (k === 'html') {
      el.innerHTML = String(v);
    } else if (k === 'text') {
      el.textContent = String(v);
    } else if (v === true) {
      el.setAttribute(k, '');
    } else {
      el.setAttribute(k, String(v));
    }
  }
  const list = Array.isArray(children) ? children : [children];
  for (const c of list) {
    if (c === null || c === undefined || c === false) continue;
    el.append(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return el;
}

export function img(src: string, cls = 'px'): HTMLImageElement {
  const el = document.createElement('img');
  el.src = src;
  el.className = cls;
  el.alt = '';
  el.draggable = false;
  return el;
}

export const uiRoot = (): HTMLElement => document.getElementById('ui')!;
export const hudRoot = (): HTMLElement => document.getElementById('hud')!;

let openCount = 0;

/** True while any blocking modal/dialog is open; the game ignores world input. */
export function isBlocking(): boolean {
  return openCount > 0;
}

export interface ModalHandle {
  el: HTMLElement;
  close: () => void;
}

/** Show `content` in a centred modal. Returns a handle to close it. */
export function openModal(content: HTMLElement, opts: { clear?: boolean; wrap?: boolean } = {}): ModalHandle {
  const back = h(`div.backdrop${opts.clear ? '.clear' : ''}`);
  if (opts.wrap === false) back.append(content);
  else back.append(h('div.panel.modal', {}, [content]));
  uiRoot().append(back);
  openCount++;
  let closed = false;
  return {
    el: back,
    close: () => {
      if (closed) return;
      closed = true;
      openCount--;
      back.remove();
    },
  };
}

export function toast(text: string): void {
  const el = h('div.toast', { text });
  hudRoot().append(el);
  setTimeout(() => el.remove(), 2700);
}

export function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Focus the first input/button inside el on the next frame. */
export function autofocus(el: HTMLElement): void {
  requestAnimationFrame(() => {
    const target = el.querySelector<HTMLElement>('input, button.primary, button');
    target?.focus();
  });
}
