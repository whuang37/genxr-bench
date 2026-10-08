# A model jumps after two-hand scaling

Move a model with one hand, add the other hand to resize it, then release only
the second hand. Continuing the drag with the first hand makes the model jump
toward an earlier position.

## Goal

Let the user continue moving the model smoothly after two-hand scaling.

## Current behavior

Start moving a model with one controller. Add a second controller to scale it,
move both controllers, and release only the second one. The model keeps its new
size, but the next movement from the first controller pulls it toward its
pre-scale position.

## Required behavior

- Releasing one controller after two-hand scaling must leave the model where the
  user placed and sized it. Movement with the remaining controller must continue
  smoothly from there.
- Applications observing manipulation must receive a complete scale action and
  a normal continuing one-hand action. Ordinary one-hand movement must continue
  to work.

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
