# Mesh detector lifecycle

Implement WebXR frame lifecycle management for the retained `MeshDetector`.

## Goal

Enable applications to receive stable, current, visible environmental meshes through the detector's public maps and scene children.

## Required behavior

- Read WebXR detected meshes when available, create `DetectedMesh` instances for accepted sources, apply their poses, retain bidirectional map identity, and add them to the detector.
- On a source change, update its geometry and pose while preserving its detected-mesh identity. Initialize physics for meshes created before or after physics becomes available.
- Reconcile WebXR mesh observations at most once per second. Cull sources beyond
  the three-meter view limit, behind the active camera, or outside its usable
  forward view.
- Safely handle missing frames, detected sets, reference spaces, and viewer poses. Use available camera information when a viewer pose is absent.
- Track last-seen observations and remove stale meshes from maps and scene, disposing mesh-owned resources.
- Preserve simulator injection, clear, debug materials, and disposal behavior; simulator sources suppress WebXR reconciliation while active.

## Public SDK interface

Implement `src/world/mesh/MeshDetector.ts`. Preserve `MeshDetector extends Script`, dependencies, `xrMeshToThreeMesh`, `threeMeshToXrMesh`, `init`, `initPhysics`, `updateMeshes`, `setSimulatorMeshes`, `clearSimulatorMeshes`, and `dispose`.

Use `MeshDetectionOptions` and the existing `DetectedMesh`/`SimulatorMesh` public contracts. WebXR mesh poses use the renderer reference space. See `src/world/mesh/README.md`, `World.ts`, and mesh samples. Geometry conversion and horizontal-placement ranking are not part of this task.

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
