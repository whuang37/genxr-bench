# GPU depth converter

Implement GPU-to-CPU readback for the retained `GPUDepthConverter` API. The
starter supplies the depth-conversion vertex and fragment shaders; this task
implements the Three.js and WebGL orchestration around them.

## Goal

Enable depth-mesh consumers to obtain a CPU-compatible float depth buffer from
native GPU depth when CPU geometry is required.

## Required behavior

- Convert the supplied `XRWebGLDepthInformation` into a new
  `XRCPUDepthInformation` with the source dimensions, raw-value scale, and a
  current float readback buffer.
- Use the supplied conversion shaders to render the native texture into a float
  target that existing `Depth` and `DepthMesh` callers can consume.
- Use the supplied WebGL renderer for conversion and readback. Disable XR during
  the off-screen pass, re-enable it afterward, and restore the caller's render
  target.
- Treat one converter instance as one stable WebXR GPU stream. Reuse the
  conversion target, native-texture wrapper, and readback buffer across repeated
  frames with the same dimensions and native texture while refreshing the
  readback values and returned scale. Do not return stale data from a prior frame.
- Preserve existing CPU depth handling and options.

## Public SDK interface

Implement `src/depth/GPUDepthConverter.ts`. Preserve `GPUDepthConverter`, constructor `(renderer: THREE.WebGLRenderer)`, and `convertGPUToCPU(depthData: Readonly<XRWebGLDepthInformation>): XRCPUDepthInformation`.

The input is WebXR GPU depth data; the output must remain compatible with
standard CPU depth consumers and preserve its dimensions and
`rawValueToMeters`. View and projection transforms remain owned by `Depth`. See
`Depth.ts`, `DepthMesh.ts`, and `docs/manual/Depth.md` for callers. Do not expose
or require a private renderer seam. Keep the supplied shader source; shader
authoring, stream resizing, and switching to a different native texture are not
part of this task.

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
