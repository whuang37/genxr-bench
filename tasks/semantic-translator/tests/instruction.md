# Semantic Translator

Build a simple world-mesh contrast styling tool in the supplied application scaffold at `/workspace/app`.

## Description

Semantic Translator lets the user mark one region across sensed room geometry and view it with three visual treatments. Two world-mesh clicks assign opposite diagonal corners of the region, including points on different room surfaces. Three compact buttons switch the existing region between Outline, Light on dark, and Color separation styles.

## User experience

- Present three visible ray-selectable buttons labeled Outline, Light on dark, and Color separation.
- The first click on the sensed world mesh assigns one corner of a new region.
- The second world-mesh click assigns the opposite diagonal corner and creates the region between the two points. The points can be on different sensed surfaces, such as a table and wall.
- Apply the treatment to sensed geometry inside the two-corner region. Do not add a placement reticle or fixed region handles.
- Selecting Outline gives the region a strong, readable boundary without covering its interior.
- Selecting Light on dark gives the selected region a light treatment against a dark contrasting treatment.
- Selecting Color separation gives the selected region clearly separated colors that remain distinguishable from the surrounding surface.
- Switching styles updates the same region without changing its position or boundaries.
- After a region exists, the next valid world-mesh click starts a replacement region. Two new diagonal points replace the earlier region.
- If the second click does not hit sensed world geometry, keep waiting for a valid second point.
- Do not add semantic interpretation, condition assessment, multiple-region management, removal tools, or other workflow controls.

## Project layout

- Build the application only in `/workspace/app`. Do not modify, replace, or
  vendor `/workspace/xrblocks`; it is the pinned, read-only XR Blocks SDK.
- Use the supplied static app scaffold and local dependencies. Do not install,
  reinstall, or vendor dependencies unless this task explicitly requires a
  dependency change.

## Tagging the app

Only tag the three user-facing style buttons. The world-mesh points and styled region do not need tags.

Attach each tag with
`object.userData.xrblocksDevtools = { tag: "..." }`. Tags identify scene
objects for interaction and verification.

Each listed tag identifies exactly one live object. Attach the tag to the
semantic owner of the button. Do not also attach that tag to a helper mesh or
to an ancestor or descendant of the semantic owner.

- `outline-style-button`: the Outline button.
- `light-dark-style-button`: the Light on dark button.
- `color-separation-style-button`: the Color separation button.

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
