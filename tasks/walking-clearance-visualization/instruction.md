# Walking Clearance Visualization

Build the Walking Clearance Visualization XR experience described below. Implement it in the
supplied application scaffold at `/workspace/app`.

## Description

Walking Clearance Visualization is a room-planning tool that highlights floor areas with enough open space for walking. It helps users compare possible paths and understand how a chosen clearance affects the usable floor area. A floating slider lets the user choose a value from 0.3 to 0.8 meters. The overlay updates at once, showing qualifying areas in green and excluded areas with a contrasting boundary near walls or obstacles. Reset returns the tool to its initial clearance, and the result remains a planning aid rather than a safety certification.

## User experience

- The user selects and adjusts the clearance slider with the controller ray.
- The app presents a floating panel with a clearance slider, numeric label,
  Reset, and nearby-floor overlay.
- The default clearance is `0.3 m`. The slider ranges from `0.3 m` to `0.8 m`
  in `0.1 m` steps. Reset always restores `0.3 m`.
- Qualifying floor is green. Regions too close to walls or floor obstacles remain visible with a contrasting excluded boundary.
- Increasing clearance contracts the green region and expands excluded boundaries immediately. Decreasing it restores qualifying floor but never includes obstacle interiors or out-of-bounds regions.
- Sample the floor on a grid with cells no larger than `0.1 m`. At the selected
  value, a cell is green only when its horizontal distance from every
  reconstructed wall and obstacle footprint is greater than or equal to that
  clearance.
  Obstacle interiors and closer cells belong to the excluded overlay.
- Place both overlays no more than `0.02 m` above the reconstructed floor so their
  relationship to obstacles remains clear.
- Changes to nearby surfaces update the overlay. The result reports geometric clearance only and does not claim safety, accessibility, or compliance.
- If ray selection ends unexpectedly, keep the current allowed value and the matching floor overlay.

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

- `clearance-distance-slider`: geometric clearance control.
- `clearance-high-stop`: visible 0.8 m slider stop.
- `reset-clearance`: default-distance reset.

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
