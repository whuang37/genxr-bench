# Palm Controller

Build a two-button shape selector on the upward-facing open palm of either hand, controlled by the pointing index finger of the other hand. Implement it in the supplied application scaffold at `/workspace/app`.

## Description

Palm Controller turns either open hand into a small two-button shape selector. The interface remains hidden until the user rolls that hand so its palm faces upward; this hand then becomes the display hand. Two numbered targets appear on the display palm, and the other hand becomes the tapping hand with its index finger extended. Touching a target selects and raises its shape, while touching a finger or any space between the targets has no effect. After the user selects each target once, the two shape icons combine into a completed palm emblem.

## User experience

- The interface does not appear while both palms face away from the user or downward.
- The user can roll either relaxed, open hand until its palm faces upward. That hand becomes the display hand, and two numbered targets appear on its palm with no active shape.
- The other hand becomes the tapping hand. The user extends its index finger and touches one numbered target with that fingertip.
- A valid tap raises the selected shape above the display palm and shows its confirmation outline in front of the hand. No additional matching action is required.
- Touching one of the display hand's fingers or touching between targets changes nothing.
- The app presents the exact visible status `Selected shape 1` or `Selected shape 2` for the current selection.
- After both targets have been selected once, join their icons into one palm emblem. Closing the display hand into a fist and reopening it clears the emblem and restores the two unused targets.

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

- `palm-target-1` and `palm-target-2`: the two selection targets.

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
