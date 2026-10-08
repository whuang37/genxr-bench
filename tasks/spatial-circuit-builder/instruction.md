# Spatial Circuit Builder

Build the Spatial Circuit Builder XR experience described below. Implement it in the
supplied application scaffold at `/workspace/app`.

## Description

Spatial Circuit Builder is a hands-on lesson for assembling and operating a simple series circuit. The learner arranges a battery, switch, resistor, bulb, and four loose wires in a clear build area. Labeled terminals and snapping wire ends make valid connections easy to understand. Components remain movable, so the layout can be adjusted without losing sight of their terminals. Completing the circuit and closing the switch lights the bulb and shows the finished current path.

## User experience

- The user selects and moves rigid components and wire leads with the controller ray.
- The app presents a battery, open switch, resistor, unlit bulb, and four loose wire leads around a reachable build area with labeled terminals.
- The user can move each rigid component. It keeps its spatial position and both terminal faces remain visible.
- Selecting one wire end and releasing near a terminal snaps that end while the other end stays available. Pulling a connected end disconnects it.
- The intended series path is battery positive, switch, resistor, bulb, and battery negative. A hint can be toggled without moving parts.
- A complete path with an open switch keeps the bulb dark. Closing it starts moving charge markers and makes the bulb cast warm room light. Opening or disconnecting stops both immediately. Reset separates parts and opens the switch.
- If ray selection ends unexpectedly, leave a component at its current allowed position or return an unattached wire end. Preserve completed connections.

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

- `circuit-workspace`: the durable root of the visible Spatial Circuit Builder experience.
- `movable-circuit-component`: one complete rigid battery, switch, resistor, or
  bulb used to verify component rearrangement.
- `positioned-circuit-component`: released rigid part at its selected workspace pose.
- `wire-1-end-a`, `wire-1-end-b`, `wire-2-end-a`, `wire-2-end-b`,
  `wire-3-end-a`, `wire-3-end-b`, `wire-4-end-a`, and `wire-4-end-b`: the
  eight selectable ends of the four loose wires. Each end keeps its tag after
  snapping.
- `terminal-battery-positive`, `terminal-battery-negative`,
  `terminal-switch-input`, `terminal-switch-output`,
  `terminal-resistor-input`, `terminal-resistor-output`,
  `terminal-bulb-input`, and `terminal-bulb-output`: the eight visible series
  circuit terminals.
- `circuit-switch`: the ray-selectable switch control.

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
