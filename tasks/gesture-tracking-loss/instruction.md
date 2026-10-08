# A gesture stays active after the hand disappears

An application can remain stuck in a grabbed or pinched state after the headset
briefly loses sight of the user's hand.

## Goal

Let applications cleanly finish a gesture when its hand is no longer tracked.

## Current behavior

Run the hand gesture sample, hold a recognized pose, and move that hand out of
the cameras' view. The application receives `gesturestart` but no matching
`gestureend`, so UI that reacts to the gesture stays active. Bringing the hand
back in the same pose does not start a fresh interaction.

## Required behavior

Losing sight of a hand must finish its active gestures once. If the hand returns
in the same pose, it must be able to start a new gesture.

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
