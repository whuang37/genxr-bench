# Perception worker correlation

Implement the retained `MediaPipeVisionWorkerClient` in the supplied XR Blocks
workspace. The client runs a configured MediaPipe vision task off the render
thread and returns each result to the call that requested it.

## Goal

Enable face and pose backends to initialize a shared worker client once, submit
camera snapshots without copying their pixel buffer, and safely consume
asynchronous results even when replies arrive out of order.

## Required behavior

- `isSupported()` reports whether the environment provides both `Worker` and
  `Blob`.
- `init(config)` creates one JavaScript Blob worker, sends the supplied
  `MediaPipeWorkerInitConfig`, and resolves only after its successful
  initialization reply. Repeated initialization after success is idempotent.
- If workers are unavailable or initialization fails, reject with a usable error
  and leave the client in a safe state.
- `detect(imageData)` converts the snapshot to an `ImageBitmap`, transfers that
  bitmap to the worker, and resolves with the matching raw detection result.
- Multiple overlapping detections must correlate replies by their request IDs;
  out-of-order replies return to the correct callers and unknown replies have no
  effect.
- A detection before successful initialization, failed bitmap conversion, or a
  worker error resolves as `null` without corrupting other requests.
- `dispose()` terminates the worker, revokes its Blob URL, settles pending
  detections as `null`, and is safe before initialization or when repeated.
- Preserve the supplied worker protocol: initialization and detection replies
  carry the request ID and report errors for unsupported message types. Do not
  move task-specific face or pose result conversion into this shared client.
- Deliverable: implement the retained client shell without changing the public
  worker-program exports or unrelated perception backends.

## Public SDK interface

Implement `src/world/shared/MediaPipeVisionWorker.ts`. Preserve the public
`MediaPipeTaskName`, `MEDIAPIPE_MODULE_URL`, `MediaPipeWorkerInitConfig`,
`MEDIA_PIPE_VISION_WORKER_SOURCE`, and `MediaPipeVisionWorkerClient` exports.

`MediaPipeWorkerInitConfig` contains `mediapipeModuleUrl`, `wasmFilesUrl`,
`taskName`, and `taskOptions`. Preserve `new MediaPipeVisionWorkerClient(label)`,
the static `isSupported()`, `init(config): Promise<void>`,
`detect(imageData): Promise<unknown>`, and `dispose()` methods. Detection
results remain structured-clonable task results for the caller to interpret.

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
