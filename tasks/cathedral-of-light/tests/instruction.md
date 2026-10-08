# Cathedral of Light

Build the Cathedral of Light XR experience in the supplied application scaffold at `/workspace/app`. It must provide the complete user-facing behavior described below.

## Description

Cathedral of Light is a wall-based stained-glass puzzle with five colored pieces. The user takes pieces from a nearby tray and fits them into a window outline. Each piece can be moved until its shape matches the correct opening. Valid placement locks the glass into the design, while a poor match remains available for another attempt. Completing the window creates a simple colored-light projection on the floor.

## User experience

- The user selects and moves each glass piece with the controller ray. Pieces stay upright and do not need rotation.
- A five-slot window outline appears flush with the wall, with five glass pieces on a tray in front of it.
- The user moves a glass piece near a wall slot. The slot highlights when the shape and position match.
- The user releases a piece over the wrong slot. The slot flashes red and the piece returns to the tray.
- The user places all five pieces correctly. The window becomes complete and colored floor patches appear in matching positions.
- The pattern completes. A completion border traces the window.
- The user selects replay. Replay returns all pieces to the tray.
- Ending the ray selection ends the move. An unmatched piece stays available, and any unfinished slot highlight disappears.

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

- `glass-piece`: each movable glass piece. Multiple objects can use this tag;
  every tagged piece must support the same select and move interaction.
- `window-slot`: each visible placement target. Multiple objects can use this
  tag; every tagged slot must accept its compatible glass piece.

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
