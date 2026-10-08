# Origami Bird

Build a simple, repeatable paper-bird hand interaction in the supplied application scaffold at `/workspace/app`.

## Description

Origami Bird is a gentle hand-motion toy built around one looping paper bird. Holding a relaxed, upward-facing open palm steady for two seconds invites the bird to fly onto that hand. Lifting the supporting hand sends the bird back into flight. The user can hold the palm open again to repeat the same landing and takeoff loop.

## User experience

- Present one paper bird flying on a short loop in front of the user.
- Let either hand control the interaction.
- When the user turns a relaxed hand palm-up and holds it steady and visible for two continuous seconds, make the bird approach and rest within 5 cm of that hand.
- Keep the bird more than 5 cm from the hand when the user holds a fist or a downward-facing open palm for two seconds.
- When the user lifts the supporting hand, make the landed bird take off, move more than 5 cm from the hand, and return to its flight loop.
- Start a new two-second landing hold after takeoff if the hand remains open and steady. Let the user repeat the loop without a separate reset action.
- If the palm closes or leaves view before two seconds, cancel that landing hold and keep the bird in flight.

## Project layout

- Build the application only in `/workspace/app`. Do not modify, replace, or
  vendor `/workspace/xrblocks`; it is the pinned, read-only XR Blocks SDK.
- Use the supplied static app scaffold and local dependencies. Do not install,
  reinstall, or vendor dependencies unless this task explicitly requires a
  dependency change.

## Tagging the app

Attach a stable tag only to the listed durable visible result: `object.userData.xrblocksDevtools = { tag: "..." }`. Tags identify scene objects; they do not replace visible behavior.

Each listed tag identifies exactly one live object unless its entry explicitly
allows multiple objects. Attach the tag to the semantic owner of the result.
Do not also attach that tag to a helper mesh or to an ancestor or descendant of
the semantic owner.

- `paper-bird`: the paper bird in both its flying and landed states.

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
