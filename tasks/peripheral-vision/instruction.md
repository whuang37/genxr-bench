# Peripheral Vision

Build a nonclinical visual-attention practice with a center marker and six side targets in a fixed arc. Implement it in the supplied application scaffold at `/workspace/app`.

## Description

Peripheral Vision is a six-trial visual-awareness practice with targets placed around a central marker. It gives users a structured way to practice noticing changes away from the center of view while keeping the head still. The user responds when a side target changes shape, and that same target changes color to show a correct response. Moving outside the head guide pauses valid responses until the user returns to the intended position. The final results describe only the completed practice trials and do not assess or diagnose vision.

## User experience

- The app presents a center marker, a head-direction guide, six side target positions, and a `0 of 6` counter.
- Tag all six side targets as `side-attention-target` and keep the same target objects throughout the practice.
- Keeping the head guide green and pinching after one side target changes shape turns that same target green and advances the correct-response score.
- Each response window lasts no longer than 15 seconds. If the user does not pinch before it ends, show `Missed` feedback and do not increase the score.
- After six preset trials, show a summary of correct and missed responses without a medical interpretation.
- Touching Practice Again restores the same six-trial sequence and counter.
- Pause the trial when the head moves outside the guide or cannot be seen. Keep the active target and completed results visible.

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

- `center-marker`: the fixed central gaze marker.
- `head-direction-guide`: the visible valid-head-direction guide.
- `side-attention-target`: each of the six durable side targets. Multiple
  objects can use this tag. Keep it while a target changes shape or color.
- `attention-practice-summary`: the final nonclinical practice summary.

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
