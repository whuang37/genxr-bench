#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd -- "$script_dir/.." && pwd)"
xrblocks_dir="${1:-}"

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <xrblocks-directory>" >&2
  exit 2
fi

if [[ ! -f "$xrblocks_dir/package.json" ]]; then
  echo "XRBlocks checkout not found: $xrblocks_dir" >&2
  exit 1
fi

build_runtime() {
  docker buildx build --load \
    --file "$repo_root/docker/runtime.Dockerfile" \
    --build-context "xrblocks=$xrblocks_dir" \
    "$@" \
    --tag genxr-runtime:local \
    "$repo_root"
}

echo "Building genxr-runtime:local"
if [[ -n "${XRBLOCKS_DEVTOOLS_COMMIT:-}" ]]; then
  build_runtime \
    --build-arg "XRBLOCKS_DEVTOOLS_COMMIT=${XRBLOCKS_DEVTOOLS_COMMIT}"
else
  build_runtime
fi

echo "Building genxr-runtime-app:local"
docker build \
  --file "$repo_root/docker/runtime-app.Dockerfile" \
  --build-arg RUNTIME_IMAGE=genxr-runtime:local \
  --tag genxr-runtime-app:local \
  "$repo_root"

echo "Built local GenXR images:"
echo "  genxr-runtime:local"
echo "  genxr-runtime-app:local"
