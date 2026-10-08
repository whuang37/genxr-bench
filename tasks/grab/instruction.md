# Direct-touch grab interaction

Implement pinch-to-grab behavior in the retained Interaction and Script event
shells.

## Goal

Enable developers to respond to a hand that pinches while directly touching an
object, including built-in manipulation for configured objects.

## User experience

A fingertip contact alone remains a touch. Pinching during that contact starts a
grab and manipulation when configured; releasing the pinch ends the grab while
the touch may continue.

## Required behavior

- Start a grab only when a touching hand pinches. Emit one start, updates while
  held, and one end, with the same public direct-touch contact data.
- Start built-in manipulation for a touched `xb.manipulation` owner, update it by
  grip motion, and end manipulation on pinch release without ending active touch
  selection.
- On tracking loss, end the grab once, cancel manipulation, and complete the
  existing selection with its public source-loss outcome.
- Keep the first active manipulation owner when a second hand touches and pinches;
  that second hand may receive its lifecycle but cannot replace the active owner.
- Do not turn contact-only or ray-only selection into a grab. Deliver the feature
  without changing normal touch, ray, or manipulation behavior.

## Public SDK interface

Preserve grab event declarations in `src/core/Script.ts` and related public
interaction event types in `src/interaction/InteractionTypes.ts`. Follow
`docs/manual/Interaction.md` and `docs/manual/Hands.mdx` for touch, grab,
selection, and manipulation lifecycle behavior.

Keep public event names and payloads intact. A grab is tied to direct touch, and
manipulation ownership remains exclusive.

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
