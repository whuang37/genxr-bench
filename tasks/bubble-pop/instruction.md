# Bubble Pop

Build the Bubble Pop XR experience in the supplied application scaffold at `/workspace/app`. It must provide the complete user-facing behavior described below.

## Description

Bubble Pop is a simple hand-tracking game set in a small play area. The user
selects Play to start a round of ten bubbles that slowly float upward while a
counter shows the user's score. Contact with any part of either tracked hand
removes a bubble and adds one point. Bubbles also pop without scoring when they
touch any detected room surface. The round ends when no bubbles remain.

## User experience

- The app opens with a visible, ray-selectable Play button and no active bubbles.
- Selecting Play hides the button, creates ten bubbles that slowly float upward
  in a comfortable play area, and shows a visible `0 of 10 hand pops` score.
- Contact with any part of either tracked hand removes a bubble and increments the score once. After the first hand pop, display `1 of 10 hand pops`.
- A bubble also pops when it touches any detected room surface, including the walls, floor, or ceiling. A surface pop does not increment the score.
- A hand that does not reach a bubble changes nothing. Each bubble can score only once.
- When no active bubbles remain, the game ends and shows a completion bubble with the final hand-pop score.
- Clicking the completion bubble restores ten bubbles and resets the score.

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

- `play-button`: the ray-selectable control that starts the first round.
- `bubble`: each active bubble. Multiple objects can use this tag; the verifier
  selects one object by ID.

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
