# Guitar Tab Tutor

Build a compact virtual guitar-neck practice toy with a fixed six-note fingertip sequence. Implement it in the supplied application scaffold at `/workspace/app`.

## Description

Guitar Tab Tutor is a six-note fingertip practice on a compact virtual guitar neck. Each step lights one fret and shows which fingertip should touch it. A correct touch turns the target green, extends a chord ribbon, and moves to the next note. A wrong fret flashes red without removing progress or changing the active note. Completing the sequence leaves the full ribbon and finished note count visible.

## User experience

- The app presents a compact guitar neck within reach with the first lit fret, a requested right-index fingertip cue, an empty chord ribbon, and a `0 of 6 notes` display.
- Touching the lit fret with its requested fingertip turns it green, adds one ribbon segment, lights the next target, and advances the visible note count. After the first correct touch, display `1 of 6 notes`.
- Touching a wrong fret flashes red and leaves the same note active.
- Completing all six notes spans the chord ribbon across the neck and shows a solved pattern.
- Touching the solved ribbon clears the sequence and relights the first fret.

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

- `guitar-neck`: the durable visible neck.
- `lit-fret`: each current requested target. Multiple objects can use this tag;
  the verifier selects one object by ID.
- `chord-ribbon`: the visible accumulated ribbon.

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
