# Screen-composited UI overlays

Implement the retained screen-compositing mode for `UIOverlay`. This mode is
for view-space UI shown on optical displays, where bright pixels add light and
black pixels leave the scene unchanged.

## Goal

Let applications select additive screen blending for a complete view-space UI
tree without managing render targets or changing the normal Core frame loop.

## User experience

With screen compositing, black UI regions are visually transparent. Colored and
white UI regions brighten the scene beneath them. The overlay stays fixed in
the view and appears above the scene and simulator output.

## Required behavior

- `compositing: 'screen'` must screen-blend the complete overlay tree over the
  rendered output. Transparent black leaves the destination unchanged.
- Screen-composited overlays are visual only. They and their descendants must
  not block or receive pointer interaction.
- Screen overlays must render after normal scene and simulator presentation.
  Public virtual-scene screenshots must include the same overlay output.
- Multiple screen overlays share rendering resources. Repeated frames and
  repeated screenshots at one size must not continually allocate textures.
- Hidden or removed overlays must stop contributing pixels. Owned resources
  must be released when Core is disposed.
- Invalid compositing values must fail at construction. `direct` remains the
  default and must preserve existing view-space rendering and interaction.

## Public SDK interface

Complete the retained `UIOverlayCompositing`, `UIOverlayOptions.compositing`,
and `UIOverlay.compositing` interface in `src/ui/components/UIOverlay.ts`. These
symbols are exported from `xrblocks` through `src/ui/index.ts`.

`direct` and `screen` are the only valid values. The selected mode is fixed for
the overlay lifetime. Screen layout uses the active rendering surface and must
remain stable across output-size changes. See `docs/manual/UI.mdx` and existing
UI overlay callers for normal layout and lifecycle behavior.

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
