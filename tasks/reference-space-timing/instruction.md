# The first XR session ignores the selected play area

An application can select a WebXR reference space before it starts, but the
first immersive session still uses the default floor setup.

## Goal

Honor the application's reference-space choice when the user first enters XR.

## Current behavior

Set `Options.referenceSpaceType` to a supported non-default value, initialize XR
Blocks, and enter immersive mode. The first session uses `local-floor`. Later
entries can behave differently from the first entry.

## Required behavior

The selected reference space must apply on the first entry into XR. Applications
that do not select one must keep the normal `local-floor` behavior.

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
