# Quantum Double Slit Bench

Build the Quantum Double Slit Bench XR experience described below. Implement it in the
supplied application scaffold at `/workspace/app`.

## Description

Quantum Double-Slit Bench is an interactive demonstration of how slit spacing changes an interference pattern. A floating emitter and two movable slit plates project visible fringes onto a nearby wall. The user slides a plate along its rail and sees the wall pattern update immediately. A marked target gives the learner a clear fringe position to match. Correct spacing places a bright fringe over the target and displays the completed arrangement.

## User experience

- The user selects and adjusts each slit plate with the controller ray.
- An emitter and two movable slit plates float in a comfortable workspace in front of the user, while a target marker and fringe pattern appear on the selected wall.
- The user slides one slit plate along the floating rail. The slit spacing changes and the wall fringes update immediately.
- The user sets a spacing that misses the wall target. The nearest bright fringe and target show a visible offset.
- The user adjusts the plates until a bright fringe overlaps the target. The target fills and the current spacing locks as the solution.
- The user changes the spacing. The target clears when alignment is lost.
- The user selects replay. Replay returns both plates to their initial marks.
- If ray selection ends unexpectedly, leave the plate at its current allowed position and keep the matching fringe pattern visible.

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

- `slit-plate`: each draggable slit-plate interaction surface. Multiple objects
  can use this tag; every tagged object must perform the same spacing control.
- `slit-spacing-stop`: the target slit-spacing stop.
- `slit-replay`: the replay control that restores both plates to their initial
  marks.

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
