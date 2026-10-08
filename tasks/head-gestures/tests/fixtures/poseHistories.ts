import * as THREE from "three";

import type { HeadPoseSample } from "@xrblocks/source/input/headGestures/HeadGestureTypes";

type Axis = "pitch" | "yaw";

type PoseAngles = {
  pitch?: number;
  yaw?: number;
  roll?: number;
};

export function degrees(value: number) {
  return (value * Math.PI) / 180;
}

export function makeCompletedGestureSamples({
  axis,
  direction = 1,
  amplitudeDegrees = axis === "pitch" ? 25 : 18,
  timestamps = regularTimestamps(900),
  secondaryAxisDegrees = 0,
  worldOrientation = new THREE.Quaternion(),
  worldPosition = new THREE.Vector3(),
}: {
  axis: Axis;
  direction?: 1 | -1;
  amplitudeDegrees?: number;
  timestamps?: readonly number[];
  secondaryAxisDegrees?: number;
  worldOrientation?: THREE.Quaternion;
  worldPosition?: THREE.Vector3;
}): HeadPoseSample[] {
  const start = timestamps[0] ?? 0;
  const duration = (timestamps.at(-1) ?? start) - start;
  return makePoseSamples(
    timestamps,
    (timestamp) => {
      const progress = duration > 0 ? (timestamp - start) / duration : 0;
      const primary =
        direction * degrees(amplitudeDegrees) * excursion(progress);
      const secondary = degrees(secondaryAxisDegrees) * excursion(progress);
      return axis === "pitch"
        ? { pitch: primary, yaw: secondary }
        : { yaw: primary, pitch: secondary };
    },
    worldOrientation,
    worldPosition,
  );
}

export function makeOneWaySamples(axis: Axis): HeadPoseSample[] {
  const timestamps = regularTimestamps(1000);
  return makePoseSamples(timestamps, (timestamp) => {
    const value = timestamp < 300 ? 0 : degrees(35) * ((timestamp - 300) / 700);
    return axis === "pitch" ? { pitch: value } : { yaw: value };
  });
}

export function makeSlowNodSamples(): HeadPoseSample[] {
  return makePoseSamples(regularTimestamps(1800), (timestamp) => ({
    pitch:
      timestamp < 300
        ? 0
        : timestamp < 1000
          ? degrees(20) * ((timestamp - 300) / 700)
          : timestamp < 1700
            ? degrees(20) * (1 - (timestamp - 1000) / 700)
            : 0,
  }));
}

export function makeNoisyNodSamples(): HeadPoseSample[] {
  return makePoseSamples(regularTimestamps(900), (timestamp) => {
    const index = Math.floor(timestamp / 25);
    return {
      pitch: degrees(index % 2 === 0 ? 24 : -24),
      yaw: degrees(index % 3 === 0 ? 20 : -20),
    };
  });
}

export function irregularTimestamps() {
  return [
    0, 31, 65, 108, 144, 189, 225, 267, 302, 336, 381, 420, 461, 498, 539, 576,
    614, 657, 692, 734, 771, 812, 849, 884, 900,
  ];
}

export function regularTimestamps(durationMs: number, intervalMs = 25) {
  const timestamps: number[] = [];
  for (let timestamp = 0; timestamp <= durationMs; timestamp += intervalMs) {
    timestamps.push(timestamp);
  }
  if (timestamps.at(-1) !== durationMs) timestamps.push(durationMs);
  return timestamps;
}

export function makePoseSamples(
  timestamps: readonly number[],
  getAngles: (timestamp: number) => PoseAngles,
  worldOrientation = new THREE.Quaternion(),
  worldPosition = new THREE.Vector3(),
): HeadPoseSample[] {
  return timestamps.map((timestamp) => {
    const { pitch = 0, yaw = 0, roll = 0 } = getAngles(timestamp);
    return {
      timestamp,
      position: worldPosition.clone(),
      orientation: worldOrientation
        .clone()
        .multiply(
          new THREE.Quaternion().setFromEuler(
            new THREE.Euler(pitch, yaw, roll, "YXZ"),
          ),
        ),
    };
  });
}

function excursion(progress: number) {
  if (progress <= 1 / 3) return 0;
  if (progress <= 11 / 18) return (progress - 1 / 3) / (5 / 18);
  if (progress <= 8 / 9) return 1 - (progress - 11 / 18) / (5 / 18);
  return 0;
}
