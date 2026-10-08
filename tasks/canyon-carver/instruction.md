# Canyon Carver

Build the Canyon Carver XR experience in the supplied application scaffold at `/workspace/app`. It must provide the complete user-facing behavior described below.

## Description

Canyon Carver is a mixed-reality runoff puzzle that turns a tabletop into a small landscape. The user rearranges ordinary objects to build channels between a water spout and an outlet cup. A subtle contour shows how the current layout shapes the terrain. Releasing the water sends a group of visible beads across the table and leaves short trails behind them. The user succeeds by guiding most of the water into the outlet instead of letting it collect elsewhere.

## User experience

- A virtual spout appears near one side of the table, with a virtual outlet cup and counter opposite it. The live surface shape is visible as a subtle contour. The experience does not use a visible runoff frame or boundary.
- The outlet cup can be selected and moved with the controller ray. The spout stays fixed. Moving the cup also moves its capture volume and counter.
- The user moves ordinary tabletop objects to form a channel, and the contour updates to match the current surface shape.
- The user clicks the spout handle to release ten virtual water beads.
- Beads collide with the current surface shape, leave short visible trails, and either enter the outlet cup or continue away from it. A bead disappears after it leaves the active tabletop area or travels beyond a safe distance.
- A counter on the outlet shows the captured total; eight or more captured beads complete the experiment.
- Reset removes beads and trails while keeping the current physical arrangement for another release.
- The counter always reports the number of beads captured at the cup's current position.
- Releasing the cup or moving the controller out of view ends that move and leaves the cup at its latest allowed position. Nearby stopped beads and trails remain until Reset clears them; beads that travel too far disappear automatically.

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

- `spout-handle`: the primary control or interaction target for the core operation.
- `outlet-cup`: the movable virtual outlet and its visible captured counter.
- `reset-button`: the control that removes the current beads and trails and resets the captured counter.

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
