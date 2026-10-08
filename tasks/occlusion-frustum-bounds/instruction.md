# Virtual objects vanish beside the depth camera view

With depth occlusion enabled, a virtual object can disappear when it moves past
the area that the depth camera can see.

## Goal

Keep virtual content visible where the headset has no depth image.

## Current behavior

Open the depth occlusion sample and move a virtual object sideways across the
edge of the depth camera's view. Occlusion looks correct while the object is in
the observed area. As it leaves that area, parts of the object are still cut out
instead of becoming fully visible.

## Required behavior

Virtual content outside the observed depth image must remain visible. Inside the
image, real surfaces must still hide virtual content behind them without hiding
content in front.

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
