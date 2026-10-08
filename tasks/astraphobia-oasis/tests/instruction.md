# Astraphobia Oasis

Build the Astraphobia Oasis XR experience in the supplied application scaffold at `/workspace/app`. It must provide the complete user-facing behavior described below.

## Description

A nonclinical storm-grounding studio places one virtual storm window on a nearby wall. The user traces four slow hand-guided shapes, and each completed shape visibly reduces the storm intensity. A clearly available Reset control restores the first step and the initial storm intensity. Completing all four shapes changes the window into a calm rain view and displays a completed practice mark without making a therapeutic claim.

## User experience

- A wall-aligned storm window, four grounding-shape outlines, a clearly marked
  starting point on the active outline, and a clearly available Reset control
  are visible.
- The user pinches and traces the active grounding shape.
- The shape fills with light and the storm window advances one step toward calm rain.
- If the trace leaves the shape, the current trace clears and the storm intensity does not decrease.
- When all four grounding shapes are complete, the storm window becomes a calm rain view and displays a completed practice mark.
- Clicking Reset clears all shape progress, restores the initial storm intensity, and activates the first grounding shape.
- Releasing the pinch or leaving the shape corridor clears the partial trace and leaves storm intensity unchanged.

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

- `storm-window`: wall-aligned changing storm view.
- `grounding-shape`: active tracing outline.
- `grounding-trace-start`: visible starting point on the active tracing outline.
- `storm-reset-control`: resets the storm and shape progress to the first step.
- `storm-practice-mark`: calm-rain completion.

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
