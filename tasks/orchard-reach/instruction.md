# Orchard Reach

Build a mixed-reality reaching practice in which the user grabs apples, drags them above a basket, and releases them to fall under gravity. Implement it in the supplied application scaffold at `/workspace/app`.

## Description

The user reaches through a wide visible corridor, grabs an apple, and drags it above a basket. Releasing the apple lets it fall naturally under gravity instead of placing it directly into the basket. The activity provides a simple, repeatable way to practice reaching toward six comfortable positions arranged in a fixed arc. An apple that lands in the basket remains there, turns the corridor green, and advances progress. An apple that falls without landing in the basket returns to its original branch so the user can try again.

## User experience

- The app presents six apples in a fixed arc, one basket, and the first wide reach corridor at comfortable visible positions.
- The user reaches through the active corridor, grabs its apple, and drags the held apple above the basket opening.
- Releasing the apple lets gravity pull it downward. The app does not place or snap the apple directly into the basket.
- An apple that falls into and settles inside the basket remains there, turns the corridor green, and advances progress. After the first apple settles, display `1 of 6`.
- An apple that falls without landing in the basket returns to its branch and leaves the current corridor available.
- After all six apples are basketed, show `6 of 6`. Touching the full basket restores the apples and clears the progress.
- An interrupted grab returns the apple to its branch. Keep the active corridor and progress visible to the user without medical or posture claims.

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

- `reach-apple`: each fixed-arc apple. Multiple objects can use this tag.
- `apple-reach-corridor`: the active wide reach path.
- `apple-basket`: the physical landing target and progress display.

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
