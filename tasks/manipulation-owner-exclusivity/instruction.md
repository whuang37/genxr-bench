# Two handles compete to move the same object

When one model exposes more than one manipulation handle, two controllers can
press different handles and make the model react to both drags at once.

## Goal

Keep one model moving smoothly when two people press different handles on it.

## Current behavior

Create one movable model with two translation handles. Hold the first handle
with one controller, then press the second handle with another controller.
Moving both controllers makes the model jump between the two drags.

## Required behavior

- The model follows one accepted drag until that drag ends, without jumping or
  starting a second manipulation at the same time.
- After release, either handle can start the next drag.
- Separate models and supported two-hand scaling continue to work normally.

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
