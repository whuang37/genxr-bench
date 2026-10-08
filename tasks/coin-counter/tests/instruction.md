# Coin Counter

Build the Coin Counter XR experience in the supplied application scaffold at `/workspace/app`. It must provide the complete user-facing behavior described below.

## Description

Coin Counter is a hands-free tool for checking the value of several mixed coin piles at a glance. It recognizes pennies, nickels, dimes, quarters, and dollar coins. Each recognized pile receives a large, high-contrast value label directly above it. Labels follow their piles as the coins move and update when nearby piles merge. The experience stays focused on live pile values rather than asking the user to sort coins or complete a sequence.

## User experience

- The app finds each visible coin pile and places one readable subtotal label directly above it.
- Each label stays associated with its own pile as the user changes viewpoint or moves the pile.
- The supported values are one cent for a penny, five cents for a nickel, ten cents for a dime, twenty-five cents for a quarter, and one dollar for a dollar coin.
- Separate piles show separate subtotal labels.
- When the user moves piles close enough that they visually form one group, the app replaces their individual labels with one label that shows the combined value.
- When merged piles separate again, the combined label splits back into the correct individual subtotal labels.
- When coins leave view or are no longer recognized, their label disappears instead of remaining at an old position.
- When the pile becomes visible again, a new label appears above its current position and shows its current value.

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

- `coin-amount-label`: one readable subtotal directly above each recognized
  pile or merged pile group. Multiple objects can use this tag.

## Recognized objects

The object detector returns the physical objects listed below. The quoted text
is the exact label returned for each detected object.

- `"Penny"` - One physical penny.
- `"Nickel"` - One physical nickel.
- `"Dime"` - One physical dime.
- `"Quarter"` - One physical quarter.
- `"Dollar coin"` - One physical dollar coin.

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
