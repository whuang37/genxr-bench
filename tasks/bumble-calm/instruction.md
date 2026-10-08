# Bumble Calm

Build the Bumble Calm XR experience in the supplied application scaffold at `/workspace/app`. It must provide the complete user-facing behavior described below.

## Description

Bumble Calm is a gentle hand-control activity with a virtual bee and flower. The user places the center of an open palm inside a visible ring and holds it steady for ten seconds. As the ring fills, it gradually shrinks around the center of the palm and reduces the allowed movement, so the user must become steadier while the bee slowly moves closer. Moving the center of the palm outside the current ring drains it and returns the bee to the flower without a penalty. A complete hold lets the bee land on the palm.

## User experience

- A flower, one circling bee, and a visible open-palm steadiness ring float in a comfortable workspace in front of the user.
- The user moves the center of an open palm into the ring and holds it steadily for ten seconds.
- During the hold, the ring fills visibly and continuously shrinks to a tighter fit around the palm. The smaller ring reduces the allowed palm movement as progress increases.
- The bee moves slowly and continuously toward the palm during the ten-second hold.
- When the steadiness ring fills completely, the bee lands on the palm and a warm completed glow appears.
- Leaving the ring at its current size drains the steadiness ring, returns the bee toward the flower, and creates no failure penalty.
- Lowering the landed palm below the flower returns the bee, empties the ring, and restores the initial circling state for another attempt.

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

- `palm-steadiness-ring`: ten-second dwell ring centered on the open palm that shrinks as progress increases.

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
