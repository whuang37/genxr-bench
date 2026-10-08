# A slider drag stops when the pointer slips off the bar

It is difficult to make one smooth slider adjustment with a controller because
the value freezes as soon as the pointer leaves the narrow visible bar.

## Goal

Let users finish the slider adjustment that they already started.

## Current behavior

Start dragging a `UISlider` with a controller ray. Keep the button held and move
sideways along the slider, allowing the pointer to slip just above or below the
bar. The thumb stops at its last value until the pointer crosses the bar again.

## Required behavior

After a slider drag starts, sideways movement must continue to adjust the value
until the user releases the control. Moving past an end must stop at that end.

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
