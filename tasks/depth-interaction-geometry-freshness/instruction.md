# Recognition falls behind the visible room surface

Face recognition can place results on an old room surface after the depth view
has already changed.

## Goal

Keep recognition results aligned with the room surface that the user sees.

## Current behavior

Enable the depth mesh and run face recognition. Move a surface in view, wait for
the visible mesh to follow it, and run recognition again. The new results still
line up with the surface's earlier position. Restarting depth sensing temporarily
makes the two agree again.

## Required behavior

After the visible depth surface updates, the next recognition result must line
up with that new surface.

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
