# Toilet Paper Rain

Build the Toilet Paper Rain XR experience described below. Implement it in the
supplied application scaffold at `/workspace/app`.

## Description

Toilet Paper Rain is a passive room-scale graphics scene. Toilet paper rolls
continuously appear overhead, fall under gravity, collide with the environment,
and disappear shortly after landing.

## User experience

- The roll shower starts automatically when the app loads. It has no start
  control, counter, score, or hand interaction.
- Spawn recognizable toilet paper rolls at varied positions above a clear floor
  area and at a steady interval. Keep the active roll count bounded.
- Every roll is a dynamic physics body. Gravity pulls it down, and it collides
  with the detected floor and other room surfaces instead of passing through
  them.
- Rolls can bounce, tumble, and roll after contact. They must never pass below
  the environment floor.
- Remove each roll shortly after it lands or after a bounded lifetime. Continue
  spawning new rolls so the passive effect remains active.

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

- `falling-toilet-paper-roll`: each active falling or landed roll. Multiple
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
