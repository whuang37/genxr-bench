# Clay Prototype

Build the Clay Prototype XR experience in the supplied application scaffold at `/workspace/app`. It must provide the complete user-facing behavior described below.

## Description

Clay Prototype is a free-form spatial tool for quickly shaping a three-dimensional concept. The user first places a virtual clay puck at a reachable point, then turns it to work from any side. Pulling stretches a local area, pressing creates an indentation, and rubbing smooths nearby transitions. Each completed edit remains visible while later gestures affect only the area being touched. Undo removes the latest deformation, while Reset restores the original placed puck.

## User experience

- A placement reticle and translucent clay-puck preview float at the user's selected point in reachable space, with compact Undo and Reset controls nearby.
- The user pinches to place the puck. It becomes solid at that location and can be turned or repositioned for access to every side.
- The user pinches one point on the clay and pulls. A local part of the mesh stretches with the hand while nearby material blends smoothly into the new form.
- The user presses a fingertip into another point. A local indentation forms with visible depth and the opposite side remains substantially unchanged.
- The user makes several edits around the form. Each deformation persists while later edits affect only their contact regions.
- The user selects Undo or Reset. Undo removes only the latest deformation, while Reset restores the placed puck to its original form.
- Releasing a gesture ends the deformation at the last completed edit. The unfinished preview disappears, and Reset clears all edit feedback.

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

- `clay-puck`: placed directly deformable clay form.
- `undo-clay-edit`: latest local-edit undo.
- `reset-clay`: original-form reset.

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
