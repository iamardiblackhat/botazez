/**
 * Copy CesiumJS runtime assets into public/cesium.
 *
 * Cesium loads Workers, shaders, textures and widget CSS at runtime from
 * CESIUM_BASE_URL rather than through the bundler, so the prebuilt output
 * has to be served as static files. public/cesium is gitignored and
 * regenerated on install and before each build.
 */
import { copyFile, cp, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules', 'cesium', 'Build', 'Cesium');
const dest = join(root, 'public', 'cesium');

// Assets is the big one (~20MB of textures); the rest are small but required.
const DIRS = ['Workers', 'Assets', 'Widgets', 'ThirdParty'];

if (!existsSync(src)) {
  console.warn('[cesium] node_modules/cesium not found — skipping asset copy.');
  process.exit(0);
}

// Skip the copy when the destination is already populated, so repeated
// builds don't re-walk ~20MB of textures every time. Both the worker
// directory and the bundle must be present for the copy to be current.
const markers = [join(dest, 'Workers'), join(dest, 'Cesium.js')];
if (markers.every(m => existsSync(m))) {
  const [a, b] = await Promise.all([stat(join(src, 'Workers')), stat(markers[0])]);
  if (b.mtimeMs >= a.mtimeMs) {
    console.log('[cesium] assets already current — skipping.');
    process.exit(0);
  }
}

await mkdir(dest, { recursive: true });
for (const dir of DIRS) {
  const from = join(src, dir);
  if (!existsSync(from)) continue;
  await cp(from, join(dest, dir), { recursive: true });
}

// The prebuilt IIFE bundle is loaded at runtime via a script tag rather
// than through webpack: Cesium's shipped bundle contains octal escape
// sequences that fail to parse once webpack reprocesses it as a module.
await copyFile(join(src, 'Cesium.js'), join(dest, 'Cesium.js'));

console.log(`[cesium] assets copied to public/cesium (Cesium.js, ${DIRS.join(', ')})`);
