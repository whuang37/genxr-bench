# GenXR Docker images

Tasks use a shared runtime and task-specific Docker images:

```text
genxr-runtime:local
  ├── genxr-runtime-app:local
  └── genxr-runtime-sdk:<task-version>
```

`genxr-runtime` is the reusable agent-visible toolchain. It contains Node.js 24,
Python 3, uv, the complete local XR Blocks checkout and dependency tree,
Chromium, FFmpeg, Git, native build tools, and a built installation of the
pinned XR Blocks DevTools revision. The DevTools checkout has no upstream Git
history.

`genxr-runtime-sdk` starts the agent in `/workspace/xrblocks`, where it can edit
the SDK directly. `genxr-runtime-app` uses the same prepared SDK but starts the
agent in `/workspace/app` with a small offline application scaffold.

`genxr-runtime-sdk` is an SDK task image. Its environment layer reverse-applies
the task's oracle patch to `/workspace/xrblocks`, removes guidance selected by
that task, rebuilds the SDK, and creates a new one-commit Git repository. The
patch is mounted only for that build step and does not remain in the resulting
image.

## Build the runtime

Build both reusable local images by passing the XR Blocks source directory:

```bash
./scripts/build-local-images.sh /absolute/path/to/xrblocks
```

`docker/runtime.Dockerfile` pins the public DevTools repository to a full
commit. That DevTools revision must use `xrblocks@^0.21.0`, which matches the
embedded SDK. Update the DevTools commit and SDK version together. To test a
different revision without editing the Dockerfile, set the build argument
through the helper script:

```bash
XRBLOCKS_DEVTOOLS_COMMIT=<full-commit> \
  ./scripts/build-local-images.sh /absolute/path/to/xrblocks
```

Use the bundled `xrblocks/` source to run this benchmark. A different SDK
checkout can change task behavior or prevent task patches from applying.

## Build an SDK task image

Build the task's existing `environment/` directory as the context. Each task
includes its required patches. BuildKit mounts the patches for the reverse-apply
command without copying them into the image:

```bash
docker build \
  --file tasks/<task-id>/environment/Dockerfile \
  --build-arg "RUNTIME_IMAGE=genxr-runtime:local" \
  --build-arg "XRBLOCKS_COMMIT=<full-upstream-commit>" \
  --tag "genxr-runtime-sdk:<task-version>" \
  tasks/<task-id>/environment
```

## Harbor task paths

- `/workspace/xrblocks` is the SDK agent workspace.
- `/workspace/app` is the experience agent workspace.
- `/opt/xrblocks-devtools` contains the shared DevTools installation.
- `/tests` contains test files uploaded for Harbor's verifier phase.
- `/logs/verifier` contains `reward.json` and verifier logs.
- `/logs/artifacts` contains retained evaluation evidence.
- `/var/lib/devcontainer_base_ref` records the prepared SDK workspace commit.

Tasks use Harbor's shared verifier mode. Harbor uploads the task's `tests/`
directory after the agent phase and runs `/tests/test.sh` in the existing
runtime container.
