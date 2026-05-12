import { randomUUID } from 'crypto';
import type { UrlPreset, SessionMode } from '../shared/types';

export interface CreatePresetInput {
  name: string;
  url: string;
  sessionMode: SessionMode;
  displayTarget: string | null;
  description: string | null;
}

export type UpdatePresetInput = Partial<Omit<UrlPreset, 'id' | 'createdAt' | 'updatedAt'>>;

// NOTE: In-memory only — persistence to show profile is deferred to Phase 5 (spec 05).
export function createPresetsStore() {
  const presets = new Map<string, UrlPreset>();

  function list(): UrlPreset[] {
    return Array.from(presets.values());
  }

  function findById(id: string): UrlPreset | null {
    return presets.get(id) ?? null;
  }

  function create(input: CreatePresetInput): UrlPreset {
    const now = new Date().toISOString();
    const preset: UrlPreset = {
      id: randomUUID(),
      name: input.name,
      url: input.url,
      sessionMode: input.sessionMode,
      displayTarget: input.displayTarget,
      description: input.description,
      createdAt: now,
      updatedAt: now,
    };
    presets.set(preset.id, preset);
    return { ...preset };
  }

  function update(id: string, input: UpdatePresetInput): UrlPreset | null {
    const existing = presets.get(id);
    if (!existing) return null;
    const updated: UrlPreset = { ...existing, ...input, id, createdAt: existing.createdAt, updatedAt: new Date().toISOString() };
    presets.set(id, updated);
    return { ...updated };
  }

  function remove(id: string): boolean {
    return presets.delete(id);
  }

  return { list, findById, create, update, remove };
}

export type PresetsStore = ReturnType<typeof createPresetsStore>;
