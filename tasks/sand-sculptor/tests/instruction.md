# Sand Sculptor

Build an XR sand-sculpting toy controlled by the user's two hands. Implement it in the supplied application scaffold at `/workspace/app`.

## Description

Sand Sculptor is a two-hand creative toy that uses a detected horizontal surface in the user's real environment, such as a table. Pinching with the right hand releases a visible stream of sand from the fingertips. Sand accumulates on the detected surface where the stream lands, so it gradually forms persistent mounds with visible depth. A click from the left hand creates one bead above the accumulated sand. Each bead falls under gravity into the current sand shape and settles in or becomes partly embedded in it. The sand and beads also react physically when either hand touches or pushes them.

## User experience

- The app opens with a detected horizontal environment surface ready for sculpting, with no falling sand or beads. Do not add a floating sand bed, tray, or replacement surface.
- Pinching with the right hand starts a continuous fingertip sand stream. Opening that hand stops the stream.
- Sand visibly accumulates on the detected surface at the impact point while the stream continues. The raised sand remains after the pinch ends and becomes part of the collision surface.
- Each left-hand click creates one clearly visible bead above the accumulated sand.
- A bead falls directly into the current sand shape and settles in or becomes partly embedded in it. A bead that lands only on the bare detected surface or passes through the sand does not satisfy this requirement.
- Touching or pushing the sand with either hand visibly displaces it. Hand contact also pushes or deflects beads instead of passing through them.

## Project layout

- Build the application only in `/workspace/app`. Do not modify, replace, or
  vendor `/workspace/xrblocks`; it is the pinned, read-only XR Blocks SDK.
- Use the supplied static app scaffold and local dependencies. Do not install,
  reinstall, or vendor dependencies unless this task explicitly requires a
  dependency change.

## Tagging the app

No DevTools tags are required for this app. Evaluation uses the visible sand
accumulation and bead motion directly.

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
