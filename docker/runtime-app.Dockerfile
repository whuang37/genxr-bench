# syntax=docker/dockerfile:1.7

ARG RUNTIME_IMAGE=genxr-runtime:local
FROM ${RUNTIME_IMAGE}

# Give app-generation tasks a clean folder while sharing the SDK and dependency
# tree already installed in the common runtime image.
WORKDIR /workspace/app
RUN mkdir -p /workspace/app \
    && ln -s /workspace/xrblocks/node_modules node_modules

COPY docker/app/ ./

CMD ["bash"]
