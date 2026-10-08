# GPU depth

Implement GPU-optimized WebXR depth handling in the retained `Depth` and `DepthTextures` APIs.

## Goal

Enable applications to use per-view native GPU depth textures and, when needed, a CPU depth representation for the depth mesh.

## Required behavior

- Publish an independent native `THREE.ExternalTexture` for each GPU depth view. Reuse the wrapper for a stable view and refresh its native texture.
- `Depth.updateGPUDepthData` stores per-view GPU observations, updates depth-camera matrices, and updates texture consumers without CPU readback when no mesh needs CPU data. Update dimensions when primary-view GPU depth is converted for the depth mesh.
- If an enabled depth mesh needs CPU depth, convert the primary GPU view, update geometry and pose, and preserve stereo texture ownership.
- In the normal frame lifecycle, prefer available GPU depth information and leave prior state intact when no GPU depth observation is available.
- Preserve CPU frame lookup, texture reuse/replacement, no-data behavior, option isolation, and view-to-depth coordinate transforms.

## Public SDK interface

Implement `src/depth/Depth.ts` and `src/depth/DepthTextures.ts`. Preserve `Depth.updateGPUDepthData`, `updateLocalDepth`, `getTexture`, public per-view depth arrays and matrices, and `DepthTextures.updateNativeTexture` and `get`.

Native WebXR depth input is `XRWebGLDepthInformation`; its texture is renderer-bound and must be wrapped as a Three.js external texture. Preserve the existing `DepthOptions` opt-ins and `getDepth` meter semantics. See `docs/manual/Depth.md`. The GPU-to-CPU conversion implementation itself is a separate task.

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
