// Rasterizes assets/icon.svg -> assets/icon.png (512x512).
// The @wxt-dev/auto-icons module then generates the 16/32/48/128
// manifest icons from this PNG source at build time.
//
// Run: node scripts/generate-icon.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const svgPath = join(here, '..', 'assets', 'icon.svg');
const pngPath = join(here, '..', 'assets', 'icon.png');

const svg = await readFile(svgPath);
const png = await sharp(svg).resize(512, 512).png().toBuffer();
await writeFile(pngPath, png);

console.log(`Wrote ${pngPath} (${png.length} bytes)`);
