# Spatial Sticky Notes

Build the Spatial Sticky Notes XR experience described below. Implement it in the
supplied application scaffold at `/workspace/app`.

## Description

Spatial Sticky Notes lets the user place voice-written notes on the sensed room
environment. A note stays attached to the selected surface and can be moved to
another environment surface. The experience starts with an uncluttered room and
does not require templates or preset phrases.

## User experience

- Ray-select a point on the sensed environment to create a note at that point
  and start listening.
- Show spoken words as readable text on the note. Keep the committed text when
  dictation ends.
- Keep each note attached flush to the selected room surface, including walls
  and the floor. Do not place notes in empty space.
- Ray-drag a note to move it across the sensed environment. When the drag ends,
  attach the note to the new surface and keep its text.
- If dictation becomes unavailable, stop listening and keep all existing notes
  and committed text.

## Project layout

- Build the application only in `/workspace/app`. Do not modify, replace, or
  vendor `/workspace/xrblocks`; it is the pinned, read-only XR Blocks SDK.
- Use the supplied static app scaffold and local dependencies. Do not install,
  reinstall, or vendor dependencies unless this task explicitly requires a
  dependency change.

## Tagging the app

Attach this stable tag to each durable note:
`object.userData.xrblocksDevtools = { tag: "spatial-note" }`. The tag identifies
the scene object; it does not replace visible behavior.

This tag explicitly allows multiple live objects. Attach it to each semantic
note owner. Do not also attach it to a helper mesh or to an ancestor or
descendant of that owner.

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
