# Bezier Curve Loom

Build the Bezier Curve Loom XR experience in the supplied application scaffold at `/workspace/app`. It must provide the complete user-facing behavior described below.

## Description

Bezier Curve Loom is a spatial curve-shaping puzzle with fixed start and end points. The user moves two control handles to bend a cubic Bezier strand through three target rings. The curve and its tangent guides update continuously, making the effect of each handle easy to see. Rings change color as the strand enters or leaves their target areas. Passing through all three rings at the same time completes the pattern and advances to a new arrangement.

## User experience

- A curve frame appears within reach with fixed start and end nodes, two movable control handles, three target rings, and the first challenge pattern.
- The user pinches either handle and moves it in three dimensions; tangent guides and the curve update continuously.
- Each target ring turns green when the curve passes through its target area and amber when it does not.
- The challenge completes when all three rings are green at the same time.
- The next two patterns move the rings to preset positions while preserving the same curve controls.
- Reset returns both handles and the active pattern to their initial positions.
- Releasing a handle ends the edit at the handle's current allowed position. Reset clears the temporary guides and restores the starting handles and rings.

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

- `curve-handle`: each movable control handle. Multiple objects can use this
  tag.
- `bezier-reset`: visible control that restores the initial handle and pattern positions.

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
