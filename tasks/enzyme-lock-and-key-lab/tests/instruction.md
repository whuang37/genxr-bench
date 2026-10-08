# Enzyme Lock and Key Lab

Build the Enzyme Lock and Key Lab XR experience in the supplied application scaffold at `/workspace/app`. It must provide the complete user-facing behavior described below.

## Description

Enzyme Lock and Key Lab is a molecular docking puzzle about shape and orientation. Two stylized enzymes and three substrate pieces appear in a shared workspace. The user moves and rotates each substrate while color feedback shows clashes and improving alignment. A correctly aligned substrate snaps into its matching site, while an incompatible piece returns for another attempt. Finding both valid enzyme-substrate pairs fills the completion markers and links the two finished models.

## User experience

- Two enzyme models, three substrate pieces, and two empty completion markers float in a comfortable workspace in front of the user.
- The user moves a substrate near an incompatible site. Intersecting regions glow red and the piece does not snap.
- The user rotates a compatible substrate into the marked orientation. The site changes from amber to green as alignment improves.
- The user releases a correctly aligned substrate. It snaps into the site and the matching completion marker fills.
- Both enzymes are filled. A linked completion effect appears across both stands.
- The user selects replay. Replay releases all pieces to the tray.
- Releasing a substrate away from a valid site returns it to the tray and clears the unfinished clash or alignment feedback.

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

- `enzyme-stands`: the durable root of the visible Enzyme Lock And Key Lab experience.
- `test-substrate`: one movable substrate used to verify compatible and
  incompatible placement. It starts 90 degrees from its marked compatible
  orientation around the grabbing hand's roll axis. A positive 90-degree hand
  roll aligns it, and it keeps this tag after snapping.
- `compatible-enzyme-site`: the matching interaction target for
  `test-substrate`.
- `incompatible-enzyme-site`: a nonmatching interaction target for
  `test-substrate`; the site itself turns red while the substrate clashes.

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
