# Shape Unfolder

Build the Shape Unfolder XR experience described below. Implement it in the
supplied application scaffold at `/workspace/app`.

## Description

Shape Unfolder is a spatial geometry puzzle about the relationship between solids and flat nets. The learner pulls an unfold handle to open a solid along its edges. The faces settle into one flat arrangement that can be moved toward three candidate outlines. A correct match turns green and locks into place, while a wrong choice returns for another try. Completing the sequence helps the learner compare several solid-to-net relationships.

## User experience

- The user selects and pulls the unfold handle with the controller ray.
- One solid, its unfold handle and stop, and three candidate net outlines remain within reach.
- Pulling the handle to the stop hinges the cube faces along preset edges into one flat, nonoverlapping net.
- Placing the net over a match turns the outline green and locks it. A wrong outline turns amber and returns the net beside the candidates.
- Continue with tetrahedron and octahedron cards, each with three candidates. Reset refolds the active solid and clears candidate feedback.
- If ray selection ends unexpectedly, return the solid or net to its previous state and do not award a match.

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

- `unfold-handle`: the primary control or interaction target for the core operation.
- `unfold-end-stop`: the fully unfolded end stop.

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
