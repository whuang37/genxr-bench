# Depth mesh

Implement the retained `DepthMesh` feature in XR Blocks. It converts CPU WebXR depth frames into an updateable Three.js surface for rendering, raycasting, and optional environment physics.

## Goal

Enable applications to use a depth-camera-aligned mesh for depth visualization, surface interaction, and collision.

## User experience

When visualization is enabled, users see a depth-aligned environment surface. When it is disabled, the mesh can still support interaction and physics without being visible.

## Required behavior

- Build the configured active depth grid, excluding `ignoreEdgePixels`, and support full-resolution plus optional downsampled geometry.
- Update geometry from `float32` and `luminance-alpha` CPU depth frames using the supplied depth-view projection. Retain geometry identity and mark changed position attributes for Three.js consumers.
- In the shipped Living Room simulator environment at its deterministic initial camera pose, reconstruct the sampled room surface in meters. The mesh must agree with the captured depth values and nearby room geometry within normal depth-grid tolerances.
- Synchronize mesh pose with the supplied depth-camera translation and orientation.
- Honor automatic and explicit full-resolution updates, debug/depth-texture material mode, and refreshed texture, scale, dimensions, and view-to-depth transform.
- Make ray hits use the current world pose and report the owning `DepthMesh`, including with downsampled raycast geometry.
- Create, refresh, and safely replace fixed Rapier colliders at `colliderUpdateFps`; return a known collider by handle.
- Retain safe no-data and CPU-depth texture behavior. Shadows and GPU-depth acquisition are not part of this task.

## Public SDK interface

Implement `src/depth/DepthMesh.ts`, exported through the existing XR Blocks package surface. Preserve `DepthMesh`, constructor `(depthOptions, width, height, depthTextures?)`, `init`, `updateDepth`, `updatePose`, `updateFullResolutionGeometry`, `initRapierPhysics`, `raycast`, and `getColliderFromHandle`.

Use `DepthOptions` and `DepthMeshOptions` in `src/depth/DepthOptions.ts`. Depth values are meters after `rawValueToMeters` conversion; UVs and projection data use supplied WebXR depth-view conventions. Preserve public `downsampledGeometry`, `downsampledMesh`, mesh identity, and `xb` surface metadata. See `docs/manual/Depth.md` and retained depth samples.

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
