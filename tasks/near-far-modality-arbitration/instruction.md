# Pointing feedback survives a direct-touch transition

Move one hand from pointing at a distant object to touching a nearby control,
then move the hand away from the nearby control again.

## Goal

Keep direct contact and pointer feedback consistent while that hand changes
interaction mode.

## Current behavior

During a hand transition from pointing to direct touch, the distant object can
briefly keep hover feedback or a reticle. When contact ends, pointer feedback
can also remain absent for a frame. This only happens for the hand that changed
mode.

## Required behavior

- While a fingertip touches a control, the same hand must not show pointer
  feedback or begin pointer selection on a different object.
- Pointer feedback from that hand must return when the touch ends. The other
  hand and normal touch or pointer interaction must continue to work.

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
