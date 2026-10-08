# Dolphin Glide

Build the Dolphin Glide XR experience in the supplied application scaffold at `/workspace/app`. It must provide the complete user-facing behavior described below.

## Description

Dolphin Glide is a rhythmic movement game set on a short underwater course. It uses a playful goal to encourage coordinated upper-body movement and repeatable two-hand strokes. The user guides a dolphin through six wide gates with paired hand motion and gentle changes in head angle. A stroke counter and gate display make progress easy to follow while reporting only actions completed during play. Passing all six gates ends the course and shows the final counts without assessing physical condition or recovery.

## User experience

- A dolphin, six wide gates, a `0 strokes` counter, and a clear End control are visible in an underwater course.
- The user reaches both hands forward and pulls them back together.
- The dolphin advances one speed step, the stroke counter shows `1 stroke` after the first completed stroke, and head pitch adjusts its vertical direction. A visible direction marker points up or down to match the current head pitch.
- When the dolphin passes all six gates, the course stops and shows the completed gate and stroke counts.
- The user can select replay on the completed course; six gates and a zero stroke count return with motion stopped.

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

- `dolphin-guide`: moving underwater dolphin.
- `dolphin-gate`: one of six wide course gates. Multiple objects can use this
  tag.
- `stroke-count`: observed paired-stroke count.
- `dolphin-course-result`: stopped completed course counts.
- `end-dolphin-course`: visible End control.

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
