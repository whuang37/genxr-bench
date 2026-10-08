# Heuristic hand gesture recognition

Implement the retained built-in heuristic hand-gesture detectors.

## Goal

Enable applications to score the documented built-in hand poses and receive their
configured public gesture lifecycle events.

## User experience

A recognized hand pose can start, update, and end a gesture event for either hand.
Applications can use default poses or register and configure their own recognizers.

## Required behavior

- Score the built-in gestures named exactly `pinch`, `open-palm`, `fist`,
  `thumbs-up`, `thumbs-down`, `point`, and `spread` from complete left or right
  hand-joint contexts. Use these exact strings as score-map keys and public
  event names. Scores are finite and range from 0 through 1; incomplete input
  returns a complete safe score map containing all seven names.
- Distinguish opposing poses, and keep a translated complete hand's score stable.
  Point and spread remain scoreable even when their default event configuration is
  disabled.
- Work through the retained options, Core, input, and event lifecycle so enabled
  built-in gestures produce public events for simulator and device hands.
- Preserve custom recognizer registration, configuration, thresholds, per-hand
  lifecycle, and disposal. Disabled recognizers remain inert.
- Do not change pose-estimator adapters or expose implementation metrics. Deliver
  the detector implementation while retaining existing extension points.

## Public SDK interface

Implement the built-in detector logic under
`src/input/gestures/gestureRecognizers/`. Preserve the exported
`HeuristicGestureRecognizer`, `GestureRecognizer`, `HandContext`,
`GestureScoreMap`, `GestureRecognition`, options, and gesture events already
defined in `src/input/gestures/` and exported through `src/xrblocks.ts`.

Use `docs/manual/HandGestures.md` for supported names, defaults, configuration,
and custom recognizers. Keep diagnostic fields unconstrained and preserve the
existing public result and event types.

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
