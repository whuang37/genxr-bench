# GenXR-Bench: Benchmarking Coding Agents for Interactive XR Development

This work is licensed under a
[Creative Commons Attribution 4.0 International License](https://creativecommons.org/licenses/by/4.0/deed.en).

### [[Project Page]](https://whuang37.github.io/genxr-bench) [[arXiv]](https://arxiv.org/abs/2610.29014v1)

![Teaser Image](./assets/teaser.png)

## Overview

GenXR-Bench is a benchmark to analyze the performance of agents on common XR coding tasks fully implemented using the [XR Blocks](https://xrblocks.github.io/) SDK. GenXR-Bench consists of the following:
- 24 tasks analyzing how well agents are able to **implement core SDK functionality** like occlusion rendering or interactions.
- 21 tasks analyzing how well agents can **translate interaction-related bugs into concrete code updates**.
- 67 tasks analyzing how well agents can **generate end-to-end XR experiences** across common application domains. 


## Installation

GenXR-Bench is implemented using Harbor. Run this benchmark on a computer with:
- Docker. Each task requires 4 GB of memory and 10 GB of storage during runtime
- Python. We recommend installation through [uv](https://docs.astral.sh/uv/getting-started/installation/).
- An API key for your agent provider and `GEMINI_API_KEY` for the verifier. Get a key [here](https://aistudio.google.com/app/api-keys)
- [Harbor](https://docs.harborframework.com/getting-started/quick-start) evaluation framework.

We outline setup using [uv](https://docs.astral.sh/uv/getting-started/installation/) below:

1. Clone the repository

```bash
git clone https://github.com/xrblocks/genxr-bench.git
cd genxr-bench
```

2. Setup all tools

```bash
uv python install 3.12
uv tool install --python 3.12 harbor==0.18.0

docker info
docker buildx version
docker compose version
harbor --version
```

3. Build the docker images

```bash
./scripts/build-local-images.sh ./xrblocks
```

The build downloads SDK assets and sets up XR Blocks for a fully local runtime.. It
creates `genxr-runtime:local` and `genxr-runtime-app:local`. See
[Docker setup](docker/README.md) for details.

## Run the benchmark

The full benchmark:
```bash
export MODEL_KEY="<your-agent-api-key>"
export GEMINI_API_KEY="<your-gemini-api-key>"
export MODEL_ID="your-model-id"

harbor run \
  --path tasks/ \
  --agent mini-swe-agent \
  --model "$MODEL_ID" \
  --verifier-env "GEMINI_API_KEY=$GEMINI_API_KEY" \
  --jobs-dir jobs
```


A singular task:
```bash
export MODEL_KEY="<your-agent-api-key>"
export GEMINI_API_KEY="<your-gemini-api-key>"
export MODEL_ID="your-model-id"

harbor run \
  --path tasks/blowing-dandelion \
  --agent mini-swe-agent \
  --model "$MODEL_ID" \
  --verifier-env "GEMINI_API_KEY=$GEMINI_API_KEY" \
  --jobs-dir jobs
```

## View results

We provide an optional viewer to easily look at generated applications. using Node.js 24 and npm. run:

```bash
cd genxr-viewer
npm ci
npm run import-job -- ../jobs/<job-id> --import-artifacts
npm run dev
```

Replace `<job-id>` with a completed job directory. 

## Citing

If extending or using our work, please cite the following:

```
@misc{huangGenXRBenchBenchmarkingCoding2026,
  title = {{{GenXR-Bench}}: {{Benchmarking Coding Agents}} for {{Interactive XR Development}}},
  shorttitle = {{{GenXR-Bench}}},
  author = {Huang, William and Li, David and Chen, Xiang 'Anthony' and Qian, Xun and Numan, Nels and Zhou, Zhongyi and Cho, Hyunsung and Chishti, Salman Muin Kayser and Xia, Ding and Huang, Xincheng and Ren, Jiahao and Faruqi, Faraz and Xu, Tianyu and Zhang, Yang and Kim, David and Du, Ruofei},
  year = 2026,
  month = oct,
  number = {arXiv:2610.29014},
  eprint = {2610.29014},
  primaryclass = {cs.AI},
  publisher = {arXiv},
  doi = {10.48550/arXiv.2610.29014},
  urldate = {2026-10-22},
  archiveprefix = {arXiv}
}
```