// After vite build: put a unique version into the service worker so each deploy refreshes the cache.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const sw = resolve(dist, 'sw.js');
if (!existsSync(sw)) throw new Error('dist/sw.js missing');
const version = process.env.GITHUB_SHA ? process.env.GITHUB_SHA.slice(0, 12) : String(Date.now());
writeFileSync(sw, readFileSync(sw, 'utf8').replace('__BUILD_VERSION__', version));
// GitHub Pages serves 404.html for unknown paths; the app has a single page, so reuse index.html.
writeFileSync(resolve(dist, '404.html'), readFileSync(resolve(dist, 'index.html'), 'utf8'));
console.log('build finished, version', version);
