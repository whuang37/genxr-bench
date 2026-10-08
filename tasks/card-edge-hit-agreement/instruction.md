# Rounded parts of a card border cannot be dragged

Some visible parts of a rounded `UICard` border do not respond when the user
tries to drag the card.

## Goal

Make the whole visible border behave like one consistent drag handle.

## Current behavior

Create a movable card with `edge: true` and rounded corners. A controller drag
starts from the top, bottom, or side border, but the same action often does
nothing near a corner after the card is resized or its corner rounding changes,
even when the pointer is clearly on the painted border.

## Required behavior

Dragging anywhere on the visible border must move the card. Pressing the card's
content area or empty space outside the card must not start a border drag. When
the card layout or corner rounding changes, its drag border must follow the new
visible shape.

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
