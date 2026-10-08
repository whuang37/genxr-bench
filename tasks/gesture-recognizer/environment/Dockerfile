# syntax=docker/dockerfile:1.7

ARG RUNTIME_IMAGE=genxr-runtime:local
FROM ${RUNTIME_IMAGE}

ARG XRBLOCKS_COMMIT=unknown

LABEL org.opencontainers.image.title="GenXR XR Blocks SDK task runtime"
LABEL org.opencontainers.image.revision="${XRBLOCKS_COMMIT}"

WORKDIR /workspace/xrblocks

# Start from the correct SDK in the local runtime, introduce this task's bug,
# and rebuild. The patch is mounted for this step and is not stored in a layer.
RUN --mount=type=bind,source=oracle.patch,target=/tmp/oracle.patch,readonly \
    test ! -e .git \
    && git apply --reverse /tmp/oracle.patch \
    && rm --recursive --force \
        samples/xr_interaction/hand_gestures \
        samples/xr_interaction/xr_emoji \
    && npm run build:sdk

# Give the agent one baseline commit with no upstream history or patch file.
RUN git init \
    && git config user.email automation@localhost \
    && git config user.name devcontainer \
    && git add --all \
    && git commit --message "chore: initialize benchmark workspace" --no-gpg-sign \
    && git rev-parse HEAD > /var/lib/devcontainer_base_ref

CMD ["bash"]
