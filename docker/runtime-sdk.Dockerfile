# syntax=docker/dockerfile:1.7

ARG RUNTIME_IMAGE=genxr-runtime:local
FROM ${RUNTIME_IMAGE}

ARG XRBLOCKS_COMMIT=unknown

LABEL org.opencontainers.image.title="GenXR XR Blocks SDK task runtime"
LABEL org.opencontainers.image.description="Editable XR Blocks workspace for a Harbor SDK task"
LABEL org.opencontainers.image.revision="${XRBLOCKS_COMMIT}"

WORKDIR /workspace/xrblocks

# The shared runtime contains the trusted SDK without upstream Git history.
# Reverse-apply the task patch from a temporary BuildKit mount. Remove guidance
# that this task does not expose, clear the inherited build, and then rebuild
# the buggy SDK. Customize the removal list for each generated task.
RUN --mount=type=bind,source=oracle.patch,target=/tmp/oracle.patch,readonly \
    test ! -e .git \
    && git apply --reverse /tmp/oracle.patch \
    && rm --recursive --force \
        build \
        demos \
        samples \
        skills \
        templates \
    && npm run build:sdk

# Give the agent one clean baseline commit. There is no upstream history or
# patch file in the resulting environment.
RUN git init \
    && git config user.email automation@localhost \
    && git config user.name devcontainer \
    && git add --all \
    && git commit --message "chore: initialize benchmark workspace" --no-gpg-sign \
    && git rev-parse HEAD > /var/lib/devcontainer_base_ref

CMD ["bash"]
