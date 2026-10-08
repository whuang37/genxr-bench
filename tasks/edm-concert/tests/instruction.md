# EDM Concert

Build the EDM Concert XR experience in the supplied application scaffold at `/workspace/app`. It must provide the complete user-facing behavior described below.

## Description

EDM Concert is a compact rhythm toy with four colored beat pads and animated concert lighting. Each pad toggles one musical and visual layer, so the user can build or reduce the mix freely. The effects combine open light beams, lasers, haze, and stage-wide color. Input between pads has no effect. Activating all four layers triggers one synchronized visual drop while the full concert look remains active.

## User experience

- The app opens with four colored toggle pads in the center reach area and a clear open stage area for the lighting effects.
- Tapping a pad with either fingertip visibly depresses it, changes its persistent active state, and toggles its matching musical and visual layer.
- Pad 1 toggles a sweeping cyan-and-magenta volumetric beam fan above and behind the pads.
- Pad 2 toggles narrow scanning lasers that form a changing grid through the open stage area.
- Pad 3 toggles animated shader haze with soft additive light shafts. The haze must make the beams feel volumetric without covering the physical room.
- Pad 4 toggles a rhythmic stage-wide color wash with a radial bass pulse.
- Animate the beam, laser, haze, and color-wash effects so their motion and intensity change over time. Keep the effects spatially contained around the stage.
- Tapping an active pad turns off only its matching effect and musical layer. Other active effects continue. Touching between pads changes nothing, and an unavailable hand cannot activate a pad from its last known position.
- When all four effects are active, perform one brief synchronized drop accent across the beams, lasers, haze, and color wash. Keep all four layers active after the accent.
- Tapping the center Clear pad stops every effect and resets all pads to inactive.

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

- `beat-pad-1` through `beat-pad-4`: direct fingertip toggles for the four concert-effect layers.
- `clear-pad`: reset control for all pads and concert effects.

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
