import { getMe, getReplay, type Me } from './api.ts';
import { subscribe, summary } from './connections.ts';
import { openConnect } from './views/connect.ts';
import { audio } from './audio.ts';
import { h } from './dom.ts';
import './style.css';
import { fightView } from './views/fight.ts';
import { leaderboardView, replaysView } from './views/lists.ts';
import { posesView } from './views/poses.ts';
import { replayView } from './views/replay.ts';

const app = document.getElementById('app')!;
let me: Me = { mode: 'none', user: null, loginAvailable: false, models: [] };
let cleanup: () => void = () => {};

let connectBtn: HTMLElement | null = null;
function paintConnect(): void {
  if (!connectBtn) return;
  const what = summary(me);
  connectBtn.replaceChildren(h('span.connect-dot', { 'data-on': what ? '1' : '0' }), what || 'Connect');
  connectBtn.title = what ? `Connected: ${what}` : 'Sign in with Opper, add an API key or an endpoint';
}
subscribe(paintConnect);

const REPO_URL = 'https://github.com/Jose-Sabater/jev-fighter';

function header(): HTMLElement {
  const link = (href: string, text: string) => h(`a.nav${location.pathname === href ? '.active' : ''}`, { href }, text);
  // Everything about keys, sign-in and endpoints lives behind one button, labelled with what is connected.
  connectBtn = h('button.btn.small.connect-btn', { type: 'button', onclick: () => openConnect(me) });
  paintConnect();
  const toggle = (key: 'sound' | 'music', label: string, icon: string) => {
    const b = h('button.btn.small.toggle', { type: 'button', 'aria-pressed': String(audio.settings[key]), title: `${label} on/off`, html: `${icon}<span>${label}</span>` });
    b.addEventListener('click', () => audio.set({ [key]: !audio.settings[key] }));
    audio.onChange(() => b.setAttribute('aria-pressed', String(audio.settings[key])));
    return b;
  };
  const SPEAKER = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
  const NOTE = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M9 18V6l11-2v12" stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round"/><circle cx="6.5" cy="18" r="2.5" fill="currentColor"/><circle cx="17.5" cy="16" r="2.5" fill="currentColor"/></svg>';
  const GITHUB = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>';
  const code = h('a.btn.small.toggle', { href: REPO_URL, target: '_blank', rel: 'noopener', title: 'The code on GitHub', html: `${GITHUB}<span>GitHub</span>` });
  return h(
    'header.top',
    null,
    h('a.logo', { href: '/' }, 'Jev Fighter'),
    h('nav', null, link('/', 'Fight'), link('/replays', 'Replays'), link('/leaderboard', 'Leaderboard')),
    h('div.audio-toggles', null, code, toggle('sound', 'Sound', SPEAKER), toggle('music', 'Music', NOTE)),
    connectBtn,
  );
}

async function route(): Promise<void> {
  cleanup();
  cleanup = () => {};
  audio.scene(false);
  const main = h('main');
  app.replaceChildren(header(), main);
  const path = location.pathname;
  const m = /^\/replay\/([a-z0-9-]+)$/.exec(path);
  try {
    if (m) {
      main.append(h('p.note.page', null, 'Loading replay...'));
      const { replay, source } = await getReplay(m[1]);
      cleanup = replayView(main, replay, m[1], { source, admin: Boolean(me.admin), onDeleted: () => navigate('/replays') });
    } else if (path === '/replays') {
      await replaysView(main, me);
    } else if (path === '/poses') {
      posesView(main);
    } else if (path === '/leaderboard') {
      await leaderboardView(main);
    } else {
      cleanup = fightView(main, me, navigate);
    }
  } catch (e) {
    main.replaceChildren(h('div.page', null, h('h1', null, 'Something went wrong'), h('p', null, (e as Error).message)));
  }
}

export function navigate(path: string): void {
  history.pushState(null, '', path);
  void route();
}

document.addEventListener('click', (e) => {
  const a = (e.target as HTMLElement).closest('a');
  // Leave downloads, new tabs and external links to the browser.
  if (!a || a.target || a.hasAttribute('download') || a.dataset.external || e.metaKey || e.ctrlKey || e.shiftKey) return;
  const url = new URL(a.href, location.href);
  // blob: and data: URLs report this page's origin, so check the protocol too.
  if (url.origin !== location.origin || (url.protocol !== 'http:' && url.protocol !== 'https:')) return;
  e.preventDefault();
  navigate(url.pathname);
});
window.addEventListener('popstate', () => void route());

me = await getMe().catch(() => me);
void route();
