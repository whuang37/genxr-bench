# Plate UFO

Build a mixed-reality toy that turns a detected paper plate into a handheld UFO. Implement it in the supplied application scaffold at `/workspace/app`.

## Description

Plate UFO turns the supplied paper plate itself into a handheld flying saucer. Before the user reaches for the plate, the UFO remains inactive and no separate spacecraft appears. Bringing either hand close enough to hold the plate adds a virtual dome, lights, and tractor beam directly to it. Moving the tracked plate moves the complete saucer, allowing the user to position it above three nearby sheep. Holding the plate above a sheep pulls that sheep into the beam, and collecting all three completes the game.

## User experience

- The app recognizes the supplied paper plate and places three sheep in a nearby play area. There is no launch ring or separate miniature UFO.
- While the user's hand remains away from the plate, the UFO augmentation and tractor beam stay hidden.
- Bringing either hand close enough to hold the plate starts the game. A virtual dome, rim lights, and tractor beam appear directly on the plate so the plate becomes the body of the saucer.
- The saucer follows the tracked plate's position and orientation. Moving the plate above a sheep aligns the tractor beam with that sheep.
- The tractor beam visibly pulls the sheep upward during a one-second hold. Moving the plate away before the sheep reaches the saucer cancels that attempt.
- Each collected sheep disappears into the saucer while the other sheep remain available. Collecting all three shows `3 of 3` and a clear completed state.

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

- `plate-ufo`: the visible saucer augmentation and tractor beam attached directly to the plate.
- `sheep`: each collectible sheep. Multiple objects can use this tag; the
  verifier selects one object by ID.

## Recognized objects

The object detector returns the physical objects listed below. The quoted text
is the exact label returned for each detected object.

- `"Paper plate"` - The physical plate used as the virtual UFO.

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
