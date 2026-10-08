# Mug Cauldron

Build a mixed-reality potion toy anchored to a stationary detected ceramic mug. Implement it in the supplied application scaffold at `/workspace/app`.

## Description

Mug Cauldron turns the supplied ceramic mug into a small virtual potion bowl. Three numbered ingredients sit nearby and must be added in order. A valid ingredient disappears into the mug and changes the potion's color and bubble pattern. An out-of-order or misplaced ingredient returns to the tray without changing the mixture. Adding all three ingredients creates a final potion effect and a clear completion mark.

## User experience

- The user selects and places ingredients with the controller ray.
- The app outlines the supplied stationary ceramic mug, places a potion surface inside it, and shows three numbered ingredients beside it.
- The user must ray-select the next numbered ingredient and release it over the bowl.
- An accepted ingredient disappears and changes the potion to its matching preset color and bubble pattern.
- An ingredient released outside the bowl returns to its tray without advancing the potion.
- Accepting ingredients 1, 2, and 3 in order raises a small vapor creature and shows a complete potion state.
- Selecting the empty tray restores all ingredients and the first potion state at the mug's current measured position.

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

- `detected-mug`: the supplied recognized ceramic mug.
- `potion-bowl`: the visible virtual potion and valid drop target.
- `ingredient-1`, `ingredient-2`, and `ingredient-3`: the numbered ingredients.

## Recognized objects

The object detector returns the physical objects listed below. The quoted text
is the exact label returned for each detected object.

- `"Ceramic mug"` - The physical mug that holds the virtual potion.

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
