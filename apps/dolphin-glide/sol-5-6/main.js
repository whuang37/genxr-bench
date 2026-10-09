import * as THREE from "three";
import * as xb from "xrblocks";
import {DolphinCourseState, GATE_COUNT} from "./course-state.js";

const START_Z = -1.15;
const FIRST_GATE_Z = -2.05;
const GATE_SPACING = 0.88;
const START_Y = 1.28;
const GLIDE_SECONDS = 0.82;
const REACH_DEPTH = -0.34;
const PULL_DISTANCE = 0.15;
const STROKE_TIMEOUT = 2.4;

const COLORS = {
  deep: 0x021b2f,
  water: 0x063a56,
  cyan: 0x62e7f5,
  aqua: 0x20c8cc,
  teal: 0x0c7f85,
  coral: 0xff806c,
  sand: 0xb8ac78,
  passed: 0x78f0ad,
  white: 0xf6fdff,
};

function disposeBranch(root) {
  root.traverse((object) => {
    object.geometry?.dispose?.();
    if (Array.isArray(object.material)) object.material.forEach((m) => m.dispose?.());
    else object.material?.dispose?.();
    object.material?.map?.dispose?.();
  });
}

function standardMaterial(color, extra = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.55,
    metalness: 0.04,
    ...extra,
  });
}

function mesh(geometry, material, {position, rotation, scale} = {}) {
  const object = new THREE.Mesh(geometry, material);
  if (position) object.position.set(...position);
  if (rotation) object.rotation.set(...rotation);
  if (scale) object.scale.set(...scale);
  return object;
}

function makeTriangle(width, height, material) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [-width / 2, 0, 0, width / 2, 0, 0, 0, height, 0],
      3,
    ),
  );
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, material);
}

function makeNumberBadge(number) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, 128, 128);
  context.beginPath();
  context.arc(64, 64, 54, 0, Math.PI * 2);
  context.fillStyle = "rgba(2, 30, 47, 0.94)";
  context.fill();
  context.lineWidth = 7;
  context.strokeStyle = "#65e8ef";
  context.stroke();
  context.fillStyle = "#f6fdff";
  context.font = "700 62px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(String(number), 64, 66);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({map: texture, transparent: true, depthTest: true}),
  );
  sprite.scale.set(0.24, 0.24, 1);
  return sprite;
}

function createDolphin() {
  const dolphin = new THREE.Group();
  dolphin.name = "Dolphin guide";
  dolphin.userData.xrblocksDevtools = {tag: "dolphin-guide"};

  const skin = standardMaterial(0x45b9d5, {roughness: 0.32});
  const lightSkin = standardMaterial(0xa8edf2, {roughness: 0.42});
  const finMaterial = standardMaterial(0x2788a5, {
    side: THREE.DoubleSide,
    roughness: 0.4,
  });
  const dark = standardMaterial(0x092d43, {roughness: 0.35});

  const body = mesh(new THREE.SphereGeometry(0.5, 28, 20), skin, {
    scale: [0.42, 0.34, 1.05],
  });
  dolphin.add(body);

  const belly = mesh(new THREE.SphereGeometry(0.48, 24, 16), lightSkin, {
    position: [0, -0.085, -0.11],
    scale: [0.34, 0.2, 0.88],
  });
  dolphin.add(belly);

  const forehead = mesh(new THREE.SphereGeometry(0.25, 22, 16), skin, {
    position: [0, 0.04, -0.48],
    scale: [1.08, 0.78, 1.2],
  });
  const beak = mesh(new THREE.ConeGeometry(0.115, 0.5, 20), lightSkin, {
    position: [0, -0.055, -0.82],
    rotation: [-Math.PI / 2, 0, 0],
    scale: [1, 1, 0.78],
  });
  dolphin.add(forehead, beak);

  for (const side of [-1, 1]) {
    const eye = mesh(new THREE.SphereGeometry(0.038, 14, 10), dark, {
      position: [side * 0.18, 0.095, -0.59],
    });
    const eyeGlint = mesh(
      new THREE.SphereGeometry(0.011, 8, 6),
      new THREE.MeshBasicMaterial({color: 0xffffff}),
      {position: [side * 0.194, 0.112, -0.617]},
    );
    dolphin.add(eye, eyeGlint);
  }

  const dorsal = makeTriangle(0.38, 0.38, finMaterial);
  dorsal.position.set(0, 0.16, 0.13);
  dorsal.rotation.set(Math.PI / 2, 0, 0);
  dolphin.add(dorsal);

  for (const side of [-1, 1]) {
    const fin = makeTriangle(0.48, 0.42, finMaterial);
    fin.position.set(side * 0.17, -0.07, -0.02);
    fin.rotation.set(Math.PI / 2, side * -0.45, side * -0.92);
    dolphin.add(fin);
  }

  const tailStem = mesh(new THREE.CylinderGeometry(0.09, 0.16, 0.48, 16), skin, {
    position: [0, 0, 0.66],
    rotation: [Math.PI / 2, 0, 0],
  });
  dolphin.add(tailStem);

  const tailPivot = new THREE.Group();
  tailPivot.name = "Dolphin tail";
  tailPivot.position.set(0, 0, 0.91);
  for (const side of [-1, 1]) {
    const fluke = makeTriangle(0.42, 0.44, finMaterial);
    fluke.rotation.set(-Math.PI / 2, 0, side * Math.PI / 2);
    fluke.scale.x = side;
    tailPivot.add(fluke);
  }
  dolphin.add(tailPivot);
  dolphin.userData.tailPivot = tailPivot;

  const glow = mesh(
    new THREE.TorusGeometry(0.33, 0.018, 8, 40),
    new THREE.MeshBasicMaterial({
      color: COLORS.cyan,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
    }),
    {position: [0, 0, 0.08], rotation: [Math.PI / 2, 0, 0]},
  );
  dolphin.add(glow);
  dolphin.scale.setScalar(0.66);
  return dolphin;
}

function createGate(index) {
  const gate = new THREE.Group();
  gate.name = `Dolphin gate ${index + 1}`;
  gate.userData.xrblocksDevtools = {tag: "dolphin-gate"};

  const frameMaterial = standardMaterial(index % 2 ? 0x1dc4c5 : 0x3dd9e2, {
    emissive: index % 2 ? 0x063d43 : 0x083f4c,
    emissiveIntensity: 0.8,
    roughness: 0.28,
  });
  const trimMaterial = new THREE.MeshBasicMaterial({
    color: 0x91fbff,
    transparent: true,
    opacity: 0.72,
  });
  const postGeometry = new THREE.CylinderGeometry(0.065, 0.09, 1.42, 16);
  const beamGeometry = new THREE.CylinderGeometry(0.065, 0.065, 2.22, 16);

  const leftPost = mesh(postGeometry, frameMaterial, {position: [-1.05, 1.0, 0]});
  const rightPost = mesh(postGeometry, frameMaterial, {position: [1.05, 1.0, 0]});
  const topBeam = mesh(beamGeometry, frameMaterial, {
    position: [0, 1.7, 0],
    rotation: [0, 0, Math.PI / 2],
  });
  gate.add(leftPost, rightPost, topBeam);

  for (const side of [-1, 1]) {
    const base = mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.18, 18), frameMaterial, {
      position: [side * 1.05, 0.22, 0],
    });
    const light = mesh(new THREE.SphereGeometry(0.085, 14, 10), trimMaterial, {
      position: [side * 1.05, 1.7, 0.015],
    });
    gate.add(base, light);
  }

  const innerGlow = mesh(new THREE.TorusGeometry(1.05, 0.016, 6, 52, Math.PI), trimMaterial, {
    position: [0, 1.68, 0.01],
  });
  gate.add(innerGlow);

  const badge = makeNumberBadge(index + 1);
  badge.position.set(0, 1.93, 0.025);
  gate.add(badge);

  gate.userData.frameMaterial = frameMaterial;
  gate.userData.trimMaterial = trimMaterial;
  gate.position.x = (index % 2 === 0 ? -1 : 1) * (0.08 + index * 0.018);
  gate.position.z = FIRST_GATE_Z - index * GATE_SPACING;
  return gate;
}

function createDirectionMarker() {
  const marker = new THREE.Group();
  marker.name = "Head pitch direction marker";
  const material = new THREE.MeshBasicMaterial({
    color: 0xffcf6a,
    transparent: true,
    opacity: 0.95,
    side: THREE.DoubleSide,
    depthTest: false,
  });
  const stem = mesh(new THREE.BoxGeometry(0.055, 0.26, 0.025), material, {
    position: [0, 0.02, 0],
  });
  const head = makeTriangle(0.22, 0.18, material);
  head.position.y = 0.15;
  marker.add(stem, head);
  marker.renderOrder = 5;
  marker.scale.setScalar(0.74);
  return marker;
}

function addSeabed(sceneRoot) {
  const floorMaterial = standardMaterial(COLORS.sand, {roughness: 0.95});
  const floor = mesh(new THREE.PlaneGeometry(22, 22, 1, 1), floorMaterial, {
    position: [0, 0.08, -6],
    rotation: [-Math.PI / 2, 0, 0],
  });
  floor.receiveShadow = true;
  sceneRoot.add(floor);

  const rockMaterial = standardMaterial(0x365e60, {roughness: 0.88});
  const coralMaterials = [
    standardMaterial(0xf27d67, {roughness: 0.7}),
    standardMaterial(0xf3b86a, {roughness: 0.72}),
    standardMaterial(0x8d79c7, {roughness: 0.72}),
  ];
  const decor = new THREE.Group();
  decor.name = "Underwater reef";
  const random = (seed) => {
    const x = Math.sin(seed * 973.13) * 43758.5453;
    return x - Math.floor(x);
  };

  for (let i = 0; i < 30; i++) {
    const side = i % 2 ? -1 : 1;
    const x = side * (1.55 + random(i + 2) * 2.8);
    const z = -0.8 - random(i + 8) * 8.7;
    const size = 0.12 + random(i + 19) * 0.24;
    const rock = mesh(new THREE.DodecahedronGeometry(size, 0), rockMaterial, {
      position: [x, 0.12 + size * 0.25, z],
      rotation: [random(i) * 2, random(i + 4) * 2, random(i + 9) * 2],
      scale: [1.3, 0.65, 1],
    });
    decor.add(rock);
  }

  for (let i = 0; i < 13; i++) {
    const side = i % 2 ? -1 : 1;
    const coral = new THREE.Group();
    coral.position.set(
      side * (1.45 + random(i + 31) * 2.15),
      0.15,
      -1.1 - random(i + 55) * 7.8,
    );
    const material = coralMaterials[i % coralMaterials.length];
    const branches = 3 + (i % 3);
    for (let branch = 0; branch < branches; branch++) {
      const height = 0.2 + random(i * 7 + branch) * 0.32;
      const piece = mesh(new THREE.CylinderGeometry(0.025, 0.055, height, 9), material, {
        position: [(branch - (branches - 1) / 2) * 0.075, height / 2, 0],
        rotation: [0, 0, (branch - (branches - 1) / 2) * 0.18],
      });
      coral.add(piece);
    }
    decor.add(coral);
  }
  sceneRoot.add(decor);

  const rayMaterial = new THREE.MeshBasicMaterial({
    color: 0x59dce7,
    transparent: true,
    opacity: 0.035,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  for (let i = 0; i < 9; i++) {
    const ray = mesh(new THREE.ConeGeometry(0.7, 5.5, 4, 1, true), rayMaterial, {
      position: [-3.2 + i * 0.8, 3.5, -4 - (i % 3) * 1.2],
      rotation: [0, 0, 0.1 + (i % 2) * 0.08],
    });
    sceneRoot.add(ray);
  }
}

function createBubbleField() {
  const count = 110;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const angle = i * 2.399;
    const radius = 0.8 + ((i * 37) % 100) / 23;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = 0.2 + ((i * 53) % 100) / 28;
    positions[i * 3 + 2] = -0.4 - ((i * 71) % 100) / 10;
    seeds[i] = (i * 17) % 100;
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("seed", new THREE.BufferAttribute(seeds, 1));
  const material = new THREE.PointsMaterial({
    color: 0x9eefff,
    size: 0.028,
    transparent: true,
    opacity: 0.48,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);
  points.name = "Rising bubbles";
  return points;
}

export class DolphinGlide extends xb.Script {
  constructor() {
    super();
    this.name = "Dolphin Glide course";
    this.course = new DolphinCourseState();
    this.gates = [];
    this.animating = false;
    this.glideElapsed = 0;
    this.reachStartedAt = 0;
    this.strokePhase = "waiting";
    this.currentPitch = 0;
    this.headDirection = new THREE.Vector3(0, 0, -1);
    this.headQuaternion = new THREE.Quaternion();
    this.leftPosition = new THREE.Vector3();
    this.rightPosition = new THREE.Vector3();
    this.leftLocal = new THREE.Vector3();
    this.rightLocal = new THREE.Vector3();
    this.reachLeftZ = 0;
    this.reachRightZ = 0;
    this.lastFrameTime = 0;
    this.keyboardStroke = () => {};
  }

  init() {
    this.setupWorld();
    this.setupCourse();
    this.setupUi();
    this.updateUi("Reach both hands forward");

    this.keyboardStroke = (event) => {
      if (event.code !== "Space" || event.repeat) return;
      event.preventDefault();
      this.performAccessibleStroke();
    };
    window.addEventListener("keydown", this.keyboardStroke);

    // A narrow debug surface is useful to local deterministic browser runners.
    // It invokes the same validated course transition as hand and keyboard input.
    window.dolphinGlide = {
      stroke: () => this.performAccessibleStroke(),
      replay: () => this.replay(),
      end: () => this.endCourse(),
      state: this.course,
    };
  }

  setupWorld() {
    xb.scene.background = new THREE.Color(COLORS.deep);
    xb.scene.fog = new THREE.FogExp2(COLORS.deep, 0.115);

    this.add(new THREE.HemisphereLight(0x88ecff, 0x071c2c, 2.35));
    const sun = new THREE.DirectionalLight(0xa8f3ff, 2.2);
    sun.position.set(-3, 7, 2);
    this.add(sun);
    const courseGlow = new THREE.PointLight(0x28e6e8, 6, 9, 1.8);
    courseGlow.position.set(0, 2.2, -3.8);
    this.add(courseGlow);
    addSeabed(this);
    this.bubbles = createBubbleField();
    this.add(this.bubbles);
  }

  setupCourse() {
    this.dolphin = createDolphin();
    this.dolphin.position.set(0, START_Y, START_Z);
    this.add(this.dolphin);

    this.directionMarker = createDirectionMarker();
    this.add(this.directionMarker);

    for (let i = 0; i < GATE_COUNT; i++) {
      const gate = createGate(i);
      this.gates.push(gate);
      this.add(gate);
    }
  }

  setupUi() {
    xb.ui.theme = "glimmer";

    this.titleText = new xb.UIText({
      text: "DOLPHIN GLIDE",
      pointerEvents: "none",
      style: {
        fontSize: 30,
        fontWeight: "bold",
        color: "#92f7ff",
        textAlign: "left",
        flexGrow: 1,
      },
    });
    this.gateText = new xb.UIText({
      text: "0 / 6 GATES",
      pointerEvents: "none",
      style: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#ffffff",
        textAlign: "center",
        width: 160,
      },
    });
    this.strokeText = new xb.UIText({
      text: "0 strokes",
      pointerEvents: "none",
      style: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#ffda7b",
        textAlign: "center",
        width: 150,
      },
    });
    this.strokeText.name = "Stroke count";
    this.strokeText.userData.xrblocksDevtools = {tag: "stroke-count"};

    this.endButton = new xb.UIButton({
      label: "End",
      ariaLabel: "End Dolphin Glide course",
      onClick: () => this.endCourse(),
      style: {
        width: 110,
        height: 54,
        fontSize: 20,
        fontWeight: "bold",
        color: "#ffffff",
        backgroundColor: "#bd4b55",
        borderRadius: 18,
      },
    });
    this.endButton.name = "End Dolphin Glide course";
    this.endButton.userData.xrblocksDevtools = {tag: "end-dolphin-course"};

    const headerRow = new xb.UIPanel({
      style: {
        width: "100%",
        height: 64,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      },
      children: [this.titleText, this.gateText, this.strokeText, this.endButton],
    });
    this.hud = new xb.UICard({
      size: {width: 1.42, height: 0.19},
      appearance: "surface",
      style: {
        padding: 14,
        backgroundColor: "#04283ee6",
        borderColor: "#2acbd1",
        borderWidth: 2,
        borderRadius: 22,
      },
      children: [headerRow],
    });
    this.hud.name = "Dolphin Glide progress";
    this.hud.position.set(0, 2.12, -1.22);
    this.add(this.hud);

    this.directionText = new xb.UIText({
      text: "HEAD  ↑  UP",
      pointerEvents: "none",
      style: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#ffda7b",
        textAlign: "center",
      },
    });
    this.instructionText = new xb.UIText({
      text: "Reach both hands forward • pull back together",
      pointerEvents: "none",
      style: {
        fontSize: 18,
        lineHeight: 1.25,
        color: "#ffffff",
        textAlign: "center",
      },
    });
    this.trackingText = new xb.UIText({
      text: "Waiting for both hands · SPACE also strokes",
      pointerEvents: "none",
      style: {
        fontSize: 14,
        color: "#9ed5df",
        textAlign: "center",
      },
    });
    this.coachCard = new xb.UICard({
      size: {width: 0.88, height: 0.29},
      appearance: "surface",
      pointerEvents: "none",
      style: {
        padding: 18,
        gap: 7,
        backgroundColor: "#04283ed9",
        borderColor: "#176d79",
        borderWidth: 1,
        borderRadius: 24,
      },
      children: [this.directionText, this.instructionText, this.trackingText],
    });
    this.coachCard.name = "Stroke guidance";
    this.coachCard.position.set(0, 0.78, -1.15);
    this.add(this.coachCard);

    this.resultTitle = new xb.UIText({
      text: "COURSE COMPLETE!",
      pointerEvents: "none",
      style: {
        fontSize: 38,
        fontWeight: "bold",
        color: "#85f5b4",
        textAlign: "center",
      },
    });
    this.resultCounts = new xb.UIText({
      text: "6 / 6 gates · 0 strokes",
      pointerEvents: "none",
      style: {
        fontSize: 26,
        fontWeight: "bold",
        color: "#ffffff",
        textAlign: "center",
      },
    });
    this.resultMessage = new xb.UIText({
      text: "Beautiful glide — every gate cleared.",
      pointerEvents: "none",
      style: {
        fontSize: 18,
        color: "#bdebf0",
        textAlign: "center",
      },
    });
    this.replayButton = new xb.UIButton({
      label: "Replay course",
      icon: "replay",
      ariaLabel: "Replay Dolphin Glide course",
      onClick: () => this.replay(),
      style: {
        width: "100%",
        height: 68,
        fontSize: 24,
        fontWeight: "bold",
        color: "#062536",
        backgroundColor: "#72ecdd",
        borderRadius: 22,
      },
    });
    this.resultCard = new xb.UICard({
      size: {width: 0.86, height: 0.48},
      appearance: "surface",
      style: {
        padding: 28,
        gap: 16,
        justifyContent: "center",
        backgroundColor: "#03263bf5",
        borderColor: "#67eade",
        borderWidth: 3,
        borderRadius: 30,
      },
      children: [
        this.resultTitle,
        this.resultCounts,
        this.resultMessage,
        this.replayButton,
      ],
    });
    this.resultCard.name = "Dolphin course result";
    this.resultCard.userData.xrblocksDevtools = {tag: "dolphin-course-result"};
    this.resultCard.position.set(0, 1.42, -0.92);
    this.resultCard.visible = false;
    this.add(this.resultCard);
  }

  update(time = 0) {
    const seconds = time * 0.001;
    const delta = this.lastFrameTime
      ? Math.min(0.05, Math.max(0, seconds - this.lastFrameTime))
      : 0;
    this.lastFrameTime = seconds;

    this.sampleHeadPitch();
    this.updateDirectionMarker();
    this.animateAmbient(seconds, delta);
    if (this.animating) this.updateGlide(delta);
    else this.sampleStroke(seconds);
  }

  sampleHeadPitch() {
    const camera = xb.core.camera;
    if (!camera) return;
    camera.getWorldQuaternion(this.headQuaternion);
    this.headDirection.set(0, 0, -1).applyQuaternion(this.headQuaternion).normalize();
    this.currentPitch = THREE.MathUtils.clamp(this.headDirection.y, -0.62, 0.62);
    const direction = this.currentPitch >= 0 ? "up" : "down";
    this.course.pitchDirection = direction;
    if (this.directionText) {
      this.directionText.text = direction === "up" ? "HEAD  ↑  UP" : "HEAD  ↓  DOWN";
    }
  }

  updateDirectionMarker() {
    if (!this.directionMarker || !this.dolphin) return;
    this.directionMarker.position.set(
      this.dolphin.position.x + 0.53,
      this.dolphin.position.y + 0.24,
      this.dolphin.position.z + 0.12,
    );
    this.directionMarker.rotation.z = this.currentPitch >= 0 ? 0 : Math.PI;
  }

  sampleStroke(seconds) {
    if (!this.course.canStroke) return;
    const hands = xb.user?.hands;
    const camera = xb.core.camera;
    if (!hands || !camera) {
      this.setTrackingText("Waiting for both hands · SPACE also strokes");
      return;
    }
    const left = hands.getWrist(xb.Handedness.LEFT);
    const right = hands.getWrist(xb.Handedness.RIGHT);
    if (!left || !right || !left.visible || !right.visible) {
      this.setTrackingText("Show both hands · SPACE also strokes");
      this.resetStrokePhase();
      return;
    }

    left.getWorldPosition(this.leftPosition);
    right.getWorldPosition(this.rightPosition);
    this.leftLocal.copy(this.leftPosition);
    this.rightLocal.copy(this.rightPosition);
    camera.worldToLocal(this.leftLocal);
    camera.worldToLocal(this.rightLocal);

    const balanced = Math.abs(this.leftLocal.z - this.rightLocal.z) < 0.18;
    const comfortablyPaired = Math.abs(this.leftLocal.x - this.rightLocal.x) < 1.05;
    const bothForward =
      this.leftLocal.z < REACH_DEPTH &&
      this.rightLocal.z < REACH_DEPTH &&
      balanced &&
      comfortablyPaired;

    if (this.strokePhase === "waiting") {
      this.setTrackingText("Both hands tracked · reach forward");
      if (bothForward && this.course.startStroke()) {
        this.strokePhase = "reached";
        this.reachStartedAt = seconds;
        this.reachLeftZ = this.leftLocal.z;
        this.reachRightZ = this.rightLocal.z;
        this.setTrackingText("Reach set · pull both hands back together");
      }
      return;
    }

    if (seconds - this.reachStartedAt > STROKE_TIMEOUT) {
      this.course.cancelStroke();
      this.resetStrokePhase();
      this.setTrackingText("Reset · reach both hands forward again");
      return;
    }

    // Each wrist must travel back; similar travel prevents a one-hand action
    // from being reported as a paired stroke.
    const leftPull = this.leftLocal.z - this.reachLeftZ;
    const rightPull = this.rightLocal.z - this.reachRightZ;
    const synchronized = Math.abs(leftPull - rightPull) < 0.13;
    const handsTogether = Math.abs(this.leftLocal.x - this.rightLocal.x) < 0.72;
    if (
      leftPull >= PULL_DISTANCE &&
      rightPull >= PULL_DISTANCE &&
      synchronized &&
      handsTogether
    ) {
      this.completeStroke();
    }
  }

  resetStrokePhase() {
    this.strokePhase = "waiting";
    this.reachStartedAt = 0;
  }

  performAccessibleStroke() {
    if (!this.course.canStroke || this.animating) return false;
    if (!this.course.startStroke()) return false;
    return this.completeStroke();
  }

  completeStroke() {
    if (this.animating) return false;
    if (!this.course.completeStroke(this.currentPitch)) return false;
    this.resetStrokePhase();
    this.beginGlide();
    this.updateUi("Gliding to the next gate…");
    return true;
  }

  beginGlide() {
    const gateIndex = this.course.passedGates;
    const gate = this.gates[gateIndex];
    if (!gate) return;
    this.animating = true;
    this.glideElapsed = 0;
    this.glideStart = this.dolphin.position.clone();
    this.glideEnd = new THREE.Vector3(
      gate.position.x,
      THREE.MathUtils.clamp(
        this.dolphin.position.y + this.currentPitch * 0.58,
        0.72,
        1.62,
      ),
      gate.position.z - 0.2,
    );
    const distanceZ = Math.abs(this.glideEnd.z - this.glideStart.z);
    this.glidePitch = Math.atan2(this.glideEnd.y - this.glideStart.y, distanceZ);
  }

  updateGlide(delta) {
    this.glideElapsed += delta;
    const progress = Math.min(1, this.glideElapsed / GLIDE_SECONDS);
    const eased = 1 - Math.pow(1 - progress, 3);
    this.dolphin.position.lerpVectors(this.glideStart, this.glideEnd, eased);
    this.dolphin.position.y += Math.sin(progress * Math.PI) * 0.045;
    this.dolphin.rotation.x = THREE.MathUtils.lerp(0, this.glidePitch, Math.sin(progress * Math.PI));
    if (progress < 1) return;

    this.dolphin.position.copy(this.glideEnd);
    this.dolphin.rotation.x = 0;
    this.animating = false;
    this.course.finishStep();
    this.markGatePassed(this.course.passedGates - 1);
    if (this.course.status === "complete") this.showResult(true);
    else this.updateUi("Gate cleared! Reach forward for the next stroke");
  }

  markGatePassed(index) {
    const gate = this.gates[index];
    if (!gate) return;
    gate.userData.frameMaterial.color.set(COLORS.passed);
    gate.userData.frameMaterial.emissive.set(0x17633a);
    gate.userData.frameMaterial.emissiveIntensity = 1.3;
    gate.userData.trimMaterial.color.set(COLORS.passed);
  }

  updateUi(instruction) {
    this.strokeText.text = this.course.strokeLabel;
    this.gateText.text = `${this.course.passedGates} / ${GATE_COUNT} GATES`;
    if (instruction) this.instructionText.text = instruction;
  }

  setTrackingText(text) {
    if (this.trackingText && this.trackingText.text !== text) this.trackingText.text = text;
  }

  showResult(completed) {
    this.animating = false;
    this.course.motionEnabled = false;
    this.resetStrokePhase();
    this.updateUi(completed ? "All six gates cleared" : "Course stopped");
    this.resultTitle.text = completed ? "COURSE COMPLETE!" : "COURSE ENDED";
    this.resultTitle.style.color = completed ? "#85f5b4" : "#ffcf7a";
    this.resultCounts.text = this.course.resultLabel;
    this.resultMessage.text = completed
      ? "Beautiful glide — every gate cleared."
      : "Your completed play counts are saved below.";
    this.resultCard.visible = true;
    this.hud.visible = false;
    this.coachCard.visible = false;
    this.directionMarker.visible = false;
  }

  endCourse() {
    if (!this.course.end()) return;
    this.animating = false;
    this.showResult(false);
  }

  replay() {
    this.course.replay();
    this.animating = false;
    this.glideElapsed = 0;
    this.resetStrokePhase();
    this.dolphin.position.set(0, START_Y, START_Z);
    this.dolphin.rotation.set(0, 0, 0);
    this.directionMarker.visible = true;
    for (let i = 0; i < this.gates.length; i++) {
      const gate = this.gates[i];
      const baseColor = i % 2 ? 0x1dc4c5 : 0x3dd9e2;
      gate.userData.frameMaterial.color.set(baseColor);
      gate.userData.frameMaterial.emissive.set(i % 2 ? 0x063d43 : 0x083f4c);
      gate.userData.frameMaterial.emissiveIntensity = 0.8;
      gate.userData.trimMaterial.color.set(0x91fbff);
    }
    this.resultCard.visible = false;
    this.hud.visible = true;
    this.coachCard.visible = true;
    this.endButton.disabled = false;
    this.updateUi("Reach both hands forward • pull back together");
    this.setTrackingText("Motion stopped · show both hands or press SPACE");
  }

  animateAmbient(seconds) {
    if (this.bubbles) {
      this.bubbles.rotation.y = seconds * 0.012;
      const positions = this.bubbles.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        let y = positions.getY(i) + 0.0025 + (i % 5) * 0.00025;
        if (y > 4.1) y = 0.15;
        positions.setY(i, y);
      }
      positions.needsUpdate = true;
    }
    if (!this.dolphin) return;
    const swimming = this.animating;
    this.dolphin.userData.tailPivot.rotation.y = swimming
      ? Math.sin(seconds * 15) * 0.32
      : 0;
  }

  dispose() {
    window.removeEventListener("keydown", this.keyboardStroke);
    if (window.dolphinGlide?.state === this.course) delete window.dolphinGlide;
    disposeBranch(this);
  }
}

const options = new xb.Options();
options.enableHands();
options.enableReticles();
options.hands.visualization = true;
options.hands.visualizeJoints = false;
options.hands.visualizeMeshes = true;
options.controllers.visualizeRays = true;
options.simulator.defaultMode = xb.SimulatorMode.POSE;
options.simulator.initialCameraPosition = {x: 0, y: 1.52, z: 0};
options.xrButton.showEnterSimulatorButton = true;
options.setAppTitle("Dolphin Glide");
options.setAppDescription(
  "Guide a dolphin through six underwater gates with synchronized two-hand strokes.",
);

document.addEventListener("DOMContentLoaded", async () => {
  xb.add(new DolphinGlide());
  await xb.init(options);
});
