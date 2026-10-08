# Screenshot labels drift when the viewer moves

Request a labeled scene screenshot, then move the viewer or change zoom before
the capture finishes. The labels shift away from the objects in the returned
image.

## Goal

Keep Set-of-Mark labels aligned with the screenshot they describe.

## Current behavior

Request Set-of-Mark context for a visible object. While the image is being
captured, move the viewer or change zoom. The returned screenshot shows the
earlier view, but the label appears where the object would be in the later view.

## Required behavior

- Labels must stay on the correct objects in the returned screenshot when the
  viewer moves or changes zoom during capture.
- The returned Set-of-Mark context must describe one consistent view. Normal
  stationary capture and camera-inclusive screenshots must continue to work.

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
