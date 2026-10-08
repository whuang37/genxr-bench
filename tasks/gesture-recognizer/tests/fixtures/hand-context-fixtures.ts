import * as THREE from "three";

import { Handedness, type JointName } from "@xrblocks/source/input/Hands.ts";
import { HAND_JOINT_NAMES } from "@xrblocks/source/input/components/HandJointNames.ts";
import { resolveSimulatorHandPoseRotations } from "@xrblocks/source/simulator/handPoses/HandPoseFK.ts";
import { SIMULATOR_HAND_POSE_ROTATIONS } from "@xrblocks/source/simulator/handPoses/HandPoseRotations.ts";
import { SimulatorHandPose } from "@xrblocks/source/simulator/handPoses/HandPoses.ts";
import type { HandContext } from "@xrblocks/source/input/gestures/GestureTypes.ts";

export function contextForPose(
  handedness: Handedness,
  pose: SimulatorHandPose,
): HandContext {
  const joints = new Map<JointName, THREE.Vector3>();
  const keypoints = resolveSimulatorHandPoseRotations(
    handedness,
    SIMULATOR_HAND_POSE_ROTATIONS[pose],
    pose === SimulatorHandPose.PINCHING || pose === SimulatorHandPose.FIST,
  );
  HAND_JOINT_NAMES.forEach((name, index) => {
    joints.set(name, new THREE.Vector3().fromArray(keypoints[index].t));
  });

  return {
    getJoint(name) {
      return joints.get(name);
    },
    handedness,
    handLabel: handedness === Handedness.LEFT ? "left" : "right",
    joints,
  };
}

export function transformedContext(
  context: HandContext,
  {
    rotation = new THREE.Quaternion(),
    scale = 1,
    translation = new THREE.Vector3(),
  }: {
    rotation?: THREE.Quaternion;
    scale?: number;
    translation?: THREE.Vector3;
  },
): HandContext {
  const joints = new Map<JointName, THREE.Vector3>();
  for (const [name, position] of context.joints) {
    joints.set(
      name,
      position
        .clone()
        .multiplyScalar(scale)
        .applyQuaternion(rotation)
        .add(translation),
    );
  }
  return {
    getJoint(name) {
      return joints.get(name);
    },
    handedness: context.handedness,
    handLabel: context.handLabel,
    joints,
  };
}

export function incompleteContext(handedness: Handedness): HandContext {
  const joints = new Map<JointName, THREE.Vector3>([
    ["wrist", new THREE.Vector3()],
  ]);
  return {
    getJoint(name) {
      return joints.get(name);
    },
    handedness,
    handLabel: handedness === Handedness.LEFT ? "left" : "right",
    joints,
  };
}
