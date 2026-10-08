# Depth-mesh shadows

Implement opt-in depth-mesh shadow receiving and estimated directional-light shadows.

## Goal

Let applications render virtual-object shadows on the reconstructed environment without changing non-shadow rendering paths.

## User experience

With shadows enabled, virtual shadows appear on the depth surface and adapt to ambient light. With shadows disabled, existing depth visualization and lighting stay unchanged.

## Required behavior

- `renderShadow` creates a visible depth receiver with `shadowOpacity`; it receives shadows, does not cast them, and does not write depth.
- Keep diagnostic `showDebugTexture` and `useDepthTexture` rendering separate from shadow receiving.
- `Depth.init` retains mesh registration and scene ownership, and enables PCF shadow mapping only for a shadow receiver.
- `Lighting` must honor enabled, selected-light, directional-shadow, and dynamic-soft-shadow options; a shadow-enabled directional light has usable target and shadow resources.
- Adapt receiver opacity and shadow softness to estimated ambient light within
  sensible visual limits. Higher ambient light makes shadows lighter and softer.
- Preserve non-shadow estimated-light updates, simulator lighting, disabled lighting behavior, and independent light selection.

## Public SDK interface

Implement retained behavior in `src/depth/Depth.ts`, `src/depth/DepthMesh.ts`, and `src/lighting/Lighting.ts`. Preserve `Depth.init`, `DepthMesh` construction, and `Lighting.init`, `update`, `dirLight`, `ambientProbe`, `ambientLight`, and `simulatorRunning`.

Use existing `DepthMeshOptions.renderShadow` and `shadowOpacity` plus public `LightingOptions`. Renderer shadow state belongs to the supplied Three.js renderer; environment estimates remain owned by `XREstimatedLight`. Consult `docs/manual/Depth.md` and retained lighting samples. Do not change depth acquisition or mesh geometry.

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
