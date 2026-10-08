# Reticle presentation

Implement presentation of resolved ray hits through the retained
`ReticlePresenter` shell.

## Goal

Enable applications to show a correct reticle for an active ray without changing
which objects the interaction system targets.

## User experience

An automatic reticle appears at an eligible hit, aligns to its surface, shows
hover and pressed feedback, and clears when no presentation is possible.

## Required behavior

- For an automatic hit, present the hit point, intersection, and target; enable
  hover feedback; normalize ray direction; and orient positive Z to the
  world-space surface normal.
- In surface mode, retain the surface hit but omit target and hover. Hidden mode
  clears presentation. Presentation range affects only the visual result.
- On a miss or a hit at or beyond the configured presentation range, use the
  configured default render distance, orient opposite the ray, and hide when
  that distance is zero. Reflect boolean selection and selection progress as
  pressed feedback.
- Replace stale pose and target data on new source updates. Missing rays,
  repeated clears, and inputs without reticles are safe and leave no stale visual
  state.
- Reticles remain presentation-only and cannot intercept a ray before its real
  target. Keep ordinary ray targeting and selection working. Deliver the feature.

## Public SDK interface

Implement the internal presentation behavior in
`src/interaction/ReticlePresenter.ts` against the retained hit, input, and
reticle objects under `src/interaction/`. Preserve the public
`Options.reticles`/`ReticleOptions` configuration, `ReticleMode`, and existing
interaction results. Follow `docs/manual/Interaction.md` for presentation modes,
distances, and selection state.

Use world-space hit and normal data. Do not add a public targeting API or change
reticle ownership.

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
