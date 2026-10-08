# Portal

Build a simple paired-portal physics toy that uses the sensed world mesh. Implement it in the supplied application scaffold at `/workspace/app`.

## Description

Portal lets the user place one blue portal and one orange portal directly on the room mesh. A fist places the portal assigned to that hand at the current hand-ray hit. A pinch launches a physics ball. A ball that enters either portal exits the other with its motion transformed to the exit portal, then continues colliding with and bouncing around the sensed room.

## User experience

- Start with no placed portals and no balls.
- Show the normal hand aim so the user can choose a point on the sensed world mesh.
- Making a fist with the primary hand places the blue portal at that hand's current world-mesh hit.
- Making a fist with the secondary hand places the orange portal at that hand's current world-mesh hit.
- Align each portal to the hit surface. Repeating the fist gesture moves that hand's existing portal instead of creating another portal.
- Do not place or move a portal when its hand is not aimed at the sensed world mesh.
- Pinching with either hand launches a new ball from that hand along its aim direction.
- Give every launched ball gravity, velocity, and collision against the sensed room. Balls must bounce from the floor, walls, and other room surfaces instead of stopping at the first collision.
- When a ball enters either portal, move it to the linked portal and transform its velocity into the exit portal's direction. Keep the same ball moving under physics after it exits.
- Let the user place portals and launch balls repeatedly. Do not add a score, ball limit, completion state, game objective, portal previews, reset control, or other game rules.

## Project layout

- Build the application only in `/workspace/app`. Do not modify, replace, or
  vendor `/workspace/xrblocks`; it is the pinned, read-only XR Blocks SDK.
- Use the supplied static app scaffold and local dependencies. Do not install,
  reinstall, or vendor dependencies unless this task explicitly requires a
  dependency change.

## Tagging the app

Attach a stable tag only to each listed durable visible result: `object.userData.xrblocksDevtools = { tag: "..." }`. Tags identify scene objects; they do not replace visible behavior.

Each listed tag identifies exactly one live object unless its entry explicitly
allows multiple objects. Attach the tag to the semantic owner of the result.
Do not also attach that tag to a helper mesh or to an ancestor or descendant of
the semantic owner.

- `blue-portal`: the blue portal placed by the primary-hand fist.
- `orange-portal`: the orange portal placed by the secondary-hand fist.
- `portal-ball`: every ball launched by a pinch. Multiple balls can share this tag.

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
