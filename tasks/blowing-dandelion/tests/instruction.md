# Blowing Dandelion

Build the Blowing Dandelion XR experience in the supplied application scaffold at `/workspace/app`. It must provide the complete user-facing behavior described below.

## Description

Blowing Dandelion is a mixed-reality toy that combines hand movement with microphone input. A virtual flower with visible seeds grows from a nearby floor or table. The user picks up the stem and brings the flower near the headset. A nearby breath releases the seeds and sends them drifting across the room, while a distant breath leaves them attached and asks the user to move closer. Reset grows a fresh dandelion in the selected location.

## User experience

- The app presents one dandelion on a selected reachable floor or table point. Its head starts with visible seeds.
- The user pinches the stem, moves the flower 0.15 m in front of the headset, releases it, and blows into the microphone.
- A valid blow within 0.2 m of the headset detaches all seeds and carries them away until they settle on nearby surfaces or reach a clear distance limit. The empty head glows and exposes a respawn leaf.
- A blow from farther away keeps every seed attached and shows a visible Move Closer marker. The marker is unavailable after the flower enters the valid zone.
- Releasing the stem cancels the held interaction. Interrupted audio does not scatter seeds.
- Clicking the respawn leaf removes all old seeds and restores one fresh flower with attached seeds at the same surface location.

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

- `dandelion-stem`: grabbable flower stem and initial interaction target.
- `dandelion-head`: visible flower head used as the proximity target for the
  breath interaction.
- `respawn-leaf`: clickable replay control exposed after a successful scatter.

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
