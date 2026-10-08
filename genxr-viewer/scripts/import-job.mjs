import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Project root paths
const VIEWER_ROOT = path.resolve(__dirname, '..');
const BENCH_ROOT = path.resolve(VIEWER_ROOT, '..');
const PUBLIC_JOBS_DIR = path.resolve(VIEWER_ROOT, 'public/jobs');

// Ensure directories exist
fs.mkdirSync(PUBLIC_JOBS_DIR, { recursive: true });

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else if (entry.isFile() || entry.isSymbolicLink()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const VIDEO_MEDIA_TYPES = new Map([
  ['.mp4', 'video/mp4'],
  ['.webm', 'video/webm']
]);

function findVideoFiles(rootDir) {
  if (!fs.existsSync(rootDir)) return [];

  const videos = [];

  function visit(directory) {
    const entries = fs.readdirSync(directory, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(entryPath);
        continue;
      }

      if (!entry.isFile() && !entry.isSymbolicLink()) continue;
      const mediaType = VIDEO_MEDIA_TYPES.get(path.extname(entry.name).toLowerCase());
      if (!mediaType) continue;

      videos.push({
        name: entry.name,
        relativePath: path.relative(rootDir, entryPath).split(path.sep).join('/'),
        mediaType
      });
    }
  }

  visit(rootDir);
  return videos.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

// Generate browser-ready importmap loading from CDN
function getStandardImportMap() {
  return {
    imports: {
      "three": "https://cdn.jsdelivr.net/npm/three@0.184.0/build/three.module.js",
      "three/": "https://cdn.jsdelivr.net/npm/three@0.184.0/",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.184.0/examples/jsm/",
      "troika-three-text": "https://cdn.jsdelivr.net/gh/protectwise/troika@028b81cf308f0f22e5aa8e78196be56ec1997af5/packages/troika-three-text/src/index.js",
      "troika-three-utils": "https://cdn.jsdelivr.net/gh/protectwise/troika@v0.52.4/packages/troika-three-utils/src/index.js",
      "troika-worker-utils": "https://cdn.jsdelivr.net/gh/protectwise/troika@v0.52.4/packages/troika-worker-utils/src/index.js",
      "bidi-js": "https://esm.sh/bidi-js@%5E1.0.2?target=es2022",
      "webgl-sdf-generator": "https://esm.sh/webgl-sdf-generator@1.1.1/es2022/webgl-sdf-generator.mjs",
      "@pmndrs/uikit": "https://cdn.jsdelivr.net/npm/@pmndrs/uikit@1.0.64/dist/index.min.js",
      "@pmndrs/uikit-pub-sub": "https://cdn.jsdelivr.net/npm/@pmndrs/uikit-pub-sub@1.0.64/dist/index.min.js",
      "@pmndrs/msdfonts": "https://cdn.jsdelivr.net/npm/@pmndrs/msdfonts@1.0.64/dist/index.min.js",
      "@preact/signals-core": "https://cdn.jsdelivr.net/npm/@preact/signals-core@1.14.0/dist/signals-core.mjs",
      "@dimforge/rapier3d-simd-compat": "https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-simd-compat@0.19.2/rapier.mjs",
      "yoga-layout/load": "https://cdn.jsdelivr.net/npm/yoga-layout@3.2.1/dist/src/load.js",
      "lit": "https://esm.sh/lit@3.3.1",
      "lit/": "https://esm.sh/lit@3.3.1/",
      "three-pathfinding": "https://cdn.jsdelivr.net/npm/three-pathfinding@1.3.0/dist/three-pathfinding.module.js",
      "xrblocks": "https://cdn.jsdelivr.net/npm/xrblocks@0.21.0/build/xrblocks.js",
      "xrblocks/addons/": "https://cdn.jsdelivr.net/npm/xrblocks@0.21.0/build/addons/"
    }
  };
}

// Injected styling for clean responsive rendering
const INJECTED_HEAD_TAGS = `
    <script>window.litDisableBundleWarning = true;</script>
    <style>
      html, body {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        overflow: hidden;
        background-color: #000;
        color: #fff;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      canvas {
        width: 100% !important;
        height: 100% !important;
        display: block;
      }
      #XRButtonWrapper {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1.5rem;
        z-index: 10;
        pointer-events: none;
        text-align: center;
      }
      #XRButtonWrapper > * {
        pointer-events: auto;
      }
      .XRButton {
        background: #f4f2ed;
        color: #252724;
        border: 1px solid #bdbbb4;
        border-radius: 3px;
        padding: 14px 24px;
        font-size: 1rem;
        font-weight: 550;
        cursor: pointer;
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      }
    </style>`;

// Relink importmap and inject styles in index.html
function relinkHtmlImportMap(htmlPath) {
  if (!fs.existsSync(htmlPath)) return false;

  let html = fs.readFileSync(htmlPath, 'utf8');
  const importMap = getStandardImportMap();
  const formattedImportMap = JSON.stringify(importMap, null, 4);

  const importMapTag = `<script type="importmap">\n${formattedImportMap}\n    </script>`;

  if (html.includes('<script type="importmap">')) {
    html = html.replace(/<script type="importmap">[\s\S]*?<\/script>/, importMapTag);
  } else if (html.includes('</head>')) {
    html = html.replace('</head>', `    ${importMapTag}\n  </head>`);
  }

  // Inject styles if not present
  if (!html.includes('#XRButtonWrapper')) {
    if (html.includes('<head>')) {
      html = html.replace('<head>', `<head>${INJECTED_HEAD_TAGS}`);
    }
  }

  fs.writeFileSync(htmlPath, html, 'utf8');
  return true;
}

// Find instruction.md for a given task
function findInstructionMd(taskName, trialDir) {
  const candidates = [
    path.resolve(BENCH_ROOT, `tasks/${taskName}/instruction.md`),
    path.resolve(BENCH_ROOT, `templates/tasks/app/instruction.md`),
    path.resolve(trialDir, 'instruction.md')
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      try {
        return fs.readFileSync(candidate, 'utf8');
      } catch (err) {
        console.warn(`Could not read ${candidate}:`, err.message);
      }
    }
  }
  return `# ${taskName}\n\nNo instruction.md found for task ${taskName}.`;
}

// Find and parse f2p.log
function parseF2pLog(trialDir) {
  const f2pCandidates = [
    path.resolve(trialDir, 'verifier/xrblocks-test/f2p.log'),
    path.resolve(trialDir, 'verifier/f2p.log'),
    path.resolve(trialDir, 'f2p.log')
  ];

  for (const f2pPath of f2pCandidates) {
    if (fs.existsSync(f2pPath)) {
      try {
        const raw = fs.readFileSync(f2pPath, 'utf8');
        return JSON.parse(raw);
      } catch (err) {
        console.warn(`Error parsing ${f2pPath}:`, err.message);
        return {
          status: 'error',
          score: 0,
          passedTests: 0,
          totalTests: 0,
          requiredGateFailed: true,
          runnable: false,
          tests: [],
          errors: [`JSON parse error in f2p.log: ${err.message}`]
        };
      }
    }
  }

  return {
    status: 'missing',
    score: 0,
    passedTests: 0,
    totalTests: 0,
    requiredGateFailed: true,
    runnable: false,
    tests: [],
    errors: ['f2p.log not found for this trial.']
  };
}

// Read config.json or result.json if present
function readJsonSafely(filePath) {
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
      return null;
    }
  }
  return null;
}

// Main Import Function
async function importJob(jobPathInput, options = {}) {
  const { importArtifacts = false } = options;

  let resolvedJobPath = path.resolve(process.cwd(), jobPathInput);
  if (!fs.existsSync(resolvedJobPath)) {
    // Try relative to BENCH_ROOT
    const altPath = path.resolve(BENCH_ROOT, jobPathInput);
    if (fs.existsSync(altPath)) {
      resolvedJobPath = altPath;
    } else {
      console.error(`[error] Job path not found: ${jobPathInput}`);
      process.exit(1);
    }
  }

  const jobId = path.basename(resolvedJobPath);
  console.log(`[import] Importing job: ${jobId} from ${resolvedJobPath}`);
  console.log(`[import] Using CDN for XR Blocks and dependencies.`);
  if (importArtifacts) {
    console.log(`[import] Flag --import-artifacts enabled: copying full trial artifacts folders.`);
  }

  const targetJobDir = path.join(PUBLIC_JOBS_DIR, jobId);
  fs.mkdirSync(targetJobDir, { recursive: true });

  const entries = fs.readdirSync(resolvedJobPath, { withFileTypes: true });
  const trialDirs = entries.filter(e => e.isDirectory());

  const trials = [];
  let passedCount = 0;
  let failedCount = 0;

  for (const entry of trialDirs) {
    const trialName = entry.name;
    const trialSrcDir = path.join(resolvedJobPath, trialName);

    // Read trial config if available
    const config = readJsonSafely(path.join(trialSrcDir, 'config.json'));
    const result = readJsonSafely(path.join(trialSrcDir, 'result.json'));

    let taskName = trialName.includes('__') ? trialName.split('__')[0] : trialName;
    if (config?.task?.path) {
      taskName = path.basename(config.task.path);
    }

    const targetTrialDir = path.join(targetJobDir, trialName);
    const targetAppDir = path.join(targetTrialDir, 'app');
    fs.mkdirSync(targetAppDir, { recursive: true });

    // Copy app files
    const appSrcDir = path.join(trialSrcDir, 'artifacts/app');
    let hasApp = false;
    if (fs.existsSync(appSrcDir)) {
      copyDirRecursive(appSrcDir, targetAppDir);
      const targetHtmlPath = path.join(targetAppDir, 'index.html');
      if (fs.existsSync(targetHtmlPath)) {
        hasApp = true;
        relinkHtmlImportMap(targetHtmlPath);
      }
    }

    // Handle --import-artifacts flag
    let hasArtifacts = false;
    let videos = [];
    if (importArtifacts) {
      const trialArtifactsSrc = path.join(trialSrcDir, 'artifacts');
      const targetTrialArtifactsDir = path.join(targetTrialDir, 'artifacts');
      if (fs.existsSync(trialArtifactsSrc)) {
        copyDirRecursive(trialArtifactsSrc, targetTrialArtifactsDir);
        hasArtifacts = true;
        const nestedHtml = path.join(targetTrialArtifactsDir, 'app/index.html');
        if (fs.existsSync(nestedHtml)) {
          relinkHtmlImportMap(nestedHtml);
        }
        videos = findVideoFiles(targetTrialArtifactsDir).map((video) => ({
          ...video,
          url: `jobs/${jobId}/${trialName}/artifacts/${video.relativePath}`
        }));
      }

      // Also copy verifier directory if present
      const trialVerifierSrc = path.join(trialSrcDir, 'verifier');
      const targetTrialVerifierDir = path.join(targetTrialDir, 'verifier');
      if (fs.existsSync(trialVerifierSrc)) {
        copyDirRecursive(trialVerifierSrc, targetTrialVerifierDir);
      }
    }

    // Parse verifier log
    const f2p = parseF2pLog(trialSrcDir);
    const isPassed = f2p.score === 100 || (f2p.totalTests > 0 && f2p.passedTests === f2p.totalTests && !f2p.requiredGateFailed);
    if (isPassed) {
      passedCount++;
    } else {
      failedCount++;
    }

    // Get instruction markdown
    const instructionMd = findInstructionMd(taskName, trialSrcDir);
    fs.writeFileSync(path.join(targetTrialDir, 'instruction.md'), instructionMd, 'utf8');

    // Build trial record with ?formFactor=desktop for automatic simulator start
    const trialData = {
      trialName,
      taskName,
      hasApp,
      hasArtifacts,
      appUrl: hasApp ? `jobs/${jobId}/${trialName}/app/index.html?formFactor=desktop` : null,
      artifactsUrl: hasArtifacts ? `jobs/${jobId}/${trialName}/artifacts/` : null,
      videos,
      instructionMarkdown: instructionMd,
      verifier: {
        status: f2p.status || (isPassed ? 'valid' : 'failed'),
        score: typeof f2p.score === 'number' ? f2p.score : (isPassed ? 100 : 0),
        passedTests: f2p.passedTests ?? 0,
        totalTests: f2p.totalTests ?? 0,
        requiredGateFailed: Boolean(f2p.requiredGateFailed),
        runnable: f2p.runnable ?? true,
        tests: f2p.tests || [],
        errors: f2p.errors || [],
        startedAt: f2p.startedAt || null,
        finishedAt: f2p.finishedAt || null
      },
      agent: {
        name: config?.agent?.name || 'unknown',
        modelName: config?.agent?.model_name || 'unknown'
      }
    };

    trials.push(trialData);
  }

  // Sort trials alphabetically by taskName
  trials.sort((a, b) => a.taskName.localeCompare(b.taskName));
  const totalVideos = trials.reduce((total, trial) => total + trial.videos.length, 0);

  const jobManifest = {
    jobId,
    importedAt: new Date().toISOString(),
    artifactsIncluded: importArtifacts,
    totalTrials: trials.length,
    passedTrials: passedCount,
    failedTrials: failedCount,
    totalVideos,
    trials
  };

  // Write job manifest
  const manifestPath = path.join(targetJobDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(jobManifest, null, 2), 'utf8');
  console.log(`[manifest] Created manifest at ${manifestPath}`);

  // Update jobs registry (jobs.json)
  const registryPath = path.join(PUBLIC_JOBS_DIR, 'jobs.json');
  let jobRegistry = [];
  if (fs.existsSync(registryPath)) {
    try {
      jobRegistry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    } catch {
      jobRegistry = [];
    }
  }

  // Remove existing entry for this job if re-importing
  jobRegistry = jobRegistry.filter(j => j.jobId !== jobId);
  jobRegistry.unshift({
    jobId,
    importedAt: jobManifest.importedAt,
    artifactsIncluded: importArtifacts,
    totalTrials: jobManifest.totalTrials,
    passedTrials: jobManifest.passedTrials,
    failedTrials: jobManifest.failedTrials,
    manifestUrl: `jobs/${jobId}/manifest.json`
  });

  fs.writeFileSync(registryPath, JSON.stringify(jobRegistry, null, 2), 'utf8');
  console.log(`[registry] Updated jobs registry at ${registryPath}`);

  console.log(`\n======================================================`);
  console.log(` Successfully imported job: ${jobId}`);
  console.log(` Total trials: ${trials.length} | Passed: ${passedCount} | Failed: ${failedCount}`);
  if (importArtifacts) {
    console.log(` Artifacts: Copied all trial artifacts to public/jobs/${jobId}/<trial>/artifacts/`);
  }
  console.log(`======================================================\n`);
}

// CLI entrypoint
const rawArgs = process.argv.slice(2);
const importArtifacts = rawArgs.includes('--import-artifacts');
const filteredArgs = rawArgs.filter(arg => arg !== '--import-artifacts');
const jobArg = filteredArgs[0];

if (!jobArg) {
  // Check available jobs in ../jobs
  const jobsDir = path.resolve(BENCH_ROOT, 'jobs');
  if (fs.existsSync(jobsDir)) {
    const availableJobs = fs.readdirSync(jobsDir).filter(f => {
      return fs.statSync(path.join(jobsDir, f)).isDirectory();
    });
    if (availableJobs.length > 0) {
      console.log(`No job directory provided. Found available jobs in ${jobsDir}:`);
      availableJobs.forEach(j => console.log(`  - jobs/${j}`));
      const latestJob = availableJobs[availableJobs.length - 1];
      console.log(`\nImporting latest job: jobs/${latestJob}...`);
      importJob(path.join(jobsDir, latestJob), { importArtifacts });
    } else {
      console.error('Usage: npm run import-job -- <path-to-job-dir> [--import-artifacts]');
      process.exit(1);
    }
  } else {
    console.error('Usage: npm run import-job -- <path-to-job-dir> [--import-artifacts]');
    process.exit(1);
  }
} else {
  importJob(jobArg, { importArtifacts });
}
