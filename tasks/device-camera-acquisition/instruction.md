# Device camera acquisition

Implement the retained `XRDeviceCamera` acquisition and selection capability in
the supplied XR Blocks workspace. The public camera shell already exposes stream
state, device information, simulator integration, and the WebXR fallback hooks.

## Goal

Enable applications to enumerate video inputs, acquire the selected camera, and
switch between cameras or facing modes while receiving accurate stream metadata.

## User experience

An application can show the available cameras, select one, and begin using its
video texture. Environment-facing simulator cameras work without a browser media
request. When no usable camera is available, callers observe a clear unavailable
state; when acquisition fails, they can handle the rejected operation and error
state. Replacing a camera stops the old capture cleanly.

## Required behavior

- Enumerate browser and registered simulator devices, returning video inputs only.
- Use a registered environment-facing simulator source when it is selected; do
  not request browser media for that source.
- Acquire browser media using `DeviceCameraOptions.videoConstraints`. An empty
  device ID is not a valid browser device constraint and must resolve to the
  concrete active track when one is obtained.
- After valid metadata is available, publish `STREAMING` with width, height,
  aspect ratio, selected device when known, facing mode, and track settings.
  A rejected autoplay attempt must not discard otherwise valid metadata.
- Report `NO_DEVICES_FOUND` when enumeration finds no usable source. Report
  `ERROR` and reject an unrecoverable normal-media acquisition failure.
- `setDeviceId()` rejects an unknown ID, does nothing for the active device, and
  removes a conflicting facing-mode constraint. `setFacingMode()` removes a
  conflicting device constraint and reacquires the source.
- Ensure only one acquisition is active at a time. Stop replaced tracks, and if
  disposal happens during acquisition, stop late-arriving tracks and do not
  restore streaming state.
- Preserve the existing WebXR raw-camera fallback behavior and its ownership
  rules. Disposal is safe to repeat and releases active normal-media resources.
- Deliverable: implement the retained camera shell without changing its public
  API or unrelated camera, video, simulator, or perception behavior.

## Public SDK interface

Implement the shell in `src/camera/XRDeviceCamera.ts`, used through the SDK
exports. Preserve `XRDeviceCamera`, `MediaOrSimulatorMediaDeviceInfo`, and its
public constructor `new XRDeviceCamera(options: DeviceCameraOptions)`.

The public methods and properties are `getAvailableVideoDevices()`, `init()`,
`setRenderer(renderer)`, `setDeviceId(deviceId)`, `setFacingMode(facingMode)`,
`getAvailableDevices()`, `getCurrentDevice()`, `getCurrentTrackSettings()`,
`getCurrentDeviceIndex()`, `isUsingXRCameraAccess`, `updateXRCamera(frame)`,
`registerSimulatorCamera(source)`, and `dispose()`. The camera extends
`VideoStream`; retain its `statechange` event and `StreamState` values.

Use the retained `DeviceCameraOptions` and `SimulatorCameraSource` contracts in
`src/camera/CameraOptions.ts` and `src/camera/SimulatorCameraSource.ts`. Device
IDs select devices; facing modes use the browser `VideoFacingModeEnum` values.
The public `VideoStream` contract defines stream state and texture lifetime.

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
