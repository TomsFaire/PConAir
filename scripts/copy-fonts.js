#!/usr/bin/env node
// Copies woff2 files from @fontsource packages into graphics/_fonts/.
// Run via: npm run copy-fonts (or automatically via postinstall).
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'graphics', '_fonts');
fs.mkdirSync(OUT, { recursive: true });

/** [src path relative to ROOT, dest filename in _fonts/] */
const copies = [
  // Inter (news, quarterly templates)
  ['node_modules/@fontsource/inter/files/inter-latin-400-normal.woff2',   'inter-latin-400.woff2'],
  ['node_modules/@fontsource/inter/files/inter-latin-500-normal.woff2',   'inter-latin-500.woff2'],
  ['node_modules/@fontsource/inter/files/inter-latin-600-normal.woff2',   'inter-latin-600.woff2'],
  // Lora (news, quarterly templates)
  ['node_modules/@fontsource/lora/files/lora-latin-400-normal.woff2',     'lora-latin-400.woff2'],
  ['node_modules/@fontsource/lora/files/lora-latin-500-normal.woff2',     'lora-latin-500.woff2'],
  ['node_modules/@fontsource/lora/files/lora-latin-600-normal.woff2',     'lora-latin-600.woff2'],
  ['node_modules/@fontsource/lora/files/lora-latin-400-italic.woff2',     'lora-latin-400-italic.woff2'],
  ['node_modules/@fontsource/lora/files/lora-latin-500-italic.woff2',     'lora-latin-500-italic.woff2'],
  // Saira (scoreboard-basketball template)
  ['node_modules/@fontsource/saira/files/saira-latin-500-normal.woff2',   'saira-latin-500.woff2'],
  ['node_modules/@fontsource/saira/files/saira-latin-600-normal.woff2',   'saira-latin-600.woff2'],
  ['node_modules/@fontsource/saira/files/saira-latin-700-normal.woff2',   'saira-latin-700.woff2'],
  // Saira Condensed (scoreboard-basketball template)
  ['node_modules/@fontsource/saira-condensed/files/saira-condensed-latin-500-normal.woff2', 'saira-condensed-latin-500.woff2'],
  ['node_modules/@fontsource/saira-condensed/files/saira-condensed-latin-600-normal.woff2', 'saira-condensed-latin-600.woff2'],
  ['node_modules/@fontsource/saira-condensed/files/saira-condensed-latin-700-normal.woff2', 'saira-condensed-latin-700.woff2'],
  ['node_modules/@fontsource/saira-condensed/files/saira-condensed-latin-800-normal.woff2', 'saira-condensed-latin-800.woff2'],
  // Chakra Petch (tactical-hud template)
  ['node_modules/@fontsource/chakra-petch/files/chakra-petch-latin-400-normal.woff2', 'chakra-petch-latin-400.woff2'],
  ['node_modules/@fontsource/chakra-petch/files/chakra-petch-latin-500-normal.woff2', 'chakra-petch-latin-500.woff2'],
  ['node_modules/@fontsource/chakra-petch/files/chakra-petch-latin-600-normal.woff2', 'chakra-petch-latin-600.woff2'],
  ['node_modules/@fontsource/chakra-petch/files/chakra-petch-latin-700-normal.woff2', 'chakra-petch-latin-700.woff2'],
  // Share Tech Mono (tactical-hud template)
  ['node_modules/@fontsource/share-tech-mono/files/share-tech-mono-latin-400-normal.woff2', 'share-tech-mono-latin-400.woff2'],
];

let errors = 0;
for (const [src, dest] of copies) {
  const srcPath = path.join(ROOT, src);
  const destPath = path.join(OUT, dest);
  if (!fs.existsSync(srcPath)) {
    console.error(`✗ Missing: ${src}`);
    errors++;
    continue;
  }
  fs.copyFileSync(srcPath, destPath);
  console.log(`✓ ${dest}`);
}
if (errors > 0) {
  console.error(`\n${errors} font file(s) not found. Run: npm install`);
  process.exit(1);
}
console.log(`\nFonts copied to graphics/_fonts/ (${copies.length} files)`);
