# WebXR camera fallback

Implement the retained WebXR Raw Camera Access fallback for `XRDeviceCamera` in
the supplied XR Blocks workspace. The normal browser and simulator acquisition
path is already part of the public camera contract and must continue to work.

## Goal

Enable an AR application with no normal video device to use camera frames made
available by its WebXR session as the device-camera texture.

## User experience

In an eligible immersive AR session, the camera remains initializing until a
usable raw camera frame arrives, then becomes a streaming camera texture. If the
feature is unavailable or no frame arrives, the application sees an unavailable
camera instead of a broken or stale texture. Leaving or disposing the camera
stops fallback updates.

## Required behavior

- `setRenderer()` enables fallback decisions for the associated WebGL renderer.
  If normal device discovery or acquisition cannot provide a source, use raw
  camera access only when the session grants `camera-access`.
- When fallback is selected, enter `INITIALIZING`. If no usable frame becomes
  available within the five-second readiness period, clear fallback and report
  `NO_DEVICES_FOUND`.
- `updateXRCamera(frame)` must require a renderer binding, reference space,
  viewer pose, usable view camera, and native camera image before it publishes
  a stream.
- Publish the native image through the camera's public `texture`, dimensions,
  aspect ratio, `loaded` flag, and `STREAMING` state. Reuse the owned external
  texture across later valid frames and refresh it with the current native image.
- A valid first frame cancels the pending no-frame transition. Incomplete or
  stale frames must not publish a stream.
- Disposal releases the fallback texture, clears fallback state and pending
  readiness work, and makes later frame updates inert. Repeated disposal is safe.
- Preserve normal media behavior: browser and simulator enumeration, normal
  stream metadata, source replacement, no-device state, and normal acquisition
  errors must continue to follow the existing `XRDeviceCamera` contract.
- Deliverable: implement the fallback in the retained camera shell without
  changing the documented camera API or unrelated rendering behavior.

## Public SDK interface

Implement the fallback-facing shell in `src/camera/XRDeviceCamera.ts`. Preserve
`XRDeviceCamera` and its constructor `new XRDeviceCamera(options:
DeviceCameraOptions)`, plus `setRenderer(renderer)`, `init()`,
`isUsingXRCameraAccess`, `updateXRCamera(frame)`, and `dispose()`.

The class remains a `VideoStream`: consumers observe its `texture`, `loaded`,
`width`, `height`, `aspectRatio`, `state`, and `statechange` events. Use the
retained `StreamState` values and the `DeviceCameraOptions` configuration.
Raw-camera frames use the WebXR camera image supplied by the renderer binding;
do not introduce a new application-facing camera API.

## Provided workspace and resources

- The editable SDK workspace is `/workspace/xrblocks`. The shell starts in this
  directory.
- Package dependencies and XR Blocks assets are already available in
  `node_modules/` and `xrblocks-assets/`. Use the supplied dependency versions and
  do not reinstall or replace them unless the task specifically requires a
  dependency change.
- Existing SDK source and public unit tests are under `src/`. Public manuals,
  samples, starter applications, and task-relevant guidance are under `docs/`,
  `samples/`, `templates/`, and `skills/`. These retained resources define normal
  callers and surrounding behavior that must continue to work.
- `xrblocks-devtools` is installed on `PATH` and includes the browser-based XR
  simulator and inspection tools. Run `xrblocks-devtools --help` to list its public
  commands. Do not modify the internal source code.
- Run `npm run build:sdk` for the SDK build, `npm test` for the public unit tests,
  and `npm run dev` only when you need to inspect public samples or templates in a
  browser. Network access can be restricted, so use the supplied local resources.
