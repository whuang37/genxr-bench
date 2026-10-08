# Visibility Prototyper

Build the Visibility Prototyper XR experience described below. Implement it in the
supplied application scaffold at `/workspace/app`.

## Description

Visibility Prototyper is a simple spatial planning tool for sketching a virtual
window on a detected flat plane. Two ray clicks define opposite rectangle
corners. The completed rectangle stays flush with the plane and visualizes what
an observer outside the plane can see inside the room through that window.

## User experience

- The app starts with no window or visibility result.
- The first ray click on a detected flat plane places the first corner. The
  second ray click on the same plane selects the opposite corner.
- After the second click, create one clear rectangular window outline between
  the two points. Keep it aligned and flush with the selected plane.
- Place a virtual observation origin just outside the selected plane, centered
  on the rectangle. Cast a grid of rays from that outside origin through the
  window. The rays must continue past the window and extend into the room.
- Visualize this inward ray fan and its first hits on room surfaces or detected
  objects. The ray paths and hit marks show which parts of the room are visible
  to the outside observer through the window.
- Identify a first-hit object with its detected label when one is available.
  Otherwise identify it as a room surface. 
- The next valid plane click deletes the completed window and its inward
  visibility visualization. Treat that same click as the first corner of a new
  rectangle, then repeat the two-click creation cycle.
- If the second click is on a different plane, discard only the unfinished
  second corner and keep the app ready for a new first click.

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

- `visibility-window`: the completed rectangle on the selected plane.
- `window-inward-visibility`: the inward ray fan, first-hit marks, and visible
  object or surface labels produced through the window. Multiple objects can
  use this tag.

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
