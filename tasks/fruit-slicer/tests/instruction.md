# Fruit Slicer

Build a hand-slicing arcade game with a seeded round of twelve targets that appear around the user. Implement it in the supplied application scaffold at `/workspace/app`.

## Description

Fruit Slicer is a hand-slicing arcade game with a short twelve-target round. The user selects Play Game, then turns and cuts fruit that pops into reachable arcs from varied positions around the play area. Quick hand motions split fruit, while three bombs require the user to control each swing. Split effects, score, lives, and a resolved counter make every outcome visible. Resolving all targets or losing all lives produces a clear final result with the user's score.

## User experience

- The app opens with a visible Play Game button, three life markers, a `0 of 12 resolved` counter, and no active targets.
- Selecting Play Game starts the seeded twelve-target round and promptly launches the first target. Fruit and bombs pop into reachable arcs from varied positions all around the user, and the round includes exactly three bombs.
- A sufficiently fast hand crossing splits a fruit into short-lived halves, increases score, and advances the resolved counter. After the first fruit resolves, display `1 of 12 resolved`.
- Crossing a bomb empties one life marker, adds no score, and visibly resolves the bomb.
- After the twelfth target resolves, stop spawning and show the final score with a win or loss state.
- Touching play again clears old targets and restarts the same seeded round with three lives and zero resolved targets.
- Keep each active target within a safe hand reach after the user turns toward it.

## Project layout

- Build the application only in `/workspace/app`. Do not modify, replace, or
  vendor `/workspace/xrblocks`; it is the pinned, read-only XR Blocks SDK.
- Use the supplied static app scaffold and local dependencies. Do not install,
  reinstall, or vendor dependencies unless this task explicitly requires a
  dependency change.

## Tagging the app

Attach a stable tag only to each listed user-facing control, interaction target,
or durable visible result: `object.userData.xrblocksDevtools = { tag: "..." }`.
Tags identify scene objects; they do not replace visible behavior.

Each listed tag identifies exactly one live object unless its entry explicitly
allows multiple objects. Attach the tag to the semantic owner of the control,
target, or result. Do not also attach that tag to a helper mesh or to an
ancestor or descendant of the semantic owner.

- `play-game`: the control that starts the round.
- `fruit`: every active fruit target uses this shared tag. Multiple objects can
  use this tag.
- `bomb`: every active bomb target uses this shared tag. Multiple objects can
  use this tag.
- `life-markers`: the visible three-life display.
- `resolved-counter`: the visible round counter.

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
