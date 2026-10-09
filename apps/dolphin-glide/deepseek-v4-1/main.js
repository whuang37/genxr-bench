import * as THREE from "three";
import * as xb from "xrblocks";

// ---------------------------------------------------------------------------
// Dolphin Glide - rhythmic underwater course driven by paired hand strokes.
// ---------------------------------------------------------------------------

const LANE_Y = 1.3;
const START_Z = -0.8;
const STEP = 1.2;
const GATE_ZS = [-1.8, -3.0, -4.2, -5.4, -6.6, -7.8];
const GATE_OFFSETS = [
  {x: -0.10, y: 0.06},
  {x: 0.12, y: -0.05},
  {x: -0.12, y: -0.06},
  {x: 0.10, y: 0.05},
  {x: -0.08, y: 0.07},
  {x: 0.10, y: -0.04},
];

// Stroke detection thresholds (meters).
const REACH_ON = 0.045;
const RETURN_ON = 0.018;
const RETURN_DROP = 0.028;
const STROKE_TIMEOUT_SECONDS = 2.6;

const COLORS = {
  waterTop: 0x1d7fb5,
  waterBottom: 0x03192b,
  sand: 0x9a8257,
  dolphin: 0x79cbff,
  dolphinBelly: 0xe9f7ff,
  gate: 0x3ecbff,
  gateEmissive: 0x0d709f,
  gatePassed: 0x7dffb2,
  markerUp: 0x58ffa8,
  markerDown: 0xff7a7a,
  markerLevel: 0xdff4ff,
};

/** Attach the stable Devtools tag (plus readable text/state) to one object. */
function tagObject(object, tag, options = {}) {
  const metadata = {tag};
  if (options.getText) {
    metadata.output = {
      get text() {
        return options.getText();
      },
    };
  }
  if (options.getState) {
    Object.defineProperty(metadata, "state", {
      enumerable: true,
      get: options.getState,
    });
  }
  object.userData.xrblocksDevtools = metadata;
  return object;
}

function makeBubbleTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  gradient.addColorStop(0, "rgba(226,248,255,0.95)");
  gradient.addColorStop(0.45, "rgba(170,226,255,0.35)");
  gradient.addColorStop(1, "rgba(170,226,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function buildDolphin() {
  const group = new THREE.Group();
  group.name = "Dolphin Guide";

  const skin = new THREE.MeshStandardMaterial({
    color: COLORS.dolphin,
    roughness: 0.32,
    metalness: 0.08,
    emissive: 0x0d3a63,
    emissiveIntensity: 0.35,
  });
  const belly = new THREE.MeshStandardMaterial({
    color: COLORS.dolphinBelly,
    roughness: 0.4,
    metalness: 0.02,
    emissive: 0x1a4a70,
    emissiveIntensity: 0.15,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x08202f,
    roughness: 0.55,
    metalness: 0.1,
  });

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.34, 28, 20), skin);
  body.scale.set(0.92, 0.82, 1.9);
  group.add(body);

  const stomach = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 16), belly);
  stomach.scale.set(0.86, 0.66, 1.62);
  stomach.position.set(0, -0.09, 0.02);
  group.add(stomach);

  const snout = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.36, 20), skin);
  snout.rotation.x = -Math.PI / 2;
  snout.position.set(0, -0.02, -0.8);
  group.add(snout);

  const forehead = new THREE.Mesh(new THREE.SphereGeometry(0.18, 20, 14), skin);
  forehead.scale.set(1.0, 0.72, 1.05);
  forehead.position.set(0, 0.06, -0.5);
  group.add(forehead);

  const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.36, 4), skin);
  dorsal.scale.set(1, 1, 0.34);
  dorsal.rotation.x = -0.3;
  dorsal.position.set(0, 0.29, 0.03);
  group.add(dorsal);

  const flipperGeometry = new THREE.ConeGeometry(0.11, 0.34, 4);
  for (const side of [-1, 1]) {
    const flipper = new THREE.Mesh(flipperGeometry, skin);
    flipper.scale.set(1, 1, 0.32);
    flipper.rotation.z = side * 1.25;
    flipper.rotation.y = side * 0.25;
    flipper.position.set(side * 0.3, -0.14, -0.16);
    group.add(flipper);
  }

  const tail = new THREE.Group();
  tail.position.set(0, 0, 0.58);
  const tailStem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.3, 12), skin);
  tailStem.rotation.x = Math.PI / 2;
  tailStem.position.set(0, 0, 0.13);
  tail.add(tailStem);

  const flukeGeometry = new THREE.ConeGeometry(0.1, 0.34, 4);
  const flukeLeft = new THREE.Mesh(flukeGeometry, skin);
  flukeLeft.scale.set(1, 1, 0.28);
  flukeLeft.rotation.z = Math.PI / 2;
  flukeLeft.position.set(0.17, 0, 0.27);
  tail.add(flukeLeft);
  const flukeRight = new THREE.Mesh(flukeGeometry, skin);
  flukeRight.scale.set(1, 1, 0.28);
  flukeRight.rotation.z = -Math.PI / 2;
  flukeRight.position.set(-0.17, 0, 0.27);
  tail.add(flukeRight);
  group.add(tail);

  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), dark);
    eye.position.set(side * 0.16, 0.06, -0.53);
    group.add(eye);
  }

  // Direction marker: an arrow that points up or down with head pitch.
  const markerMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.markerLevel,
    emissive: COLORS.markerLevel,
    emissiveIntensity: 0.7,
    roughness: 0.35,
  });
  const marker = new THREE.Group();
  marker.position.set(0, 0.7, 0.05);
  const markerShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.028, 0.22, 10),
    markerMaterial
  );
  markerShaft.position.y = 0.11;
  const markerTip = new THREE.Mesh(
    new THREE.ConeGeometry(0.078, 0.17, 16),
    markerMaterial
  );
  markerTip.position.y = 0.3;
  marker.add(markerShaft, markerTip);
  group.add(marker);

  group.userData.parts = {marker, markerMaterial, tail};
  return group;
}

function buildGate(index, z) {
  const group = new THREE.Group();
  group.name = `Gate ${index + 1}`;

  const ringMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.gate,
    emissive: COLORS.gateEmissive,
    emissiveIntensity: 1.1,
    metalness: 0.3,
    roughness: 0.28,
  });
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.92, 0.085, 14, 52),
    ringMaterial
  );
  ring.scale.x = 1.35;
  group.add(ring);

  const membraneMaterial = new THREE.MeshBasicMaterial({
    color: 0x6fe0ff,
    transparent: true,
    opacity: 0.1,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const membrane = new THREE.Mesh(
    new THREE.CircleGeometry(0.92, 52),
    membraneMaterial
  );
  membrane.scale.x = 1.35;
  group.add(membrane);

  for (const side of [-1, 1]) {
    const buoy = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 16, 12),
      ringMaterial
    );
    buoy.position.set(side * 1.24, 0, 0);
    group.add(buoy);
  }

  const offset = GATE_OFFSETS[index];
  group.position.set(offset.x, LANE_Y + offset.y, z);
  group.userData.index = index;
  group.userData.z = z;
  group.userData.passed = false;
  group.userData.ringMaterial = ringMaterial;
  group.userData.membraneMaterial = membraneMaterial;
  return group;
}

function buildEnvironment(scene) {
  const root = new THREE.Group();
  root.name = "Underwater Course";

  scene.background = new THREE.Color(COLORS.waterBottom);
  scene.fog = new THREE.FogExp2(0x0a3450, 0.035);

  const domeMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: {value: new THREE.Color(COLORS.waterTop)},
      bottomColor: {value: new THREE.Color(COLORS.waterBottom)},
    },
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      varying vec3 vWorld;
      void main() {
        float h = clamp((vWorld.y + 3.0) / 13.0, 0.0, 1.0);
        gl_FragColor = vec4(mix(bottomColor, topColor, h), 1.0);
      }
    `,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(40, 32, 18), domeMaterial);
  dome.position.set(0, 4, -6);
  root.add(dome);

  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 70, 1, 1),
    new THREE.MeshStandardMaterial({color: COLORS.sand, roughness: 1, metalness: 0})
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, -0.75, -14);
  root.add(sand);

  const rockMaterial = new THREE.MeshStandardMaterial({
    color: 0x486d7a,
    roughness: 0.95,
    metalness: 0.05,
  });
  for (let i = 0; i < 14; i++) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18 + Math.random() * 0.4, 0), rockMaterial);
    const side = i % 2 === 0 ? -1 : 1;
    rock.position.set(
      side * (1.8 + Math.random() * 3.5),
      -0.65 + Math.random() * 0.25,
      -1 - Math.random() * 15
    );
    rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    root.add(rock);
  }

  // Light shafts streaming down through the water.
  const shaftMaterial = new THREE.MeshBasicMaterial({
    color: 0x9fe8ff,
    transparent: true,
    opacity: 0.055,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  for (let i = 0; i < 5; i++) {
    const shaft = new THREE.Mesh(new THREE.PlaneGeometry(0.9 + i * 0.25, 14), shaftMaterial);
    shaft.position.set(-4 + i * 2.1, 4.5, -4 - i * 2.4);
    shaft.rotation.z = -0.28;
    root.add(shaft);
  }

  const bubbleTexture = makeBubbleTexture();
  const bubbleCount = 90;
  const positions = new Float32Array(bubbleCount * 3);
  const speeds = new Float32Array(bubbleCount);
  for (let i = 0; i < bubbleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 10;
    positions[i * 3 + 1] = -0.6 + Math.random() * 5;
    positions[i * 3 + 2] = 1.5 - Math.random() * 16;
    speeds[i] = 0.18 + Math.random() * 0.4;
  }
  const bubbleGeometry = new THREE.BufferGeometry();
  bubbleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const bubbleMaterial = new THREE.PointsMaterial({
    map: bubbleTexture,
    color: 0xdff6ff,
    transparent: true,
    opacity: 0.75,
    size: 0.09,
    sizeAttenuation: true,
    depthWrite: false,
  });
  const bubbles = new THREE.Points(bubbleGeometry, bubbleMaterial);
  bubbles.name = "Bubbles";
  root.add(bubbles);

  root.userData.bubbles = bubbles;
  root.userData.bubbleSpeeds = speeds;
  return root;
}

class DolphinGlide extends xb.Script {
  constructor() {
    super();
    this.name = "Dolphin Glide";

    this.strokes = 0;
    this.gatesPassed = 0;
    this.courseState = "ready"; // ready | running | complete | stopped
    this.targetZ = START_Z;
    this.verticalOffset = 0;
    this.pitch = 0;
    this.elapsed = 0;

    // Paired-stroke state machine: reach forward with both hands, then pull
    // back together. Excursions are measured from the relaxed hand level.
    this.strokePhase = "idle";
    this.strokePeak = 0;
    this.strokeStartedAt = 0;
    this.strokeCooldownUntil = 0;
    this.restLevel = undefined;
    this.restLeft = undefined;
    this.restRight = undefined;

    this.flatForward = new THREE.Vector3(0, 0, -1);
    this.headPosition = new THREE.Vector3();
    this.handPosition = new THREE.Vector3();
    this.cameraForward = new THREE.Vector3();

    this.gates = [];

    this._lastStrokeLabel = "";
    this._lastGateLabel = "";
    this._lastResultLabel = "";
  }

  init() {
    this.add(new THREE.HemisphereLight(0x9fe8ff, 0x0b2a3d, 2.4));
    const sun = new THREE.DirectionalLight(0xbfeaff, 2.1);
    sun.position.set(4, 10, 3);
    this.add(sun);
    const rim = new THREE.DirectionalLight(0x2fa6d8, 0.8);
    rim.position.set(-5, 2, -6);
    this.add(rim);

    this.environment = buildEnvironment(xb.scene || this);
    this.add(this.environment);

    this.courseRoot = new THREE.Group();
    this.courseRoot.name = "Dolphin Course";
    this.add(this.courseRoot);

    this.dolphin = buildDolphin();
    this.dolphin.position.set(0, LANE_Y, START_Z);
    this.courseRoot.add(this.dolphin);
    tagObject(this.dolphin, "dolphin-guide", {
      getText: () => `${this.gatesPassed} of 6 gates`,
      getState: () => ({
        z: Number(this.dolphin.position.z.toFixed(3)),
        y: Number(this.dolphin.position.y.toFixed(3)),
        strokes: this.strokes,
        gates: this.gatesPassed,
        pitchDegrees: Number(THREE.MathUtils.radToDeg(this.pitch).toFixed(1)),
        heading: this.directionWord(),
      }),
    });

    GATE_ZS.forEach((z, index) => {
      const gate = buildGate(index, z);
      this.courseRoot.add(gate);
      this.gates.push(gate);
      tagObject(gate, "dolphin-gate", {
        getText: () => (gate.userData.passed ? "passed" : "open"),
        getState: () => ({
          index: index + 1,
          passed: gate.userData.passed,
        }),
      });
    });

    this.buildHud();
    this.buildResultCard();
    this.updateHud(true);
  }

  buildHud() {
    this.strokeText = new xb.UIText({
      text: "0 strokes",
      style: {
        fontSize: 32,
        fontWeight: "bold",
        color: "#e9f9ff",
        flexGrow: 1,
      },
    });
    tagObject(this.strokeText, "stroke-count", {
      getText: () => this.strokeLabel(),
      getState: () => ({strokes: this.strokes}),
    });

    this.gateText = new xb.UIText({
      text: "Gates 0 / 6",
      style: {
        fontSize: 28,
        color: "#8fdcff",
        flexGrow: 1,
        textAlign: "right",
      },
    });

    const statusRow = new xb.UIPanel({
      style: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        width: "100%",
      },
      children: [this.strokeText, this.gateText],
    });

    this.hudCard = new xb.UICard({
      size: {width: 1.15, height: 0.4},
      style: {
        flexDirection: "column",
        gap: 12,
        padding: 18,
        backgroundColor: "rgba(5, 30, 48, 0.82)",
        borderColor: "#3ecbff",
        borderWidth: 2,
        borderRadius: 22,
      },
      children: [
        new xb.UIText({
          text: "Dolphin Glide",
          style: {
            fontSize: 34,
            fontWeight: "bold",
            color: "#9fe8ff",
            textAlign: "center",
            width: "100%",
          },
        }),
        statusRow,
      ],
    });
    this.hudCard.position.set(0, 0.84, -1.15);
    this.add(this.hudCard);

    this.endButton = new xb.UIButton({
      label: "End",
      ariaLabel: "End dolphin course",
      onClick: () => this.endCourse(),
      style: {
        backgroundColor: "#ff7043",
        color: "#ffffff",
        borderRadius: 16,
        fontSize: 30,
        fontWeight: "bold",
        width: "100%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
      },
    });
    this.endButton.name = "End Dolphin Course";
    tagObject(this.endButton, "end-dolphin-course", {
      getText: () => "End",
      getState: () => ({enabled: !this.endButton.disabled}),
    });

    // A dedicated card keeps the button's world origin at its centre, so
    // ray-based targeting lands on the control itself.
    this.endCard = new xb.UICard({
      size: {width: 0.62, height: 0.28},
      style: {
        padding: 0,
        backgroundColor: "rgba(8, 40, 60, 0.9)",
        borderColor: "#ff7043",
        borderWidth: 2,
        borderRadius: 18,
      },
      children: [this.endButton],
    });
    this.endCard.position.set(0.36, 1.38, -1.0);
    this.add(this.endCard);
  }

  buildResultCard() {
    this.resultText = new xb.UIText({
      text: "0 gates - 0 strokes",
      style: {
        fontSize: 36,
        fontWeight: "bold",
        color: "#ffffff",
        textAlign: "center",
        width: "100%",
      },
    });

    this.resultCard = new xb.UICard({
      size: {width: 1.05, height: 0.32},
      style: {
        flexDirection: "column",
        gap: 10,
        padding: 20,
        backgroundColor: "rgba(6, 40, 60, 0.94)",
        borderColor: "#7dffb2",
        borderWidth: 3,
        borderRadius: 24,
      },
      children: [
        (this.resultTitle = new xb.UIText({
          text: "Course complete!",
          style: {
            fontSize: 32,
            fontWeight: "bold",
            color: "#7dffb2",
            textAlign: "center",
            width: "100%",
          },
        })),
        this.resultText,
      ],
    });
    this.resultCard.position.set(0, 1.82, -1.2);
    this.resultCard.visible = false;
    tagObject(this.resultCard, "dolphin-course-result", {
      getText: () => this.resultLabel(),
      getState: () => ({
        gates: this.gatesPassed,
        strokes: this.strokes,
        complete: this.courseState === "complete",
        stopped: this.courseState === "stopped",
      }),
    });
    this.add(this.resultCard);

    this.replayButton = new xb.UIButton({
      label: "Replay",
      ariaLabel: "Replay dolphin course",
      onClick: () => this.replay(),
      style: {
        backgroundColor: "#26a69a",
        color: "#ffffff",
        borderRadius: 16,
        fontSize: 30,
        fontWeight: "bold",
        width: "100%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
      },
    });
    this.replayButton.name = "Replay";

    this.replayCard = new xb.UICard({
      size: {width: 0.62, height: 0.28},
      style: {
        padding: 0,
        backgroundColor: "rgba(8, 40, 60, 0.9)",
        borderColor: "#26a69a",
        borderWidth: 2,
        borderRadius: 18,
      },
      children: [this.replayButton],
    });
    this.replayCard.position.set(0.36, 1.38, -1.0);
    this.replayCard.visible = false;
    this.add(this.replayCard);
  }

  strokeLabel() {
    return `${this.strokes} stroke${this.strokes === 1 ? "" : "s"}`;
  }

  gateLabel() {
    return `Gates ${this.gatesPassed} / 6`;
  }

  resultLabel() {
    return `${this.gatesPassed} gate${this.gatesPassed === 1 ? "" : "s"} - ${this.strokes} stroke${this.strokes === 1 ? "" : "s"}`;
  }

  directionWord() {
    if (this.pitch > 0.14) return "up";
    if (this.pitch < -0.14) return "down";
    return "level";
  }

  updatePitch() {
    const camera = xb.camera;
    if (!camera) return;
    camera.getWorldDirection(this.cameraForward);
    this.pitch = Math.asin(THREE.MathUtils.clamp(this.cameraForward.y, -1, 1));
    this.flatForward.set(this.cameraForward.x, 0, this.cameraForward.z);
    if (this.flatForward.lengthSq() < 1e-6) {
      this.flatForward.set(0, 0, -1);
    } else {
      this.flatForward.normalize();
    }
    camera.getWorldPosition(this.headPosition);
  }

  handExtension(hand) {
    const joint = hand && hand.joints ? hand.joints["wrist"] : undefined;
    if (!joint || !joint.getWorldPosition) return null;
    joint.getWorldPosition(this.handPosition);
    return this.handPosition.sub(this.headPosition).dot(this.flatForward);
  }

  updateStrokeDetection(dt) {
    if (this.courseState === "complete" || this.courseState === "stopped") {
      return;
    }
    const hands = xb.user && xb.user.hands;
    const left = hands && hands.hands ? hands.hands[0] : undefined;
    const right = hands && hands.hands ? hands.hands[1] : undefined;
    const leftExtension = this.handExtension(left);
    const rightExtension = this.handExtension(right);

    if (leftExtension === null && rightExtension === null) return;

    const extension =
      leftExtension !== null && rightExtension !== null
        ? (leftExtension + rightExtension) / 2
        : leftExtension !== null
          ? leftExtension
          : rightExtension;

    if (this.restLevel === undefined) this.restLevel = extension;
    if (leftExtension !== null && this.restLeft === undefined) {
      this.restLeft = leftExtension;
    }
    if (rightExtension !== null && this.restRight === undefined) {
      this.restRight = rightExtension;
    }

    const relaxed = (current, rest) =>
      rest === undefined || Math.abs(current - rest) >= 0.08
        ? rest
        : rest + (current - rest) * Math.min(1, dt * 1.5);

    if (this.strokePhase === "idle") {
      if (this.elapsed >= this.strokeCooldownUntil) {
        this.restLevel = relaxed(extension, this.restLevel);
        if (leftExtension !== null) {
          this.restLeft = relaxed(leftExtension, this.restLeft);
        }
        if (rightExtension !== null) {
          this.restRight = relaxed(rightExtension, this.restRight);
        }
      }
      const leftReady =
        leftExtension === null ||
        leftExtension - this.restLeft > REACH_ON * 0.5;
      const rightReady =
        rightExtension === null ||
        rightExtension - this.restRight > REACH_ON * 0.5;
      if (
        extension - this.restLevel > REACH_ON &&
        leftReady &&
        rightReady
      ) {
        this.strokePhase = "extended";
        this.strokePeak = extension;
        this.strokeStartedAt = this.elapsed;
      }
      return;
    }

    if (this.strokePhase === "extended") {
      this.strokePeak = Math.max(this.strokePeak, extension);
      if (this.elapsed - this.strokeStartedAt > STROKE_TIMEOUT_SECONDS) {
        this.strokePhase = "idle";
      } else if (this.strokePeak - extension > RETURN_DROP) {
        this.strokePhase = "returning";
      }
      return;
    }

    // returning toward the relaxed hand level.
    if (extension - this.restLevel <= RETURN_ON) {
      this.strokePhase = "idle";
      this.strokeCooldownUntil = this.elapsed + 0.1;
      this.restLevel = extension;
      if (leftExtension !== null) this.restLeft = leftExtension;
      if (rightExtension !== null) this.restRight = rightExtension;
      this.performStroke();
    } else if (this.elapsed - this.strokeStartedAt > STROKE_TIMEOUT_SECONDS) {
      this.strokePhase = "idle";
    }
  }

  performStroke() {
    if (this.courseState === "complete" || this.courseState === "stopped") return;
    this.strokes += 1;
    this.courseState = "running";
    this.targetZ -= STEP;
    this.verticalOffset = THREE.MathUtils.clamp(
      this.verticalOffset + Math.sin(this.pitch) * 0.18,
      -0.55,
      0.55
    );
    this.advanceGates();
    this.updateHud();
  }

  advanceGates() {
    for (const gate of this.gates) {
      if (!gate.userData.passed && this.targetZ <= gate.userData.z + 1e-6) {
        gate.userData.passed = true;
        this.gatesPassed += 1;
        const ringMaterial = gate.userData.ringMaterial;
        ringMaterial.color.set(COLORS.gatePassed);
        ringMaterial.emissive.set(0x1f8f57);
        gate.userData.membraneMaterial.opacity = 0.24;
        gate.scale.setScalar(1.06);
      }
    }
    if (this.gatesPassed >= this.gates.length) {
      this.completeCourse();
    }
  }

  completeCourse() {
    if (this.courseState === "complete" || this.courseState === "stopped") return;
    this.courseState = "complete";
    this.showResult();
  }

  endCourse() {
    if (this.courseState === "stopped") return;
    this.courseState = "stopped";
    this.targetZ = this.dolphin.position.z;
    this.showResult();
  }

  showResult() {
    this.resultTitle.text =
      this.courseState === "complete" ? "Course complete!" : "Course stopped";
    this.resultCard.visible = true;
    this.replayCard.visible = true;
    this.endCard.visible = false;
    this.updateHud(true);
  }

  replay() {
    this.strokes = 0;
    this.gatesPassed = 0;
    this.courseState = "ready";
    this.targetZ = START_Z;
    this.verticalOffset = 0;
    this.strokePhase = "idle";
    this.strokeCooldownUntil = 0;
    this.restLevel = undefined;
    this.restLeft = undefined;
    this.restRight = undefined;
    this.dolphin.position.set(0, LANE_Y, START_Z);
    this.dolphin.rotation.set(0, 0, 0);
    for (const gate of this.gates) {
      gate.userData.passed = false;
      gate.scale.setScalar(1);
      gate.userData.ringMaterial.color.set(COLORS.gate);
      gate.userData.ringMaterial.emissive.set(COLORS.gateEmissive);
      gate.userData.membraneMaterial.opacity = 0.1;
    }
    this.resultCard.visible = false;
    this.replayCard.visible = false;
    this.endCard.visible = true;
    this.updateHud(true);
  }

  updateDolphin(dt) {
    const dolphin = this.dolphin;
    const difference = this.targetZ - dolphin.position.z;
    if (Math.abs(difference) > 1e-5) {
      dolphin.position.z += difference * Math.min(1, dt * 5.5);
      if (Math.abs(this.targetZ - dolphin.position.z) < 1e-3) {
        dolphin.position.z = this.targetZ;
      }
    }

    if (this.courseState === "running" || this.courseState === "ready") {
      this.verticalOffset = THREE.MathUtils.clamp(
        this.verticalOffset + Math.sin(this.pitch) * 0.9 * dt,
        -0.55,
        0.55
      );
    }
    dolphin.position.y = LANE_Y + this.verticalOffset;

    const targetRotation = THREE.MathUtils.clamp(this.pitch * 0.9, -0.7, 0.7);
    dolphin.rotation.x += (targetRotation - dolphin.rotation.x) * Math.min(1, dt * 4);

    const marker = dolphin.userData.parts.marker;
    const markerMaterial = dolphin.userData.parts.markerMaterial;
    const direction = this.directionWord();
    const targetMarkerRotation = direction === "down" ? Math.PI : 0;
    marker.rotation.z +=
      (targetMarkerRotation - marker.rotation.z) * Math.min(1, dt * 6);
    if (direction === "up") {
      markerMaterial.color.set(COLORS.markerUp);
      markerMaterial.emissive.set(COLORS.markerUp);
    } else if (direction === "down") {
      markerMaterial.color.set(COLORS.markerDown);
      markerMaterial.emissive.set(COLORS.markerDown);
    } else {
      markerMaterial.color.set(COLORS.markerLevel);
      markerMaterial.emissive.set(COLORS.markerLevel);
    }

    const swimming = this.courseState === "running" || Math.abs(difference) > 0.01;
    const tail = dolphin.userData.parts.tail;
    const tailTarget = swimming ? Math.sin(this.elapsed * 9) * 0.4 : 0;
    tail.rotation.y += (tailTarget - tail.rotation.y) * Math.min(1, dt * 10);
  }

  updateAmbient(dt) {
    const environment = this.environment;
    if (!environment) return;
    const bubbles = environment.userData.bubbles;
    const speeds = environment.userData.bubbleSpeeds;
    if (bubbles && speeds) {
      const positions = bubbles.geometry.attributes.position;
      for (let i = 0; i < speeds.length; i++) {
        let y = positions.getY(i) + speeds[i] * dt;
        if (y > 4.6) {
          y = -0.7;
          positions.setX(i, (Math.random() - 0.5) * 10);
          positions.setZ(i, 1.5 - Math.random() * 16);
        }
        positions.setY(i, y);
        positions.setX(i, positions.getX(i) + Math.sin(this.elapsed + i) * 0.0008);
      }
      positions.needsUpdate = true;
    }
  }

  updateHud(force = false) {
    const strokeLabel = this.strokeLabel();
    if (force || strokeLabel !== this._lastStrokeLabel) {
      this.strokeText.text = strokeLabel;
      this._lastStrokeLabel = strokeLabel;
    }
    const gateLabel = this.gateLabel();
    if (force || gateLabel !== this._lastGateLabel) {
      this.gateText.text = gateLabel;
      this._lastGateLabel = gateLabel;
    }
    const resultLabel = this.resultLabel();
    if (force || resultLabel !== this._lastResultLabel) {
      this.resultText.text = resultLabel;
      this._lastResultLabel = resultLabel;
    }
  }

  update(_time, _frame) {
    const dt = THREE.MathUtils.clamp(xb.getDeltaTime() || 0.016, 0.0005, 0.05);
    this.elapsed += dt;
    this.updatePitch();
    this.updateStrokeDetection(dt);
    this.updateDolphin(dt);
    this.updateAmbient(dt);
    this.updateHud();
  }

  onKeyDown(event) {
    if (event && event.code === "Space") {
      this.performStroke();
    }
  }

  dispose() {
    this.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      const material = object.material;
      if (Array.isArray(material)) {
        material.forEach((entry) => entry.dispose && entry.dispose());
      } else if (material && material.dispose) {
        material.dispose();
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const options = new xb.Options();
  options.enableHands();
  options.simulator.defaultMode = xb.SimulatorMode.POSE;
  options.xrButton.showEnterSimulatorButton = true;

  xb.add(new DolphinGlide());
  await xb.init(options);
});
