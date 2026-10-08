#!/usr/bin/env bash
set -euo pipefail

output_root="/logs/verifier/xrblocks-test"
reward_file="/logs/verifier/reward.json"
temporary_reward="/logs/verifier/.reward.json.tmp"
judge_result="/logs/verifier/llm_judge_result.json"
test_artifact_source="$output_root/f2p/artifacts"
test_artifact_destination="/logs/artifacts"

rm -f -- "$reward_file" "$temporary_reward" "$judge_result"
mkdir -p -- "$output_root" "$test_artifact_destination" /logs/verifier
rm -f -- "$output_root/build.log" "$output_root/build_xrblocks.log" "$output_root/f2p.log" "$output_root/p2p.log" "$output_root/judge.log"

write_reward() {
  printf '{"reward":%s}\n' "$1" >"$temporary_reward"
  mv -- "$temporary_reward" "$reward_file"
}

# -----------------------------------------------------------------------------
# Stage 1: XR Blocks Build and App Structure Checks
# -----------------------------------------------------------------------------
echo "=== Stage 1: XR Blocks Build and App Structure Checks ==="
if ! npm --prefix /workspace/xrblocks run build:sdk 2>&1 | tee "$output_root/build_xrblocks.log"; then
  echo "XR Blocks SDK build failed."
  write_reward 0
  exit 0
fi

if [[ ! -f /workspace/app/index.html || ! -f /workspace/app/main.js ]]; then
  echo "Static app files are missing."
  write_reward 0
  exit 0
fi

# -----------------------------------------------------------------------------
# Stage 2: Realtime DevTools Session Tests & Video Recordings
# -----------------------------------------------------------------------------
echo "=== Stage 2: DevTools Session Tests ==="
session_passed=true
test_command=(
  xrblocks-devtools test "/tests/f2p.test.ts"
  --app /workspace/app
  --xrblocks-root /workspace/xrblocks
  --output "$output_root/f2p"
)
if [[ -n "${MODEL_NAME:-}" ]]; then
  test_command+=(--judge-model "$MODEL_NAME")
fi
if ! "${test_command[@]}" 2>&1 | tee "$output_root/f2p.log"; then
  session_passed=false
fi

if ! jq -e '.status == "valid" and .passedTests == .totalTests' \
  "$output_root/f2p/result.json" >/dev/null 2>&1; then
  session_passed=false
fi

# Move all DevTools evidence into Harbor artifacts without keeping a duplicate.
if [[ -d "$test_artifact_source" ]]; then
  find "$test_artifact_source" -mindepth 1 -maxdepth 1 \
    -exec mv -t "$test_artifact_destination" -- {} +
else
  echo "Warning: No DevTools artifacts found at $test_artifact_source."
fi

# Slow short recordings to five seconds so the evaluator receives enough
# frames to inspect. Keep the final frame visible if rounding leaves a gap.
minimum_video_duration_seconds=5
while IFS= read -r -d '' video_path; do
  duration_seconds=$(ffprobe -v error \
    -show_entries format=duration \
    -of default=noprint_wrappers=1:nokey=1 \
    "$video_path" 2>/dev/null || true)

  if ! awk -v duration="$duration_seconds" \
    -v minimum="$minimum_video_duration_seconds" \
    'BEGIN { exit !(duration > 0 && duration < minimum) }'; then
    continue
  fi

  slowdown_factor=$(awk -v duration="$duration_seconds" \
    -v minimum="$minimum_video_duration_seconds" \
    'BEGIN { printf "%.9f", minimum / duration }')
  temporary_video="${video_path%.mp4}.minimum-duration.tmp"
  echo "Slowing $(basename -- "$video_path") from ${duration_seconds}s to ${minimum_video_duration_seconds}s."

  if ffmpeg -hide_banner -loglevel error -y \
    -i "$video_path" \
    -vf "setpts=${slowdown_factor}*PTS,tpad=stop_mode=clone:stop_duration=${minimum_video_duration_seconds},fps=30" \
    -t "$minimum_video_duration_seconds" \
    -an \
    -c:v libx264 \
    -preset veryfast \
    -pix_fmt yuv420p \
    -movflags +faststart \
    -f mp4 \
    "$temporary_video"; then
    mv -- "$temporary_video" "$video_path"
  else
    rm -f -- "$temporary_video"
    echo "Warning: Could not slow short video $video_path."
  fi
done < <(find "$test_artifact_destination" -maxdepth 1 -type f -name "*.mp4" -print0)

# Discard recordings that contain no readable video frames. Continue with any
# valid recordings instead of sending an empty file to the evaluator.
while IFS= read -r -d '' video_path; do
  readable_frame_count=$(ffprobe -v error \
    -select_streams v:0 \
    -count_frames \
    -show_entries stream=nb_read_frames \
    -of default=noprint_wrappers=1:nokey=1 \
    "$video_path" 2>/dev/null || true)

  if ! awk -v frames="$readable_frame_count" \
    'BEGIN { exit !(frames ~ /^[0-9]+$/ && frames > 0) }'; then
    echo "Warning: Discarding $(basename -- "$video_path") because it contains no readable video frames."
    rm -f -- "$video_path"
  fi
done < <(find "$test_artifact_destination" -maxdepth 1 -type f -name "*.mp4" -print0)

# -----------------------------------------------------------------------------
# Stage 3: Multimodal LLM Judge (All Videos in One Request)
# -----------------------------------------------------------------------------
echo "=== Stage 3: LLM Judge ==="
video_count=$(find /logs/artifacts -maxdepth 1 -name "*.mp4" 2>/dev/null | wc -l | tr -d ' ')

if [[ "$video_count" -gt 0 && -n "${GEMINI_API_KEY:-}" ]]; then
  if uv run /tests/llm_judge.py 2>&1 | tee "$output_root/judge.log"; then
    if [[ ! -f "$judge_result" ]]; then
      echo "Warning: LLM judge completed without producing a result."
    fi
  else
    echo "Warning: LLM judge failed; build and F2P results are unchanged."
  fi
else
  if [[ "$video_count" -eq 0 ]]; then
    echo "Warning: No video recordings found in /logs/artifacts/; skipping LLM judge."
  fi
  if [[ -z "${GEMINI_API_KEY:-}" ]]; then
    echo "Warning: GEMINI_API_KEY not set; skipping LLM judge."
  fi
fi

# -----------------------------------------------------------------------------
# Final Reward Calculation
# -----------------------------------------------------------------------------
if [[ "$session_passed" == "true" ]]; then
  reward=1
else
  reward=0
fi

if [[ -f "$judge_result" ]]; then
  mv -- "$judge_result" "$test_artifact_destination/llm_judge_result.json"
fi

write_reward "$reward"

echo "Verification complete. Reward: $reward"
