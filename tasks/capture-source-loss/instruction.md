# A control stays unavailable after its active source disappears

If a tracked hand or controller disappears while its ray is holding an object
or pressing a control, a later input source cannot use that same control.

## Goal

End the lost source's selection and let other connected sources interact
normally.

## Current behavior

Start a slider drag, then remove that hand or controller before it releases.
The drag rolls back and its end callback arrives, but another controller cannot
start a new drag on the same slider. Normal release and unrelated targets still
work.

This can be reproduced by adapting `templates/02_object_interaction` and removing
the active simulator input source during a held selection.

## Required behavior

- The held interaction ends once and reports that it did not complete because
  its source was lost.
- The lost source no longer leaves selection or hover feedback behind.
- Another connected source can immediately use the same target.
- Normal release behavior and unrelated targets continue to work.

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
