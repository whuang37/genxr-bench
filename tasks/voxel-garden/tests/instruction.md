# Voxel Garden

Build a simple environment planting toy in the supplied application scaffold at
`/workspace/app`.

## Description

Voxel Garden grows a small voxel flower wherever the user clicks sensed room
geometry. Each flower stays where it was planted. There are no fixed planting
locations, goals, or completion state.

## User experience

- Ray-click any valid point on sensed room geometry to plant there.
- Show a short, simple voxel growth animation from the clicked point into a
  recognizable flower with a stem, leaves, and bloom.
- Keep every grown flower attached to its selected surface. Orient its stem away
  from that surface.
- Let the user plant any number of flowers. Each valid click creates exactly one
  new flower and does not change existing flowers.
- A click that hits no sensed surface creates nothing.

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

- `voxel-flower`: every durable grown flower. Multiple flowers can share this
  tag.

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
