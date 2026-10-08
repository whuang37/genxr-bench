# Wall Darts

Build a simple wall-darts experience in the supplied application scaffold at
`/workspace/app`.

## Description

Wall Darts lets the user place a dartboard on a sensed wall and throw virtual
darts with natural hand velocity. Pinching creates and holds a dart. Opening the
hand releases it. Board hits stick and increase the score. Replay clears the
darts and score without moving the board.

## User experience

- Start with no dartboard, no dart, a visible score of zero, and a visible Replay
  button.
- Ray-click a valid sensed wall position to place one dartboard centered at that
  point. Mount it flat to the wall and keep it upright. A click on a non-wall
  surface creates nothing.
- After placement, pinching with either empty hand creates one dart at that hand
  and holds it while the pinch stays closed.
- Opening the hand releases the dart with the hand's current velocity. A quick
  forward hand translation must produce a faster throw than a slow translation
  over the same path.
- Apply gravity and room collision to released darts. Remove missed darts after
  they leave the practical play area.
- When a dart tip enters the board, stop its physics, leave it visibly stuck at
  the hit point, and add the visible value of that scoring zone to the total.
- Replay removes every held, flying, or stuck dart and restores the score to
  zero. Keep the placed dartboard at its current wall position.
- Do not add throw limits, target totals, win or loss states, remaining-dart
  markers, or final result controls.

## Project layout

- Build the application only in `/workspace/app`. Do not modify, replace, or
  vendor `/workspace/xrblocks`; it is the pinned, read-only XR Blocks SDK.
- Use the supplied static app scaffold and local dependencies. Do not install,
  reinstall, or vendor dependencies unless this task explicitly requires a
  dependency change.

## Tagging the app

Attach a stable tag only to each listed user-facing control, interaction target,
or durable visible result:
`object.userData.xrblocksDevtools = { tag: "..." }`. Tags identify scene
objects; they do not replace visible behavior.

Each listed tag identifies exactly one live object unless its entry explicitly
allows multiple objects. Attach the tag to the semantic owner of the control,
target, or result. Do not also attach that tag to a helper mesh or to an
ancestor or descendant of the semantic owner.

- `dartboard`: the single placed wall target.
- `dart`: the current held, flying, or stuck dart.
- `dart-score`: the visible score counter. Its rendered text contains the
  current numeric total.
- `replay-button`: the ray-selectable Replay button.

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
