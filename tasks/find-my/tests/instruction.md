# Find My

Build the Find My XR experience in the supplied application scaffold at `/workspace/app`. It must provide the complete user-facing behavior described below.

## Description

Find My is a simple voice-guided tool for marking familiar objects in the supplied room scene. The user can say coffee mug, book, or remote control. The app immediately places one clear box around the named recognized object. Saying another supported name moves the box to the new object and clears the previous mark.

## User experience

- The app starts with an unobstructed room view. Voice is the only query input,
  and the search box appears after the user says a supported object name.
- The user says `coffee mug`, `book`, or `remote control` while the recognized objects are visible.
- The app immediately places one high-contrast rectangular box tightly around the named object.
- Saying another supported name removes the previous box before placing the same single box around the newly named object.
- The box follows the current position and size of its recognized object.

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


## Recognized objects

The object detector returns the physical objects listed below. The quoted text
is the exact label returned for each detected object.

- `"Coffee mug"` - A physical coffee mug that the user can search for.
- `"Book"` - A physical book that the user can search for.
- `"Remote control"` - A physical remote control that the user can search for.

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
