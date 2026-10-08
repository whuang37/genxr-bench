# syntax=docker/dockerfile:1.7

ARG RUNTIME_IMAGE=genxr-runtime-app:local
FROM ${RUNTIME_IMAGE}

WORKDIR /workspace/app

# Copy task-specific starter scaffold into /workspace/app
COPY app/ /workspace/app/

# Initialize fresh Git workspace with one baseline commit
RUN git init \
    && git config user.email automation@localhost \
    && git config user.name devcontainer \
    && git add --all \
    && git commit --message "chore: initialize benchmark app workspace" --no-gpg-sign \
    && git rev-parse HEAD > /var/lib/devcontainer_base_ref

CMD ["bash"]
