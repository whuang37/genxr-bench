import * as THREE from 'three';
import * as xb from 'xrblocks';

const SPEED_PER_STEP = 2.4;
const MAX_SPEED = 7.2;

export class DolphinGlideApp extends xb.Script {
  static dependencies = {
    camera: THREE.Camera,
  };

  camera;

  // Course State
  strokeCount = 0;
  passedGatesCount = 0;
  speedStep = 0;
  dolphinSpeed = 0;
  isPlaying = true;

  // Stroke Detection State
  strokeState = 'RESTING'; // 'RESTING' | 'REACHING'
  baselineZ = -0.3;
  minReachZ = -0.3;
  lastStrokeTime = 0;

  // References
  dolphinGroup;
  tailGroup;
  gates = [];
  directionMarker;
  directionArrow;
  directionArrowMaterial;

  // UI References
  hudCard;
  strokeText;
  gatesText;
  hudDirectionText;
  endButton;

  resultCard;
  resultTitle;
  resultGatesText;
  resultStrokesText;

  // Time tracking
  lastTime;

  init({camera} = {}) {
    this.camera = camera || xb.core.camera;

    this.setupEnvironment();
    this.buildDolphin();
    this.buildDirectionMarker();
    this.buildGates();
    this.buildUI();
    this.setupKeyboardFallback();
  }

  setupEnvironment() {
    // Deep ocean atmosphere
    const scene = xb.core.scene;
    scene.background = new THREE.Color(0x06283d);
    scene.fog = new THREE.FogExp2(0x06283d, 0.03);

    const hemiLight = new THREE.HemisphereLight(0x7dd3fc, 0x073b4c, 2.0);
    this.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xe0f2fe, 1.8);
    sunLight.position.set(3, 10, 2);
    this.add(sunLight);

    // Seabed floor
    const floorGeo = new THREE.PlaneGeometry(80, 80, 16, 16);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0a334a,
      roughness: 0.9,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.6;
    this.add(floor);

    // Floating particles / bubbles
    const bubbleGeo = new THREE.SphereGeometry(0.025, 8, 8);
    const bubbleMat = new THREE.MeshBasicMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.5,
    });
    this.bubbles = [];
    for (let i = 0; i < 40; i++) {
      const bubble = new THREE.Mesh(bubbleGeo, bubbleMat);
      bubble.position.set(
        (Math.random() - 0.5) * 8,
        Math.random() * 3 - 0.5,
        -Math.random() * 22
      );
      this.bubbles.push(bubble);
      this.add(bubble);
    }
  }

  buildDolphin() {
    this.dolphinGroup = new THREE.Group();
    this.dolphinGroup.position.set(0, 1.4, -2.2);

    // Semantic tag: dolphin-guide
    this.dolphinGroup.userData.xrblocksDevtools = {tag: 'dolphin-guide'};

    const skinMat = new THREE.MeshStandardMaterial({
      color: 0x2563eb,
      roughness: 0.35,
      metalness: 0.1,
    });

    const bellyMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.45,
    });

    // Main Torso (smooth elongated ellipsoid)
    const bodyGeo = new THREE.SphereGeometry(0.3, 24, 24);
    const bodyMesh = new THREE.Mesh(bodyGeo, skinMat);
    bodyMesh.scale.set(0.72, 0.78, 1.6);
    this.dolphinGroup.add(bodyMesh);

    // Pale Belly Patch
    const bellyGeo = new THREE.SphereGeometry(0.28, 20, 20);
    const bellyMesh = new THREE.Mesh(bellyGeo, bellyMat);
    bellyMesh.scale.set(0.65, 0.45, 1.5);
    bellyMesh.position.set(0, -0.07, 0.02);
    this.dolphinGroup.add(bellyMesh);

    // Snout / Beak (facing -Z)
    const snoutGeo = new THREE.ConeGeometry(0.08, 0.28, 16);
    const snoutMesh = new THREE.Mesh(snoutGeo, skinMat);
    snoutMesh.rotation.x = -Math.PI / 2;
    snoutMesh.position.set(0, -0.04, -0.58);
    this.dolphinGroup.add(snoutMesh);

    // Forehead Melon
    const melonGeo = new THREE.SphereGeometry(0.15, 16, 16);
    const melonMesh = new THREE.Mesh(melonGeo, skinMat);
    melonMesh.position.set(0, 0.08, -0.32);
    this.dolphinGroup.add(melonMesh);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.025, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({color: 0x0f172a});
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.16, 0.04, -0.3);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.16, 0.04, -0.3);
    this.dolphinGroup.add(leftEye, rightEye);

    // Dorsal Fin (curved back on top)
    const dorsalGeo = new THREE.ConeGeometry(0.12, 0.26, 4);
    const dorsalMesh = new THREE.Mesh(dorsalGeo, skinMat);
    dorsalMesh.scale.set(0.2, 1.0, 1.2);
    dorsalMesh.rotation.x = 0.5;
    dorsalMesh.position.set(0, 0.28, 0.05);
    this.dolphinGroup.add(dorsalMesh);

    // Pectoral Flippers (left & right)
    const flipperGeo = new THREE.ConeGeometry(0.08, 0.3, 4);
    const leftFlipper = new THREE.Mesh(flipperGeo, skinMat);
    leftFlipper.scale.set(0.2, 1.0, 1.4);
    leftFlipper.rotation.set(0.5, 0, -1.0);
    leftFlipper.position.set(-0.25, -0.1, -0.15);

    const rightFlipper = new THREE.Mesh(flipperGeo, skinMat);
    rightFlipper.scale.set(0.2, 1.0, 1.4);
    rightFlipper.rotation.set(0.5, 0, 1.0);
    rightFlipper.position.set(0.25, -0.1, -0.15);
    this.dolphinGroup.add(leftFlipper, rightFlipper);

    // Tail Group (for swimming wave animation)
    this.tailGroup = new THREE.Group();
    this.tailGroup.position.set(0, 0, 0.45);

    const peduncleGeo = new THREE.ConeGeometry(0.14, 0.45, 16);
    const peduncleMesh = new THREE.Mesh(peduncleGeo, skinMat);
    peduncleMesh.rotation.x = Math.PI / 2;
    peduncleMesh.position.set(0, 0, 0.22);
    this.tailGroup.add(peduncleMesh);

    // Horizontal Flukes
    const flukeGeo = new THREE.BoxGeometry(0.6, 0.025, 0.18);
    const flukeMesh = new THREE.Mesh(flukeGeo, skinMat);
    flukeMesh.position.set(0, 0, 0.44);
    this.tailGroup.add(flukeMesh);

    this.dolphinGroup.add(this.tailGroup);
    this.add(this.dolphinGroup);
  }

  buildDirectionMarker() {
    this.directionMarker = new THREE.Group();
    this.directionMarker.position.set(0, 1.85, -2.2);

    this.directionArrow = new THREE.Group();

    this.directionArrowMaterial = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      roughness: 0.2,
    });

    // Arrow Stem along +Y
    const stemGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.28, 16);
    const stemMesh = new THREE.Mesh(stemGeo, this.directionArrowMaterial);
    stemMesh.position.y = 0.14;

    // Arrow Head pointing +Y
    const headGeo = new THREE.ConeGeometry(0.065, 0.14, 16);
    const headMesh = new THREE.Mesh(headGeo, this.directionArrowMaterial);
    headMesh.position.y = 0.28 + 0.07;

    this.directionArrow.add(stemMesh, headMesh);
    this.directionMarker.add(this.directionArrow);
    this.add(this.directionMarker);
  }

  buildGates() {
    const gatePositions = [
      new THREE.Vector3(0, 1.4, -4.5),
      new THREE.Vector3(0, 1.75, -7.5),
      new THREE.Vector3(0, 1.25, -10.5),
      new THREE.Vector3(0, 1.85, -13.5),
      new THREE.Vector3(0, 1.3, -16.5),
      new THREE.Vector3(0, 1.5, -19.5),
    ];

    this.gates = [];

    gatePositions.forEach((pos, index) => {
      const gateGroup = new THREE.Group();
      gateGroup.position.copy(pos);

      // Semantic tag: dolphin-gate
      gateGroup.userData.xrblocksDevtools = {tag: 'dolphin-gate'};

      // Outer Torus Ring
      const ringGeo = new THREE.TorusGeometry(1.6, 0.1, 16, 48);
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        roughness: 0.3,
        metalness: 0.2,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      gateGroup.add(ringMesh);

      // Inner Accent Ring
      const innerGeo = new THREE.TorusGeometry(1.6, 0.03, 8, 32);
      const innerMat = new THREE.MeshBasicMaterial({color: 0x7dd3fc});
      const innerMesh = new THREE.Mesh(innerGeo, innerMat);
      gateGroup.add(innerMesh);

      // Anchor Pillars
      const pillarGeo = new THREE.CylinderGeometry(0.06, 0.08, pos.y + 0.6, 8);
      const pillarMat = new THREE.MeshStandardMaterial({
        color: 0x0369a1,
        roughness: 0.5,
      });

      const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
      leftPillar.position.set(-1.6, -(pos.y + 0.6) / 2, 0);

      const rightPillar = new THREE.Mesh(pillarGeo, pillarMat);
      rightPillar.position.set(1.6, -(pos.y + 0.6) / 2, 0);

      gateGroup.add(leftPillar, rightPillar);

      gateGroup.passed = false;
      gateGroup.ringMesh = ringMesh;
      gateGroup.innerMesh = innerMesh;
      gateGroup.gateIndex = index;

      this.gates.push(gateGroup);
      this.add(gateGroup);
    });
  }

  buildUI() {
    // 1. HUD Card
    this.strokeText = new xb.UIText({
      text: '0 strokes',
      style: {fontSize: 22, fontWeight: 'bold', color: '#ffffff'},
    });
    // Semantic tag: stroke-count
    this.strokeText.userData.xrblocksDevtools = {tag: 'stroke-count'};

    this.gatesText = new xb.UIText({
      text: 'Gates: 0 / 6',
      style: {fontSize: 18, color: '#93c5fd'},
    });

    this.hudDirectionText = new xb.UIText({
      text: 'Pitch: Level',
      style: {fontSize: 16, color: '#38bdf8'},
    });

    this.endButton = new xb.UIButton({
      label: 'End Course',
      style: {minWidth: 110, padding: 8},
      onClick: () => this.endCourse(),
    });
    // Semantic tag: end-dolphin-course
    this.endButton.userData.xrblocksDevtools = {tag: 'end-dolphin-course'};

    this.hudCard = new xb.UICard({
      size: {width: 0.88, height: 0.26},
      style: {
        flexDirection: 'column',
        padding: 12,
        gap: 8,
        backgroundColor: 'rgba(7, 30, 52, 0.85)',
        borderRadius: 16,
      },
      children: [
        new xb.UIPanel({
          style: {
            width: '100%',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          },
          children: [
            new xb.UIText({
              text: 'Dolphin Glide',
              style: {fontSize: 20, fontWeight: 'bold', color: '#e0f2fe'},
            }),
            this.hudDirectionText,
          ],
        }),
        new xb.UIPanel({
          style: {
            width: '100%',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          },
          children: [this.strokeText, this.gatesText, this.endButton],
        }),
      ],
    });
    this.hudCard.position.set(0, 2.15, -1.8);
    this.add(this.hudCard);

    // 2. Course Result Card
    this.resultTitle = new xb.UIText({
      text: 'Course Complete!',
      style: {fontSize: 26, fontWeight: 'bold', color: '#38bdf8', textAlign: 'center'},
    });

    this.resultGatesText = new xb.UIText({
      text: 'Gates: 6 / 6',
      style: {fontSize: 20, color: '#ffffff', textAlign: 'center'},
    });

    this.resultStrokesText = new xb.UIText({
      text: '0 strokes',
      style: {fontSize: 20, color: '#ffffff', textAlign: 'center'},
    });

    const replayButton = new xb.UIButton({
      label: 'Replay Course',
      style: {minWidth: 140, padding: 10},
      onClick: () => this.replayCourse(),
    });

    this.resultCard = new xb.UICard({
      size: {width: 0.72, height: 0.38},
      style: {
        flexDirection: 'column',
        padding: 20,
        gap: 12,
        alignItems: 'center',
        backgroundColor: 'rgba(6, 24, 44, 0.95)',
        borderRadius: 20,
      },
      children: [
        this.resultTitle,
        this.resultGatesText,
        this.resultStrokesText,
        replayButton,
      ],
    });
    this.resultCard.position.set(0, 1.55, -1.5);
    this.resultCard.visible = false;

    // Semantic tag: dolphin-course-result
    this.resultCard.userData.xrblocksDevtools = {tag: 'dolphin-course-result'};
    this.add(this.resultCard);
  }

  setupKeyboardFallback() {
    this.onKeyDown = (e) => {
      if (e.code === 'Space' || e.key === ' ') {
        this.onStroke();
      }
    };
    window.addEventListener('keydown', this.onKeyDown);
  }

  getHandPositions() {
    const camera = this.camera || xb.core.camera;
    let leftWorldPos = null;
    let rightWorldPos = null;

    // 1. Try xb.user.hands
    const hands = xb.user?.hands;
    if (hands) {
      const leftJoint = hands.getIndexTip(0) || hands.getWrist(0);
      const rightJoint = hands.getIndexTip(1) || hands.getWrist(1);
      if (leftJoint) leftWorldPos = leftJoint.getWorldPosition(new THREE.Vector3());
      if (rightJoint) rightWorldPos = rightJoint.getWorldPosition(new THREE.Vector3());
    }

    // 2. Try input controllers
    const controllers = xb.core.input?.controllers;
    if (!leftWorldPos && controllers && controllers.length > 0) {
      const leftC = xb.core.input.leftController || controllers[0];
      if (leftC) leftWorldPos = leftC.getWorldPosition(new THREE.Vector3());
    }
    if (!rightWorldPos && controllers && controllers.length > 1) {
      const rightC = xb.core.input.rightController || controllers[1];
      if (rightC) rightWorldPos = rightC.getWorldPosition(new THREE.Vector3());
    }

    // 3. Fallback to simulatorControllerState
    const sim = xb.core.simulator?.simulatorControllerState;
    if (sim && sim.localControllerPositions) {
      if (!leftWorldPos && sim.localControllerPositions[0]) {
        leftWorldPos = sim.localControllerPositions[0]
          .clone()
          .applyMatrix4(camera.matrixWorld);
      }
      if (!rightWorldPos && sim.localControllerPositions[1]) {
        rightWorldPos = sim.localControllerPositions[1]
          .clone()
          .applyMatrix4(camera.matrixWorld);
      }
    }

    if (!leftWorldPos || !rightWorldPos) return null;

    return {
      left: camera.worldToLocal(leftWorldPos.clone()),
      right: camera.worldToLocal(rightWorldPos.clone()),
    };
  }

  onStroke() {
    if (!this.isPlaying) return;

    this.strokeCount++;
    this.speedStep++;
    this.dolphinSpeed = Math.min(this.speedStep * SPEED_PER_STEP, MAX_SPEED);

    // Format count: singular '1 stroke', plural 'N strokes'
    this.strokeText.text =
      this.strokeCount === 1 ? '1 stroke' : `${this.strokeCount} strokes`;
  }

  finishCourse() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this.dolphinSpeed = 0; // Motion stopped

    this.resultTitle.text = 'Course Complete!';
    this.resultGatesText.text = `Gates: ${this.passedGatesCount} / 6`;
    this.resultStrokesText.text =
      this.strokeCount === 1 ? '1 stroke' : `${this.strokeCount} strokes`;
    this.resultCard.visible = true;
  }

  endCourse() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this.dolphinSpeed = 0; // Motion stopped

    this.resultTitle.text = 'Course Ended';
    this.resultGatesText.text = `Gates: ${this.passedGatesCount} / 6`;
    this.resultStrokesText.text =
      this.strokeCount === 1 ? '1 stroke' : `${this.strokeCount} strokes`;
    this.resultCard.visible = true;
  }

  replayCourse() {
    this.resultCard.visible = false;
    this.strokeCount = 0;
    this.strokeText.text = '0 strokes';
    this.speedStep = 0;
    this.dolphinSpeed = 0; // Motion stopped
    this.passedGatesCount = 0;
    this.gatesText.text = 'Gates: 0 / 6';

    this.dolphinGroup.position.set(0, 1.4, -2.2);
    this.dolphinGroup.rotation.set(0, 0, 0);

    for (const gate of this.gates) {
      gate.passed = false;
      gate.ringMesh.material.color.set(0x38bdf8);
      gate.ringMesh.material.emissive.set(0x0284c7);
      gate.innerMesh.material.color.set(0x7dd3fc);
    }

    this.isPlaying = true;
  }

  update(time = 0) {
    let delta = 0.016;
    if (this.lastTime !== undefined) {
      delta = (time - this.lastTime) / 1000;
      if (delta <= 0 || delta > 0.1) delta = 0.016;
    }
    this.lastTime = time;

    const camera = this.camera || xb.core.camera;

    // 1. Hand paired-stroke detection
    const hands = this.getHandPositions();
    if (hands) {
      const avgZ = (hands.left.z + hands.right.z) / 2;

      if (this.strokeState === 'RESTING') {
        if (avgZ > this.baselineZ) {
          this.baselineZ = THREE.MathUtils.lerp(this.baselineZ, avgZ, 0.05);
        }
        const leftForward = hands.left.z - this.baselineZ;
        const rightForward = hands.right.z - this.baselineZ;

        // Both hands reached forward
        if (leftForward < -0.05 && rightForward < -0.05 && (avgZ - this.baselineZ) < -0.05) {
          this.strokeState = 'REACHING';
          this.minReachZ = avgZ;
        }
      } else if (this.strokeState === 'REACHING') {
        this.minReachZ = Math.min(this.minReachZ, avgZ);

        const pullBack = avgZ - this.minReachZ;
        const leftPull = hands.left.z - this.minReachZ;
        const rightPull = hands.right.z - this.minReachZ;

        // Both hands pulled back together
        if (pullBack >= 0.05 && leftPull >= 0.04 && rightPull >= 0.04) {
          const now = performance.now();
          if (now - this.lastStrokeTime > 200) {
            this.lastStrokeTime = now;
            this.onStroke();
          }
          this.strokeState = 'RESTING';
          this.baselineZ = avgZ;
        }
      }
    }

    // 2. Head pitch detection & direction marker
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const pitch = Math.asin(Math.min(Math.max(dir.y, -1), 1));

    // Update direction marker position (floating above dolphin)
    this.directionMarker.position.set(
      this.dolphinGroup.position.x,
      this.dolphinGroup.position.y + 0.45,
      this.dolphinGroup.position.z
    );

    if (pitch > 0.04) {
      // Point UP
      this.directionArrow.rotation.z = 0; // points UP along +Y
      this.directionArrowMaterial.color.set(0x38bdf8);
      this.hudDirectionText.text = 'Pitch: UP';
      this.hudDirectionText.style.color = '#38bdf8';
    } else if (pitch < -0.04) {
      // Point DOWN
      this.directionArrow.rotation.z = Math.PI; // points DOWN along -Y
      this.directionArrowMaterial.color.set(0x38bdf8);
      this.hudDirectionText.text = 'Pitch: DOWN';
      this.hudDirectionText.style.color = '#38bdf8';
    } else {
      // Level
      this.directionArrow.rotation.z = Math.PI / 2; // horizontal
      this.directionArrowMaterial.color.set(0x94a3b8);
      this.hudDirectionText.text = 'Pitch: Level';
      this.hudDirectionText.style.color = '#94a3b8';
    }

    // 3. Dolphin movement & pitch guidance
    if (this.isPlaying) {
      if (this.dolphinSpeed > 0) {
        // Forward motion along -Z
        this.dolphinGroup.position.z -= this.dolphinSpeed * delta;

        // Vertical motion guided by head pitch
        if (pitch > 0.04) {
          this.dolphinGroup.position.y = Math.min(
            2.3,
            this.dolphinGroup.position.y + 0.9 * delta
          );
        } else if (pitch < -0.04) {
          this.dolphinGroup.position.y = Math.max(
            0.6,
            this.dolphinGroup.position.y - 0.9 * delta
          );
        }

        // Tail wave animation
        const swimTime = time / 1000;
        this.tailGroup.rotation.y = Math.sin(swimTime * 8) * 0.25;
        this.tailGroup.rotation.x = Math.cos(swimTime * 8) * 0.12;

        // Check Gates
        for (let i = 0; i < this.gates.length; i++) {
          const gate = this.gates[i];
          if (!gate.passed && this.dolphinGroup.position.z <= gate.position.z) {
            gate.passed = true;
            gate.ringMesh.material.color.set(0xfacc15); // gold
            gate.ringMesh.material.emissive.set(0xeab308);
            gate.innerMesh.material.color.set(0xfef08a);
            this.passedGatesCount++;
            this.gatesText.text = `Gates: ${this.passedGatesCount} / 6`;
          }
        }

        if (this.passedGatesCount >= 6) {
          this.finishCourse();
        }
      }

      // Smooth dolphin pitch rotation to match head pitch
      const targetRotX = pitch > 0.04 ? 0.35 : pitch < -0.04 ? -0.35 : 0;
      this.dolphinGroup.rotation.x = THREE.MathUtils.lerp(
        this.dolphinGroup.rotation.x,
        targetRotX,
        delta * 6
      );
    }

    // 4. Animate floating bubbles
    if (this.bubbles) {
      for (const bubble of this.bubbles) {
        bubble.position.y += delta * 0.2;
        if (bubble.position.y > 3.0) {
          bubble.position.y = -0.5;
        }
      }
    }
  }

  dispose() {
    if (this.onKeyDown) {
      window.removeEventListener('keydown', this.onKeyDown);
    }
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const options = new xb.Options();
  options.enableHands();
  options.enableGestures();
  options.enableReticles();
  options.hands.visualization = true;
  options.hands.visualizeJoints = false;
  options.hands.visualizeMeshes = true;
  options.simulator.defaultMode = xb.SimulatorMode.POSE;
  options.xrButton.showEnterSimulatorButton = true;

  xb.add(new DolphinGlideApp());
  await xb.init(options);
});
