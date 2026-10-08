# Rainbow Pen

Build a simple two-hand mid-air drawing toy in the supplied application scaffold at `/workspace/app`.

## Description

Rainbow Pen lets the user draw persistent colored strokes anywhere in the air. Pinching with either hand draws from that hand's position. While one hand is available for drawing, moving the other hand as a fist adjusts the shared pen settings: inward and outward movement relative to the other hand changes stroke width, and vertical movement changes color saturation. Undo and Reset provide simple editing controls.

## User experience

- Start with an empty drawing space, a visible Undo button, and a visible Reset button.
- Pinching with either hand starts a stroke at that hand's position. Continue the stroke along the hand's movement and finish it when the pinch opens.
- Keep every finished stroke fixed in the room until Undo or Reset removes it.
- Use the other hand as the pen-settings control while it is a fist.
- Moving the settings fist outward, away from the other hand, increases stroke width. Moving it inward, toward the other hand, decreases stroke width. This is leftward movement for a left-hand fist and rightward movement for a right-hand fist when increasing width; reverse those directions when decreasing width.
- Moving the settings fist up increases color saturation; moving it down decreases color saturation.
- Start at a medium width and 50% saturation so each setting can increase or decrease. Clamp both settings to useful visible ranges.
- Apply new width and saturation values to strokes drawn after the adjustment. Do not alter finished strokes.
- Make Undo and Reset normal ray-selectable buttons. Undo removes only the most recent finished stroke. Reset removes all finished strokes and restores the default width and saturation.

## Project layout

- Build the application only in `/workspace/app`. Do not modify, replace, or
  vendor `/workspace/xrblocks`; it is the pinned, read-only XR Blocks SDK.
- Use the supplied static app scaffold and local dependencies. Do not install,
  reinstall, or vendor dependencies unless this task explicitly requires a
  dependency change.

## Tagging the app

Attach a stable tag only to each listed user-facing control or durable visible result: `object.userData.xrblocksDevtools = { tag: "..." }`. Tags identify scene objects; they do not replace visible behavior.

Each listed tag identifies exactly one live object unless its entry explicitly
allows multiple objects. Attach the tag to the semantic owner of the control or
result. Do not also attach that tag to a helper mesh or to an ancestor or
descendant of the semantic owner.

- `undo-button`: the ray-selectable Undo button.
- `reset-button`: the ray-selectable Reset button.

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
