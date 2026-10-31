import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { stdout } from 'node:process';
import { fileURLToPath } from 'node:url';

// Offline preparation only. This file does not change the live exhibition title.
const outputDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = resolve(outputDirectory, '../../..');
const fontDirectory = resolve(
  projectDirectory,
  'node_modules/@fontsource/noto-serif-sc',
);
const css = await readFile(resolve(fontDirectory, '600.css'), 'utf8');
const codePoints = [...'长征'].map((character) => character.codePointAt(0));
const selected = new Map();

for (const face of css.matchAll(/@font-face\s*\{([^}]+)\}/g)) {
  const body = face[1];
  const ranges = [...body.matchAll(/U\+([\da-f]+)(?:-([\da-f]+))?/gi)].map(
    ([, start, end]) => [parseInt(start, 16), parseInt(end ?? start, 16)],
  );
  const supported = codePoints.filter((point) =>
    ranges.some(([start, end]) => point >= start && point <= end),
  );
  if (supported.length === 0) continue;
  const fontPath = body.match(/url\(([^)]+\.woff2)\)/)?.[1];
  if (!fontPath) throw new Error('Expected a local WOFF2 source.');
  selected.set(fontPath, supported);
}
if (new Set([...selected.values()].flat()).size !== codePoints.length) {
  throw new Error(
    'Both title characters must have a licensed local font face.',
  );
}
const faces = await Promise.all(
  [...selected].map(async ([fontPath, supported]) => {
    const bytes = await readFile(resolve(fontDirectory, fontPath));
    if (bytes.subarray(0, 4).toString() !== 'wOF2') {
      throw new Error('Expected WOFF2 data.');
    }
    return `@font-face { font-family: LongMarchOFL; font-style: normal; font-weight: 600; src: url(data:font/woff2;base64,${bytes.toString('base64')}) format('woff2'); unicode-range: ${supported.map((point) => `U+${point.toString(16)}`).join(',')}; }`;
  }),
);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="300" viewBox="0 0 560 300">
<metadata>Prepared alternative only. Noto Serif SC 600, Fontsource 5.3.1, SIL OFL-1.1, Google Inc. This is licensed typography, not Mao Zedong handwriting. See ../title-licensed-alternative.md and ../../../public/licenses/OFL-1.1.txt.</metadata>
<style>${faces.join('\n')}</style>
<text x="32" y="222" fill="#f2eee8" font-family="LongMarchOFL" font-weight="600" font-size="186" letter-spacing="24">长征</text>
</svg>
`;
await writeFile(resolve(outputDirectory, 'title-ofl.svg'), svg);
stdout.write(
  `Prepared title-ofl.svg using ${selected.size} local OFL font segments; live title unchanged.\n`,
);
