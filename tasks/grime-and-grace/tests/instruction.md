# Grime and Grace

Build a mixed-reality surface-cleaning coverage game with six visible grime patches on a detected table or counter. Implement it in the supplied application scaffold at `/workspace/app`.

## Description

Grime and Grace is a hand-guided cleaning activity on a nearby table or counter. Six compact grime patches respond when the user wipes directly across their surface. Each patch fades along the hand path, and a complete circular wiping motion removes it and advances the progress counter. Moving above the surface leaves the grime unchanged. Fading grime and the counter provide clear feedback without a marked route or special hand guide.

## User experience

- The app presents six compact grime patches and a `0 of 6 clean` counter on one nearby table or counter.
- Moving a hand directly across a patch clears only the contacted area along the wiping path. A compact circular wipe can fully remove one patch.
- Moving above the surface clears nothing.
- A fully cleared grime patch is removed, advances the counter to `1 of 6 clean` after the first patch, and leaves the underlying surface clean.
- Cleaning all six patches adds a clean sheen and shows `6 of 6 clean`. Touching that counter restores all six patches at their initial surface positions.

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

- `grime-patch`: each active grime patch. Multiple objects can use this tag.

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
