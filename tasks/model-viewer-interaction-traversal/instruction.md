# ModelViewer controls report the wrong object

An interactive `ModelViewer` reports an object the application did not create
when the user points at its move or rotate controls.

## Goal

Make interaction callbacks consistently report the `ModelViewer` created by the
application.

## Current behavior

Create a `ModelViewer` with manipulation enabled, set its content, and point at
the built-in move and rotation controls. The hover callback reports a different
object instead of the viewer. The problem remains after replacing the content.

## Required behavior

- Move and rotation interactions report the application-created `ModelViewer`.
- The same result applies after content is replaced.
- Normal content replacement, bounds, and application ownership continue to
  work.

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
