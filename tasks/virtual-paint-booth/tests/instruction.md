# Virtual Paint Booth

Build a simple room-scale spray-painting tool in the supplied application
scaffold at `/workspace/app`.

## Description

Virtual Paint Booth turns either hand into a virtual spray can. Pinching sprays
paint onto the sensed room environment. A fist gesture cycles the selected paint
color. Reset clears the room and restores the initial color.

## User experience

- Start with no paint, a visible selected paint color, and a visible Reset
  button. These are the persistent controls for the painting workspace.
- Let either hand aim a virtual spray can at the sensed environment. Pinching
  holds the can trigger and releasing the pinch stops it.
- While the trigger is held, show a short-lived cone or mist of paint droplets
  from the hand toward the hit surface. Deposit paint only where that spray hits
  sensed room geometry.
- Make deposited paint look like spray paint. Use soft, speckled, or misted
  edges instead of a solid pen ribbon. Keep finished paint fixed to the receiving
  surface.
- When a hand is not spraying, each completed fist gesture advances through a
  small set of distinct paint colors. Show the selected color on the virtual can
  or a small color indicator. The new color affects later paint only.
- Reset removes all finished paint and restores the initial selected color.
- Stop spraying when the pinch opens or the spray no longer hits sensed
  geometry. Do not create paint in empty space.

## Project layout

- Build the application only in `/workspace/app`. Do not modify, replace, or
  vendor `/workspace/xrblocks`; it is the pinned, read-only XR Blocks SDK.
- Use the supplied static app scaffold and local dependencies. Do not install,
  reinstall, or vendor dependencies unless this task explicitly requires a
  dependency change.

## Tagging the app

Attach a stable tag only to each listed user-facing control or durable visible
result: `object.userData.xrblocksDevtools = { tag: "..." }`. Tags identify scene
objects; they do not replace visible behavior.

Each listed tag identifies exactly one live object unless its entry explicitly
allows multiple objects. Attach the tag to the semantic owner of the control,
target, or result. Do not also attach that tag to a helper mesh or to an
ancestor or descendant of the semantic owner.

- `reset-button`: the ray-selectable Reset button.

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
