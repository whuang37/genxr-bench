# Sweep Assist AR

Build the Sweep Assist AR XR experience described below. Implement it in the
supplied application scaffold at `/workspace/app`.

## Description

Sweep Assist AR is a cleaning-coverage guide that shows which parts of a floor still need attention. A small highlight follows the supplied broom head and indicates when it is in contact with the floor. Sweeping records a visible cleaned path and reduces the remaining-area percentage. Passing over the same place again does not count it twice, so the display reflects actual coverage. A Reset control clears the recorded path and starts a new cleaning pass.

## User experience

- The app presents a remaining-area floor overlay, remaining percentage, and floating Reset control.
- A compact floor-contact highlight follows the supplied broom head and matches its horizontal position and orientation.
- Valid floor contact records a surface-conforming cleaned path and decreases the remaining percentage without counting an area twice.
- Lifting the broom or leaving the tracked floor records no new path. Reset clears paths and restores the full remaining overlay.

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

- `reset-coverage`: coverage reset control.

## Recognized objects

The object detector returns the physical objects listed below. The quoted text
is the exact label returned for each detected object.

- `"Broom head"` - The physical broom head used to track the swept path.

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
