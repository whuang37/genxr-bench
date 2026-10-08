# Butterfly Flight

Build the Butterfly Flight XR experience in the supplied application scaffold at `/workspace/app`. It must provide the complete user-facing behavior described below.

## Description

A gentle wrist-control practice places a butterfly above the hand and six wide rings in a fixed reachable arc. It gives users a playful way to practice deliberate wrist rotation and observe how smoothly the movement changes over time. Closing either hand into a fist starts the interaction. Rotating that wrist steers the butterfly, while a visible trail responds directly to the motion. Opening the active hand stops and resets the interaction at any time. The wide route supports slow, repeatable practice without scoring injury, mobility, or recovery. When all six rings are passed, the butterfly settles on the hand and the complete movement trail remains visible.

## User experience

- A butterfly, six wide rings in a fixed arc, and an empty smoothness trail are visible while the app waits to start.
- Closing either hand into a fist starts the interaction and makes that hand active.
- With the fist closed, the user rotates the active wrist to guide the butterfly through the active ring.
- The ring turns green and the butterfly adds one segment to the visible movement trail.
- When all six rings are passed, the butterfly settles on the hand and the complete movement trail remains visible.
- Opening the active hand stops the interaction at any time, restores six uncleared rings, and clears the movement trail.
- Closing either hand into a fist starts a fresh attempt with that hand, including after a reset or completion.

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

- `wrist-butterfly`: butterfly following active wrist.
- `butterfly-flight-ring`: one of six wide arc rings. Multiple objects can use
  this tag.
- `butterfly-completion`: settled-on-hand result.

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
