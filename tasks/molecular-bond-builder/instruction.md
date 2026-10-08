# Molecular Bond Builder

Build an XR molecular-geometry challenge that lets a user assemble methane and ammonia and match each molecule to a target silhouette. Implement it in the supplied application scaffold at `/workspace/app`.

## Description

Molecular Bond Builder is a chemistry activity for comparing the shapes of methane and ammonia. The learner places hydrogen atoms into fixed sockets around carbon and nitrogen centers. Valid atoms snap into place, while incompatible placements turn red and return to the tray. Completing methane creates a tetrahedral structure, and completing ammonia creates a trigonal-pyramidal structure. Rotating both molecules into their target outlines finishes a side-by-side geometry comparison.

## User experience

- The user selects and places atom pieces with the controller ray.
- The app presents methane and ammonia stands, carbon, nitrogen, and hydrogen pieces, fixed bond sockets, and translucent target shapes within reach. The methane stand starts one hydrogen placement from completion so its final socket is clear.
- Placing the remaining hydrogen in the open methane socket completes the tetrahedral structure.
- Moving nitrogen toward a methane hydrogen socket makes that socket pulse red and returns nitrogen to the tray.
- Valid ammonia assembly produces trigonal-pyramidal geometry on the second stand.
- Rotating each finished molecule to overlap its silhouette changes that silhouette from amber to green. Matching both shows a side-by-side geometry comparison.
- Replay separates both molecules and restores the tray.
- An interrupted atom selection returns an unsnapped piece to the tray. Keep the molecule geometry visible to the user.

## Project layout

- Build the application only in `/workspace/app`. Do not modify, replace, or
  vendor `/workspace/xrblocks`; it is the pinned, read-only XR Blocks SDK.
- Use the supplied static app scaffold and local dependencies. Do not install,
  reinstall, or vendor dependencies unless this task explicitly requires a
  dependency change.

## Tagging the app

Attach a stable tag only to each listed user-facing control, interaction target,
or durable visible result: `object.userData.xrblocksDevtools = { tag: "..." }`.
Tags identify scene objects; they do not replace visible behavior.

Each listed tag identifies exactly one live object unless its entry explicitly
allows multiple objects. Attach the tag to the semantic owner of the control,
target, or result. Do not also attach that tag to a helper mesh or to an
ancestor or descendant of the semantic owner.

- `hydrogen-atom`: each selectable hydrogen tray piece. Multiple objects can use
  this tag; the verifier selects one object by ID.
- `nitrogen-atom`: the nitrogen tray piece used for incompatible-placement feedback.
- `methane-open-socket`: the visible final hydrogen target on the methane stand.

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
