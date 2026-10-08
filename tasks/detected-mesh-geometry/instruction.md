# Detected mesh geometry

Implement `DetectedMesh`, which converts WebXR and simulator mesh observations into Three.js geometry with optional fixed Rapier collision resources.

## Goal

Enable applications to consume environmental mesh geometry with stable scene objects, semantic metadata, and collision support.

## Required behavior

- Build indexed position and normal geometry from source XYZ vertices and triangle indices; preserve the caller material and semantic label.
- Support `XRMesh` and `SimulatorMesh` sources. Detector-owned pose application remains separate from geometry construction.
- Update changed observations according to `lastChangedTime`, retaining geometry where its layout permits and disposing replaced geometry.
- Accept empty or malformed partial arrays safely without producing invalid
  geometry.
- Create fixed collision resources from current geometry, refresh them after changes, and release all mesh-owned resources exactly once on disposal.

## Public SDK interface

Implement `src/world/mesh/DetectedMesh.ts`. Preserve `DetectedMesh extends THREE.Mesh`, `semanticLabel`, `getRigidBody`, constructor `(mesh, material)`, `initRapierPhysics`, `updateVertices`, and `dispose`.

The constructor accepts `XRMesh | SimulatorMesh`; vertices are XYZ triples and indices identify triangles. Keep public material and rigid-body identity semantics. See `src/world/mesh/README.md` and `SimulatorMesh.ts`. Detector lifecycle and placement are out of scope.

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
