# Unistroke recognition

Implement the built-in one-dollar unistroke provider and the retained
`StrokeRecognizer` runtime.

## Goal

Enable applications to record a selected hand joint as a stroke and receive
recognized shape results through public events.

## User experience

After activation, a selected hand draws a stroke. Applications receive start and
update events while drawing, then an end event with a recognized shape when the
path is valid.

## Required behavior

- Recognize the built-in Triangle, Rectangle, Circle, V, and Caret templates from
  translated, scaled, rotated, and applicable reversed paths. Return supported
  names with confidence from 0 through 1.
- Honor configured template filtering. With no enabled template, return the
  public Unknown result with zero confidence; degenerate paths return finite,
  bounded results.
- Start recording after `startDelay`, choose the hand that begins selection,
  sample its configured world-space joint, and emit start, update, and end in
  order. Recognition requires at least 11 retained points after the configured
  start and end delays are applied; shorter paths end without a recognition
  result. Project 3D paths for recognition, including a safe camera-plane
  fallback for collinear paths.
- Honor `maxPoints` and `endDelay`, clear on deactivation, and end safely if a
  selected hand or joint is lost. Unknown provider names fall back to configured
  built-in templates.
- Preserve deep-merged options, disabled behavior, and the public custom backend
  base contract. Deliver the implementation without changing unrelated input.

## Public SDK interface

Implement the runtime and built-in provider under `src/input/strokes/`.
Preserve the exported `StrokeRecognizer` and `StrokeEventMap` contracts with
`unistrokestart`, `unistrokeupdate`, and `unistrokeend`, their existing detail
payloads, and the public `Options.strokes`/`enableStrokes()` configuration.
Retain the existing custom-backend behavior without adding a new public API.

Timing values are seconds and captured joint positions are world-space. Keep the
existing activation, disposal, event, and result contracts.

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
