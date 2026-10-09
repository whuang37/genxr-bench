import * as THREE from 'three';
import * as xb from 'xrblocks';

/** Attaches a stable devtools tag to the semantic owner of a control. */
function tag(object, name) {
  object.userData.xrblocksDevtools = {tag: name};
  return object;
}

const GATE_COUNT = 6;
const GATE_START_Z = -3.0;
const GATE_SPACING = 1.5;
const COURSE_MIN_Y = 0.5;
const COURSE_MAX_Y = 2.3;
const DOLPHIN_START = new THREE.Vector3(0, 1.35, -1.6);

// Paired-stroke detection thresholds, measured in meters of forward reach.
const REACH_EXTEND = 0.09;
const REACH_RETURN = 0.09;
const STROKE_IMPULSE = 1.6;
const SPEED_DECAY_PER_SECOND = 0.55;

/** Builds a simple stylized dolphin out of primitive meshes. */
function createDolphin() {
  const dolphin = new THREE.Group();
  dolphin.name = 'DolphinGuide';

  const skin = new THREE.MeshStandardMaterial({
    color: 0x8fb3d9,
    roughness: 0.35,
    metalness: 0.1,
  });
  const belly = new THREE.MeshStandardMaterial({
    color: 0xf2f6fb,
    roughness: 0.5,
  });

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 16), skin);
  body.scale.set(0.55, 0.6, 1.6);
  dolphin.add(body);

  const underside = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 20, 14),
    belly
  );
  underside.scale.set(0.5, 0.4, 1.45);
  underside.position.y = -0.06;
  dolphin.add(underside);

  const snout = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.34, 16), skin);
  snout.rotation.x = -Math.PI / 2;
  snout.position.set(0, -0.01, -0.55);
  dolphin.add(snout);

  const tailStalk = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 12), skin);
  tailStalk.rotation.x = Math.PI / 2;
  tailStalk.position.set(0, 0, 0.6);
  dolphin.add(tailStalk);

  const fluke = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.03, 0.16), skin);
  fluke.position.set(0, 0, 0.78);
  dolphin.add(fluke);

  const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 8), skin);
  dorsal.position.set(0, 0.18, 0.06);
  dolphin.add(dorsal);

  for (const side of [-1, 1]) {
    const flipper = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.025, 0.12),
      skin
    );
    flipper.position.set(side * 0.17, -0.05, -0.16);
    flipper.rotation.z = side * 0.3;
    dolphin.add(flipper);
  }

  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.022, 10, 8),
      new THREE.MeshStandardMaterial({color: 0x10161f})
    );
    eye.position.set(side * 0.085, 0.05, -0.36);
    dolphin.add(eye);
  }

  return dolphin;
}

/** Builds one wide course gate. */
function createGate(index) {
  const gate = new THREE.Mesh(
    new THREE.TorusGeometry(0.85, 0.075, 12, 40),
    new THREE.MeshStandardMaterial({
      color: 0x35d0c0,
      emissive: 0x0d3f3a,
      roughness: 0.4,
    })
  );
  gate.name = `DolphinGate${index + 1}`;
  gate.position.set(0, 1.35, GATE_START_Z - index * GATE_SPACING);
  return gate;
}

export class DolphinGlide extends xb.Script {
  // Course state.
  strokes = 0;
  gatesPassed = 0;
  speed = 0;
  courseActive = true;
  completed = false;
  // Stroke detection state.
  reachBaseline = null;
  reachPeak = null;
  strokePhase = 'idle';
  headPitch = 0;

  init() {
    this.add(new THREE.HemisphereLight(0xa8e5ff, 0x03263c, 2.5));
    const sun = new THREE.DirectionalLight(0xdff4ff, 1.2);
    sun.position.set(1.5, 4, 1);
    this.add(sun);

    this.buildEnvironment();
    this.buildCourse();
    this.buildDolphin();
    this.buildUI();

    // Desktop convenience: the J key stands in for one completed stroke.
    this.onKeyDown = (event) => {
      if (event.code === 'KeyJ') {
        this.registerStroke();
      }
    };
    window.addEventListener('keydown', this.onKeyDown);

    // Small scripted hook so the experience can be driven without hands.
    window.dolphinGlide = {
      stroke: () => this.registerStroke(),
      replay: () => this.restartCourse(),
      end: () => this.endCourse(),
      state: () => ({
        strokes: this.strokes,
        gatesPassed: this.gatesPassed,
        speed: this.speed,
        courseActive: this.courseActive,
        completed: this.completed,
        pitch: this.headPitch,
      }),
    };
  }

  buildEnvironment() {
    const water = new THREE.Mesh(
      new THREE.BoxGeometry(14, 8, 26),
      new THREE.MeshStandardMaterial({
        color: 0x0a4c78,
        transparent: true,
        opacity: 0.22,
        side: THREE.BackSide,
      })
    );
    water.position.set(0, 1.4, -8);
    water.userData.xrblocksPrivate = true;
    this.add(water);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 26),
      new THREE.MeshStandardMaterial({color: 0x0d6c8a, roughness: 0.9})
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -0.05, -8);
    floor.userData.xrblocksPrivate = true;
    this.add(floor);

    // Drifting bubbles give the course a sense of motion.
    this.bubbles = new THREE.Group();
    this.bubbles.userData.xrblocksPrivate = true;
    const bubbleMaterial = new THREE.MeshStandardMaterial({
      color: 0xdff6ff,
      transparent: true,
      opacity: 0.45,
    });
    const bubbleGeometry = new THREE.SphereGeometry(0.035, 8, 6);
    for (let i = 0; i < 36; i++) {
      const bubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
      bubble.position.set(
        (Math.random() - 0.5) * 6,
        Math.random() * 3,
        -1 - Math.random() * 14
      );
      this.bubbles.add(bubble);
    }
    this.add(this.bubbles);
  }

  buildCourse() {
    this.gatesGroup = new THREE.Group();
    this.gatesGroup.name = 'DolphinCourseGates';
    this.add(this.gatesGroup);

    this.gates = [];
    for (let i = 0; i < GATE_COUNT; i++) {
      const gate = createGate(i);
      tag(gate, 'dolphin-gate');
      gate.userData.passed = false;
      this.gatesGroup.add(gate);
      this.gates.push(gate);
    }
  }

  buildDolphin() {
    this.dolphin = createDolphin();
    tag(this.dolphin, 'dolphin-guide');
    this.dolphin.position.copy(DOLPHIN_START);
    this.add(this.dolphin);

    // Visible marker that points up or down with the current head pitch.
    this.directionMarker = new THREE.Mesh(
      new THREE.ConeGeometry(0.09, 0.26, 12),
      new THREE.MeshStandardMaterial({color: 0xffd24a, emissive: 0x4a3a00})
    );
    this.directionMarker.name = 'DolphinDirectionMarker';
    this.directionMarker.position.set(0, 0.42, 0.1);
    this.directionMarker.userData.direction = 'up';
    this.dolphin.add(this.directionMarker);
  }

  buildUI() {
    this.strokeText = new xb.UIText({
      text: '0 strokes',
      style: {
        width: '55%',
        fontSize: 32,
        color: '#e8f7ff',
        verticalAlign: 'middle',
        textAlign: 'left',
      },
    });
    tag(this.strokeText, 'stroke-count');

    this.endButton = new xb.UIButton({
      label: 'End',
      ariaLabel: 'End dolphin course',
      style: {width: '40%', height: '80%'},
      onClick: () => this.endCourse(),
    });
    tag(this.endButton, 'end-dolphin-course');

    this.hudCard = new xb.UICard({
      size: {width: 0.7, height: 0.2},
      style: {
        flexDirection: 'row',
        gap: 16,
        padding: 18,
        alignItems: 'center',
        backgroundColor: '#0b2233',
        borderRadius: 20,
      },
      children: [this.strokeText, this.endButton],
    });
    this.instructionText = new xb.UIText({
      text:
        'Reach both hands forward and pull them back together to stroke.\n' +
        'Look up or down to steer through all six gates. (Desktop: press J)',
      style: {
        width: '100%',
        fontSize: 20,
        color: '#bfe7ff',
        textAlign: 'center',
        whiteSpace: 'pre-line',
      },
    });
    this.instructionCard = new xb.UICard({
      size: {width: 0.8, height: 0.16},
      style: {padding: 14, backgroundColor: '#0b2233', borderRadius: 16},
      children: [this.instructionText],
    });
    this.instructionCard.position.set(0, 0.62, -1.15);
    this.add(this.instructionCard);

    this.hudCard.position.set(0, 0.95, -1.15);
    this.add(this.hudCard);
  }

  /** Builds the stopped-course summary with a replay control. */
  showResultCard(text) {
    this.hideResultCard();

    this.resultText = new xb.UIText({
      text,
      style: {
        width: '100%',
        flexGrow: 1,
        fontSize: 28,
        color: '#ffffff',
        textAlign: 'center',
        whiteSpace: 'pre-line',
      },
    });
    tag(this.resultText, 'dolphin-course-result');

    this.replayButton = new xb.UIButton({
      label: 'Replay',
      ariaLabel: 'Replay dolphin course',
      style: {width: '60%', height: 70},
      onClick: () => this.restartCourse(),
    });

    this.resultCard = new xb.UICard({
      size: {width: 0.8, height: 0.45},
      style: {
        flexDirection: 'column',
        gap: 18,
        padding: 24,
        alignItems: 'center',
        backgroundColor: '#07304a',
        borderRadius: 24,
      },
      children: [this.resultText, this.replayButton],
    });
    this.resultCard.position.set(0, 1.8, -1.3);
    this.add(this.resultCard);
  }

  hideResultCard() {
    if (!this.resultCard) return;
    this.remove(this.resultCard);
    this.resultCard = undefined;
    this.resultText = undefined;
    this.replayButton = undefined;
  }

  /** Formats and applies the observed paired-stroke count. */
  updateStrokeText() {
    this.strokeText.text = this.strokeLabel();
  }

  registerStroke() {
    if (!this.courseActive) return;
    this.strokes++;
    this.speed += STROKE_IMPULSE;
    this.updateStrokeText();
  }

  strokeLabel() {
    return this.strokes === 1 ? '1 stroke' : `${this.strokes} strokes`;
  }

  showResult(completed) {
    const heading = completed ? 'Course complete' : 'Course ended';
    this.showResultCard(
      `${heading}\nGates passed: ${this.gatesPassed} of ${GATE_COUNT}\n` +
        `Strokes: ${this.strokeLabel()}`
    );
  }

  endCourse() {
    if (!this.courseActive) return;
    this.courseActive = false;
    this.completed = this.gatesPassed >= GATE_COUNT;
    this.speed = 0;
    this.endButton.disabled = true;
    this.showResult(this.completed);
  }

  completeCourse() {
    this.courseActive = false;
    this.completed = true;
    this.speed = 0;
    this.endButton.disabled = true;
    this.showResult(true);
  }

  restartCourse() {
    this.strokes = 0;
    this.gatesPassed = 0;
    this.speed = 0;
    this.courseActive = true;
    this.completed = false;
    this.strokePhase = 'idle';
    this.reachBaseline = null;
    this.reachPeak = null;
    this.dolphin.position.copy(DOLPHIN_START);
    for (const gate of this.gates) {
      gate.userData.passed = false;
      gate.visible = true;
      gate.material.color.set(0x35d0c0);
      gate.material.emissive.set(0x0d3f3a);
    }
    this.endButton.disabled = false;
    this.updateStrokeText();
    this.hideResultCard();
  }

  /** Returns the world position of one hand, if it is tracked. */
  getHandPosition(handIndex, target) {
    const hands = xb.user?.hands;
    const wrist = hands?.getWrist?.(handIndex);
    if (wrist) {
      wrist.getWorldPosition(target);
      if (target.lengthSq() > 0) return target;
    }
    const controller = xb.core?.input?.controllers?.[handIndex];
    if (controller && controller.userData?.connected) {
      controller.getWorldPosition(target);
      if (target.lengthSq() > 0) return target;
    }
    return null;
  }

  /**
   * Observes paired hand motion. Both hands must reach forward together and
   * then pull back together for one completed stroke to be counted.
   */
  updateStrokeObservation(camera) {
    this.leftHandPosition ??= new THREE.Vector3();
    this.rightHandPosition ??= new THREE.Vector3();
    this.localHandPosition ??= new THREE.Vector3();

    const left = this.getHandPosition(0, this.leftHandPosition);
    const right = this.getHandPosition(1, this.rightHandPosition);
    if (!left || !right) {
      this.strokePhase = 'idle';
      this.reachBaseline = null;
      return;
    }

    // Forward reach of each hand, measured in camera-local meters.
    const reaches = [left, right].map((hand) => {
      this.localHandPosition.copy(hand);
      camera.worldToLocal(this.localHandPosition);
      return -this.localHandPosition.z;
    });

    if (this.reachBaseline === null) {
      this.reachBaseline = reaches.slice();
      this.reachPeak = reaches.slice();
      this.strokePhase = 'idle';
      return;
    }

    if (this.strokePhase === 'idle') {
      // The baseline follows a new resting reach immediately when the hands
      // come back and rises only slowly, so slow strokes still register.
      for (let i = 0; i < 2; i++) {
        this.reachBaseline[i] =
          reaches[i] < this.reachBaseline[i]
            ? reaches[i]
            : this.reachBaseline[i] +
              (reaches[i] - this.reachBaseline[i]) * 0.005;
      }
      const extended = reaches.every(
        (reach, i) => reach > this.reachBaseline[i] + REACH_EXTEND
      );
      if (extended) {
        this.strokePhase = 'extended';
        this.reachPeak = reaches.slice();
      }
    } else {
      for (let i = 0; i < 2; i++) {
        this.reachPeak[i] = Math.max(this.reachPeak[i], reaches[i]);
      }
      const pulledBack = reaches.every(
        (reach, i) => reach < this.reachPeak[i] - REACH_RETURN
      );
      if (pulledBack) {
        this.strokePhase = 'idle';
        this.reachBaseline = reaches.slice();
        this.registerStroke();
      }
    }
  }

  /**
   * Both hands pinching at the same time is also accepted as one completed
   * paired stroke, which keeps the course playable with pinch-only input.
   */
  updatePairedPinch() {
    const controllers = xb.core?.input?.controllers ?? [];
    const bothPinching =
      controllers[0]?.userData?.selected === true &&
      controllers[1]?.userData?.selected === true;
    if (bothPinching && !this.pairedPinchActive) {
      this.pairedPinchActive = true;
      this.registerStroke();
    } else if (!bothPinching) {
      this.pairedPinchActive = false;
    }
  }

  /** Reads head pitch and points the direction marker to match it. */
  updateHeading(camera, deltaTime) {
    this.cameraForward ??= new THREE.Vector3();
    camera.getWorldDirection(this.cameraForward);
    this.headPitch = Math.asin(
      THREE.MathUtils.clamp(this.cameraForward.y, -1, 1)
    );

    const pointingUp = this.headPitch >= 0;
    this.directionMarker.rotation.x = pointingUp ? 0 : Math.PI;
    this.directionMarker.userData.direction = pointingUp ? 'up' : 'down';

    const pitchRatio = THREE.MathUtils.clamp(this.headPitch / 0.6, -1, 1);
    this.dolphin.rotation.x = -pitchRatio * 0.35;
    if (this.courseActive) {
      const verticalSpeed = pitchRatio * 0.6;
      this.dolphin.position.y = THREE.MathUtils.clamp(
        this.dolphin.position.y + verticalSpeed * deltaTime,
        COURSE_MIN_Y,
        COURSE_MAX_Y
      );
    }
  }

  updateGates() {
    for (const gate of this.gates) {
      if (gate.userData.passed) continue;
      if (this.dolphin.position.z <= gate.position.z) {
        gate.userData.passed = true;
        gate.material.color.set(0xf6c445);
        gate.material.emissive.set(0x4a3400);
        this.gatesPassed++;
      }
    }
    if (this.gatesPassed >= GATE_COUNT && this.courseActive) {
      this.completeCourse();
    }
  }

  update() {
    const camera = xb.core?.camera;
    const deltaTime = Math.min(xb.core?.timer?.getDelta?.() ?? 1 / 60, 0.1);

    this.updatePairedPinch();
    if (camera) {
      this.updateStrokeObservation(camera);
      this.updateHeading(camera, deltaTime);
    }

    if (this.courseActive) {
      this.dolphin.position.z -= this.speed * deltaTime;
      this.speed = Math.max(
        0,
        this.speed - this.speed * SPEED_DECAY_PER_SECOND * deltaTime
      );
      this.updateGates();
    }

    for (const bubble of this.bubbles.children) {
      bubble.position.y += 0.25 * deltaTime;
      if (bubble.position.y > 3.2) bubble.position.y = 0;
    }
  }

  dispose() {
    window.removeEventListener('keydown', this.onKeyDown);
    delete window.dolphinGlide;
  }
}

const options = new xb.Options();
options.enableHands();
options.enableReticles();
options.hands.visualization = true;
options.hands.visualizeJoints = true;
options.hands.visualizeMeshes = true;
options.simulator.defaultMode = xb.SimulatorMode.POSE;
options.xrButton.showEnterSimulatorButton = true;

document.addEventListener('DOMContentLoaded', async () => {
  xb.add(new DolphinGlide());
  await xb.init(options);
});
