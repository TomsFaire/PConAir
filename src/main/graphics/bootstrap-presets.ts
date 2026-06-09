import fs from 'fs';
import path from 'path';
import type { PresetsStore } from '../presets';

interface ManifestTemplate {
  id: string;
  title: string;
  description: string;
  mode: string;
  path: string;
  params: Record<string, string>;
}

interface Manifest {
  version: number;
  templates: ManifestTemplate[];
}

export function bootstrapGraphicsPresets(port: number, graphicsRoot: string, presets: PresetsStore): void {
  if (presets.list().length > 0) return;

  const manifestPath = path.join(graphicsRoot, 'manifest.json');
  if (!fs.existsSync(manifestPath)) return;

  let manifest: Manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Manifest;
  } catch {
    return;
  }

  if (!Array.isArray(manifest.templates)) return;

  for (const tpl of manifest.templates) {
    if (tpl.mode !== 'url') continue;
    const params = new URLSearchParams(tpl.params ?? {}).toString();
    const url = `http://localhost:${port}/graphics/${tpl.path}${params ? '?' + params : ''}`;
    presets.create({
      name: tpl.title,
      url,
      sessionMode: 'persistent',
      displayTarget: null,
      description: tpl.description ?? null,
    });
  }
}
