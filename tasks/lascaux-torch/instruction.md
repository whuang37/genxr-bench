# Lascaux Torch

Build an indefinite mixed-reality wall exploration in which a carried virtual torch locally reveals prehistoric artwork. Implement it in the supplied application scaffold at `/workspace/app`.

## Description

Lascaux Torch is a free-form wall exploration inspired by prehistoric cave art. The user carries a virtual torch and aims its beam across prepared areas on nearby walls. Animal outlines, pigment, engravings, and hand stencils appear only inside the moving pool of light. Moving the torch away lets the unlit artwork fade again, encouraging continued exploration rather than collecting discoveries. The experience has no score or final state and continues for as long as the user wants to inspect the walls.

## User experience

- The user selects and aims the virtual torch with the controller ray.
- The app presents a ray-selectable virtual torch and prepared prehistoric artwork across one or more nearby walls.
- Outside the torch beam, selected wall surfaces remain visually quiet.
- Aiming the torch at a prepared wall region reveals animal outlines with a soft edge that follows the illuminated area.
- Moving the beam across a painting reveals pigment, engraving, and hand-stencil details only inside the light. Moving away fades every unlit layer instead of retaining discoveries.
- The exploration continues across other walls without a discovery count, terminal completion state, replay, or reset.

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

- `virtual-torch`: the ray-selectable torch.
- `artwork-reveal-region`: the visible authored wall region used for the first reveal.

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
