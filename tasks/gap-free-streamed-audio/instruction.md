# Remove cracks between streamed audio chunks

An application streams short PCM speech chunks through `AudioPlayer`. The
listener hears a crack or short gap when a new chunk begins.

## Goal

Make PCM chunks play as one continuous stream while preserving the player's
public volume and stop behavior.

## Current behavior

Create an `AudioPlayer` and submit two or more short PCM chunks before the first
chunk finishes. A later chunk starts with a delay, which leaves silence between
the chunks.

## Required behavior

- Chunks supplied before current playback ends sound like one ordered stream,
  without silence or overlap between them.
- The public playing state follows the audio the listener should still hear.
- Volume changes and `stop()` continue to work, including later playback after
  a stop.

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
