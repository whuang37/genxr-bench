# Micro World Bench

Build an XR chemistry bench that lets a user assemble one water molecule with visible valence slots and preview bonds. Implement it in the supplied application scaffold at `/workspace/app`.

## Description

Micro World Bench is a simple molecule-building activity that introduces the composition of water. One oxygen atom provides two open bond positions, while three hydrogen atoms remain available nearby. Moving a hydrogen toward an open position previews the bond, and releasing it there snaps the connection closed. A third hydrogen is repelled after both positions are filled, making the two-to-one ratio visible. Connecting exactly two hydrogens completes the water model and fills the H2O target.

## User experience

- The user selects and places atom pieces with the controller ray.
- The app presents one oxygen atom, three hydrogen atoms, and a two-slot water target.
- Moving a hydrogen atom near an open oxygen slot shows a visible preview bond. Releasing at the slot snaps that bond closed.
- After both slots are filled, a third hydrogen is repelled and occupied slots flash.
- Exactly two attached hydrogens produce finished water geometry, fill the H2O target, and show a completion ring.
- Replay separates all atoms into their starting positions.

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

- `water-assembly-area`: the durable visible bench root.
- `hydrogen-atom`: each of the three selectable hydrogen pieces. Multiple
  objects can use this tag.
- `open-oxygen-slot`: each of the two valid release targets on the oxygen atom.
  Multiple objects can use this tag.

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
