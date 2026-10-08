# Hand Fire

Build a two-hand elemental toy that renders a separate flame above each tracked palm and combines them through a timed two-hand gesture. Implement it in the supplied application scaffold at `/workspace/app`.

## Description

Hand Fire is a two-hand visual-effects toy with a different colored flame above each palm. The left hand carries a blue flame, and the right hand carries an orange flame. Pinching one hand concentrates only its matching flame into a bright fingertip stream. Bringing both streams together creates a temporary fire orb that holds briefly between the hands. Releasing either pinch returns that hand's flame to its open-palm form.

## User experience

- The app opens with a blue flame above the tracked left palm and an orange flame above the tracked right palm in a clear reach volume.
- Pinching either hand concentrates only that hand's flame into a bright stream at its fingertips. The other hand's flame keeps its current form.
- Holding both pinched streams together continuously for one second merges them into one visible fire orb with a success ring.
- Keep the orb for five seconds. Opening both hands after the orb appears clears it and restores both palm flames.
- Cancel the one-second merge if either stream separates. Keep the remaining visible flame in its current form.

## Project layout

- Build the application only in `/workspace/app`. Do not modify, replace, or
  vendor `/workspace/xrblocks`; it is the pinned, read-only XR Blocks SDK.
- Use the supplied static app scaffold and local dependencies. Do not install,
  reinstall, or vendor dependencies unless this task explicitly requires a
  dependency change.

## Tagging the app

No DevTools tags are required for this app. Evaluation uses the visible hand
flames and merged fire effect directly.

## Provided workspace and resources

- `/workspace/app` contains the static starter application. Its `index.html`
  and `main.js` are the application source. Run `npm run dev` from that directory
  for a development preview. DevTools serves the files directly during
  verification; no app build step is required.
- `/workspace/xrblocks` contains the buildable XR Blocks source tree, public
  documentation, samples, templates, skills, and local assets. Treat it as
  read-only reference material.
- Center your implementation on XR Blocks conventions. Learn more about XR
  Blocks in `/workspace/xrblocks/docs` and `/workspace/xrblocks/skills`.
- `xrblocks-devtools` is installed on `PATH` and includes the browser-based XR
  simulator and inspection tools. Run `xrblocks-devtools --help` to list its public
  commands. Do not modify the internal source code.
- Dependencies and XR Blocks assets are already available locally. Network
  access can be restricted; use supplied local resources.
