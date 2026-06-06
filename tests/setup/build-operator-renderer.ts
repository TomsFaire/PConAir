import { build } from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export async function setup() {
  await build({
    entryPoints: [path.join(root, 'src/renderer/operator/index.ts')],
    bundle: true,
    outfile: path.join(root, 'src/renderer/operator/index.js'),
    platform: 'browser',
    format: 'iife',
    logLevel: 'silent',
  });
}
