# Spatial Dominoes

Build a simple room-scale domino physics toy in the supplied application scaffold at `/workspace/app`.

## Description

Spatial Dominoes lets the user place upright dominoes on sensed room surfaces with the hand ray. Each ray click creates one physics domino at the mesh hit. The domino starts stable and upright, then responds naturally when the user's hand collides with it.

## User experience

- Start with no dominoes and no placement previews.
- A ray click on a valid horizontal world-mesh surface places one domino with its base near the ray hit.
- Place each new domino upright with no initial tilt, angular velocity, or motion. It must remain upright after settling unless something hits it.
- Let the user place any number of dominoes. Keep all placed dominoes under gravity with collision against the room and other dominoes.
- Direct contact from either user hand must apply a physics impulse that moves and can topple the domino.
- A ray click that misses valid sensed geometry creates nothing.

## Project layout

- Build the application only in `/workspace/app`. Do not modify, replace, or
  vendor `/workspace/xrblocks`; it is the pinned, read-only XR Blocks SDK.
- Use the supplied static app scaffold and local dependencies. Do not install,
  reinstall, or vendor dependencies unless this task explicitly requires a
  dependency change.

## Tagging the app

Attach the same stable tag to every placed domino: `object.userData.xrblocksDevtools = { tag: "domino" }`.

This tag explicitly allows multiple live objects. Attach it to each semantic
domino owner. Do not also attach it to a helper mesh or to an ancestor or
descendant of that owner.

- `domino`: every placed physics domino.

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
