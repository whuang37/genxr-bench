# Ion Deflection Spectrometer

Build an XR spectrometer challenge that launches two isotope streams through an adjustable magnetic field. Implement it in the supplied application scaffold at `/workspace/app`.

## Description

Ion Deflection Spectrometer is an interactive demonstration of how a magnetic field separates isotopes by mass. Activating the source launches two labeled ion streams toward a pair of detectors. The user turns a field dial and watches both curved paths update continuously, with the lighter isotope bending more. Each detector lights when its matching stream reaches the correct slot. Aligning both streams completes the comparison and stops the source after the current particle group.

## User experience

- The app presents a compact spectrometer within reach and visible from above and the side, with an ion source, two labeled isotope streams, a magnetic-field dial, and two detector slots.
- Selecting the ion-source activation control launches both streams and leaves their two visible curved trajectories from the source toward the detector area.
- The user ray-selects and turns the field dial. Both curves update continuously, and the lighter isotope bends more. A 90-degree controller roll from the initial dial mark reaches the authored two-detector alignment.
- Correct alignment lights each matching detector and stops the source after a fixed particle batch. Moving the dial away turns misaligned detectors off.
- Selecting Replay clears the batch and both trajectories, turns both detectors off, and returns the field dial to its initial setting.
- If ray selection ends while turning the dial, keep its current allowed value and leave the matching ion paths visible.

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

- `spectrometer`: the durable visible instrument root.
- `ion-source`: the activation control.
- `field-dial`: the ray-selectable magnetic-field dial.
- `replay-button`: the full ray-selectable Replay control that clears the batch
  and resets the field dial. Its visible label must not block ray hits on the
  control.

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
