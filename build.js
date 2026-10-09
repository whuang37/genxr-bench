import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.join(__dirname, 'dist');

console.log('[build] Starting website production build...');

// 1. Syntax validation of JavaScript modules
const jsFiles = fs.readdirSync(__dirname).filter(file => file.endsWith('.js') && file !== 'build.js');
for (const file of jsFiles) {
  const filePath = path.join(__dirname, file);
  const result = spawnSync(process.execPath, ['--check', filePath], { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`Syntax check failed for ${file}`);
  }
}
console.log('[build] JavaScript syntax validation passed.');

// 2. Validate essential data files
const requiredDataFiles = ['data/benchmark.csv', 'data/design.csv', 'data/demos.json'];
for (const file of requiredDataFiles) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.error(`[build] Error: Required data file missing: ${file}`);
    process.exit(1);
  }
}

try {
  const demos = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/demos.json'), 'utf8'));
  if (!demos.tasks || !Array.isArray(demos.tasks)) {
    throw new Error('demos.json missing tasks array');
  }
  console.log(`[build] Data validation passed (${demos.tasks.length} demo tasks verified).`);
} catch (err) {
  console.error(`[build] Error validating demos.json:`, err.message);
  process.exit(1);
}

// 3. Clean and prepare dist directory
if (fs.existsSync(DIST_DIR)) {
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
}
fs.mkdirSync(DIST_DIR, { recursive: true });

// 4. Copy distribution files
const copyItems = [
  'index.html',
  'styles.css',
  ...jsFiles,
  '.nojekyll',
  'assets',
  'data',
  'apps',
];

for (const item of copyItems) {
  const src = path.join(__dirname, item);
  const dest = path.join(DIST_DIR, item);

  fs.cpSync(src, dest, { recursive: true });
}

console.log(`[build] Production bundle generated at: ${path.relative(__dirname, DIST_DIR)}/`);
console.log('[build] Build completed successfully.');
