# Tape Measure

Build the Tape Measure XR experience described below. Implement it in the
supplied application scaffold at `/workspace/app`.

## Description

Tape Measure is a ray-based spatial tool for measuring between any two points on
detected room surfaces. The experience starts without a measurement line so the
user can choose a clear starting point. A ray click anywhere on a detected
surface places a durable marker at the hit point. Aiming at another detected
surface previews a live line and readable distance label. Clicking again keeps
the completed line, both markers, and the final measurement visible.

## User experience

- The detected room surfaces are available for measurement, with no line or
  endpoint present at launch. No supplied virtual target is required.
- Aiming the hand ray anywhere on a detected floor, wall, table, or other room
  surface and clicking places a start marker at the raycast hit.
- Aiming at any other detected-surface point shows a live line ending at the
  current raycast hit and a facing distance label. Clicking finalizes the
  endpoint.
- A ray click that does not hit a detected surface does not create or finalize
  a measurement.
- A visible Units control shows the current unit. It starts in meters and each
  ray click cycles through `m`, `cm`, `in`, and back to `m`.
- Changing units converts only the numeric label. The line and endpoints remain
  fixed.
- Ray-clicking Clear removes both points, the label, and the line. A later first
  ray click starts a fresh measurement.

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

- `measurement-unit-control`: visible control that displays and changes units.
- `clear-measurement`: clear control.

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
