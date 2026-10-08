# Time-of-Flight Echo Mapper

Build the Time-of-Flight Echo Mapper XR experience described below. Implement it in the
supplied application scaffold at `/workspace/app`.

## Description

Time-of-Flight Echo Mapper is a room-scale visualization of how signals travel to nearby surfaces and return. The user moves a virtual probe once to choose where the scan begins. Activating the probe sends eight visible pulses outward and shows one reflected path for each direction. Every contact point receives a distance label that remains readable after the scan. The completed view keeps all hit markers and reflected paths visible for comparison.

## User experience

- The app presents a movable virtual probe source and eight inactive direction markers within reach.
- The user selects the probe with the controller ray and moves it once to choose
  the scan origin.
- Activating the probe sends eight visible pulses to the first nearby surface in each direction and creates one reflected segment for every pulse.
- After the cycle, keep eight hit markers, distance labels, and reflected segments visible. Replay clears them and returns the probe.

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

- `echo-probe-source`: movable virtual ray source.
- `activate-echo-probe`: pulse activation control.
- `replay-echoes`: clear result control.

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
