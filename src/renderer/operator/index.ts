import { createClientStore } from './state';
import type { AppState, WsServerMessage } from '../../shared/types';
import * as api from './api';

const store = createClientStore();

// ── WebSocket connection ──────────────────────────────────────────

function connectWs(): WebSocket {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${protocol}//${location.host}/ws`);

  ws.addEventListener('open', () => setWsStatus(true));

  ws.addEventListener('close', () => {
    setWsStatus(false);
    let delay = 1000;
    const retry = () => setTimeout(() => { connectWs(); }, delay);
    delay = Math.min(delay * 2, 30000);
    retry();
  });

  ws.addEventListener('message', (event: MessageEvent<string>) => {
    const msg = JSON.parse(event.data) as WsServerMessage;
    if (msg.type === 'state')       store.applyFullState(msg.payload);
    else if (msg.type === 'state_patch') store.applyPatch(msg.payload);
  });

  return ws;
}

// ── UI updates ────────────────────────────────────────────────────

function setWsStatus(connected: boolean): void {
  document.getElementById('ws-dot')!.classList.toggle('connected', connected);
  document.getElementById('ws-label')!.textContent = connected ? 'Connected' : 'Disconnected';
}

function renderState(state: AppState): void {
  const badge = document.getElementById('mode-badge')!;
  badge.textContent = state.currentMode.toUpperCase();
  badge.className = `mode-badge ${state.currentMode}`;

  document.getElementById('companion-dot')!.classList.toggle(
    'connected', state.connectionStatus.companionConnected
  );

  const slides = state.slides;
  const hasSlides = state.currentMode === 'slides' && slides !== null;
  const navEnabled = hasSlides && slides !== null && !slides.isLoading;

  document.getElementById('slide-counter')!.textContent =
    hasSlides && slides ? `${slides.slideIndex + 1} / ${slides.slideCount}` : '— / —';
  document.getElementById('deck-title')!.textContent =
    hasSlides && slides
      ? (slides.deckTitle !== slides.deckId ? slides.deckTitle : 'Loading…')
      : 'No deck loaded';

  (document.getElementById('prev-btn') as HTMLButtonElement).disabled =
    !navEnabled || slides!.slideIndex === 0;
  (document.getElementById('next-btn') as HTMLButtonElement).disabled =
    !navEnabled || slides!.slideIndex >= slides!.slideCount - 1;
  (document.getElementById('goto-btn') as HTMLButtonElement).disabled = !navEnabled;
  (document.getElementById('reload-btn') as HTMLButtonElement).disabled = !hasSlides;

  const active = state.abState.activeInstance;
  document.getElementById('ab-a-btn')!.classList.toggle('active', active === 'A');
  document.getElementById('ab-b-btn')!.classList.toggle('active', active === 'B');

  document.getElementById('state-dump')!.textContent = JSON.stringify(state, null, 2);
}

// ── Error toast ───────────────────────────────────────────────────

function showError(msg: string): void {
  const toast = document.getElementById('error-toast')!;
  toast.textContent = msg;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 4000);
}

// ── Event bindings ────────────────────────────────────────────────

function bindEvents(): void {
  const on = (id: string, fn: () => Promise<unknown>) => {
    document.getElementById(id)!.addEventListener('click', async () => {
      try { await fn(); } catch (e) { showError((e as Error).message); }
    });
  };

  on('load-btn', () => api.loadDeck(
    (document.getElementById('deck-url-input') as HTMLInputElement).value.trim()
  ));
  on('next-btn',   () => api.slideNext());
  on('prev-btn',   () => api.slidePrev());
  on('goto-btn', async () => {
    const n = parseInt((document.getElementById('goto-input') as HTMLInputElement).value, 10);
    if (!isNaN(n) && n >= 1) await api.slideGoto(n - 1);
  });
  on('reload-btn', () => api.slideReload());

  document.querySelectorAll<HTMLButtonElement>('.ab-btn').forEach((btn) =>
    btn.addEventListener('click', async () => {
      try { await api.switchAB(btn.dataset.instance as 'A' | 'B'); }
      catch (e) { showError((e as Error).message); }
    })
  );

  document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      try { await api.setMode(btn.dataset.mode!); }
      catch (e) { showError((e as Error).message); }
    })
  );
}

// ── Boot ──────────────────────────────────────────────────────────

store.subscribe(renderState);
bindEvents();
connectWs();
