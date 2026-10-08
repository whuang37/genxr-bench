# Catch the Ring

Build the Catch the Ring XR experience in the supplied application scaffold at `/workspace/app`. It must provide the complete user-facing behavior described below.

## Description

Catch the Ring is a quick hand-tracking game about reaching through moving targets. A sequence of twelve rings approaches within a clear play area while a score counter and three life markers remain visible. Passing a hand through a ring's center creates a green burst and adds a point. Touching only the rim creates a red miss and removes one life. The round ends with a result panel that shows the final score and a clear win or loss.

## User experience

- The app starts with a visible Start button, a `0 of 12` score counter, three
  full life markers, and no active ring sequence.
- Ray-clicking Start hides the button and starts a fixed twelve-ring sequence in
  a clear reach volume.
- Passing either hand through an incoming ring center contracts it into a green burst and adds one score. After the first center pass, display `1 of 12`.
- Touching only the ring rim turns it red, empties one life marker, and adds no score. Missing a ring resolves it without awarding a center pass.
- When all twelve rings resolve, show a result panel with the final score and a clear win or loss.
- Touching Play Again restarts the same sequence with zero score, three lives, and the first incoming ring.

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

- `incoming-ring`: each center-pass or rim-contact target. Multiple objects can
  use this tag; the verifier selects one object by ID.
- `start-button`: the ray-selectable control that starts the ring sequence.
- `score-counter`: durable resolved-ring score display.

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
