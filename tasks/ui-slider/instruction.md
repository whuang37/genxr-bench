# Spatial UI slider

Implement the retained `UISlider` control and its ray interaction behavior.

## Goal

Enable applications to create a validated, interactive horizontal slider that
updates UI rendering and semantic scene context.

## User experience

Users can press and drag one slider at a time. Value feedback changes while
dragging, commits on release, and returns to the starting value when the capture
is cancelled.

## Required behavior

- Validate the slider label, finite ordered range, positive finite step, finite
  value, and boolean disabled state. Clamp and quantize public properties after
  construction and updates.
- Let one ray exclusively capture a slider. Stream `onInput` only when its value
  changes and call `onChange` once on a completed capture.
- Disabled sliders reject new capture. Source loss or disablement during capture
  cancels it, restores its starting value, reports the input update, and does not
  commit a change.
- Continue an active capture from the ray projected onto the transformed slider
  plane after direct hit data is unavailable.
- Preserve normal button behavior, Object3D event maps, UI rendering updates, and
  slider semantic metadata. Deliver the feature without changing other controls.

## Public SDK interface

Complete `UISliderOptions` and `UISlider` in
`src/ui/components/UISlider.ts`: retain `ariaLabel`, `min`, `max`, `step`,
`value`, `disabled`, `onInput`, and `onChange`. Preserve the slider variant
of the documented semantic control output and its use by the retained
interaction system.

Use `docs/manual/UI.mdx` and the existing interaction APIs for the public UI
contract. Values follow the configured range and step; slider capture is exclusive
but does not change button or other interaction semantics.

## Provided workspace and resources

- The editable SDK workspace is `/workspace/xrblocks`. The shell starts in this
  directory.
- Package dependencies and XR Blocks assets are already available in
  `node_modules/` and `xrblocks-assets/`. Use the supplied dependency versions and
  do not reinstall or replace them unless the task specifically requires a
  dependency change.
- Existing SDK source and public unit tests are under `src/`. Public manuals,
  samples, starter applications, and task-relevant guidance are under `docs/`,
  `samples/`, `templates/`, and `skills/`. These retained resources define normal
  callers and surrounding behavior that must continue to work.
- `xrblocks-devtools` is installed on `PATH` and includes the browser-based XR
  simulator and inspection tools. Run `xrblocks-devtools --help` to list its public
  commands. Do not modify the internal source code.
- Run `npm run build:sdk` for the SDK build, `npm test` for the public unit tests,
  and `npm run dev` only when you need to inspect public samples or templates in a
  browser. Network access can be restricted, so use the supplied local resources.
