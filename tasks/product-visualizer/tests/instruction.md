# Product Visualizer

Build the Product Visualizer XR experience described below. Implement it in the supplied application scaffold at `/workspace/app`.

## Description

Product Visualizer is a spatial sizing tool for a single variable-size box. The box appears at real-world scale on the supplied placement surface with a nearby control panel. The user can change its X, Y, and Z dimensions, rotate it with panel buttons, and drag it to another position on the surface. Resizing adjusts the box upward so its base remains in contact with the surface instead of sinking into it or floating. A visible fit mark follows the box, starts blue while the current position is clear, and turns red when the box collides with nearby geometry.

## User experience

- The app places one visible box on the supplied placement surface and shows a compact control panel beside it.
- The panel displays the current X, Y, and Z dimensions in meters. Each dimension has separate decrease and increase buttons.
- Changing any dimension resizes the box and its outline while keeping the bottom face resting on the placement surface.
- The panel provides separate rotate-left and rotate-right buttons. Each press rotates the box around the surface normal without lifting it from the surface.
- The user can ray-select and drag the box to another valid point on the placement surface. The box follows the drag across the world and settles with its bottom face on the selected surface point.
- The fit mark remains aligned with the box as it resizes, rotates, and moves. It is blue when the box is clear and turns red when the box intersects an obstacle, room geometry, or the edge of the valid surface.
- A collision does not move the box automatically. Keep it at the current surface position and keep it movable so the user can resolve the overlap.
- If the hand leaves view during a drag, cancel that unfinished movement and keep the box at its last valid surface position.

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

- `variable-box`: the visible resizable and draggable box.
- `box-fit-mark`: the box-aligned fit indicator that changes from blue to red during a collision.
- `box-size-x-decrease` and `box-size-x-increase`: the X-dimension buttons.
- `box-size-y-decrease` and `box-size-y-increase`: the Y-dimension buttons.
- `box-size-z-decrease` and `box-size-z-increase`: the Z-dimension buttons.
- `box-rotate-left` and `box-rotate-right`: the two rotation buttons.

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
