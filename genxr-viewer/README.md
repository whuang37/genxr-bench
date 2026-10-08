# GenXR Viewer

`genxr-viewer` is a local viewer for GenXR benchmark runs.

## Features

- **CLI Ingestion (`npm run import-job`)**:
  - Ingests benchmark job directories from `jobs/<job_id>`.
  - Relinks HTML import maps to CDN modules. App previews require internet access.
  - Parses `f2p.log` verifier outcomes, scores, durations, runs, and diagnostics.
  - Embeds `instruction.md` specs and tags for every trial.
  - Optional `--import-artifacts` flag to copy all artifacts (recordings, logs, judge results) into the job folder.
- **Interactive Dashboard**:
  - **Live App Preview**: Run and interact with any trial app directly in the browser.
  - **Job Videos**: Watch every imported MP4 and WebM recording from a job-wide playlist.
  - **Instructions**: Inspect the original prompt requirements and tagging rules.
  - **Test Cases & Verifier**: Examine execution results, pass/fail status per test, and diagnostic error logs.

## Usage

Use Node.js 24 and npm. Run the setup commands from the repository root.

### 1. Start the Dashboard
```bash
cd genxr-viewer
npm ci
npm run dev
```
Open the URL printed by Vite, normally `http://localhost:5173`.

### 2. Import a Job Run

In a second terminal, enter `genxr-viewer/` from the repository root:

```bash
cd genxr-viewer
npm run import-job -- ../jobs/<job-id>
```

Replace `<job-id>` with a completed job directory. Run the following command
from `genxr-viewer/` to copy trial artifacts, logs, videos, and judge results:
```bash
npm run import-job -- ../jobs/<job-id> --import-artifacts
```

The Videos button is available only for jobs imported with `--import-artifacts`.

### 3. Keyboard Shortcuts in Dashboard
- `↓` or `j`: Move to Next Trial
- `↑` or `k`: Move to Previous Trial
- `Esc`: Close open modal

## Static deployment

Import each job that the deployed viewer must contain, then build the site:

```bash
cd genxr-viewer
npm ci
npm run import-job -- ../jobs/<job-id>
npm run build
```