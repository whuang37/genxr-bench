# Room Scale Cell Explorer

Build the Room Scale Cell Explorer XR experience described below. Implement it in the
supplied application scaffold at `/workspace/app`.

## Description

Room-Scale Cell Explorer transforms the user's room into a walkable animal-cell lesson. A translucent membrane surrounds the space while the center remains clear for comfortable exploration. Six major organelles appear as distinct, labeled structures that the learner can inspect. Selecting an organelle opens readable information about it. An optional protein-production journey links several organelles into one visible biological process.

## User experience

- The room boundary appears as a translucent membrane, the open space is tinted as cytoplasm, and a clear walking area remains available.
- The app presents the nucleus, rough endoplasmic reticulum, Golgi apparatus, mitochondria, lysosome, and ribosomes with preset forms and name markers. A wrist panel provides Overview, Protein Journey, Reset, and six-organelle progress.
- Pointing at and selecting an organelle highlights it and opens readable information about that organelle.
- Keep exactly one organelle information display open. Selecting a new organelle removes the previous display before showing the new information.
- Protein Journey visibly moves messenger RNA from the nucleus to a ribosome, peptide through rough endoplasmic reticulum, and a vesicle through Golgi to release cargo through the membrane.
- Keep the completed labeled route visible. Reset restores organelles and process objects without changing the mapped room.

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

- `nucleus`: the nucleus selection target.
- `rough-endoplasmic-reticulum`: the rough endoplasmic reticulum selection target.
- `golgi-apparatus`: the Golgi apparatus selection target.
- `mitochondria`: the mitochondria selection target.
- `lysosome`: the lysosome selection target.
- `ribosomes`: the ribosomes selection target.

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
