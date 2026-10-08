# Connect the Dots

Build the Connect the Dots XR experience in the supplied application scaffold at `/workspace/app`. It must provide the complete user-facing behavior described below.

## Description

Connect the Dots is a spatial drawing activity with six numbered points. The user traces between consecutive points to build a glowing outline one segment at a time. Correct segments remain visible and move the activity to the next number. An out-of-order connection turns red and fades without removing completed work. Finishing all five segments fills the figure with color and shows a solved state.

## User experience

- The user draws each connection through controller-ray hits on the numbered dots.
- The app presents six ordered points on one existing sensed room surface with an empty figure and a `0 of 5 segments` status. Place every dot directly against that sensed surface. Do not create a virtual wall, board, panel, or other backing surface. Each point has a large, persistent number label from `1` through `6` directly above it. Labels face the user, remain readable, and do not overlap their dots or each other.
- The active point and the next numbered point are visually distinct, so the required connection order is always clear.
- The user holds ray selection on the active point and traces to the next point. A correct trace locks one visible segment and advances the active endpoint.
- Releasing away from the next point or tracing to the wrong point cancels the current trace without adding a segment.
- Display `1 of 5 segments` after the first correct connection. Retained segments remain registered to the selected surface.
- After all five segments are complete, fill the figure with color and show a solved state.
- Selecting the solved figure clears all segments but preserves the same six preset points for replay.

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

- `dot-1` through `dot-6`: ordered surface-tracing endpoints.

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
