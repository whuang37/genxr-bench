# Visual scene context and Set-of-Mark

Implement visual scene-context derivation and Set-of-Mark presentation for the
retained Context and SceneDetector shells.

## Goal

Enable applications to obtain a semantic observation with projected visibility
data and, when requested, a labeled image of visible scene objects.

## User experience

Visible objects have screen-space positions and line-of-sight state. Set-of-Mark
labels identify visible objects in an image and remain stable for live objects.

## Required behavior

- Produce a visual record for every semantic node, including effective rendering,
  clip-frame membership, normalized screen position, and line-of-sight state.
  An off-frame projection can have normalized coordinates outside the image
  range; a non-rendered node does not need screen coordinates.
- Treat opaque scene geometry as an occluder even when it is not interactive;
  honor the configured opacity threshold for transparent geometry. Geometry at
  or below the threshold does not occlude. An object's own descendants and
  XR Blocks private/internal helpers must not occlude that object.
- Create marks only for in-line-of-sight nodes at projected bounds centers, with
  stable labels. When image rendering is available, return a labeled image;
  otherwise return the source image unchanged.
- Include eligible spatial UI nodes in visual records and marks as normal
  semantic objects. Do not create marks for simulator scenery, lights,
  backgrounds, renderer helpers, private objects, hidden objects, or any object
  that is not represented by an eligible semantic node.
- Derive visual products without modifying the supplied semantic tree. Preserve
  its node IDs, root IDs, hierarchy, ordering, and semantic fields. Visual nodes
  are separate records that add `view` data, and every mark must reference an
  existing semantic node ID. Set-of-Mark generation must not modify either the
  semantic tree or the visible-object result.
- Combined detection publishes matching semantic, visual, and Set-of-Mark results
  with the same snapshot ID and capture time from one capture. Visible-only
  detection does not request an image; concurrent Set-of-Mark requests share one
  in-flight capture and result.
- Keep semantic-only detection and node lookup working without visual work. Do
  not add visual fields to semantic-only output or change unrelated Context
  lifecycle behavior.

## Public SDK interface

Implement visual derivation under `src/context/scene/visible-objects/` and
Set-of-Mark presentation under `src/context/scene/som/`, wired through
`src/context/scene/SceneDetector.ts`. Preserve the exported scene-context result
types, `runVisibleObjectsDetection()`, `runSetOfMarkDetection()`, and their public
latest-result fields. Each latest-result field (`tree`, `visibleObjects`, or
`setOfMark`) is the exact object returned when that product was most recently
published, rather than a copy.

Use `docs/manual/Context.mdx` for public request and result semantics. Projection
coordinates are normalized image coordinates; visual and Set-of-Mark work is
opt-in and must not alter semantic-only captures. The implementation can choose
its internal data structures, raycast strategy, canvas drawing details, and label
allocation scheme as long as these observable contracts hold.

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
