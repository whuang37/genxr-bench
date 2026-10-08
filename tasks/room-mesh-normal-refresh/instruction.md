# Updated room surfaces keep their old slope

After room sensing updates the angle of a wall or floor, the visible surface
moves but its lighting and pointer feedback doesn't change.

## Goal

Make sensed room surfaces look and react like their latest shape.

## Current behavior

Observe a detected room surface, then update it so the same wall or floor has a
different slope. Its visible shape changes, but shading and a reticle placed on
it continue to face the earlier slope.

## Required behavior

- When an existing room surface changes slope, its lighting and pointer feedback
  must match the new shape.
- Updates that add or remove parts of the sensed room must continue to work.

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
