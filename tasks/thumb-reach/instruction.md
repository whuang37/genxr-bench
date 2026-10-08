# Thumb Reach

Build the Thumb Reach XR experience described below. Implement it in the
supplied application scaffold at `/workspace/app`.

## Description

Thumb Reach is a simple hand-following thumb movement activity. A visible sweep
guide stays attached to the active hand instead of requiring the user to hold
the hand at one room location. Moving the thumb through the guide leaves a
short trail and builds a translucent reach envelope without rating mobility or
making a clinical assessment.

## User experience

- Show one clear sweep guide around the visible thumb of the active hand.
- Keep the guide attached to that hand as the user moves or turns the hand in
  the room.
- Sweeping the thumb through the guide leaves a visible trail that follows the
  hand.
- A broad completed sweep creates a translucent reach envelope for review.
- Replay clears the trail and envelope so the user can repeat the movement.

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

- `thumb-sweep-guide`: the hand-following thumb sweep guide.
- `thumb-reach-trail`: each persistent successful reach segment. Multiple
  objects can use this tag.

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
