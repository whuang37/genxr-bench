# Automatic placement snaps an object after manipulation

An object that follows the viewer or another object can be dragged to a new
pose. After release, it snaps toward its earlier pose.

## Goal

Let automatic motion continue smoothly from the released pose.

## Current behavior

Attach `FollowHead` to an object, let it follow the viewer, then drag and release
the object at a new position. When the viewer moves again, the object snaps away
from the position where it was released. `FollowObject` shows the same problem
when its target moves.

## Required behavior

- Automatic motion does not override the object while it is held.
- After release, `FollowHead` and `FollowObject` continue smoothly from the
  released position and orientation.
- Objects that were not moved by the user continue their normal automatic
  motion.

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
