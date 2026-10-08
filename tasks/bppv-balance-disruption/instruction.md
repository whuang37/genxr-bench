# BPPV Balance Disruption

Build the BPPV Balance Disruption XR experience in the supplied application scaffold at `/workspace/app`. It must provide the complete user-facing behavior described below.

## Description

A vestibular anatomy model places an enlarged transparent inner ear in a comfortable workspace in front of the user. It is an educational activity for showing how orientation can affect particle movement through the semicircular canals. The learner rotates the model and guides one visible particle through three marked canal positions without trying to induce vertigo. Clear targets connect each orientation change with a visible result inside the model. When the particle reaches all three targets in order, the canal path illuminates and a completed anatomy explanation appears without offering diagnosis or treatment guidance.

## User experience

- The user selects and rotates the inner-ear model with the controller ray.
- A transparent inner-ear model, one particle, and three numbered canal targets float in a comfortable workspace in front of the user.
- The user ray-selects and rotates the model to move the particle toward the active canal target.
- The particle responds to model orientation and the reached target turns green.
- If the model is rotated toward a nonactive target, the particle moves visibly but the sequence does not advance.
- When the particle reaches all three targets in order, the canal path illuminates and a completed anatomy explanation appears.
- Selecting the illuminated canal path replays the activity by restoring the initial model orientation, particle position, three unreached targets, and empty completion card.
- Ending the ray selection ends the rotation safely. The particle remains at its current canal position, and the interrupted movement cannot complete a target.

## Project layout

- Build the application only in `/workspace/app`. Do not modify, replace, or
  vendor `/workspace/xrblocks`; it is the pinned, read-only XR Blocks SDK.
- Use the supplied static app scaffold and local dependencies. Do not install,
  reinstall, or vendor dependencies unless this task explicitly requires a
  dependency change.

## Tagging the app

Attach a stable tag only to each listed user-facing control, interaction target,
or durable visible result:
`object.userData.xrblocksDevtools = { tag: "..." }`. Tags identify scene
objects; they do not replace visible behavior.

Each listed tag identifies exactly one live object unless its entry explicitly
allows multiple objects. Attach the tag to the semantic owner of the control,
target, or result. Do not also attach that tag to a helper mesh or to an
ancestor or descendant of the semantic owner.

- `inner-ear-model`: ray-selectable transparent anatomy model.
- `canal-particle`: orientation-responsive particle.
- `canal-target`: one numbered target.
- `illuminated-canal-path`: completed ordered path.
- `anatomy-completion-card`: educational explanation.

## Provided workspace and resources

- `/workspace/app` contains the static starter application. Its `index.html`
  and `main.js` are the application source. Run `npm run dev` from that directory
  for a development preview. DevTools serves the files directly during
  verification; no app build step is required.
- `/workspace/xrblocks` contains the buildable XR Blocks source tree, public
  documentation, samples, templates, skills, and local assets. Treat it as
  read-only reference material.
- Center your implementation on XR Blocks conventions. Learn more about XR
  Blocks in `/workspace/xrblocks/docs` and `/workspace/xrblocks/skills`.
- `xrblocks-devtools` is installed on `PATH` and includes the browser-based XR
  simulator and inspection tools. Run `xrblocks-devtools --help` to list its public
  commands. Do not modify the internal source code.
- Dependencies and XR Blocks assets are already available locally. Network
  access can be restricted; use supplied local resources.
