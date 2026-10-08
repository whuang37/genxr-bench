# Heuristic head gesture recognition

Implement the retained heuristic head-gesture recognizer and built-in nod and
shake detectors.

## Goal

Enable applications to detect configured nod and shake gestures from head-pose
history and receive the existing public events.

## User experience

A completed nod or shake can produce its generic gesture and the matching
directional alias. Invalid, ambiguous, or incomplete movement produces no gesture.

## Required behavior

- Recognize completed nod and shake motion in either valid direction. Score the
  generic name and only its matching directional alias.
- Reject one-way, too-slow, too-short, non-progressing, off-axis, and erratic
  histories. Support valid uneven timestamps and local motion across translated or
  rotated world frames.
- Honor public angular thresholds and enabled flags for built-in publication.
  Integrate with the retained public event pipeline and simulator camera input.
- Preserve custom recognizer registration and configuration, threshold latching
  and rearming, history reset, asynchronous-result safety, and no-controller
  input setup.
- Do not alter hand gesture or stroke enablement. Deliver the recognizer without
  exposing a detector algorithm.

## Public SDK interface

Implement the built-in detection logic under
`src/input/headGestures/gestureRecognizers/`. Preserve the exported
`HeuristicHeadGestureRecognizer`, its options, `HeadPoseSample`,
`HeadGestureContext`, result and score types, recognizer interface, recognition
options, and event map in `src/input/headGestures/`.

Use `docs/manual/HeadGestures.md` for public names, local-frame behavior,
timing, off-axis rejection, options, and custom recognizers.

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
