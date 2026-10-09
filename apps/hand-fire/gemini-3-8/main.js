import * as THREE from "three";
import * as xb from "xrblocks";

// Export for debugging/eval
window.THREE = THREE;
window.xb = xb;

/**
 * Creates a soft radial glow texture for flame particles using HTML5 canvas.
 */
function createFlameParticleTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");

  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0.0, "rgba(255, 255, 255, 1.0)");
  grad.addColorStop(0.2, "rgba(255, 255, 255, 0.85)");
  grad.addColorStop(0.5, "rgba(255, 255, 255, 0.45)");
  grad.addColorStop(0.8, "rgba(255, 255, 255, 0.1)");
  grad.addColorStop(1.0, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

const particleTexture = createFlameParticleTexture();

/**
 * Particle system for stylized flames (blue, orange, or dual).
 */
class FlameParticleSystem {
  constructor({
    count = 80,
    size = 0.045,
    colors = {
      base: new THREE.Color(0x0055ff),
      mid: new THREE.Color(0x00d4ff),
      core: new THREE.Color(0xffffff),
    },
    spreadRadius = 0.035,
    speedY = 0.25,
    lifetime = 0.6,
  }) {
    this.count = count;
    this.size = size;
    this.colors = colors;
    this.spreadRadius = spreadRadius;
    this.speedY = speedY;
    this.lifetime = lifetime;

    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(count * 3);
    this.colorsArray = new Float32Array(count * 3);
    this.ages = new Float32Array(count);
    this.lifetimes = new Float32Array(count);
    this.velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      this.resetParticle(i, Math.random() * this.lifetime);
    }

    this.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(this.positions, 3)
    );
    this.geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(this.colorsArray, 3)
    );

    this.material = new THREE.PointsMaterial({
      size: this.size,
      map: particleTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(this.geometry, this.material);
  }

  resetParticle(i, initialAge = 0) {
    const idx = i * 3;
    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * this.spreadRadius;

    this.positions[idx] = Math.cos(angle) * r;
    this.positions[idx + 1] = (Math.random() - 0.5) * 0.02;
    this.positions[idx + 2] = Math.sin(angle) * r;

    this.velocities[idx] = (Math.random() - 0.5) * 0.04;
    this.velocities[idx + 1] = this.speedY * (0.8 + Math.random() * 0.4);
    this.velocities[idx + 2] = (Math.random() - 0.5) * 0.04;

    this.ages[i] = initialAge;
    this.lifetimes[i] = this.lifetime * (0.8 + Math.random() * 0.4);

    this.updateParticleColor(i, initialAge / this.lifetimes[i]);
  }

  updateParticleColor(i, progress) {
    const idx = i * 3;
    const col = new THREE.Color();
    if (progress < 0.3) {
      col.copy(this.colors.core).lerp(this.colors.mid, progress / 0.3);
    } else {
      col.copy(this.colors.mid).lerp(this.colors.base, (progress - 0.3) / 0.7);
    }
    const fade = 1.0 - Math.pow(progress, 1.5);
    this.colorsArray[idx] = col.r * fade;
    this.colorsArray[idx + 1] = col.g * fade;
    this.colorsArray[idx + 2] = col.b * fade;
  }

  update(dt) {
    for (let i = 0; i < this.count; i++) {
      this.ages[i] += dt;
      if (this.ages[i] >= this.lifetimes[i]) {
        this.resetParticle(i, 0);
        continue;
      }

      const idx = i * 3;
      const progress = this.ages[i] / this.lifetimes[i];

      const swirl = (1.0 - progress) * 0.02;
      this.positions[idx] += this.velocities[idx] * dt + (Math.random() - 0.5) * swirl;
      this.positions[idx + 1] += this.velocities[idx + 1] * dt;
      this.positions[idx + 2] += this.velocities[idx + 2] * dt + (Math.random() - 0.5) * swirl;

      this.updateParticleColor(i, progress);
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}

/**
 * Concentrated stream particle system shooting from fingertips.
 */
class FingertipStreamSystem {
  constructor({
    count = 60,
    size = 0.035,
    colors = {
      base: new THREE.Color(0x0088ff),
      mid: new THREE.Color(0x44ffff),
      core: new THREE.Color(0xffffff),
    },
    speed = 0.45,
    lifetime = 0.35,
  }) {
    this.count = count;
    this.size = size;
    this.colors = colors;
    this.speed = speed;
    this.lifetime = lifetime;

    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(count * 3);
    this.colorsArray = new Float32Array(count * 3);
    this.ages = new Float32Array(count);
    this.lifetimes = new Float32Array(count);
    this.velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      this.resetParticle(i, Math.random() * this.lifetime);
    }

    this.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(this.positions, 3)
    );
    this.geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(this.colorsArray, 3)
    );

    this.material = new THREE.PointsMaterial({
      size: this.size,
      map: particleTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(this.geometry, this.material);
  }

  resetParticle(i, initialAge = 0) {
    const idx = i * 3;
    this.positions[idx] = (Math.random() - 0.5) * 0.012;
    this.positions[idx + 1] = (Math.random() - 0.5) * 0.012;
    this.positions[idx + 2] = (Math.random() - 0.5) * 0.012;

    this.velocities[idx] = (Math.random() - 0.5) * 0.08;
    this.velocities[idx + 1] = (0.2 + Math.random() * 0.3) * this.speed;
    this.velocities[idx + 2] = -(0.7 + Math.random() * 0.3) * this.speed;

    this.ages[i] = initialAge;
    this.lifetimes[i] = this.lifetime * (0.8 + Math.random() * 0.4);

    this.updateColor(i, initialAge / this.lifetimes[i]);
  }

  updateColor(i, progress) {
    const idx = i * 3;
    const col = new THREE.Color();
    if (progress < 0.25) {
      col.copy(this.colors.core).lerp(this.colors.mid, progress / 0.25);
    } else {
      col.copy(this.colors.mid).lerp(this.colors.base, (progress - 0.25) / 0.75);
    }
    const fade = 1.0 - progress;
    this.colorsArray[idx] = col.r * fade;
    this.colorsArray[idx + 1] = col.g * fade;
    this.colorsArray[idx + 2] = col.b * fade;
  }

  update(dt) {
    for (let i = 0; i < this.count; i++) {
      this.ages[i] += dt;
      if (this.ages[i] >= this.lifetimes[i]) {
        this.resetParticle(i, 0);
        continue;
      }
      const idx = i * 3;
      this.positions[idx] += this.velocities[idx] * dt;
      this.positions[idx + 1] += this.velocities[idx + 1] * dt;
      this.positions[idx + 2] += this.velocities[idx + 2] * dt;
      this.updateColor(i, this.ages[i] / this.lifetimes[i]);
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}

/**
 * Swirling dual-color particle system for the merged fire orb.
 */
class OrbParticleSystem {
  constructor({ count = 140, size = 0.04 }) {
    this.count = count;
    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(count * 3);
    this.colorsArray = new Float32Array(count * 3);
    this.angles = new Float32Array(count);
    this.radii = new Float32Array(count);
    this.heights = new Float32Array(count);
    this.speeds = new Float32Array(count);
    this.types = new Uint8Array(count); // 0 = blue, 1 = orange

    const blueCore = new THREE.Color(0xdffff);
    const blueBase = new THREE.Color(0x0088ff);
    const orangeCore = new THREE.Color(0xffeedd);
    const orangeBase = new THREE.Color(0xff5500);

    for (let i = 0; i < count; i++) {
      this.types[i] = i % 2;
      this.angles[i] = (i / count) * Math.PI * 4 + Math.random() * 0.5;
      this.radii[i] = 0.04 + Math.random() * 0.055;
      this.heights[i] = (Math.random() - 0.5) * 0.09;
      this.speeds[i] = (2.5 + Math.random() * 2.0) * (this.types[i] === 0 ? 1 : -1);

      const idx = i * 3;
      const isBlue = this.types[i] === 0;
      const col = isBlue
        ? blueBase.clone().lerp(blueCore, Math.random())
        : orangeBase.clone().lerp(orangeCore, Math.random());

      this.colorsArray[idx] = col.r;
      this.colorsArray[idx + 1] = col.g;
      this.colorsArray[idx + 2] = col.b;
    }

    this.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(this.positions, 3)
    );
    this.geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(this.colorsArray, 3)
    );

    this.material = new THREE.PointsMaterial({
      size,
      map: particleTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(this.geometry, this.material);
  }

  update(dt, time) {
    for (let i = 0; i < this.count; i++) {
      this.angles[i] += this.speeds[i] * dt;
      const idx = i * 3;
      const r = this.radii[i] + Math.sin(time * 4 + i) * 0.008;
      const theta = this.angles[i];

      this.positions[idx] = Math.cos(theta) * r;
      this.positions[idx + 1] =
        this.heights[i] + Math.sin(time * 3 + theta * 2) * 0.025;
      this.positions[idx + 2] = Math.sin(theta) * r;
    }
    this.geometry.attributes.position.needsUpdate = true;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}

/**
 * Main Hand Fire Application Script
 */
class HandFireApp extends xb.Script {
  constructor() {
    super();
    window.handFire = this;
  }

  init() {
    // Ambient / environment lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444455, 1.8);
    this.add(hemiLight);

    // Timing and gesture states
    this.leftPinched = false;
    this.rightPinched = false;
    this.mergeHoldTime = 0.0;
    this.TOGETHER_THRESHOLD = 0.20; // 20cm reach threshold for fingertip stream merge
    this.orbState = "IDLE"; // "IDLE" | "ACTIVE"
    this.orbTimer = 0.0;
    this.ORB_DURATION = 5.0; // 5 seconds
    this.ringProgress = 0.0;

    // Simulation manual test overrides
    this.simHandsTogether = false;

    // Build the visual elements
    this.buildLeftHandEffects();
    this.buildRightHandEffects();
    this.buildMergedOrbEffects();

    // Register gesture / keyboard listeners
    this.setupGestureListeners();
  }

  buildLeftHandEffects() {
    // Left Hand Palm Flame (Blue)
    this.leftHandFlame = new THREE.Group();
    this.leftHandFlame.name = "leftHandFlame";
    this.leftHandFlame.visible = true;

    this.leftPalmParticles = new FlameParticleSystem({
      count: 85,
      size: 0.05,
      colors: {
        base: new THREE.Color(0x0044ff),
        mid: new THREE.Color(0x00d4ff),
        core: new THREE.Color(0xffffff),
      },
      spreadRadius: 0.04,
      speedY: 0.28,
      lifetime: 0.65,
    });
    this.leftHandFlame.add(this.leftPalmParticles.points);

    // Glowing core
    const coreGeo = new THREE.SphereGeometry(0.028, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x44ccff,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    this.leftPalmCore = new THREE.Mesh(coreGeo, coreMat);
    this.leftHandFlame.add(this.leftPalmCore);

    // Blue point light
    this.leftFlameLight = new THREE.PointLight(0x0088ff, 2.0, 0.8);
    this.leftHandFlame.add(this.leftFlameLight);

    this.add(this.leftHandFlame);

    // Left Fingertip Stream (Bright concentrated blue stream)
    this.leftFingertipStream = new THREE.Group();
    this.leftFingertipStream.name = "leftFingertipStream";
    this.leftFingertipStream.visible = false;

    this.leftStreamParticles = new FingertipStreamSystem({
      count: 70,
      size: 0.038,
      colors: {
        base: new THREE.Color(0x0066ff),
        mid: new THREE.Color(0x00ffff),
        core: new THREE.Color(0xffffff),
      },
      speed: 0.5,
      lifetime: 0.35,
    });
    this.leftFingertipStream.add(this.leftStreamParticles.points);

    const streamCoreMat = new THREE.MeshBasicMaterial({
      color: 0x66ffff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });
    this.leftStreamCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 16, 16),
      streamCoreMat
    );
    this.leftFingertipStream.add(this.leftStreamCore);

    this.leftStreamLight = new THREE.PointLight(0x00d4ff, 3.0, 0.6);
    this.leftFingertipStream.add(this.leftStreamLight);

    this.add(this.leftFingertipStream);
  }

  buildRightHandEffects() {
    // Right Hand Palm Flame (Orange)
    this.rightHandFlame = new THREE.Group();
    this.rightHandFlame.name = "rightHandFlame";
    this.rightHandFlame.visible = true;

    this.rightPalmParticles = new FlameParticleSystem({
      count: 85,
      size: 0.05,
      colors: {
        base: new THREE.Color(0xcc2200),
        mid: new THREE.Color(0xff7700),
        core: new THREE.Color(0xffffdd),
      },
      spreadRadius: 0.04,
      speedY: 0.28,
      lifetime: 0.65,
    });
    this.rightHandFlame.add(this.rightPalmParticles.points);

    const coreGeo = new THREE.SphereGeometry(0.028, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xff8822,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    this.rightPalmCore = new THREE.Mesh(coreGeo, coreMat);
    this.rightHandFlame.add(this.rightPalmCore);

    // Orange point light
    this.rightFlameLight = new THREE.PointLight(0xff6600, 2.0, 0.8);
    this.rightHandFlame.add(this.rightFlameLight);

    this.add(this.rightHandFlame);

    // Right Fingertip Stream (Bright concentrated orange stream)
    this.rightFingertipStream = new THREE.Group();
    this.rightFingertipStream.name = "rightFingertipStream";
    this.rightFingertipStream.visible = false;

    this.rightStreamParticles = new FingertipStreamSystem({
      count: 70,
      size: 0.038,
      colors: {
        base: new THREE.Color(0xff3300),
        mid: new THREE.Color(0xffaa00),
        core: new THREE.Color(0xffffff),
      },
      speed: 0.5,
      lifetime: 0.35,
    });
    this.rightFingertipStream.add(this.rightStreamParticles.points);

    const streamCoreMat = new THREE.MeshBasicMaterial({
      color: 0xffcc44,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });
    this.rightStreamCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 16, 16),
      streamCoreMat
    );
    this.rightFingertipStream.add(this.rightStreamCore);

    this.rightStreamLight = new THREE.PointLight(0xff7700, 3.0, 0.6);
    this.rightFingertipStream.add(this.rightStreamLight);

    this.add(this.rightFingertipStream);
  }

  buildMergedOrbEffects() {
    // Merged Fire Orb
    this.fireOrb = new THREE.Group();
    this.fireOrb.name = "fireOrb";
    this.fireOrb.visible = false;

    // Swirling dual-element particles
    this.orbParticles = new OrbParticleSystem({ count: 160, size: 0.045 });
    this.fireOrb.add(this.orbParticles.points);

    // Glowing core sphere
    const orbCoreGeo = new THREE.SphereGeometry(0.052, 24, 24);
    const orbCoreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
    });
    this.orbCoreMesh = new THREE.Mesh(orbCoreGeo, orbCoreMat);
    this.fireOrb.add(this.orbCoreMesh);

    // Inner chromatic glow shells (blue shell + orange shell)
    const blueShellMat = new THREE.MeshBasicMaterial({
      color: 0x00aaff,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    this.orbBlueShell = new THREE.Mesh(
      new THREE.SphereGeometry(0.065, 20, 20),
      blueShellMat
    );
    this.fireOrb.add(this.orbBlueShell);

    const orangeShellMat = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    this.orbOrangeShell = new THREE.Mesh(
      new THREE.SphereGeometry(0.065, 20, 20),
      orangeShellMat
    );
    this.fireOrb.add(this.orbOrangeShell);

    // Combined radiant light
    this.orbLight = new THREE.PointLight(0xffb077, 3.5, 1.4);
    this.fireOrb.add(this.orbLight);

    this.add(this.fireOrb);

    // Success Ring (Radiant expansion / success indicator)
    this.successRing = new THREE.Group();
    this.successRing.name = "successRing";
    this.successRing.visible = false;

    const ringGeo = new THREE.TorusGeometry(0.12, 0.012, 16, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffe688,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });
    this.ringMesh = new THREE.Mesh(ringGeo, ringMat);
    this.ringMesh.rotation.x = Math.PI / 2;
    this.successRing.add(this.ringMesh);

    const outerRingGeo = new THREE.TorusGeometry(0.16, 0.006, 16, 48);
    const outerRingMat = new THREE.MeshBasicMaterial({
      color: 0x66ddff,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });
    this.outerRingMesh = new THREE.Mesh(outerRingGeo, outerRingMat);
    this.outerRingMesh.rotation.x = Math.PI / 2;
    this.successRing.add(this.outerRingMesh);

    this.add(this.successRing);
  }

  onSelectStart(event) {
    const id = event.source?.controllerId ?? event.source?.controller?.userData?.id;
    if (id === 0) this.leftPinched = true;
    if (id === 1) this.rightPinched = true;
  }

  onSelectEnd(event) {
    const id = event.source?.controllerId ?? event.source?.controller?.userData?.id;
    if (id === 0) this.leftPinched = false;
    if (id === 1) this.rightPinched = false;
  }

  setupGestureListeners() {
    const gestures = xb.core?.gestureRecognition;
    if (gestures) {
      gestures.addEventListener("gesturestart", (event) => {
        const { hand, name } = event.detail;
        if (name === "pinch") {
          if (hand === "left") this.leftPinched = true;
          if (hand === "right") this.rightPinched = true;
        }
      });
      gestures.addEventListener("gestureend", (event) => {
        const { hand, name } = event.detail;
        if (name === "pinch") {
          if (hand === "left") this.leftPinched = false;
          if (hand === "right") this.rightPinched = false;
        }
      });
    }

    // Keyboard shortcuts for testing in simulator
    window.addEventListener("keydown", (e) => {
      if (e.key === "1") {
        this.toggleLeftPinch();
      } else if (e.key === "2") {
        this.toggleRightPinch();
      } else if (e.key === "3") {
        this.toggleHandsTogether();
      }
    });
  }

  toggleLeftPinch(force) {
    const next = force !== undefined ? force : !this.leftPinched;
    this.leftPinched = next;
    const simHands = xb.core?.simulator?.hands;
    if (simHands) {
      simHands.setLeftHandPinching(next);
    }
    const c0 = xb.core?.input?.controllers?.[0];
    if (c0) c0.userData.selected = next;
  }

  toggleRightPinch(force) {
    const next = force !== undefined ? force : !this.rightPinched;
    this.rightPinched = next;
    const simHands = xb.core?.simulator?.hands;
    if (simHands) {
      simHands.setRightHandPinching(next);
    }
    const c1 = xb.core?.input?.controllers?.[1];
    if (c1) c1.userData.selected = next;
  }

  toggleHandsTogether(force) {
    this.simHandsTogether = force !== undefined ? force : !this.simHandsTogether;
    const sim = xb.core?.simulator;
    const xOffset = this.simHandsTogether ? 0.05 : 0.3;
    if (sim) {
      const state = sim.controls?.simulatorControllerState || sim.simulatorControllerState;
      if (state) {
        state.localControllerPositions[0].set(-xOffset, -0.1, -0.35);
        state.localControllerPositions[1].set(xOffset, -0.1, -0.35);
      }
      if (sim.hands) {
        sim.hands.syncHandJoints();
      }
    }
  }

  /**
   * Reads tracked hand pose data or falls back to reach volume in front of camera.
   */
  getHandData(handIndex) {
    const isLeft = handIndex === 0;
    const hands = xb.user?.hands;
    const controller = xb.core?.input?.controllers?.[handIndex];

    // Default reach volume position in front of viewer
    const reachX = this.simHandsTogether ? 0.05 : 0.22;
    const defaultOffset = new THREE.Vector3(isLeft ? -reachX : reachX, -0.1, -0.45);
    let palmPos = new THREE.Vector3();
    let palmNormal = new THREE.Vector3(0, 1, 0);
    let fingertipPos = new THREE.Vector3();

    if (xb.core?.camera) {
      palmPos.copy(defaultOffset).applyMatrix4(xb.core.camera.matrixWorld);
      fingertipPos.copy(palmPos).add(
        new THREE.Vector3(0, 0.03, -0.06).applyQuaternion(xb.core.camera.quaternion)
      );
    } else {
      palmPos.copy(defaultOffset).add(new THREE.Vector3(0, 1.5, 0));
      fingertipPos.copy(palmPos).add(new THREE.Vector3(0, 0.03, -0.06));
    }

    if (this.simHandsTogether) {
      const flamePos = palmPos.clone().add(new THREE.Vector3(0, 0.06, 0));
      return { palmPos, palmNormal, flamePos, fingertipPos };
    }

    // Simulator controller state check
    const simState = xb.core?.simulator?.simulatorControllerState;
    if (simState && xb.core?.camera) {
      const localPos = simState.localControllerPositions[handIndex];
      if (localPos && localPos.lengthSq() > 0.001) {
        palmPos.copy(localPos).applyMatrix4(xb.core.camera.matrixWorld);
        fingertipPos.copy(palmPos).add(
          new THREE.Vector3(0, 0.03, -0.06).applyQuaternion(xb.core.camera.quaternion)
        );
      }
    }

    // Tracked controller position if non-zero
    if (controller) {
      const cPos = new THREE.Vector3();
      controller.getWorldPosition(cPos);
      if (cPos.lengthSq() > 0.001) {
        palmPos.copy(cPos);
        fingertipPos.copy(palmPos).add(new THREE.Vector3(0, 0.03, -0.06));
      }
    }

    // Tracked hand joints
    if (hands) {
      const wrist = hands.getWrist(handIndex);
      const middleBase =
        hands.getJoint("middle-finger-metacarpal", handIndex) ||
        hands.getJoint("middle-finger-phalanx-proximal", handIndex);
      const indexTip = hands.getIndexTip(handIndex);
      const thumbTip = hands.getThumbTip(handIndex);
      const indexBase = hands.getJoint("index-finger-metacarpal", handIndex);
      const pinkyBase = hands.getJoint("pinky-finger-metacarpal", handIndex);

      if (wrist && middleBase) {
        const wPos = new THREE.Vector3();
        const mPos = new THREE.Vector3();
        wrist.getWorldPosition(wPos);
        middleBase.getWorldPosition(mPos);
        if (wPos.lengthSq() > 0.001) {
          palmPos.copy(wPos).lerp(mPos, 0.5);
        }
      }

      if (wrist && indexBase && pinkyBase) {
        const wPos = new THREE.Vector3();
        const iPos = new THREE.Vector3();
        const pPos = new THREE.Vector3();
        wrist.getWorldPosition(wPos);
        indexBase.getWorldPosition(iPos);
        pinkyBase.getWorldPosition(pPos);
        const v1 = iPos.sub(wPos);
        const v2 = pPos.sub(wPos);
        const norm = new THREE.Vector3().crossVectors(v1, v2);
        if (norm.lengthSq() > 0.0001) {
          norm.normalize();
          if (isLeft) norm.negate();
          palmNormal.copy(norm);
        }
      }

      if (indexTip && thumbTip) {
        const iTip = new THREE.Vector3();
        const tTip = new THREE.Vector3();
        indexTip.getWorldPosition(iTip);
        thumbTip.getWorldPosition(tTip);
        if (iTip.lengthSq() > 0.001 && tTip.lengthSq() > 0.001) {
          fingertipPos.copy(iTip).lerp(tTip, 0.5);
        } else if (iTip.lengthSq() > 0.001) {
          fingertipPos.copy(iTip);
        }
      } else if (indexTip) {
        const iTip = new THREE.Vector3();
        indexTip.getWorldPosition(iTip);
        if (iTip.lengthSq() > 0.001) fingertipPos.copy(iTip);
      }
    }

    // Flame position hovers directly above the palm
    const flamePos = palmPos
      .clone()
      .addScaledVector(palmNormal, 0.06)
      .add(new THREE.Vector3(0, 0.035, 0));

    return { palmPos, palmNormal, flamePos, fingertipPos };
  }

  /**
   * Determine pinch status from all available inputs.
   */
  checkPinchStatus(handIndex) {
    const isLeft = handIndex === 0;
    if (isLeft) {
      if (this.leftPinched) return true;
      if (xb.user?.isSelecting(0)) return true;
      const simHands = xb.core?.simulator?.hands;
      if (simHands?.leftHandPose === "pinching") return true;
    } else {
      if (this.rightPinched) return true;
      if (xb.user?.isSelecting(1)) return true;
      const simHands = xb.core?.simulator?.hands;
      if (simHands?.rightHandPose === "pinching") return true;
    }

    const hands = xb.user?.hands;
    if (hands) {
      const thumb = hands.getThumbTip(handIndex);
      const index = hands.getIndexTip(handIndex);
      if (thumb && index) {
        const d = thumb.position.distanceTo(index.position);
        if (d > 0 && d < 0.035) return true;
      }
    }

    return false;
  }

  update(time, frame) {
    const dt = Math.min(xb.getDeltaTime() || 0.016, 0.1);

    // 1. Sample hands
    const leftData = this.getHandData(0);
    const rightData = this.getHandData(1);

    const isLeftPinching = this.checkPinchStatus(0);
    const isRightPinching = this.checkPinchStatus(1);

    // Update flame/stream group positions
    this.leftHandFlame.position.copy(leftData.flamePos);
    this.rightHandFlame.position.copy(rightData.flamePos);
    this.leftFingertipStream.position.copy(leftData.fingertipPos);
    this.rightFingertipStream.position.copy(rightData.fingertipPos);

    // Distance between fingertip streams
    const streamDistance = leftData.fingertipPos.distanceTo(rightData.fingertipPos);
    const streamsTogether =
      isLeftPinching &&
      isRightPinching &&
      streamDistance <= this.TOGETHER_THRESHOLD;

    // 2. Handle Orb State Machine
    if (this.orbState === "ACTIVE") {
      this.orbTimer -= dt;

      // Position orb at midpoint between hands
      const midPoint = new THREE.Vector3()
        .addVectors(leftData.fingertipPos, rightData.fingertipPos)
        .multiplyScalar(0.5);
      this.fireOrb.position.copy(midPoint);
      this.successRing.position.copy(midPoint);

      // Keep success ring expanding and rotating
      this.ringProgress = Math.min(1.0, this.ringProgress + dt * 2.0);
      const ringScale = 0.6 + this.ringProgress * 0.8 + Math.sin(time * 3) * 0.05;
      this.successRing.scale.setScalar(ringScale);
      this.ringMesh.rotation.z += dt * 1.5;
      this.outerRingMesh.rotation.z -= dt * 2.0;

      // Orb visual animations
      this.orbParticles.update(dt, time);
      const pulse = 1.0 + Math.sin(time * 6) * 0.08;
      this.orbCoreMesh.scale.setScalar(pulse);
      this.orbBlueShell.rotation.y += dt * 2.5;
      this.orbBlueShell.rotation.x += dt * 1.2;
      this.orbOrangeShell.rotation.y -= dt * 2.2;
      this.orbOrangeShell.rotation.z += dt * 1.5;

      // Exit orb conditions:
      // Condition A: 5 seconds elapsed
      // Condition B: "Opening both hands after the orb appears clears it and restores both palm flames."
      const bothHandsOpen = !isLeftPinching && !isRightPinching;
      if (this.orbTimer <= 0 || bothHandsOpen) {
        this.orbState = "IDLE";
        this.orbTimer = 0;
        this.mergeHoldTime = 0;
        this.fireOrb.visible = false;
        this.successRing.visible = false;

        // Restore flames
        this.leftHandFlame.visible = !isLeftPinching;
        this.leftFingertipStream.visible = isLeftPinching;
        this.rightHandFlame.visible = !isRightPinching;
        this.rightFingertipStream.visible = isRightPinching;
      } else {
        // While orb is active, streams have merged into the orb
        this.fireOrb.visible = true;
        this.successRing.visible = true;
        this.leftHandFlame.visible = false;
        this.leftFingertipStream.visible = false;
        this.rightHandFlame.visible = false;
        this.rightFingertipStream.visible = false;
      }
    } else {
      // IDLE STATE (pre-merge or standard interaction)
      this.fireOrb.visible = false;
      this.successRing.visible = false;

      // Update per-hand visual state:
      // - Pinching either hand concentrates only that hand's flame into a bright stream at its fingertips.
      // - The other hand's flame keeps its current form.
      // - Releasing either pinch returns that hand's flame to its open-palm form.
      this.leftHandFlame.visible = !isLeftPinching;
      this.leftFingertipStream.visible = isLeftPinching;

      this.rightHandFlame.visible = !isRightPinching;
      this.rightFingertipStream.visible = isRightPinching;

      // Check for holding both pinched streams together continuously for 1 second:
      if (streamsTogether) {
        this.mergeHoldTime += dt;
        if (this.mergeHoldTime >= 1.0) {
          // Success! Merge into fire orb with success ring
          this.orbState = "ACTIVE";
          this.orbTimer = this.ORB_DURATION;
          this.ringProgress = 0.0;
          this.fireOrb.visible = true;
          this.successRing.visible = true;

          const midPoint = new THREE.Vector3()
            .addVectors(leftData.fingertipPos, rightData.fingertipPos)
            .multiplyScalar(0.5);
          this.fireOrb.position.copy(midPoint);
          this.successRing.position.copy(midPoint);

          this.leftHandFlame.visible = false;
          this.leftFingertipStream.visible = false;
          this.rightHandFlame.visible = false;
          this.rightFingertipStream.visible = false;
        }
      } else {
        // Cancel the 1-second merge if either stream separates
        this.mergeHoldTime = 0.0;
      }
    }

    // 3. Update particle animations and flame cores
    if (this.leftHandFlame.visible) {
      this.leftPalmParticles.update(dt);
      const flicker = 1.0 + Math.sin(time * 12) * 0.12;
      this.leftPalmCore.scale.set(flicker, flicker * 1.3, flicker);
      this.leftFlameLight.intensity = 1.8 + Math.sin(time * 15) * 0.4;
    }

    if (this.rightHandFlame.visible) {
      this.rightPalmParticles.update(dt);
      const flicker = 1.0 + Math.sin(time * 13 + 1) * 0.12;
      this.rightPalmCore.scale.set(flicker, flicker * 1.3, flicker);
      this.rightFlameLight.intensity = 1.8 + Math.sin(time * 16 + 1) * 0.4;
    }

    if (this.leftFingertipStream.visible) {
      this.leftStreamParticles.update(dt);
      const pulse = 1.0 + Math.sin(time * 20) * 0.2;
      this.leftStreamCore.scale.setScalar(pulse);
    }

    if (this.rightFingertipStream.visible) {
      this.rightStreamParticles.update(dt);
      const pulse = 1.0 + Math.sin(time * 22) * 0.2;
      this.rightStreamCore.scale.setScalar(pulse);
    }
  }

  dispose() {
    this.leftPalmParticles.dispose();
    this.rightPalmParticles.dispose();
    this.leftStreamParticles.dispose();
    this.rightStreamParticles.dispose();
    this.orbParticles.dispose();

    this.leftPalmCore.geometry.dispose();
    this.leftPalmCore.material.dispose();
    this.rightPalmCore.geometry.dispose();
    this.rightPalmCore.material.dispose();
    this.leftStreamCore.geometry.dispose();
    this.leftStreamCore.material.dispose();
    this.rightStreamCore.geometry.dispose();
    this.rightStreamCore.material.dispose();
    this.orbCoreMesh.geometry.dispose();
    this.orbCoreMesh.material.dispose();
    this.orbBlueShell.geometry.dispose();
    this.orbBlueShell.material.dispose();
    this.orbOrangeShell.geometry.dispose();
    this.orbOrangeShell.material.dispose();
    this.ringMesh.geometry.dispose();
    this.ringMesh.material.dispose();
    this.outerRingMesh.geometry.dispose();
    this.outerRingMesh.material.dispose();
  }
}

// XR Blocks Setup
const options = new xb.Options();
options.enableHands();
options.enableGestures();
options.enableContext();
options.simulator.defaultMode = xb.SimulatorMode.POSE;
options.xrButton.showEnterSimulatorButton = true;

const start = () => {
  const app = new HandFireApp();
  window.handFire = app;
  xb.add(app);
  xb.init(options);
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
