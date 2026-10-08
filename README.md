# GENXR-BENCH

**Benchmarking Coding Agents for Interactive XR Development**

<!-- Replace these URLs when the paper and results are available. -->
[Paper](https://example.com/genxr-bench-paper) ·
[Results](https://example.com/genxr-bench-results)

## Repository layout

- `tasks/`: instructions, Docker environments, verifiers, and SDK reference solutions.
- `xrblocks/`: Local XR Blocks 0.21.0 with slight modifications for network-limitations.
- `docker/`: Runtime image files.
- `scripts/`: Build scripts.
- `genxr-viewer/`: viewer for local evaluation results.

## Requirements

- Git.
- Docker with a running daemon, Buildx, and Compose. Each task requests 4 GB of
  memory and 10 GB of storage; allow additional space for shared images.
- [uv](https://docs.astral.sh/uv/getting-started/installation/) and Python 3.12
  or newer for Harbor 0.18.0.
- An API key for your agent provider and `GEMINI_API_KEY` for the verifier.
  All task configurations reference `GEMINI_API_KEY`.

Node.js, Chromium, FFmpeg, and DevTools are installed in the Docker images.
You do not need them on the host to run tasks. Internet access is required to
build the images and call model APIs. A headset is not required for the
automated simulator tests.

## Installation

```bash
git clone https://github.com/xrblocks/genxr-bench.git
cd genxr-bench

uv python install 3.12
uv tool install --python 3.12 harbor==0.18.0

docker info
docker buildx version
docker compose version
harbor --version

./scripts/build-local-images.sh ./xrblocks
```

The build downloads SDK assets and installs the pinned DevTools revision. It
creates `genxr-runtime:local` and `genxr-runtime-app:local`. See
[Docker setup](docker/README.md) for details.

## Run the benchmark

This example uses `mini-swe-agent` with an OpenAI model. Set a model ID available
to your account in `provider/model` format.

```bash
export OPENAI_API_KEY="<your-agent-api-key>"
export GEMINI_API_KEY="<your-gemini-api-key>"
export MODEL_ID="openai/your-model-id"

harbor run \
  --path tasks/blowing-dandelion \
  --agent mini-swe-agent \
  --model "$MODEL_ID" \
  --verifier-env "GEMINI_API_KEY=$GEMINI_API_KEY" \
  --jobs-dir jobs
```

For the full benchmark, change `--path` to `tasks` and add `--n-concurrent 1`.
Start with one trial at a time because browser tests use substantial resources.
For other agents and credentials, see the
[Harbor agent guide](https://docs.harborframework.com/agents/pre-integrated-agents).

Harbor saves results, logs, and artifacts under `jobs/`. Task verifiers write
`reward.json`; app tasks also save a video judge result when available. The
video judge result is separate from the binary test reward. App tasks do not
include reference solutions; SDK tasks include them under `solution/`.

## View results

The optional viewer requires Node.js 24 and npm on the host. From the repository
root:

```bash
cd genxr-viewer
npm ci
npm run import-job -- ../jobs/<job-id> --import-artifacts
npm run dev
```

Replace `<job-id>` with a completed job directory. Open the local URL printed
by Vite, normally `http://localhost:5173`. See the
[viewer README](genxr-viewer/README.md) for build and deployment instructions.
Evaluation output and imported jobs are excluded from version control.
