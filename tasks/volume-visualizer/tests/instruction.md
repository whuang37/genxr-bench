# Volume Visualizer

Build a simple spatial shape visualizer in the supplied application scaffold at
`/workspace/app`.

## Description

Volume Visualizer lets the user define a three-dimensional form with points in
the room. Each completed pinch places one endpoint at the pinch position. The
app connects the outermost points into one continuously updated widest-fit shape.
A Reset button clears the result.

## User experience

- Start with an empty space and one visible Reset button.
- A completed pinch at any reachable position creates one small, clear endpoint
  marker at that position. Holding one pinch must not create repeated points.
- Update the connection after every new point. Show a line for two points, a
  filled outline for three points, and a closed three-dimensional shape after
  four or more non-coplanar points.
- Build the three-dimensional result as the convex hull of the placed points.
  Connect the outermost points with clear edges and lightly translucent faces so
  the full shape remains readable from different viewpoints.
- After four or more non-coplanar points create a closed hull, show its current
  volume in cubic meters on one readable label directly above the shape. Update
  the value and label position whenever the hull changes.
- Keep all placed point markers visible. A point inside the current hull remains
  visible but does not become an outer corner.
- Reset removes all points and the connected shape.

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
