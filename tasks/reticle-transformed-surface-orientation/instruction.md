# Reticles tilt away from nested model surfaces

Point at a flat part of a rotated or stretched model. The reticle reaches the
correct spot but tilts away from the visible surface.

## Goal

Keep the reticle flush with the visible surface under the pointer.

## Current behavior

Enable reticles and place an interactive flat object inside a model that is both
rotated and stretched. Point at the flat object. Hover and selection reach it,
but the reticle does not lie flat against it.

The setup in `samples/xr_realism/reticle` demonstrates normal reticle use.

## Required behavior

- The reticle must lie flush with the visible surface, including surfaces inside
  rotated or stretched models.
- Reticles on ordinary objects, camera-facing reticles, hover, and selection
  must continue to work.

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
