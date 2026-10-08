# Crystal Lattice Shear Lab

Build the Crystal Lattice Shear Lab XR experience in the supplied application scaffold at `/workspace/app`. It must provide the complete user-facing behavior described below.

## Description

Crystal Lattice Shear Lab is an interactive comparison of ionic and covalent material structures. Two lattice tiles float side by side in front of the user. The user holds an open hand edge-on and applies the same chopping motion to each tile. The ionic model shifts and separates along a highlighted plane, while the covalent model remains connected and resists the same movement. The final view keeps both results visible so the structural difference is easy to compare.

## User experience

- An ionic tile and a covalent tile float side by side in a comfortable workspace.
- The user opens a hand, turns it edge-on, starts clearly above the ionic tile, and chops in one continuous motion to clearly below it. The ionic layers shift and split along one highlighted cleavage plane.
- The user applies the same edge-on chopping motion to the covalent tile. The covalent network bends slightly and remains connected.
- The final view keeps the split ionic tile and connected covalent tile visible side by side for comparison.
- The user clicks Replay. Replay rebuilds both tiles in their initial state.
- Stopping before the hand passes through a tile restores that tile and clears unfinished stress feedback.

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

- `ionic-lattice`: the visible ionic tile and its chopping target.
- `covalent-lattice`: the visible covalent tile and its chopping target.
- `replay-lattices`: the control that rebuilds both tiles.

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
