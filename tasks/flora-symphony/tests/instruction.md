# Flora Symphony

Build a mixed-reality wall-drawing toy that lets a user grow and open bioluminescent flowers along a freehand root. Implement it in the supplied application scaffold at `/workspace/app`.

## Description

Flora Symphony is a spatial drawing activity that grows flowers along a user-created wall route. The user drags from a seed across a nearby wall to form one continuous glowing root. Unnumbered buds emerge along the root as it becomes longer. Each selected bud opens into a small bioluminescent flower. Opening every generated bud creates one much larger flower at the drawn end of the root. Selecting the seed clears the plant and starts a new route.

## User experience

- Root drawing follows controller-ray hits on an existing sensed room wall. Place the seed, root, buds, and flowers directly against that wall. Do not create a virtual wall, board, panel, or other backing surface.
- The app opens with one visible seed control with no root, buds, or flower.
- Holding ray selection on the seed and dragging across valid wall hits creates one continuous glowing root. The route follows the drag directly and does not use a fixed endpoint or route-end guide.
- Unnumbered buds spawn naturally along the root as it gains length. Use consistent minimum spacing so longer roots create more buds; do not require a fixed bud count.
- If the trace leaves the nearby surface, show a red invalid preview and do not add a floating root segment.
- Selecting any bud opens it into a small bioluminescent flower. Open buds remain attached to the root and can be selected in any order.
- When every bud currently generated along the root is open, create one much larger bioluminescent flower at the drawn end and give the root a finished glow.
- Selecting the seed clears the current root, buds, and flower and permits a new route.
- The wall, seed, preview, route, buds, and flowers remain visible while active. If ray selection ends, keep only the part of the route already drawn on the wall.

## Project layout

- Build the application only in `/workspace/app`. Do not modify, replace, or
  vendor `/workspace/xrblocks`; it is the pinned, read-only XR Blocks SDK.
- Use the supplied static app scaffold and local dependencies. Do not install,
  reinstall, or vendor dependencies unless this task explicitly requires a
  dependency change.

## Tagging the app

Attach a stable tag only to each listed user-facing control, interaction target,
or durable visible result: `object.userData.xrblocksDevtools = { tag: "..." }`.
Tags identify scene objects; they do not replace visible behavior.

Each listed tag identifies exactly one live object unless its entry explicitly
allows multiple objects. Attach the tag to the semantic owner of the control,
target, or result. Do not also attach that tag to a helper mesh or to an
ancestor or descendant of the semantic owner.

- `seed-control`: the visible seed and reset control.
- `bud`: every generated unopened bud. Multiple objects can use this tag.
  Remove the tag when that bud opens into a small flower.

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
