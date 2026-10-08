# Semantic scene context

Implement semantic-tree construction for the retained Context and SceneDetector
shells in the supplied XR Blocks workspace.

## Goal

Enable application developers to request a stable, structured semantic
description of registered Three.js objects and spatial UI.

## User experience

Scene-context consumers receive a current hierarchy with roles, names,
transforms, bounds, visibility, and UI state. Moving or reparenting a live object
updates it without changing its semantic identity.

## Required behavior

- Build semantic trees in child order with parent relationships, world-space
  transforms, bounds, and capture times represented by the public types. Round
  all published numeric values to four decimal places.
- Emit the public node metadata that applies to each object, including its
  object ID, source, runtime type, pointer participation, interaction state,
  position, and bounds when bounds are available.
- Preserve an object's semantic ID across captures while it remains the same
  live `Object3D`, including after movement or reparenting. A different object
  is a different semantic identity even if it has the same name. Omit detached
  objects from later trees and from node-to-object lookup.
- Serialize supported spatial UI roles, labels, text, state, traits, and slider
  metadata. Use standard role taxonomy: UI containers such as `UICard` and
  `UIPanel` use role `'group'`; buttons use `'button'`, sliders use `'slider'`,
  text uses `'text'`, images and icons use `'image'`, and standard 3D meshes
  use `'object'`. Use each object's own pointer and interaction settings. Preserve
  inherited invisibility by retaining eligible objects with `visible: false`.
- Keep the tree concise. Do not emit cameras, lights, renderer helpers, unnamed
  layout-only containers, or implementation meshes merely because they are in
  the Three.js scene. Continue through omitted layout or implementation wrappers
  and attach eligible descendants to the nearest emitted semantic ancestor.
- Prune an `xrblocksPrivate` root and all its descendants. Likewise prune an
  object whose semantic metadata has `hidden: true` and its descendants. An
  `xrblocksPrivateSelf` wrapper hides only itself: continue through it and retain
  eligible public descendants under the nearest semantic ancestor.
- Semantic-only detection publishes the latest tree and supports node-to-object
  lookup without requesting a screenshot. `tree` is the exact result object
  returned by the latest semantic detection, not a copy. Disposal clears state
  and is inert.
- Keep semantic enablement separate from visible-object and Set-of-Mark features,
  and retain Context lifecycle behavior.

## Public SDK interface

Implement semantic-tree construction under
`src/context/scene/semantic-tree/` and retained support under
`src/context/shared/`, wired through `src/context/scene/SceneDetector.ts`.
Preserve the exported semantic result types and the public `SceneDetector`
detection methods, `tree`, and `resolveNodeObject()`. The starter does not
prescribe an identity-registry implementation; choose an internal design that
satisfies the observable identity and lookup contract.

For reference, a semantic result has this shape. IDs and values below are only
illustrative:

```ts
{
  snapshotId: "snapshot-1",
  capturedAt: 1200,
  rootIds: ["menu"],
  nodes: {
    menu: {
      id: "menu",
      role: "group",
      name: "main-menu",
      visible: true,
      pointerEvents: "auto",
      interactionEnabled: true,
      position: [0, 1, -2],
      children: ["confirm"],
    },
    confirm: {
      id: "confirm",
      parentId: "menu",
      role: "button",
      name: "confirm",
      text: "Confirm",
      visible: true,
      pointerEvents: "auto",
      interactionEnabled: true,
      position: [0, 1, -2],
      children: [],
      disabled: false,
    },
  },
}
```

Follow `docs/manual/Context.mdx` and the existing `ContextOptions` and UI APIs.
The precise ID format and registry design are internal choices. The observable
requirements are stable identity, current hierarchy, no stale lookup entries,
and a new snapshot identity for each capture. Numeric fields use four-decimal
rounding so repeated captures have stable serialized values. Semantic-only
requests do not imply image capture or visual products.

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
