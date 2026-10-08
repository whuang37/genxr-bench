# Horizontal placement

Implement the retained horizontal-surface placement utility.

## Goal

Enable applications to place content on a suitable detected horizontal surface, upright and facing the user, while avoiding occupied space.

## User experience

Content appears on a suitable nearby table or floor without intersecting visible obstacles. If no placement is possible, it stays at its original pose and the call reports failure after the requested timeout.

## Required behavior

- Consider detected horizontal planes as candidate surfaces, favoring useful forward and elevated surfaces while retaining valid floor placement.
- Choose a point inside the plane boundary where the object's world bounds fit. Ground offset content on the selected surface, orient its up axis to world +Y, and face it toward the camera.
- Reject blocked candidates using ordinary visible scene obstacles and detected planes. Ignore placement helpers and mesh-detector-owned environmental meshes as blockers.
- On a failed attempt, restore the complete original object transform before waiting and retrying.
- Honor the supplied timer, `WaitFrame`, timeout duration, and grid-step inputs. Missing or ineligible detectors must fail safely without changing the object.

## Public SDK interface

Implement `src/world/HorizontalPlacement.ts`. Preserve `placeOnHorizontalSurface(objectToPlace, camera, scene, planes, meshes, waitFrame, timer, timeout, gridSteps): Promise<boolean>`.

Inputs are Three.js world-space objects, an optional `PlaneDetector`, an optional
`MeshDetector`, and a Temporal duration or duration-like timeout. Return `true`
only after successful placement; return `false` on timeout or unavailable
candidates. See `World.placeOnHorizontalSurface`, `docs/manual/Placement.md`, and
retained placement samples. Do not change direct controller-ray placement or
placement scripts.

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
