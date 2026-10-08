# Digital Beerpong

Build the Digital Beerpong XR experience in the supplied application scaffold at `/workspace/app`. It must provide the complete user-facing behavior described below.

## Description

Digital Beerpong is a spatial throwing game with six virtual cups and ten attempts. The cups automatically appear on a detected horizontal surface when the app starts, with no placement or registration step. Pinching spawns a ball in the user's hand, and opening the hand releases it with the hand's throw velocity. Balls collide with cups and the surrounding room, bounce with visible physical motion, and score when they enter a cup. A ball disappears after it travels too far across the floor or other surroundings. The round ends when all cups are cleared or all ten balls have been used.

## User experience

- On load, six cups appear in a fixed layout on a suitable detected horizontal surface. The user does not confirm, register, or place the cup layout.
- The persistent UI starts at `10 balls remaining` and `0 cups scored`, with Replay available. No ball exists before the user pinches.
- Pinching with either empty hand spawns one ball at that hand and holds it while the pinch remains closed. Opening the hand releases the ball with the hand's current velocity.
- Released balls use gravity and collide with detected horizontal and vertical room surfaces. They visibly bounce or roll when they hit the table, floor, walls, or other surroundings.
- A ball entering a cup marks that cup as scored, displays `1 cup scored` after the first valid hit, and then removes that resolved ball. Every released ball consumes one remaining-ball marker whether it scores or misses.
- A released ball that travels away from the cups disappears within four seconds. It adds no score and leaves no stale ball behind.
- Opening the hand without a spawned ball does nothing.
- If ten balls resolve before all six cups score, show a loss panel and the scored-cup count. When all six score, show a win panel with remaining balls.
- Clicking Replay at any time removes active balls and restores the six-cup layout, `10 balls remaining`, and `0 cups scored`.

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

- `beerpong-cup`: each cup in the fixed six-cup layout. Multiple objects can use
  this tag; the verifier selects one object by ID.
- `beerpong-ball`: each active held or released ball. Multiple objects can use
  this tag.
- `beerpong-replay`: the visible Replay control.

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
