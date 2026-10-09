import * as THREE from "three";
import * as xb from "xrblocks";
import { stepFireState } from "./fire-state.js";

const LEFT_COLOR = 0x249cff;
const RIGHT_COLOR = 0xff8a1f;
const MERGE_HOLD_SECONDS = 1;
const ORB_HOLD_SECONDS = 5;
const STREAM_JOIN_DISTANCE = 0.15;

const _world = new THREE.Vector3();
const _worldB = new THREE.Vector3();
const _midpoint = new THREE.Vector3();
const _cameraPosition = new THREE.Vector3();
const _cameraForward = new THREE.Vector3();
const _fallbackOffset = new THREE.Vector3();
const _palmDirection = new THREE.Vector3();

function easeOutCubic(value) {
  return 1 - Math.pow(1 - THREE.MathUtils.clamp(value, 0, 1), 3);
}

function createGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.14, "rgba(255,255,255,.92)");
  gradient.addColorStop(0.38, "rgba(255,255,255,.32)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createFlameTexture(inner, outer) {
  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 320;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(96, 230, 4, 96, 175, 135);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.16, inner);
  gradient.addColorStop(0.56, outer);
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = gradient;
  context.beginPath();
  context.moveTo(96, 15);
  context.bezierCurveTo(128, 72, 181, 112, 167, 213);
  context.bezierCurveTo(159, 278, 126, 308, 96, 310);
  context.bezierCurveTo(48, 309, 18, 271, 23, 213);
  context.bezierCurveTo(29, 151, 68, 126, 65, 71);
  context.bezierCurveTo(81, 87, 91, 54, 96, 15);
  context.closePath();
  context.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function sprite(texture, color, opacity = 1) {
  const material = new THREE.SpriteMaterial({
    map: texture,
    color,
    opacity,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  return new THREE.Sprite(material);
}

function createSparkMaterial(color) {
  return new THREE.PointsMaterial({
    color,
    size: 0.016,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}

class HandFlame extends THREE.Group {
  constructor({ handIndex, color, hotColor, flameTexture, glowTexture }) {
    super();
    this.handIndex = handIndex;
    this.color = color;
    this.hotColor = hotColor;
    this.mode = "palm";
    this.seed = handIndex * 31.7;
    this.visible = true;

    this.palm = new THREE.Group();
    this.add(this.palm);

    this.outerFlame = sprite(flameTexture, color, 0.86);
    this.outerFlame.scale.set(0.19, 0.31, 1);
    this.outerFlame.position.y = 0.11;
    this.palm.add(this.outerFlame);

    this.innerFlame = sprite(flameTexture, hotColor, 0.98);
    this.innerFlame.scale.set(0.095, 0.205, 1);
    this.innerFlame.position.set(0, 0.075, 0.006);
    this.palm.add(this.innerFlame);

    this.core = sprite(glowTexture, 0xffffff, 0.98);
    this.core.scale.setScalar(0.09);
    this.core.position.set(0, 0.015, 0.012);
    this.palm.add(this.core);

    this.aura = sprite(glowTexture, color, 0.3);
    this.aura.scale.setScalar(0.28);
    this.aura.position.y = 0.04;
    this.palm.add(this.aura);

    this.stream = new THREE.Group();
    this.stream.visible = false;
    this.add(this.stream);

    this.streamAura = sprite(glowTexture, color, 0.38);
    this.streamAura.scale.set(0.18, 0.18, 1);
    this.stream.add(this.streamAura);

    this.streamCore = sprite(glowTexture, 0xffffff, 1);
    this.streamCore.scale.setScalar(0.075);
    this.streamCore.position.z = 0.005;
    this.stream.add(this.streamCore);

    this.streamTail = sprite(flameTexture, hotColor, 0.95);
    this.streamTail.scale.set(0.08, 0.18, 1);
    this.streamTail.position.set(0, 0.065, -0.004);
    this.stream.add(this.streamTail);

    const sparkPositions = new Float32Array(14 * 3);
    this.sparkPhases = [];
    for (let i = 0; i < 14; i++) {
      this.sparkPhases.push((i * 0.618 + this.seed) % 1);
    }
    this.sparkGeometry = new THREE.BufferGeometry();
    this.sparkGeometry.setAttribute("position", new THREE.BufferAttribute(sparkPositions, 3));
    this.sparks = new THREE.Points(this.sparkGeometry, createSparkMaterial(color));
    this.palm.add(this.sparks);

    this.streamTip = new THREE.Vector3();
    this.targetPosition = new THREE.Vector3();
  }

  setPinched(pinched) {
    this.mode = pinched ? "stream" : "palm";
    this.palm.visible = !pinched;
    this.stream.visible = pinched;
  }

  updateEffect(elapsed) {
    const wave = elapsed * 7 + this.seed;
    this.outerFlame.scale.x = 0.19 + Math.sin(wave) * 0.012;
    this.outerFlame.scale.y = 0.31 + Math.sin(wave * 0.71) * 0.018;
    this.outerFlame.material.rotation = Math.sin(wave * 0.54) * 0.055;
    this.innerFlame.scale.x = 0.095 + Math.sin(wave * 1.23) * 0.009;
    this.innerFlame.material.rotation = -Math.sin(wave * 0.82) * 0.045;
    this.core.material.opacity = 0.84 + Math.sin(wave * 1.6) * 0.14;
    this.aura.scale.setScalar(0.28 + Math.sin(wave * 0.8) * 0.022);

    const positions = this.sparkGeometry.attributes.position.array;
    for (let i = 0; i < this.sparkPhases.length; i++) {
      const travel = (this.sparkPhases[i] + elapsed * (0.24 + (i % 4) * 0.035)) % 1;
      const angle = i * 2.399 + elapsed * 0.9;
      const radius = 0.018 + travel * 0.045;
      positions[i * 3] = Math.cos(angle) * radius * (1 - travel * 0.55);
      positions[i * 3 + 1] = 0.015 + travel * 0.265;
      positions[i * 3 + 2] = Math.sin(angle) * radius * 0.35;
    }
    this.sparkGeometry.attributes.position.needsUpdate = true;
    this.sparks.material.opacity = 0.9 - Math.sin(elapsed * 3.2 + this.seed) * 0.08;

    const pulse = 1 + Math.sin(wave * 1.8) * 0.1;
    this.streamCore.scale.setScalar(0.075 * pulse);
    this.streamAura.scale.setScalar(0.18 + Math.sin(wave) * 0.018);
    this.streamTail.material.rotation = Math.sin(wave * 0.9) * 0.08;
  }

  dispose() {
    this.traverse((object) => {
      object.geometry?.dispose();
      object.material?.dispose();
    });
  }
}

class FireOrb extends THREE.Group {
  constructor(glowTexture, leftTexture, rightTexture) {
    super();
    this.visible = false;

    this.halo = sprite(glowTexture, 0xffb04a, 0.34);
    this.halo.scale.setScalar(0.56);
    this.add(this.halo);

    this.blueLayer = sprite(leftTexture, 0x43baff, 0.92);
    this.blueLayer.scale.set(0.25, 0.36, 1);
    this.blueLayer.position.x = -0.035;
    this.add(this.blueLayer);

    this.orangeLayer = sprite(rightTexture, 0xff862d, 0.92);
    this.orangeLayer.scale.set(0.25, 0.36, 1);
    this.orangeLayer.position.x = 0.035;
    this.add(this.orangeLayer);

    this.core = sprite(glowTexture, 0xffffff, 1);
    this.core.scale.setScalar(0.2);
    this.core.position.z = 0.01;
    this.add(this.core);

    this.orbGeometry = new THREE.IcosahedronGeometry(0.105, 3);
    this.orbMaterial = new THREE.MeshBasicMaterial({
      color: 0xffe3a2,
      transparent: true,
      opacity: 0.48,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    this.orbMesh = new THREE.Mesh(this.orbGeometry, this.orbMaterial);
    this.add(this.orbMesh);

    this.successRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.205, 0.008, 12, 96),
      new THREE.MeshBasicMaterial({
        color: 0xffefb0,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      })
    );
    this.successRing.scale.setScalar(0.1);
    this.add(this.successRing);

    this.ringTwo = new THREE.Mesh(
      new THREE.TorusGeometry(0.245, 0.003, 8, 96),
      new THREE.MeshBasicMaterial({
        color: 0x66caff,
        transparent: true,
        opacity: 0.48,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      })
    );
    this.ringTwo.rotation.x = Math.PI * 0.5;
    this.add(this.ringTwo);

    const count = 36;
    const positions = new Float32Array(count * 3);
    this.particleSeeds = [];
    for (let i = 0; i < count; i++) this.particleSeeds.push(i / count);
    this.particleGeometry = new THREE.BufferGeometry();
    this.particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.particles = new THREE.Points(this.particleGeometry, createSparkMaterial(0xffcc70));
    this.particles.material.size = 0.012;
    this.add(this.particles);
  }

  ignite() {
    this.visible = true;
    this.successRing.scale.setScalar(0.08);
    this.successRing.material.opacity = 1;
  }

  updateEffect(elapsed, age, remaining) {
    const pulse = 1 + Math.sin(elapsed * 8) * 0.045;
    this.orbMesh.scale.setScalar(pulse);
    this.orbMesh.rotation.y += 0.022;
    this.blueLayer.material.rotation += 0.008;
    this.orangeLayer.material.rotation -= 0.009;
    this.blueLayer.scale.y = 0.36 + Math.sin(elapsed * 7) * 0.025;
    this.orangeLayer.scale.y = 0.36 + Math.sin(elapsed * 7 + 2.2) * 0.025;
    this.core.scale.setScalar(0.2 + Math.sin(elapsed * 10) * 0.018);
    this.halo.scale.setScalar(0.56 + Math.sin(elapsed * 4) * 0.035);
    this.successRing.rotation.z += 0.014;
    this.ringTwo.rotation.z -= 0.009;
    this.ringTwo.rotation.y += 0.005;

    const reveal = easeOutCubic(age / 0.45);
    this.successRing.scale.setScalar(reveal);
    this.successRing.material.opacity = Math.max(0.42, 1 - age * 0.07);
    this.ringTwo.scale.setScalar(0.82 + Math.sin(elapsed * 3) * 0.05);

    const positions = this.particleGeometry.attributes.position.array;
    for (let i = 0; i < this.particleSeeds.length; i++) {
      const travel = (this.particleSeeds[i] + elapsed * (0.08 + (i % 5) * 0.012)) % 1;
      const angle = i * 2.399 + elapsed * (0.5 + (i % 3) * 0.12);
      const radius = 0.13 + travel * 0.17;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = (travel - 0.45) * 0.36;
      positions[i * 3 + 2] = Math.sin(angle) * radius * 0.38;
    }
    this.particleGeometry.attributes.position.needsUpdate = true;
    this.particles.material.opacity = Math.min(0.9, remaining * 1.8);
  }

  dispose() {
    this.traverse((object) => {
      object.geometry?.dispose();
      object.material?.dispose();
    });
  }
}

class HandFireApp extends xb.Script {
  init() {
    this.clock = new THREE.Clock();
    this.elapsed = 0;
    this.mergeProgress = 0;
    this.orbAge = 0;
    this.orbRemaining = 0;
    this.state = "palms";
    this.lastStatus = "";
    this.mergePoint = new THREE.Vector3(0, 1.35, -0.8);
    this.statusElement = document.querySelector("#status");
    this.progressElement = document.querySelector("#merge-progress");

    this.glowTexture = createGlowTexture();
    this.leftTexture = createFlameTexture("rgba(218,248,255,.98)", "rgba(22,119,255,0)");
    this.rightTexture = createFlameTexture("rgba(255,246,188,.98)", "rgba(255,91,16,0)");

    this.add(new THREE.HemisphereLight(0xbfdcff, 0x101326, 2.4));
    const warmLight = new THREE.PointLight(0xff9b42, 2.8, 3.5);
    warmLight.position.set(0.5, 1.35, -0.8);
    this.add(warmLight);
    const coolLight = new THREE.PointLight(0x3aa9ff, 2.8, 3.5);
    coolLight.position.set(-0.5, 1.35, -0.8);
    this.add(coolLight);

    this.stage = new THREE.Group();
    this.add(this.stage);

    this.leftFlame = new HandFlame({
      handIndex: 0,
      color: LEFT_COLOR,
      hotColor: 0xdaf8ff,
      flameTexture: this.leftTexture,
      glowTexture: this.glowTexture,
    });
    this.rightFlame = new HandFlame({
      handIndex: 1,
      color: RIGHT_COLOR,
      hotColor: 0xffefb3,
      flameTexture: this.rightTexture,
      glowTexture: this.glowTexture,
    });
    this.stage.add(this.leftFlame, this.rightFlame);

    this.orb = new FireOrb(this.glowTexture, this.leftTexture, this.rightTexture);
    this.stage.add(this.orb);

    this.leftTracked = false;
    this.rightTracked = false;
    this.leftPinched = false;
    this.rightPinched = false;
    this.setStatus("Raise both hands to awaken the flames");
  }

  isJointTracked(joint) {
    if (!joint) return false;
    for (let object = joint; object; object = object.parent) {
      if (object.visible === false) return false;
    }
    return true;
  }

  getJointPosition(joint, target) {
    if (!this.isJointTracked(joint)) return false;
    joint.getWorldPosition(target);
    return Number.isFinite(target.x + target.y + target.z);
  }

  getPalmPosition(hands, handIndex, target) {
    // The wrist + middle metacarpal midpoint stays centered under an open palm.
    const wrist = hands?.getWrist(handIndex);
    const middle = hands?.getJoint("middle-finger-metacarpal", handIndex);
    if (!this.getJointPosition(wrist, target)) return false;
    if (this.getJointPosition(middle, _worldB)) {
      target.lerp(_worldB, 0.68);
      _palmDirection.copy(_worldB).sub(target).normalize();
      target.addScaledVector(_palmDirection, 0.055);
    } else {
      target.y += 0.1;
    }
    return true;
  }

  getPinchPosition(hands, handIndex, target) {
    const indexTip = hands?.getIndexTip(handIndex);
    const thumbTip = hands?.getThumbTip(handIndex);
    if (!this.getJointPosition(indexTip, target)) return false;
    if (this.getJointPosition(thumbTip, _worldB)) target.lerp(_worldB, 0.5);
    return true;
  }

  updateHand(flame, hands, handIndex, tracked, pinched, delta) {
    const foundPalm = this.getPalmPosition(hands, handIndex, flame.targetPosition);
    const foundPinch = pinched && this.getPinchPosition(hands, handIndex, flame.streamTip);
    const isTracked = tracked && foundPalm;

    if (isTracked) {
      flame.visible = this.state !== "orb";
      if (foundPinch) flame.targetPosition.copy(flame.streamTip);
      flame.position.lerp(flame.targetPosition, 1 - Math.exp(-delta * 24));
    } else {
      // A clear reach-volume preview remains visible until physical hands arrive.
      const camera = xb.camera;
      if (camera) {
        camera.getWorldPosition(_cameraPosition);
        camera.getWorldDirection(_cameraForward);
        const side = handIndex === 0 ? -0.29 : 0.29;
        flame.targetPosition
          .copy(_cameraPosition)
          .addScaledVector(_cameraForward, 0.78)
          .add(_fallbackOffset.set(side, -0.05, 0));
      } else {
        flame.targetPosition.set(handIndex === 0 ? -0.29 : 0.29, 1.35, -0.78);
      }
      flame.position.lerp(flame.targetPosition, 1 - Math.exp(-delta * 5));
      flame.visible = this.state !== "orb";
      flame.streamTip.copy(flame.position);
    }

    flame.setPinched(pinched && isTracked);
    flame.updateEffect(this.elapsed);
    return isTracked;
  }

  bothHandsOpen() {
    const bothOpen = this.leftTracked && this.rightTracked && !this.leftPinched && !this.rightPinched;
    return bothOpen;
  }

  createOrbAt(point) {
    this.state = "orb";
    this.mergeProgress = 0;
    this.orbAge = 0;
    this.orbRemaining = ORB_HOLD_SECONDS;
    this.mergePoint.copy(point);
    this.orb.position.copy(point);
    this.orb.ignite();
    this.leftFlame.visible = false;
    this.rightFlame.visible = false;
  }

  clearOrb() {
    this.state = "palms";
    this.orb.visible = false;
    this.orbRemaining = 0;
    this.mergeProgress = 0;
    this.leftFlame.visible = true;
    this.rightFlame.visible = true;
  }

  updateStatus(joined) {
    if (this.state === "orb") {
      this.setStatus(`Fire orb · ${Math.max(0, this.orbRemaining).toFixed(1)}s · Open both hands to release`);
    } else if (this.state === "charging") {
      this.setStatus(`Hold streams together · ${Math.ceil((MERGE_HOLD_SECONDS - this.mergeProgress) * 10) / 10}s`);
    } else if (this.leftPinched && this.rightPinched && !joined) {
      this.setStatus("Bring the two bright streams together");
    } else if (this.leftPinched) {
      this.setStatus("Blue stream active · Pinch your right hand");
    } else if (this.rightPinched) {
      this.setStatus("Orange stream active · Pinch your left hand");
    } else if (this.leftTracked && this.rightTracked) {
      this.setStatus("Both flames ready · Pinch both hands");
    } else if (this.leftTracked || this.rightTracked) {
      this.setStatus(`One flame ready · Raise your ${this.leftTracked ? "right" : "left"} hand`);
    } else {
      this.setStatus("Raise both hands to awaken the flames");
    }

    if (this.progressElement) {
      const progress = this.state === "orb" ? this.orbRemaining / ORB_HOLD_SECONDS : this.mergeProgress / MERGE_HOLD_SECONDS;
      this.progressElement.style.width = `${THREE.MathUtils.clamp(progress, 0, 1) * 100}%`;
      this.progressElement.style.opacity = this.state === "charging" || this.state === "orb" ? "1" : "0";
    }
  }

  setStatus(text) {
    if (text === this.lastStatus) return;
    this.lastStatus = text;
    if (this.statusElement) this.statusElement.textContent = text;
  }

  update() {
    const delta = Math.min(this.clock.getDelta(), 0.05);
    this.elapsed += delta;
    const hands = xb.user.hands;

    // XR Blocks maps tracked handedness consistently: 0 = left, 1 = right.
    const leftWrist = hands?.getWrist(0);
    const rightWrist = hands?.getWrist(1);
    this.leftTracked = this.isJointTracked(leftWrist);
    this.rightTracked = this.isJointTracked(rightWrist);
    this.leftPinched = this.leftTracked && xb.user.isSelecting(0);
    this.rightPinched = this.rightTracked && xb.user.isSelecting(1);

    this.leftTracked = this.updateHand(
      this.leftFlame,
      hands,
      0,
      this.leftTracked,
      this.leftPinched,
      delta
    );
    this.rightTracked = this.updateHand(
      this.rightFlame,
      hands,
      1,
      this.rightTracked,
      this.rightPinched,
      delta
    );

    let joined = false;
    if (this.state !== "orb" && this.leftPinched && this.rightPinched) {
      const streamDistance = this.leftFlame.streamTip.distanceTo(this.rightFlame.streamTip);
      joined = streamDistance <= STREAM_JOIN_DISTANCE;
      if (joined) {
        _midpoint.copy(this.leftFlame.streamTip).lerp(this.rightFlame.streamTip, 0.5);
      }
    }

    const previousState = this.state;
    const nextState = stepFireState(
      {
        mode: this.state,
        mergeProgress: this.mergeProgress,
        orbRemaining: this.orbRemaining,
      },
      {
        leftPinched: this.leftPinched,
        rightPinched: this.rightPinched,
        streamsJoined: joined,
        bothOpen: this.bothHandsOpen(),
      },
      delta,
      {
        mergeHoldSeconds: MERGE_HOLD_SECONDS,
        orbHoldSeconds: ORB_HOLD_SECONDS,
      }
    );

    this.state = nextState.mode;
    this.mergeProgress = nextState.mergeProgress;
    this.orbRemaining = nextState.orbRemaining;

    if (nextState.createdOrb) {
      this.createOrbAt(_midpoint);
    } else if (nextState.clearedOrb) {
      this.clearOrb();
    }

    if (this.state === "orb") {
      if (previousState === "orb") this.orbAge += delta;
      if (this.leftTracked && this.rightTracked) {
        _midpoint.copy(this.leftFlame.position).lerp(this.rightFlame.position, 0.5);
        this.mergePoint.lerp(_midpoint, 1 - Math.exp(-delta * 8));
        this.orb.position.copy(this.mergePoint);
      }
      this.orb.updateEffect(this.elapsed, this.orbAge, this.orbRemaining);
    } else {
      this.orb.visible = false;
    }

    this.updateStatus(joined);
  }

  onSimulatorStarted() {
    this.setStatus("Simulator ready · Settings → Hands to move · T swaps · Space pinches");
  }

  dispose() {
    this.leftFlame.dispose();
    this.rightFlame.dispose();
    this.orb.dispose();
    this.glowTexture.dispose();
    this.leftTexture.dispose();
    this.rightTexture.dispose();
  }
}

const options = new xb.Options();
options.enableHands();
options.hands.visualization = true;
options.hands.visualizeJoints = false;
options.hands.visualizeMeshes = true;
options.simulator.defaultMode = xb.SimulatorMode.POSE;
options.simulator.modeToggle.enabled = true;
options.simulator.reachDistance.enabled = true;
options.simulator.reachDistance.radius = 0.9;
options.simulator.reachAngle.enabled = true;
options.simulator.reachAngle.angle = Math.PI * 0.78;
options.xrButton.appTitle = "Hand Fire";
options.xrButton.appDescription = "Pinch both elemental flames and hold the streams together.";
options.xrButton.showEnterSimulatorButton = true;

// Keep the normal auto form factor; ?formFactor=desktop starts the hand simulator.
document.addEventListener("DOMContentLoaded", async () => {
  xb.add(new HandFireApp());
  await xb.init(options);
});
