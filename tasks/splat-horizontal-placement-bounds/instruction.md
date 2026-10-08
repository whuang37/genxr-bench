# A splat model stays above a detected table

A Gaussian splat model appears normally, but it stays at its starting height
instead of moving onto a detected table.

## Goal

Make splat models place on detected horizontal surfaces like other models.

## Current behavior

Load a splat model in the simulator with a detected table. The model renders at
its initial position, while other models settle on the table.

## Required behavior

- A splat model must come to rest on the selected surface without an
  asset-specific workaround.
- Normal model loading must continue to work.

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
