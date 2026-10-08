# Occlusion pass

Implement depth-based virtual-object occlusion for the retained postprocessing
and material utility entry points.

## Goal

Enable applications to hide virtual content that is behind real-world depth while leaving normal materials unchanged unless they opt in.

## User experience

Virtual content in front of the environment remains visible; content behind it is occluded smoothly for float and packed depth inputs.

## Required behavior

- Create an override material for occlusion-map rendering and add occlusion support to supplied built-in material shaders without globally mutating unrelated materials.
- Accept depth textures per XR view with their meter scale, near value, and depth-camera transforms. Publish an occlusion map and current XR camera clip transform to registered shader uniforms.
- Render from scene geometry or a supplied read buffer as appropriate, select the requested XR camera view and texture layer, and compose the final result.
- In the read-buffer route, bind the supplied 2D environment-depth texture to
  the full-screen occlusion-map shader that is rendered. Do not bind it only to
  the scene override material, which is not used by this route.
- Restore caller renderer target, scene override material, camera layer mask, and XR state after rendering.
- Reuse owned render targets at stable dimensions, resize them when drawing dimensions change, and dispose all owned resources.
- Preserve the disabled path: ordinary material families, `DepthOptions.occlusion.enabled === false`, and non-occluding model viewers must remain visually and behaviorally unchanged.

## Public SDK interface

Implement `src/depth/occlusion/OcclusionPass.ts` and
`src/depth/occlusion/OcclusionUtils.ts`. Recreate the removed occlusion-map,
composition, and blur shader-support modules needed by those implementations.
Preserve the retained `OcclusionPass` constructor, `setDepthTexture`, `render`,
`renderOcclusionMapFromScene`, `renderOcclusionMapFromReadBuffer`,
`blurOcclusionMap`, `applyOcclusionMapToRenderedImage`, `dispose`, and
`updateOcclusionMapUniforms` signatures, and preserve both retained
`OcclusionUtils` method signatures.

Depth texture data uses the provided WebXR depth-view semantics and `rawValueToMeters`. The pass owns only its temporary targets and materials; it must not take ownership of caller scene content or buffers. See `docs/manual/Depth.md`, the occlusion sample, and `ModelViewer` callers. Depth acquisition and depth-mesh shadows are out of scope.

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
