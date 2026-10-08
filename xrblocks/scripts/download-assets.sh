#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ASSETS_DIR="${SCRIPT_DIR}/../xrblocks-assets"
XRBLOCKS_ASSETS_URL="https://cdn.jsdelivr.net/gh/xrblocks/assets@5582bd1b2d1a4e19f7ee7093b63a5ee328e974ac"
HAND_ASSETS_URL="https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/generic-hand"

download() {
  local url="$1"
  local target="$2"

  if [[ -s "${target}" ]]; then
    echo "Using cached ${target#"${ASSETS_DIR}/"}"
    return
  fi

  mkdir -p "$(dirname -- "${target}")"
  echo "Downloading ${target#"${ASSETS_DIR}/"}"
  curl --fail --location --retry 3 --retry-all-errors \
    --output "${target}.part" "${url}"
  mv "${target}.part" "${target}"
}

# MediaPipe task models. The WASM runtimes come from the installed npm packages.
download \
  "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite2/int8/latest/efficientdet_lite2.tflite" \
  "${ASSETS_DIR}/models/efficientdet_lite2.tflite"
download \
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task" \
  "${ASSETS_DIR}/models/face_landmarker.task"
download \
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task" \
  "${ASSETS_DIR}/models/pose_landmarker_full.task"
download \
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite" \
  "${ASSETS_DIR}/models/selfie_multiclass_256x256.tflite"
download \
  "https://tfhub.dev/google/lite-model/yamnet/classification/tflite/1?lite-format=tflite" \
  "${ASSETS_DIR}/models/yamnet.tflite"

# Desktop simulator scenes.
for scene_file in \
  XREmulatorsceneV5_livingRoom.glb \
  XREmulatorsceneV5_livingRoom_planes.json \
  XREmulatorsceneV5_livingRoom_navmesh.glb \
  XREmulatorsceneV5_office.glb \
  XREmulatorsceneV5_office_planes.json \
  XREmulatorsceneV5_office_navmesh.glb \
  XREmulatorsceneV5.glb \
  XREmulatorsceneV5_planes.json \
  XREmulatorsceneV5_navmesh.glb \
  XREmulatorscene_Dark.glb; do
  download \
    "${XRBLOCKS_ASSETS_URL}/simulator/scenes/${scene_file}" \
    "${ASSETS_DIR}/simulator/scenes/${scene_file}"
done

# Desktop simulator hand meshes.
for hand_file in left.glb right.glb; do
  download \
    "${HAND_ASSETS_URL}/${hand_file}" \
    "${ASSETS_DIR}/simulator/hands/${hand_file}"
done
