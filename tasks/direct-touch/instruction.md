# Direct hand touch interaction

Implement direct fingertip interaction through the retained Input, Interaction,
and Script integration points. The starter intentionally removes the
`DirectTouch` implementation instead of retaining its internal algorithm.

## Goal

Enable developers to receive reliable touch and selection callbacks when a
tracked index fingertip contacts an interactive spatial object.

## User experience

Touching an eligible object starts touch feedback and, by default, selection.
The contact stays stable through minor boundary noise, ends after a real exit,
and safely stops if tracking is lost.

## Required behavior

- Sample each tracked index fingertip in world space and create direct-touch
  input without requiring a scene-ray intersection.
- Dispatch one touch start, moves while active, and one end with the public
  target, surface, hand, hand index, and world contact point.
- Start default selection on touch, repeat selection updates while active, and end
  it on exit. `preventDefault()` on touch start suppresses only default selection.
- Retain first-target ownership through overlap and minor boundary excursions;
  require a full exit before another target may take the contact. End safely on
  source loss with the public incomplete selection result.
- Direct touch takes precedence over a simultaneous ray from the same hand.
  Hidden, pointer-disabled, and interaction-disabled targets do not participate.
- Do not change ordinary ray interaction. Deliver the implementation and retain
  existing non-touch script and simulator behavior. Pinch-to-grab is a separate
  task and is intentionally absent from this task's baseline.

## Public SDK interface

Implement the direct-touch machinery under `src/input/` and `src/interaction/`
while preserving the public callbacks and event payloads declared by
`src/core/Script.ts`: `onObjectTouchStart`, `onObjectTouching`,
`onObjectTouchEnd`, and the existing selection callbacks. Use
`docs/manual/Scripts.md`, `docs/manual/Interaction.md`, and
`docs/manual/Hands.mdx` for callback, propagation, and direct-touch semantics.

Contact points are world-space positions. Keep event names and payload shapes
intact; do not require a new input API. Recreate an internal direct-touch module
or choose another internal design. Do not implement or restore grab behavior as
part of this task.

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
