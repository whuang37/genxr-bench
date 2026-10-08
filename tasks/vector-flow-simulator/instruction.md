# Vector Flow Simulator

Build the Vector Flow Simulator XR experience described below. Implement it in the
supplied application scaffold at `/workspace/app`.

## Description

Vector Flow Simulator is a three-dimensional learning tool for exploring how
three preset vector fields move a physics ball. A transparent volume contains a
regular arrow lattice and one durable ball. Selecting a preset updates the
arrows and immediately applies that vector field to the ball.

## User experience

- The app presents a transparent field volume, a regular 3D arrow lattice, one
  visible physics ball, and three preset controls. There is no target or goal.
- The three visible presets select these exact vector equations:
  - East Wind: `F(x, y, z) = (1, 0, 0)`
  - Helical Vortex: `F(x, y, z) = (-z, 0.5, x)`
  - Wall Push: `F(x, y, z) = (0, 0, -2)`
- Clicking a preset displays its name and equation, resets the ball to the same
  marked start with zero velocity, updates all arrows, and immediately applies
  the selected field.
- The selected vector continuously accelerates the ball. The ball remains a
  dynamic physics body and visibly moves while the field is active.
- The ball collides with detected floors, ceilings, walls, and other room
  surfaces. It can bounce or roll, but it never exits the environment and never
  disappears.

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

- `vector-flow-ball`: the one durable physics ball.
- `vector-preset-east-wind`: control for East Wind.
- `vector-preset-helical-vortex`: control for Helical Vortex.
- `vector-preset-wall-push`: control for Wall Push.

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
