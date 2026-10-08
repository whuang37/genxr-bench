# Screen overlay distortion in WebXR

A screen-composited `UIOverlay` is horizontally distorted when WebXR presents
two eye views in one framebuffer. Shapes that are square or circular in normal
rendering become narrow in each eye.

## Goal

Keep screen-composited UI correctly proportioned and positioned in every WebXR
eye view.

## Current behavior

Create an overlay with `compositing: 'screen'`, enter a two-view WebXR session,
and display a circular UI marker. Both eyes receive the marker, but the marker
is compressed horizontally.

## Required behavior

- Each active XR view must receive the complete screen overlay at that view's
  aspect ratio and viewport dimensions.
- Overlay positions and proportions must agree between the left and right eye.
  UI pixels must not cross the seam between eye viewports.
- Rendering must continue to work when XR camera or viewport data is not yet
  available.
- Mono screen compositing, direct overlays, public screenshots, renderer-state
  restoration, resizing, and disposal must continue to work.

## Public interface

Preserve the public `UIOverlay` constructor, `compositing` option, and
`compositing` property defined in `src/ui/components/UIOverlay.ts` and exported
from `xrblocks`. `docs/manual/UI.mdx` defines the screen-compositing behavior.
The repair must not add a new public stereo configuration interface.

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
