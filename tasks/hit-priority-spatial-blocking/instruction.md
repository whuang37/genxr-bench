# Overlay controls select objects behind them

Open an in-view menu over an interactive scene and point at one of its controls.
The scene object behind the menu can react instead of the control that the user
can see.

## Goal

Make visible overlay controls respond in front of scene content.

## Current behavior

Place an interactive `UIOverlay` over an interactive world object. Aim at a
place covered by both and try to hover or select the overlay. The world object
responds even though the overlay is in front on screen.

## Required behavior

- A visible interactive overlay must receive hover and selection where it
  covers interactive world content.
- World objects must keep their normal interaction behavior away from an active
  overlay, and overlays that do not accept pointer input must remain inactive.

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
