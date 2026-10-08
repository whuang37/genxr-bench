# Gas Law Balloon

Build an XR gas-law demonstration in which two hand-sized plates compress a transparent floating chamber. Implement it in the supplied application scaffold at `/workspace/app`.

## Description

Gas Law Balloon is an interactive pressure demonstration inside a transparent chamber. The user moves two side plates inward to reduce the available volume. Visible molecules speed up as the chamber narrows, and a pressure marker rises at the same time. A separate maximum-pressure readout retains the highest safe pressure reached after the plates are released. Two target bands ask the user to find safe pressure states without crossing the burst limit.

## User experience

- A transparent chamber floats within reach with two side compression plates, visible molecule markers, a current-pressure scale, a `Max pressure reached` readout, two target bands, and a burst limit.
- Moving both plates inward narrows the chamber, increases visible molecule speed, and raises the pressure marker.
- The maximum-pressure readout updates only when the current safe pressure exceeds its previous value. It does not decrease when pressure falls or when the plates are released.
- Releasing inside a target band holds the current width, retains the maximum-pressure value, gives that band a visible check mark, and does not trigger burst behavior.
- Compressing beyond the burst limit flashes the chamber, releases pressure visibly, and restores the initial volume.
- Reaching both target bands safely shows a completion seal. Replay clears both target checks, resets the maximum-pressure value to the starting pressure, and restores the starting chamber.
- An interrupted two-hand interaction releases the plates at the last safe width. Keep all feedback visible to the user.

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

- `gas-chamber`: the durable visible chamber root.
- `compression-plate-left`: the left interaction plate.
- `compression-plate-right`: the right interaction plate.
- `compressed-gas-chamber`: the visible compressed chamber result.

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
