# Diagnostic Sound Map

Build the Diagnostic Sound Map XR experience in the supplied application scaffold at `/workspace/app`. It must provide the complete user-facing behavior described below.

## Description

Diagnostic Sound Map is a visual respiratory education activity built around a virtual torso. It helps learners connect lung locations with simplified motion and waveform patterns without presenting the result as a clinical examination. The learner explores six lung zones and sees a synchronized chest pattern for each one. Three waveform cards can be compared with the zones and placed beside their matching locations, while incorrect matches return for another attempt. Matching all three cards reveals the completed zone-pattern links and a short educational summary.

## User experience

- The user selects and moves waveform cards with the controller ray. Direct lung-zone touches remain separate interactions.
- A virtual torso with six touch zones and three waveform cards floats in a comfortable workspace in front of the user.
- The user touches a lung zone and places the matching waveform card beside it.
- The zone pulses with the waveform and a correct card locks beside the torso.
- If a waveform card is placed at the wrong zone, the zone shows the selected pattern for comparison but the card returns to the tray.
- When all three waveform cards are matched, the torso displays the three completed zone-pattern links and an educational summary.
- The user can touch review again; the three cards return and all six zones return to idle.
- Releasing a card away from its matching zone returns the card to its tray. Reset clears any active waveform pulse.
- Reset returns all waveform cards to their tray, clears matched links and the summary, and restores inactive lung-zone patterns.

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

- `waveform-card`: each draggable authored pattern. Multiple objects can use
  this tag.
- `matching-lung-zone`: each zone that accepts a waveform card. Multiple objects
  can use this tag.
- `nonmatching-lung-zone`: each visible zone that rejects a waveform card.
  Multiple objects can use this tag.
- `matched-waveform-card`: each correctly locked card. Multiple objects can use
  this tag.

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
