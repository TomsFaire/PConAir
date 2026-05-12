import { BrowserWindow, screen } from 'electron';
import type { StateStore } from '../state';
import type { ABInstance } from '../../shared/types';

interface SlidesWindowConfig {
  store: StateStore;
}

export function createSlidesWindowManager(config: SlidesWindowConfig) {
  const { store } = config;
  let windowA: BrowserWindow | null = null;
  let windowB: BrowserWindow | null = null;

  function createSlidesWindow(): BrowserWindow {
    const display = screen.getPrimaryDisplay();
    const win = new BrowserWindow({
      x: display.bounds.x,
      y: display.bounds.y,
      width: display.bounds.width,
      height: display.bounds.height,
      fullscreen: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false, // Needed for Google Slides JS interactions
      },
      backgroundColor: '#000000',
      frame: false,
      show: false,
    });
    win.once('ready-to-show', () => win.show());
    return win;
  }

  function getSlidesUrl(deckId: string): string {
    return `https://docs.google.com/presentation/d/${deckId}/present`;
  }

  async function loadDeck(deckId: string, instance: ABInstance): Promise<void> {
    const win = instance === 'A' ? windowA : windowB;
    if (!win || win.isDestroyed()) return;

    const url = getSlidesUrl(deckId);
    await win.loadURL(url);

    const state = store.getState();
    if (state.slides && state.slides.deckId === deckId) {
      store.setState({
        slides: { ...state.slides, isLoading: false },
      });
    }
  }

  function showInstance(instance: ABInstance): void {
    const toShow = instance === 'A' ? windowA : windowB;
    const toHide = instance === 'A' ? windowB : windowA;
    if (toHide && !toHide.isDestroyed()) toHide.hide();
    if (toShow && !toShow.isDestroyed()) toShow.show();
  }

  function initialize(): void {
    windowA = createSlidesWindow();
    windowB = createSlidesWindow();

    store.subscribe((patch) => {
      if (patch.slides && patch.slides.isLoading) {
        const deckId = store.getState().slides?.deckId;
        const activeInstance = store.getState().abState.activeInstance;
        if (deckId) {
          void loadDeck(deckId, activeInstance);
        }
      }
      if (patch.abState?.activeInstance) {
        showInstance(patch.abState.activeInstance);
      }
    });
  }

  function destroy(): void {
    windowA?.destroy();
    windowB?.destroy();
    windowA = null;
    windowB = null;
  }

  return { initialize, loadDeck, showInstance, destroy };
}

export type SlidesWindowManager = ReturnType<typeof createSlidesWindowManager>;
