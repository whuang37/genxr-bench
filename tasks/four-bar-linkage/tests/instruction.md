# Four Bar Linkage

Build an XR mechanism challenge that lets a user select fixed link-length sets and advance a four-bar linkage with circular ray targets. Implement it in the supplied application scaffold at `/workspace/app`.

## Description

Four-Bar Linkage is an interactive mechanism lesson about how link dimensions shape motion. The user selects one of three configurations and advances the crank by selecting circles around its pivot. The rocker and coupler move together while a short trace shows the path they create. Three ordered gates give the user a clear motion challenge for each configuration. Passing the coupler through all gates completes the selected linkage exercise.

## User experience

- The app presents a compact four-bar linkage on a floating base, with four circular crank targets, three length-set tabs, three coupler gates, and a short path trace. Do not add a grabbable crank handle.
- Selecting a length-set tab moves all links and joints to that preset fixed configuration.
- Four simple circles mark the next clockwise crank positions around the pivot. The current circle is visibly distinct from the other three.
- The user points at and selects each circle with the controller ray. Each selection smoothly rotates the crank to that circle while the rocker and coupler move through the corresponding linkage solution. The coupler leaves a short visible trace.
- Each gate turns green when the coupler crosses it in the required order. One length set can cross all three gates; the other sets visibly miss at least one.
- Completing all three gates shows a visible success state. Reset clears the trace and gates and restores the first crank circle and first length set.

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

- `valid-length-set-tab`: the tab for the authored valid link set.
- `crank-circle-1` through `crank-circle-4`: the four circular ray-selection targets in clockwise order.
- `reset-linkage`: the ray-selectable Reset control.

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
