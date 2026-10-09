import * as THREE from 'three';
import * as xb from 'xrblocks';

import {Flame, FireOrb} from './flames.js';
import {MergeState} from './mergeState.js';

/** Thumb-tip to index-tip distance that starts a pinch, in meters. */
const PINCH_ENTER_DISTANCE = 0.032;
/** Thumb-tip to index-tip distance that releases a pinch, in meters. */
const PINCH_EXIT_DISTANCE = 0.045;

const HAND_CONFIG = [
  {
    handedness: xb.Handedness.LEFT,
    label: 'left',
    // Blue flame on the left hand.
    baseColor: 0x63b8ff,
    tipColor: 0x1d5cff,
    fallbackPosition: new THREE.Vector3(-0.22, 1.25, -0.45),
  },
  {
    handedness: xb.Handedness.RIGHT,
    label: 'right',
    // Orange flame on the right hand.
    baseColor: 0xffb347,
    tipColor: 0xff3c0a,
    fallbackPosition: new THREE.Vector3(0.22, 1.25, -0.45),
  },
];

const tmpPalm = new THREE.Vector3();
const tmpWrist = new THREE.Vector3();
const tmpIndex = new THREE.Vector3();
const tmpThumb = new THREE.Vector3();
const tmpMiddle = new THREE.Vector3();
const tmpUp = new THREE.Vector3();
const tmpA = new THREE.Vector3();

/**
 * Hand Fire: a blue flame above the left palm, an orange flame above the right
 * palm, pinch-concentrated fingertip streams, and a timed two-hand merge into
 * a temporary fire orb.
 */
class HandFire extends xb.Script {
  constructor() {
    super();
    this.name = 'Hand Fire';
    /** Per-hand runtime state. */
    this.hands = [];
    /** Timed two-hand merge gesture state. */
    this.merge = new MergeState();
  }

  init() {
    this.add(new THREE.HemisphereLight(0xffffff, 0x333344, 2));

    for (const config of HAND_CONFIG) {
      const flame = new Flame({
        baseColor: config.baseColor,
        tipColor: config.tipColor,
        name: `${config.label} hand flame`,
      });
      flame.position.copy(config.fallbackPosition);
      this.add(flame);
      this.hands.push({
        config,
        flame,
        pinching: false,
        tracked: false,
        // World position of the flame origin for this hand.
        origin: new THREE.Vector3().copy(config.fallbackPosition),
      });
    }

    this.orb = new FireOrb();
    this.orb.visible = false;
    this.add(this.orb);
  }

  /**
   * Reports the runtime select state of one hand's controller: a hand pinch or
   * a controller trigger. Returns undefined when the runtime has not reported
   * a select state yet, so the caller can fall back to fingertip distance.
   * @param {number} handIndex xb.Handedness.LEFT or xb.Handedness.RIGHT
   * @returns {boolean|undefined}
   */
  getHandSelectState(handIndex) {
    const input = xb.input;
    if (!input) return undefined;
    const controller =
      (handIndex === xb.Handedness.LEFT
        ? input.leftController
        : input.rightController) ?? input.controllers?.[handIndex];
    const selected = controller?.userData?.selected;
    return typeof selected === 'boolean' ? selected : undefined;
  }

  /** Resolves pinch state and flame origin for one hand. */
  updateHand(handState) {
    const {config, flame} = handState;
    const handIndex = config.handedness;
    // Only query joints when this hand is actually connected, so the SDK does
    // not warn for every frame of a one-handed session.
    const hands = xb.user?.hands?.hands?.[handIndex]
      ? xb.user.hands
      : undefined;

    let tracked = false;
    let pinching = false;

    const wrist = hands?.getWrist?.(handIndex);
    const middleMetacarpal = hands?.getJoint?.(
      'middle-finger-metacarpal',
      handIndex
    );
    const indexTip = hands?.getIndexTip?.(handIndex);
    const thumbTip = hands?.getThumbTip?.(handIndex);

    if (wrist?.visible !== false && wrist && indexTip && thumbTip) {
      wrist.getWorldPosition(tmpWrist);
      indexTip.getWorldPosition(tmpIndex);
      thumbTip.getWorldPosition(tmpThumb);
      tracked = tmpWrist.lengthSq() > 0 || tmpIndex.lengthSq() > 0;

      // Pinch when the runtime reports a select for this hand, or when the
      // thumb and index tips meet. Hysteresis keeps the flame form stable
      // while a hand hovers near the pinch threshold.
      const pinchDistance = tmpIndex.distanceTo(tmpThumb);
      const selectState = this.getHandSelectState(handIndex);
      if (selectState !== undefined) {
        pinching = selectState;
      } else {
        pinching = handState.pinching
          ? pinchDistance < PINCH_EXIT_DISTANCE
          : pinchDistance < PINCH_ENTER_DISTANCE;
      }

      if (pinching) {
        // Concentrated stream at the fingertips.
        tmpPalm.copy(tmpIndex).add(tmpThumb).multiplyScalar(0.5);
        handState.origin.copy(tmpPalm);
      } else {
        // Open-palm flame floating above the palm.
        if (middleMetacarpal) {
          middleMetacarpal.getWorldPosition(tmpMiddle);
          tmpPalm.copy(tmpWrist).lerp(tmpMiddle, 0.8);
        } else {
          tmpPalm.copy(tmpWrist);
        }
        tmpUp.set(0, 1, 0);
        handState.origin.copy(tmpPalm).addScaledVector(tmpUp, 0.07);
      }
    }

    if (!tracked) {
      handState.origin.copy(config.fallbackPosition);
    }

    handState.tracked = tracked;
    handState.pinching = pinching;
    flame.setMode(pinching ? 'stream' : 'palm');
    flame.position.copy(handState.origin);
    if (flame.parent) {
      flame.parent.worldToLocal(flame.position);
    }
  }

  update() {
    const dt = Math.min(xb.getDeltaTime?.() ?? 1 / 60, 1 / 20);
    for (const handState of this.hands) {
      this.updateHand(handState);
    }

    const [left, right] = this.hands;
    const streamDistance = left.origin.distanceTo(right.origin);
    const {orbSpawned, orbCleared} = this.merge.update(dt, {
      leftPinching: left.pinching,
      rightPinching: right.pinching,
      streamDistance,
    });

    const camera = xb.core?.camera ?? xb.camera;
    if (orbSpawned) {
      this.positionOrb();
      this.orb.visible = true;
      this.orb.update(0, 0, camera);
    }
    if (orbCleared) {
      this.orb.visible = false;
    }

    // Each hand keeps its own flame. Both pinched streams merge into the orb,
    // so they hide only while the orb holds between the hands.
    for (const handState of this.hands) {
      const mergedIntoOrb = this.merge.orbVisible && handState.pinching;
      handState.flame.visible = !mergedIntoOrb;
      if (handState.flame.visible) {
        handState.flame.update(dt);
      }
    }

    if (this.merge.orbVisible) {
      this.positionOrb();
      this.orb.update(dt, this.merge.orbProgress, camera);
    }
  }

  /** Places the orb halfway between both flame origins. */
  positionOrb() {
    const [left, right] = this.hands;
    tmpA.copy(left.origin).add(right.origin).multiplyScalar(0.5);
    this.orb.position.copy(tmpA);
    if (this.orb.parent) {
      this.orb.parent.worldToLocal(this.orb.position);
    }
  }

  dispose() {
    for (const handState of this.hands) {
      handState.flame.dispose();
    }
    this.orb.dispose();
  }
}

function start() {
  const options = new xb.Options();
  options.setAppTitle?.('Hand Fire');
  options.enableHands();
  options.hands.visualization = true;
  options.hands.visualizeJoints = false;
  options.xrButton.showEnterSimulatorButton = true;
  options.simulator.defaultMode = xb.SimulatorMode.POSE;
  options.simulator.reachDistance.enabled = true;
  options.simulator.reachDistance.radius = 0.75;

  xb.add(new HandFire());
  xb.init(options);
}

document.addEventListener('DOMContentLoaded', start);
