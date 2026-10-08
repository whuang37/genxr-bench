# Wall Aquarium

Build a simple wall-aquarium placement toy in the supplied application scaffold
at `/workspace/app`.

## Description

Wall Aquarium places small animated aquarium windows wherever the user clicks a
sensed wall. Each aquarium mounts flat to the wall and remains upright. Clicks on
the floor, tables, and other non-wall surfaces create nothing.

## User experience

- Ray-click a valid sensed wall to place one compact aquarium centered at the hit
  point.
- Keep the aquarium face flush with the wall while keeping its top edge level
  with the room. Do not tilt or roll it to follow an uneven click orientation.
- Make each placed aquarium clearly recognizable with a frame, water, plants,
  and a few simple animated fish.
- Let the user place multiple aquariums. Each valid wall click creates exactly
  one new aquarium and does not change existing aquariums.
- Reject clicks on the floor, ceiling, tables, furniture, and empty space. These
  clicks must not create or move an aquarium.

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

- `wall-aquarium`: every durable placed aquarium. Multiple aquariums can share
  this tag.

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
