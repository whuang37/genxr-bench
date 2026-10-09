import * as THREE from "three";
import * as xb from "xrblocks";

/**
 * Hand Fire
 *
 * A two-hand elemental toy. Each tracked palm carries a colored flame
 * (blue for the left hand, orange for the right). Pinching a hand focuses
 * that hand's flame into a bright fingertip stream. Holding both streams
 * together for one second merges them into a fire orb that is held for five
 * seconds. Opening both hands clears the orb early.
 */

const UP = new THREE.Vector3(0, 1, 0);

// Tunables
const MERGE_HOLD_SECONDS = 1.0;
const ORB_DURATION_SECONDS = 5.0;
const TOGETHER_DISTANCE = 0.22; // meters between the two pinch points
const PINCH_DISTANCE = 0.035; // geometric thumb/index fallback (meters)
const ORB_COOLDOWN_SECONDS = 0.6;

const LEFT_COLOR = new THREE.Color(0x2f7dff);
const RIGHT_COLOR = new THREE.Color(0xff6a14);
const ORB_GOLD = 0xffcf6e;

// Reused scratch vectors (the update loop must not allocate)
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const tmpC = new THREE.Vector3();
const tmpMid = new THREE.Vector3();

const HAND_JOINT_LEFT = xb.Handedness.LEFT;
const HAND_JOINT_RIGHT = xb.Handedness.RIGHT;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

let glowTexture = null;
function getGlowTexture() {
  if (glowTexture) return glowTexture;
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );
  gradient.addColorStop(0.0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.22, "rgba(255,255,255,0.92)");
  gradient.addColorStop(0.5, "rgba(255,255,255,0.38)");
  gradient.addColorStop(1.0, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  glowTexture = new THREE.CanvasTexture(canvas);
  glowTexture.colorSpace = THREE.SRGBColorSpace;
  return glowTexture;
}

/**
 * A single stylized flame built from an additive point cloud plus a soft
 * sprite core. The same object smoothly morphs between "open palm" and
 * "concentrated fingertip stream" forms.
 */
class Flame extends THREE.Group {
  constructor(color, seed) {
    super();
    this.baseColor = color.clone();
    this.seed = seed;
    this.count = 96;
    this.blend = 0; // 0 = palm flame, 1 = fingertip stream
    this.targetBlend = 0;

    const texture = getGlowTexture();
    const positions = new Float32Array(this.count * 3);
    const colors = new Float32Array(this.count * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    this.geometry = geometry;
    this.positions = positions;
    this.colors = colors;

    this.ux = new Float32Array(this.count);
    this.uz = new Float32Array(this.count);
    this.speed = new Float32Array(this.count);
    this.phase = new Float32Array(this.count);
    this.bright = new Float32Array(this.count);
    for (let i = 0; i < this.count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random());
      this.ux[i] = Math.cos(angle) * radius;
      this.uz[i] = Math.sin(angle) * radius;
      this.speed[i] = 0.65 + Math.random() * 0.7;
      this.phase[i] = Math.random();
      this.bright[i] = 0.55 + Math.random() * 0.45;
    }

    this.material = new THREE.PointsMaterial({
      size: 0.055,
      map: texture,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    this.points = new THREE.Points(geometry, this.material);
    this.points.frustumCulled = false;
    this.add(this.points);

    this.glowMaterial = new THREE.SpriteMaterial({
      map: texture,
      color: this.baseColor,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.glow = new THREE.Sprite(this.glowMaterial);
    this.glow.scale.setScalar(0.13);
    this.add(this.glow);

    this.light = new THREE.PointLight(this.baseColor, 0.9, 0.7, 2);
    this.add(this.light);
  }

  setPinched(pinched) {
    this.targetBlend = pinched ? 1 : 0;
  }

  update(dt, time, openAnchor, streamAnchor) {
    this.blend += (this.targetBlend - this.blend) * clamp(dt * 14, 0, 1);

    this.position.lerpVectors(openAnchor, streamAnchor, this.blend);

    const radius = lerp(0.05, 0.016, this.blend);
    const height = lerp(0.17, 0.27, this.blend);
    const riseSpeed = lerp(0.4, 0.95, this.blend);
    const intensity = lerp(1.0, 1.85, this.blend);
    const flickerRate = 20 + this.seed * 4;

    this.material.size = lerp(0.055, 0.033, this.blend);

    const base = this.baseColor;
    for (let i = 0; i < this.count; i++) {
      const life =
        (this.phase[i] + time * riseSpeed * this.speed[i]) % 1;
      const spread = radius * Math.pow(1 - life, 0.7);
      this.positions[i * 3] = this.ux[i] * spread;
      this.positions[i * 3 + 1] = life * height;
      this.positions[i * 3 + 2] = this.uz[i] * spread;

      const fade = Math.pow(1 - life, 0.9) * clamp(life / 0.12, 0, 1);
      const heat = Math.pow(1 - life, 2) * 0.5;
      const flicker =
        0.82 + 0.28 * Math.sin(time * flickerRate + this.phase[i] * 40.0);
      const value = intensity * this.bright[i] * fade * flicker;

      this.colors[i * 3] = (base.r + (1 - base.r) * heat) * value;
      this.colors[i * 3 + 1] =
        (base.g + (1 - base.g) * heat) * value;
      this.colors[i * 3 + 2] =
        (base.b + (1 - base.b) * heat) * value;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;

    const pulse = 1 + 0.12 * Math.sin(time * 17 + this.seed);
    this.glow.scale.setScalar(lerp(0.14, 0.08, this.blend) * pulse);
    this.glowMaterial.opacity = lerp(0.55, 0.95, this.blend);
    this.light.intensity = lerp(0.8, 1.8, this.blend) * pulse;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.glowMaterial.dispose();
  }
}

function makeBillboardRing(inner, outer, color, opacity) {
  const geometry = new THREE.RingGeometry(inner, outer, 64);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  return mesh;
}

class App extends xb.Script {
  init() {
    this.add(new THREE.HemisphereLight(0xffffff, 0x556070, 2.2));

    this.leftFlame = new Flame(LEFT_COLOR, 0.0);
    this.rightFlame = new Flame(RIGHT_COLOR, 3.1);
    this.add(this.leftFlame);
    this.add(this.rightFlame);

    this.leftState = this.makeHandState();
    this.rightState = this.makeHandState();

    // Charge / success ring shown while the merge builds.
    this.chargeRing = makeBillboardRing(0.055, 0.075, 0xffd98a, 0.0);
    this.chargeRing.visible = false;
    this.add(this.chargeRing);

    this.buildOrb();

    this.lastTime = 0;
    this.mergeProgress = 0;
    this.orbActive = false;
    this.orbTimer = 0;
    this.orbCooldown = 0;
    this.ringSpawn = 0;
    this.mergeLocked = false;
  }

  makeHandState() {
    return {
      valid: false,
      pinch: false,
      pinchPoint: new THREE.Vector3(),
      palmAnchor: new THREE.Vector3(),
      streamAnchor: new THREE.Vector3(),
      geometricPinch: 1,
    };
  }

  buildOrb() {
    const texture = getGlowTexture();
    const group = new THREE.Group();
    group.visible = false;
    this.orbGroup = group;

    this.orbCoreMaterial = new THREE.MeshBasicMaterial({
      color: 0xfff3c4,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.orbCore = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.05, 2),
      this.orbCoreMaterial
    );
    group.add(this.orbCore);

    this.orbGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: texture,
        color: ORB_GOLD,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    this.orbGlow.scale.setScalar(0.34);
    group.add(this.orbGlow);

    this.orbHalo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: texture,
        color: 0xff7a1e,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    this.orbHalo.scale.setScalar(0.62);
    group.add(this.orbHalo);

    // Flickering shell of embers.
    const shellCount = 72;
    const shellPositions = new Float32Array(shellCount * 3);
    const shellColors = new Float32Array(shellCount * 3);
    const shellGeo = new THREE.BufferGeometry();
    for (let i = 0; i < shellCount; i++) {
      const v = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1
      ).normalize();
      shellPositions[i * 3] = v.x * 0.06;
      shellPositions[i * 3 + 1] = v.y * 0.06;
      shellPositions[i * 3 + 2] = v.z * 0.06;
      const warm = 0.6 + Math.random() * 0.4;
      shellColors[i * 3] = warm;
      shellColors[i * 3 + 1] = warm * 0.72;
      shellColors[i * 3 + 2] = warm * 0.32;
    }
    shellGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(shellPositions, 3)
    );
    shellGeo.setAttribute("color", new THREE.BufferAttribute(shellColors, 3));
    this.orbShellGeometry = shellGeo;
    this.orbShellMaterial = new THREE.PointsMaterial({
      size: 0.045,
      map: texture,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    this.orbShell = new THREE.Points(shellGeo, this.orbShellMaterial);
    this.orbShell.frustumCulled = false;
    group.add(this.orbShell);

    // Flat success ring, billboarded toward the viewer.
    this.successRing = makeBillboardRing(0.1, 0.145, 0xffe9b0, 0.0);
    group.add(this.successRing);

    // A second ring in 3D so the success is readable from any angle.
    this.orbTorus = new THREE.Mesh(
      new THREE.TorusGeometry(0.115, 0.008, 8, 56),
      new THREE.MeshBasicMaterial({
        color: 0xffb347,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    group.add(this.orbTorus);

    this.orbLight = new THREE.PointLight(0xff9a3c, 2.0, 1.4, 2);
    group.add(this.orbLight);

    this.add(group);
  }

  /**
   * Reads the joints for one hand and fills the cached state.
   * @returns true when a usable palm pose was found.
   */
  readHand(index, state) {
    const hands = xb.user && xb.user.hands;
    if (!hands || !hands.isValid || !hands.isValid(index)) {
      state.valid = false;
      return false;
    }

    const wrist = hands.getWrist(index);
    const indexTip = hands.getIndexTip(index);
    const thumbTip = hands.getThumbTip(index);
    if (!wrist || !indexTip || !thumbTip) {
      state.valid = false;
      return false;
    }

    // Palm center: wrist plus the four finger metacarpals.
    tmpA.set(0, 0, 0);
    let samples = 0;
    wrist.getWorldPosition(tmpB);
    tmpA.add(tmpB);
    samples++;
    const metacarpals = [
      "index-finger-metacarpal",
      "middle-finger-metacarpal",
      "ring-finger-metacarpal",
      "pinky-finger-metacarpal",
    ];
    for (const name of metacarpals) {
      const joint = hands.getJoint(name, index);
      if (joint) {
        joint.getWorldPosition(tmpB);
        tmpA.add(tmpB);
        samples++;
      }
    }
    state.palmAnchor.copy(tmpA).multiplyScalar(1 / samples).addScaledVector(
      UP,
      0.06
    );

    indexTip.getWorldPosition(tmpB);
    thumbTip.getWorldPosition(tmpC);
    state.pinchPoint.addVectors(tmpB, tmpC).multiplyScalar(0.5);
    state.streamAnchor.copy(state.pinchPoint).addScaledVector(UP, 0.02);
    state.geometricPinch = tmpB.distanceTo(tmpC);
    state.valid = true;
    return true;
  }

  isPinched(index, state) {
    let selected = false;
    try {
      selected =
        !!(xb.user && xb.user.isSelecting && xb.user.isSelecting(index));
    } catch (error) {
      selected = false;
    }
    return selected || state.geometricPinch < PINCH_DISTANCE;
  }

  spawnOrb(midpoint) {
    this.orbActive = true;
    this.orbTimer = 0;
    this.mergeProgress = 0;
    this.ringSpawn = 0;
    this.orbGroup.visible = true;
    this.orbGroup.scale.setScalar(0.25);
    if (midpoint) this.orbGroup.position.copy(midpoint);
  }

  clearOrb() {
    this.orbActive = false;
    this.orbTimer = 0;
    this.mergeProgress = 0;
    this.orbCooldown = ORB_COOLDOWN_SECONDS;
    this.mergeLocked = true;
    this.orbGroup.visible = false;
  }

  updateChargeRing() {
    const visible = this.mergeProgress > 0.01;
    this.chargeRing.visible = visible;
    if (!visible) return;

    const progress = clamp(this.mergeProgress, 0, 1);
    this.chargeRing.position.copy(tmpMid);
    const camera = xb.core && xb.core.camera;
    if (camera) this.chargeRing.quaternion.copy(camera.quaternion);
    this.chargeRing.scale.setScalar(0.45 + 0.75 * progress);
    this.chargeRing.material.opacity = 0.2 + 0.8 * progress;
    this.chargeRing.material.color
      .setRGB(
        lerp(1.0, 1.0, progress),
        lerp(0.75, 0.95, progress),
        lerp(0.35, 0.8, progress)
      );
    this.chargeRing.rotation.z += 0.04;
  }

  updateOrb(dt, time) {
    this.ringSpawn = Math.min(1, this.ringSpawn + dt / 0.45);
    const spawn = easeOutBack(this.ringSpawn);
    const fadeIn = clamp(this.ringSpawn * 1.6, 0, 1);

    this.orbGroup.scale.setScalar(0.25 + 0.75 * fadeIn);

    const pulse = 1 + 0.08 * Math.sin(time * 9);
    this.orbCore.scale.setScalar(pulse);
    this.orbGlow.scale.setScalar(0.34 * pulse * (1 + 0.08 * Math.sin(time * 6)));
    this.orbGlow.material.opacity = 0.9 * fadeIn;
    this.orbHalo.scale.setScalar(0.62 * (1 + 0.1 * Math.sin(time * 5)));
    this.orbHalo.material.opacity = 0.55 * fadeIn;

    this.orbShell.rotation.y += dt * 1.7;
    this.orbShell.rotation.x += dt * 0.7;
    this.orbShell.scale.setScalar(0.9 + 0.12 * Math.sin(time * 11));

    const camera = xb.core && xb.core.camera;
    if (camera) this.successRing.quaternion.copy(camera.quaternion);
    const ringPulse = 1 + 0.12 * Math.sin(time * 7);
    this.successRing.scale.setScalar(spawn * ringPulse);
    this.successRing.material.opacity = 0.95 * fadeIn;
    this.successRing.rotation.z += dt * 0.5;

    this.orbTorus.rotation.x += dt * 1.4;
    this.orbTorus.rotation.z += dt * 1.1;
    this.orbTorus.scale.setScalar(0.6 + 0.4 * spawn);
    this.orbTorus.material.opacity = 0.85 * fadeIn;

    this.orbLight.intensity = 2.0 * fadeIn * (1 + 0.15 * Math.sin(time * 12));
  }

  update(time) {
    const dt = this.lastTime
      ? clamp((time - this.lastTime) / 1000, 0, 0.1)
      : 0.016;
    this.lastTime = time;
    const seconds = time * 0.001;

    const leftValid = this.readHand(HAND_JOINT_LEFT, this.leftState);
    const rightValid = this.readHand(HAND_JOINT_RIGHT, this.rightState);

    this.leftFlame.visible = leftValid;
    this.rightFlame.visible = rightValid;

    if (leftValid) {
      this.leftState.pinch = this.isPinched(
        HAND_JOINT_LEFT,
        this.leftState
      );
      this.leftFlame.setPinched(this.leftState.pinch);
      this.leftFlame.update(
        dt,
        seconds,
        this.leftState.palmAnchor,
        this.leftState.streamAnchor
      );
    }

    if (rightValid) {
      this.rightState.pinch = this.isPinched(
        HAND_JOINT_RIGHT,
        this.rightState
      );
      this.rightFlame.setPinched(this.rightState.pinch);
      this.rightFlame.update(
        dt,
        seconds,
        this.rightState.palmAnchor,
        this.rightState.streamAnchor
      );
    }

    if (this.orbCooldown > 0) {
      this.orbCooldown = Math.max(0, this.orbCooldown - dt);
    }

    const bothValid = leftValid && rightValid;
    const bothPinched =
      bothValid && this.leftState.pinch && this.rightState.pinch;

    let haveMidpoint = false;
    if (bothValid) {
      tmpMid
        .addVectors(this.leftState.pinchPoint, this.rightState.pinchPoint)
        .multiplyScalar(0.5);
      haveMidpoint = true;
    }

    if (!this.orbActive) {
      const streamsTogether =
        bothPinched &&
        this.leftState.pinchPoint.distanceTo(this.rightState.pinchPoint) <
          TOGETHER_DISTANCE;

      // Separating the streams re-arms the merge after an orb has ended.
      if (!streamsTogether) this.mergeLocked = false;

      if (streamsTogether && !this.mergeLocked && this.orbCooldown <= 0) {
        this.mergeProgress = Math.min(
          1,
          this.mergeProgress + dt / MERGE_HOLD_SECONDS
        );
        if (this.mergeProgress >= 1) {
          this.spawnOrb(haveMidpoint ? tmpMid : null);
        }
      } else {
        // One stream separated or a pinch released: cancel the merge.
        this.mergeProgress = 0;
      }

      if (this.orbActive) {
        this.chargeRing.visible = false;
      } else {
        this.updateChargeRing();
      }
    } else {
      this.chargeRing.visible = false;
    }

    if (this.orbActive) {
      this.orbTimer += dt;
      const bothOpen =
        bothValid && !this.leftState.pinch && !this.rightState.pinch;
      if (bothOpen || this.orbTimer >= ORB_DURATION_SECONDS) {
        this.clearOrb();
      } else {
        if (haveMidpoint) this.orbGroup.position.copy(tmpMid);
        this.updateOrb(dt, seconds);
      }
    }
  }

  dispose() {
    this.leftFlame.dispose();
    this.rightFlame.dispose();
    this.chargeRing.geometry.dispose();
    this.chargeRing.material.dispose();
    this.orbCore.geometry.dispose();
    this.orbCoreMaterial.dispose();
    this.orbGlow.material.dispose();
    this.orbHalo.material.dispose();
    this.orbShellGeometry.dispose();
    this.orbShellMaterial.dispose();
    this.successRing.geometry.dispose();
    this.successRing.material.dispose();
    this.orbTorus.geometry.dispose();
    this.orbTorus.material.dispose();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const options = new xb.Options();
  options.enableHands();
  options.simulator.defaultMode = xb.SimulatorMode.POSE;
  options.simulator.modeToggle.enabled = true;
  options.xrButton.showEnterSimulatorButton = true;
  options.setAppTitle?.("Hand Fire");
  options.setAppDescription?.(
    "Pinch to stream, bring both streams together, and hold a fire orb."
  );

  xb.add(new App());
  xb.init(options);
});

export {App, Flame};
