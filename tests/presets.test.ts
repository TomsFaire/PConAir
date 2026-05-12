import { describe, it, expect, beforeEach } from 'vitest';
import { createPresetsStore } from '../src/main/presets';

describe('PresetsStore', () => {
  let store: ReturnType<typeof createPresetsStore>;

  beforeEach(() => {
    store = createPresetsStore();
  });

  it('starts empty', () => {
    expect(store.list()).toEqual([]);
  });

  it('create: adds a preset and returns it with id/timestamps', () => {
    const p = store.create({ name: 'Slido', url: 'https://slido.com', sessionMode: 'persistent', displayTarget: null, description: null });
    expect(p.id).toBeTruthy();
    expect(p.name).toBe('Slido');
    expect(p.url).toBe('https://slido.com');
    expect(p.createdAt).toBeTruthy();
    expect(p.updatedAt).toBeTruthy();
    expect(store.list()).toHaveLength(1);
  });

  it('findById: returns preset or null', () => {
    const p = store.create({ name: 'X', url: 'https://x.com', sessionMode: 'ephemeral', displayTarget: null, description: null });
    expect(store.findById(p.id)).toMatchObject({ name: 'X' });
    expect(store.findById('missing')).toBeNull();
  });

  it('update: replaces fields and bumps updatedAt', () => {
    const p = store.create({ name: 'A', url: 'https://a.com', sessionMode: 'persistent', displayTarget: null, description: null });
    const updated = store.update(p.id, { name: 'B', url: 'https://b.com' });
    expect(updated).not.toBeNull();
    expect(updated!.name).toBe('B');
    expect(updated!.url).toBe('https://b.com');
    expect(updated!.createdAt).toBe(p.createdAt);
  });

  it('update: returns null for unknown id', () => {
    expect(store.update('nope', { name: 'X' })).toBeNull();
  });

  it('remove: deletes preset and returns true', () => {
    const p = store.create({ name: 'Y', url: 'https://y.com', sessionMode: 'persistent', displayTarget: null, description: null });
    expect(store.remove(p.id)).toBe(true);
    expect(store.list()).toHaveLength(0);
  });

  it('remove: returns false for unknown id', () => {
    expect(store.remove('nope')).toBe(false);
  });
});
