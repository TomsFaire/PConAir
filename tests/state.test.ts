import { describe, it, expect, beforeEach } from 'vitest';
import { createStateStore } from '../src/main/state';
import type { AppState, Mode } from '../src/shared/types';

describe('StateStore', () => {
  let store: ReturnType<typeof createStateStore>;

  beforeEach(() => {
    store = createStateStore();
  });

  it('initialises with idle mode', () => {
    expect(store.getState().currentMode).toBe('idle');
  });

  it('setState merges partial updates', () => {
    store.setState({ currentMode: 'slides' as Mode });
    expect(store.getState().currentMode).toBe('slides');
    // other fields unchanged
    expect(store.getState().currentUrl).toBeNull();
  });

  it('notifies subscribers on state change', () => {
    const patches: Partial<AppState>[] = [];
    store.subscribe((patch) => patches.push(patch));
    store.setState({ currentMode: 'url' as Mode });
    expect(patches).toHaveLength(1);
    expect(patches[0].currentMode).toBe('url');
  });

  it('unsubscribe stops notifications', () => {
    const patches: Partial<AppState>[] = [];
    const unsub = store.subscribe((patch) => patches.push(patch));
    unsub();
    store.setState({ currentMode: 'slides' as Mode });
    expect(patches).toHaveLength(0);
  });

  it('getState returns a copy, not the internal reference', () => {
    const s1 = store.getState();
    const s2 = store.getState();
    expect(s1).not.toBe(s2); // different objects
    expect(s1).toEqual(s2);  // same values
  });
});
