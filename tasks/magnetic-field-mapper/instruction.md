# Magnetic Field Mapper

Build an XR magnetic-field puzzle with two movable bar magnets, flowing field lines, and three target rings. Implement it in the supplied application scaffold at `/workspace/app`.

## Description

Magnetic Field Mapper is an interactive lesson about the fields around two bar magnets. The user rotates either magnet and sees the visible field lines respond immediately. Like-pole and opposite-pole arrangements create clearly different patterns on the field board. Three target rings turn the exploration into a simple alignment challenge. Arranging the magnets so one continuous path crosses all three rings completes the activity.

## User experience

- The user selects and rotates the bar magnet with the controller ray.
- The app presents two bar magnets, three target rings, and a field-line board in a comfortable workspace in front of the user.
- Selecting and rotating a magnet updates visible field lines immediately from its north and south poles.
- Placing like poles together bends paths away and turns one or more missed rings red.
- Aligning opposite poles through all three rings creates one continuous highlighted path. Crossing every ring starts a completion pulse along that path.
- Replay returns both magnets to their start marks and clears ring feedback.
- If ray selection ends unexpectedly, leave the magnet at its current allowed orientation and keep the matching field pattern visible.

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

- `bar-magnet`: the selected magnet.

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
