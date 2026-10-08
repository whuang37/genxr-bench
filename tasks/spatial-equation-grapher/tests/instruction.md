# Spatial Equation Grapher

Build the Spatial Equation Grapher XR experience described below. Implement it in the
supplied application scaffold at `/workspace/app`.

## Description

Spatial Equation Grapher lets the learner compare three preset equations as
three-dimensional surfaces. A labeled graph volume keeps the grid, scale, and
zero plane visible. Each preset has only two configurable parameters, `a` and
`b`, so the learner can see how one value changes the active surface.

## User experience

- The app presents a reachable three-axis graph volume with a grid, labels, and
  a zero plane.
- Three visible preset controls select these exact equations:
  - Wave: `z = a sin(x) + b cos(y)`
  - Saddle: `z = a x² - b y²`
  - Ripple: `z = a sin(b √(x² + y²))`
- Wave is selected at startup. Selecting a preset immediately replaces the
  surface and clearly displays its name and equation.
- Every preset owns an `a` value and a `b` value. Both start at `1.0`, use a
  range from `-3.0` to `3.0`, and change in `0.5` steps through visible minus
  and plus controls.
- A parameter change immediately resamples the active equation over `x` and
  `y` from `-5` to `5`. The displayed value and surface update together.
- Each preset retains its own `a` and `b` values while the app remains open.

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

- `equation-preset-wave`: control that selects the Wave equation.
- `equation-preset-saddle`: control that selects the Saddle equation.
- `equation-preset-ripple`: control that selects the Ripple equation.

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
