# Sight Magnifier

Build the Sight Magnifier XR experience described below. Implement it in the supplied application scaffold at `/workspace/app`.

## Description

The user forms a rectangular frame with opposing index fingers and thumbs to magnify only the enclosed part of the room at two-times scale. The two L-shaped hands mark diagonally opposite corners, with one palm facing the user and the other facing away. The tool provides quick, temporary enlargement without replacing the user's wider view of the room. It activates automatically as soon as the complete two-hand gesture is detected, without showing hand guides or requiring a separate start action. Moving or resizing the gesture changes the sampled area while keeping the same magnification level. The resulting view remains limited to the framed content and disappears when the gesture is released.

## User experience

- The app starts with no guide, border, or active magnification.
- Detecting the complete two-hand rectangle immediately creates a stable border between its diagonal hand corners and a 2x view limited to the enclosed scene content.
- Holding both L-shaped hands upright like the two sides of a U is not a complete rectangle and does not start the magnifier.
- Moving the gesture moves the sampled region. Widening or narrowing it resizes the frame but keeps 2x magnification.
- Breaking the gesture closes the border and magnified view immediately. Forming it again starts at the new hand position.
- The magnifier has no persistent scene state. Session restart shows no active frame or magnified view until the gesture is detected again.

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

- `magnifier-frame`: active rectangular border between hands.
- `magnified-region`: active two-times enclosed scene view.

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
