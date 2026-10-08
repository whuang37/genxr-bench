# Curve Revolver

Build the Curve Revolver XR experience in the supplied application scaffold at `/workspace/app`. It must provide the complete user-facing behavior described below.

## Description

A floating solids-of-revolution challenge asks the user to place three profile nodes on a two-dimensional grid and sweep the resulting curve around a fixed axis. Three target silhouettes guide the profile, and the generated solid must fit inside the visible target shell. A profile grid appears flat in a comfortable workspace in front of the user with a fixed axis, three movable nodes, a target shell, and a sweep tab. The user drags each node to half-unit grid points; a smooth profile connects them and mirrors its expected radius around the axis. The challenge completes when the full solid fits the shell; two more preset target shells follow.

## User experience

- A profile grid appears flat in a comfortable workspace in front of the user with a fixed axis, three movable nodes, a target shell, and a sweep tab.
- The user raycast-selects each node and drags it to half-unit grid points without reaching into the grid; a smooth profile connects the nodes and mirrors the expected radius around the axis.
- The user activates the sweep tab to rotate the profile through a fixed animation and form the solid.
- The solid turns green where it remains inside the target shell and amber where it extends outside.
- The challenge completes when the full solid fits the shell; two more preset target shells follow.
- Reset removes the solid and returns the nodes and first shell.
- Releasing a node away from the grid returns it to its previous grid point and clears the unfinished radius preview.

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

- `profile-node`: each movable profile node. Multiple objects can use this tag.
- `profile-grid-point`: each target half-unit grid point. Multiple objects can
  use this tag.
- `profile-radius-preview`: the visible radius preview created after a profile node moves to a grid point.
- `sweep-tab`: the visible control that starts the sweep.

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
