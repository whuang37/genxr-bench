# Screenshot synthesis

Implement the retained `ScreenshotSynthesizer` and its Core frame integration in
the supplied XR Blocks workspace. The feature returns a scene screenshot as a
Data URL, optionally composited over the device camera texture.

## Goal

Enable applications to request a screenshot from `xb.core`, receive it after a
render frame, and continue normal scene presentation and script updates while
capture work is pending or fails.

## User experience

Applications can request a virtual scene image or a camera-overlay image. A
request waits for the needed frame and camera data instead of exposing partial
output. When an overlay cannot use a device camera, its request fails clearly;
ordinary rendering and interaction continue.

## Required behavior

- `getScreenshot(false)` queues a virtual-scene capture; compatible queued
  virtual requests share one capture and resolve to the captured Data URL.
- Render all returned screenshots at a fixed width of 1280 pixels. Preserve the
  effective per-eye aspect ratio when XR stereo output is active. Return image
  data in normal top-to-bottom image orientation and restore the renderer target
  and XR state after capture.
- `getScreenshot(true)` queues a camera-overlay capture. Wait until the device
  camera is loaded, then composite its texture with the scene. Do not consume a
  queued virtual request while an overlay capture is waiting or being served.
- If an overlay request has no device camera, reject it with a clear error. A
  frame with no queued request is a renderer no-op.
- Permit at most one in-flight capture for each capture mode. If a capture
  fails, settle its affected request and allow later requests to run normally.
- Reuse overlay render-target resources when their required size is unchanged;
  replace and dispose superseded targets when the size changes.
- Integrate the synthesizer into Core's post-render lifecycle so public requests
  made through `xb.core.screenshotSynthesizer` settle after frame rendering.
  Preserve normal Core rendering, scripts, camera transforms, and interaction.
- Deliverable: implement the retained screenshot shell and required Core
  integration without adding a new public capture API or changing unrelated
  renderer ownership.

## Public SDK interface

Implement `src/core/components/ScreenshotSynthesizer.ts`, exported by the SDK,
and retain its use through `xb.core.screenshotSynthesizer`. Preserve
`ScreenshotSynthesizer` and `getScreenshot(overlayOnCamera = false):
Promise<string>`.

The argument selects a virtual-scene screenshot (`false`) or a camera-overlay
screenshot (`true`). The result is a 1280-pixel-wide Data URL whose height keeps
the applicable render-view aspect ratio. The public Core guidance in
`docs/manual/Core.mdx` shows normal callers; calls resolve through the normal
render-frame lifecycle rather than requiring a separate application render API.

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
