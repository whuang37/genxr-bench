# DNA Replication Zip

Build the DNA Replication Zip XR experience in the supplied application scaffold at `/workspace/app`. It must provide the complete user-facing behavior described below.

## Description

DNA Replication Zip is a short spatial puzzle that introduces the main steps of copying DNA. The learner pulls a helicase tool along a six-pair helix to separate the strands. A nearby tray provides nucleotide pieces that can be moved into complementary open slots. Correct pieces snap into place, while incorrect pairings remain unresolved. Filling all six slots completes the copied strand and shows the finished replication sequence.

## User experience

- The user selects and pulls the helicase with the controller ray.
- A six-pair DNA helix, a helicase tool, and a small A-T-C-G nucleotide tray float in a comfortable workspace in front of the user.
- The user ray-selects the helicase and pulls it through the marked helix path. The six base pairs separate in sequence and expose the template slots.
- The six exposed template slots have a clear spatial order from one end of the strand to the other. The final slot exposes thymine, so a tagged `adenine` nucleotide is complementary with that slot.
- The user places a correct complementary nucleotide near a slot. The nucleotide snaps into place and the new bond glows.
- The user places an incorrect nucleotide. The slot flashes red and the piece returns to its tray position.
- The user fills all six slots. The copied strand closes with a visible completion sweep.
- The user selects replay. Replay rebuilds the original helix.
- Ending ray selection away from the marked path ends the pull. Unreached base pairs stay closed, and the unfinished path feedback disappears.

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

- `helicase-tool`: the primary control or interaction target for the core operation.
- `helicase-path-end`: the visible end of the marked path where the helicase finishes unzipping the strand.
- `adenine`: every ray-selectable adenine nucleotide. Multiple objects can use
  this tag. Keep it after a piece snaps into a complementary thymine slot.
- `template-slot-6`: the sixth exposed template target, which exposes thymine.
- `exposed-template-slots`: the six visible template slots revealed as the helicase moves through the marked path.

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
