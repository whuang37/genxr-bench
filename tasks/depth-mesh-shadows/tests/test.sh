#!/usr/bin/env bash
set -euo pipefail

output_root="/logs/verifier/xrblocks-test"
reward_file="/logs/verifier/reward.json"
temporary_reward="/logs/verifier/.reward.json.tmp"

rm -f -- "$reward_file" "$temporary_reward"
mkdir -p -- "$output_root"
rm -f -- "$output_root/f2p.log" "$output_root/p2p.log"

write_reward() {
  printf '{"reward":%s}\n' "$1" >"$temporary_reward"
  mv -- "$temporary_reward" "$reward_file"
}

if ! npm --prefix /workspace/xrblocks run build:sdk; then
  write_reward 0
  exit 0
fi

for suite in f2p p2p; do
  test_command=(
    xrblocks-devtools test "/tests/$suite.test.ts"
    --app /tests/app
    --xrblocks-root /workspace/xrblocks
    --output "$output_root/$suite"
  )
  if [[ -n "${MODEL_NAME:-}" ]]; then
    test_command+=(--judge-model "$MODEL_NAME")
  fi
  if ! "${test_command[@]}" 2>&1 | tee "$output_root/$suite.log"; then
    write_reward 0
    exit 1
  fi
done

for suite in f2p p2p; do
  if ! jq -e \
    '.status == "valid" and .totalTests > 0' \
    "$output_root/$suite/result.json" >/dev/null; then
    write_reward 0
    exit 1
  fi
done

if jq -e \
  '.passedTests == .totalTests' \
  "$output_root/f2p/result.json" >/dev/null \
  && jq -e \
    '.passedTests == .totalTests' \
    "$output_root/p2p/result.json" >/dev/null; then
  write_reward 1
else
  write_reward 0
fi
