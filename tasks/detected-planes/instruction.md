# Detected planes

Implement the retained WebXR and simulator plane-detection feature.

## Goal

Enable applications to inspect, visualize, filter, and use detected environmental planes as Three.js meshes.

## Required behavior

- Convert native polygons and `SimulatorPlane` polygons into local XZ mesh geometry, with +Y as the plane normal. Publish labels and horizontal or vertical orientation, and apply simulator poses.
- Reconcile WebXR frames: retain an unchanged plane mesh, replace changed geometry and pose when the source change time advances, and remove stale planes from the detector and scene.
- Share debug visualization resources when configured; visibility toggling and disposal must be safe and release detector-owned resources.
- Simulator planes replace native output while active, clear cleanly, and allow native detection to resume afterwards.
- Preserve planes supplied by the configured simulator environment sidecar, including their authored label, area, transformed pose, and polygon geometry.
- Empty frames, absent reference spaces, disabled sensing, and repeated disposal must be safe.

## Public SDK interface

Implement `src/world/planes/DetectedPlane.ts` and `src/world/planes/PlaneDetector.ts`. Preserve `DetectedPlane extends THREE.Mesh`, `label`, `orientation`, constructor `(xrPlane, material, simulatorPlane?)`, and `PlaneDetector.init`, `update`, `get`, `showDebugVisualizations`, `setSimulatorPlanes`, `clearSimulatorPlanes`, and `dispose`.

`get(label?)` returns the active detected planes and filters by semantic label. Use WebXR plane poses in the supplied reference space. See `SimulatorPlane.ts`, `PlanesOptions.ts`, `World.ts`, and `docs/manual/World.mdx`. Do not change unrelated mesh detection, anchors, or placement policies.

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
