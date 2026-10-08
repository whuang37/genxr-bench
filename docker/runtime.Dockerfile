# syntax=docker/dockerfile:1.7

FROM node:24-bookworm AS runtime

COPY --from=ghcr.io/astral-sh/uv:0.11.19 /uv /uvx /usr/local/bin/

ENV DEBIAN_FRONTEND=noninteractive \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    XRBLOCKS_DEVTOOLS_BROWSER_PROFILE=container-software

RUN apt-get update \
    && apt-get install --yes --no-install-recommends \
        build-essential \
        ca-certificates \
        curl \
        ffmpeg \
        git \
        jq \
        lsof \
        pkg-config \
        procps \
        python3 \
        ripgrep \
        zstd \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /logs/agent /logs/artifacts /logs/verifier /tests

# Install and build the exact XR Blocks checkout supplied by this repository.
# The Docker build context excludes its Git history and existing build output.
WORKDIR /workspace/xrblocks
COPY --from=xrblocks . ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --ignore-scripts --no-audit --no-fund \
    && npm run download:assets \
    && npm run build:sdk \
    && test ! -e .git \
    && ln -s /workspace/xrblocks node_modules/xrblocks

# Fetch the exact DevTools revision compatible with xrblocks@^0.21.0. Remove its
# Git metadata so the runtime does not expose upstream history to benchmark agents.
WORKDIR /opt/xrblocks-devtools
ARG XRBLOCKS_DEVTOOLS_COMMIT=38221f1b077dcb4ba0c24259e3a7aadf26580ccd
RUN git init \
    && git remote add origin https://github.com/xrblocks/xrblocks-devtools.git \
    && git fetch --depth=1 origin "${XRBLOCKS_DEVTOOLS_COMMIT}" \
    && git checkout --detach FETCH_HEAD \
    && test "$(git rev-parse HEAD)" = "${XRBLOCKS_DEVTOOLS_COMMIT}" \
    && rm -rf .git

# npm ci installs the registry development dependency from the DevTools lockfile.
# Replace it with the active SDK before building. Detach that link before npm
# prunes development dependencies. Promote required optional packages to runtime
# dependencies, then restore the active SDK for DevTools runtime use.
RUN --mount=type=cache,target=/root/.npm \
    npm ci --ignore-scripts --no-audit --no-fund \
    && rm -rf node_modules/xrblocks \
    && ln -s /workspace/xrblocks node_modules/xrblocks \
    && npm run build \
    && rm -rf node_modules/xrblocks \
    && npm prune --omit=dev \
    && npm install --ignore-scripts --no-audit --no-fund --omit=dev \
        --save-prod --package-lock=false \
        @ai-sdk/google@4.0.46 \
        tiny-tts@5.0.1 \
    && ln -s /workspace/xrblocks node_modules/xrblocks \
    && test "$(readlink -f node_modules/xrblocks)" = /workspace/xrblocks

# Initialize TinyTTS during the build so task runs do not need network access.
RUN node --input-type=module --eval \
        "const {default: TinyTTS} = await import('tiny-tts'); const tts = new TinyTTS(); await tts.init(); await tts.dispose(); process.exit(0);" \
    && test -s node_modules/models/tinytts.onnx

# Let verifier modules import "@xrblocks/devtools" from any directory and make
# the DevTools CLI available on PATH.
RUN mkdir -p /node_modules/@xrblocks \
    && ln -s /opt/xrblocks-devtools /node_modules/@xrblocks/devtools \
    && ln -s /opt/xrblocks-devtools/dist/cli.js \
        /usr/local/bin/xrblocks-devtools

# Install the Chromium binary and Debian libraries used by DevTools sessions.
RUN ./node_modules/.bin/playwright install --with-deps chromium \
    && rm -rf /var/lib/apt/lists/*
