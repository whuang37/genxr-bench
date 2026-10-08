# Model viewer

Complete the partial `ModelViewer` class in the supplied XR Blocks workspace. It
presents one interactive glTF, GLB, or Gaussian splat model, or a caller-owned
Three.js object, through the documented spatial UI API.

## Goal

Enable applications to load, display, position, animate, and manipulate a model
while inspecting its normalized local bounds and relying on clear resource
ownership.

## User experience

After a model loads, users see it at the requested origin and can use the
configured move, rotate, and scale interaction. Applications can enable
occlusion and shadows where supported. Replacing or closing a viewer removes the
old presentation without destroying application-owned resources.

## Required behavior

- `setContent()` presents an existing `THREE.Object3D`, captures its normalized
  unscaled local bounds in `boundingBox`, and aligns it for `bottom-center`, `center`,
  or `source` origin behavior. Alignment updates the supplied object's local
  transform directly: `bottom-center` places the horizontal center at local X/Z zero
  and the lowest bound at local Y zero; `center` centers the bounds at the local origin;
  and `source` leaves its local transform unchanged.
- Caller-provided content is removed on replacement or disposal, but its
  geometry, materials, and textures remain caller-owned and are not disposed.
- `load()` accepts a URL string or `ModelSource`. Support `.gltf`, `.glb`,
  `.ply`, `.spz`, `.splat`, and `.ksplat`; reject unsupported formats. `path`
  applies only to glTF related-resource resolution.
- Apply `ModelSource.scale` and radian `rotation` before bounds and origin
  alignment. Loaded assets are viewer-owned and are disposed on replacement or
  viewer disposal.
- Only the latest overlapping load may become current content. A load superseded
  by a later `load()` call rejects and cannot change the current presentation.
  Dispose loaded superseded assets, and reject loads requested after disposal.
- When manipulation is enabled and content bounds are non-empty, provide private
  physical hit surfaces for rotation and translation. Register them to the viewer
  through the existing interaction hit-surface API so manipulation resolves to the
  public `ModelViewer` rather than to its helper objects. The rotation surface must
  cover the presented content. The translation surface must sit directly below the
  content, include the configured `platformMargin`, remain invisible while idle,
  and become visible on hover. These helpers must not cast or receive shadows.
  Users drag the translation surface to move the model and drag the model to rotate
  or scale it.
- Remove interaction surface registrations and dispose proxies when content is replaced or the viewer is disposed. Apply `castShadow` and `receiveShadow` to content objects, and register occludable materials when `occlusion` is enabled.
- Respect `autoplay`; `playAnimation()` starts loaded clips, and
  `playAnimation({once: true})` restarts clips from time 0 configured with
  `THREE.LoopOnce` and `clampWhenFinished = true`. `update()` advances the active
  animation mixer and platform animations.
- Do not add a meter-based fitting API or assume all content is a mesh. Empty
  bounds remain a valid result with no bounds-based presentation behavior.
- Deliverable: complete the viewer API and implementation while preserving
  ordinary spatial UI interaction, scene ownership, and public loading behavior.

## Public SDK interface

Implement `src/ui/model/ModelViewer.ts`, exported as `xb.ModelViewer`. The
starter retains `ModelViewerOrigin`, `ModelSource`, `ModelViewerOptions`, the
`ModelViewer` constructor, `boundingBox`, `load()`, `setContent()`, and
`dispose()`. Do not assume that an absent declaration is outside the task.

The completed public API must also provide `PlayModelAnimationOptions`, the
`manipulation` accessor, `playAnimation(options?)`, and `update()`, and export
the animation options with the other model-viewer symbols. `new
ModelViewer(options?)` accepts `origin`, `manipulation`, `platformMargin`,
`autoplay`, `occlusion`, `castShadow`, and `receiveShadow`. `ModelSource` has
`url` and optional `path`, `scale`, and `rotation`; vector values follow Three.js
vector-like shapes. See `docs/manual/ModelViewer.md` and the model-viewer sample
for normal callers and interaction configuration.

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
