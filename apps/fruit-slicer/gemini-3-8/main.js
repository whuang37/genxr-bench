import * as THREE from "three";
import * as xb from "xrblocks";

// Distance from player center (safe arm reach in XR is <= 0.75m)
const ARC_RADIUS = 0.55;
const FLIGHT_DURATION = 3.5; // seconds
const MIN_SLICE_SPEED = 0.6; // meters / second
const NEXT_TARGET_DELAY = 0.25; // seconds

// Seeded deterministic round of 12 targets: exactly 3 bombs, 9 fruits
// Targets pop into reachable arcs from varied positions all around the user.
const SEEDED_TARGETS = [
  { type: "fruit", fruitType: "watermelon", angle: 0.6 },
  { type: "fruit", fruitType: "orange", angle: -0.65 },
  { type: "bomb", fruitType: null, angle: 1.3 },
  { type: "fruit", fruitType: "apple", angle: -1.4 },
  { type: "fruit", fruitType: "watermelon", angle: 2.4 },
  { type: "bomb", fruitType: null, angle: -2.5 },
  { type: "fruit", fruitType: "orange", angle: 0.8 },
  { type: "fruit", fruitType: "apple", angle: -0.8 },
  { type: "bomb", fruitType: null, angle: 3.14 },
  { type: "fruit", fruitType: "watermelon", angle: 1.6 },
  { type: "fruit", fruitType: "orange", angle: -1.6 },
  { type: "fruit", fruitType: "apple", angle: 0.5 },
];

function distanceToSegment(point, a, b) {
  const ab = new THREE.Vector3().subVectors(b, a);
  const ap = new THREE.Vector3().subVectors(point, a);
  const lenSq = ab.lengthSq();
  if (lenSq === 0) return ap.length();
  const t = Math.max(0, Math.min(1, ap.dot(ab) / lenSq));
  const projection = new THREE.Vector3().copy(a).addScaledVector(ab, t);
  return projection.distanceTo(point);
}

// Visual Fruit Meshes
function createFruitVisuals(fruitType) {
  const group = new THREE.Group();
  let radius = 0.09;
  let outerColor = 0x2e7d32;
  let innerColor = 0xe53935;
  let ringColor = 0xc8e6c9;

  if (fruitType === "orange") {
    radius = 0.085;
    outerColor = 0xff9800;
    innerColor = 0xffb74d;
    ringColor = 0xfff3e0;
  } else if (fruitType === "apple") {
    radius = 0.08;
    outerColor = 0xd32f2f;
    innerColor = 0xfff9c4;
    ringColor = 0xffffff;
  }

  // Two pre-built halves that form the whole fruit
  const halfA = createHalfMesh(radius, outerColor, innerColor, ringColor);
  const halfB = createHalfMesh(radius, outerColor, innerColor, ringColor);
  halfB.rotation.y = Math.PI;

  group.add(halfA);
  group.add(halfB);

  return { group, halfA, halfB, radius, innerColor, outerColor };
}

function createHalfMesh(radius, outerColor, innerColor, ringColor) {
  const halfGroup = new THREE.Group();

  // Outer hemisphere
  const hemiGeom = new THREE.SphereGeometry(
    radius,
    20,
    20,
    0,
    Math.PI,
    0,
    Math.PI
  );
  const outerMat = new THREE.MeshStandardMaterial({
    color: outerColor,
    roughness: 0.4,
    metalness: 0.1,
  });
  const hemiMesh = new THREE.Mesh(hemiGeom, outerMat);
  hemiMesh.castShadow = true;
  halfGroup.add(hemiMesh);

  // Inner flat cut face
  const innerGeom = new THREE.CircleGeometry(radius * 0.96, 20);
  const innerMat = new THREE.MeshStandardMaterial({
    color: innerColor,
    roughness: 0.5,
  });
  const innerMesh = new THREE.Mesh(innerGeom, innerMat);
  innerMesh.rotation.y = Math.PI / 2;
  halfGroup.add(innerMesh);

  // Rim ring
  const ringGeom = new THREE.RingGeometry(radius * 0.94, radius * 0.99, 20);
  const ringMat = new THREE.MeshBasicMaterial({
    color: ringColor,
    side: THREE.DoubleSide,
  });
  const ringMesh = new THREE.Mesh(ringGeom, ringMat);
  ringMesh.rotation.y = Math.PI / 2;
  ringMesh.position.x = 0.001;
  halfGroup.add(ringMesh);

  return halfGroup;
}

function createBombVisuals() {
  const group = new THREE.Group();
  const radius = 0.085;

  // Body: dark metallic sphere
  const bodyGeom = new THREE.SphereGeometry(radius, 24, 24);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x1e1e24,
    roughness: 0.35,
    metalness: 0.8,
  });
  const bodyMesh = new THREE.Mesh(bodyGeom, bodyMat);
  bodyMesh.castShadow = true;
  group.add(bodyMesh);

  // Cap: metallic gold/brass
  const capGeom = new THREE.CylinderGeometry(0.02, 0.025, 0.025, 16);
  const capMat = new THREE.MeshStandardMaterial({
    color: 0xffb300,
    metalness: 0.9,
    roughness: 0.2,
  });
  const capMesh = new THREE.Mesh(capGeom, capMat);
  capMesh.position.y = radius + 0.01;
  group.add(capMesh);

  // Fuse: curved cylinder
  const fuseGeom = new THREE.CylinderGeometry(0.006, 0.006, 0.035, 8);
  const fuseMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63 });
  const fuseMesh = new THREE.Mesh(fuseGeom, fuseMat);
  fuseMesh.position.set(0.008, radius + 0.03, 0);
  fuseMesh.rotation.z = -0.3;
  group.add(fuseMesh);

  // Spark at fuse tip
  const sparkGeom = new THREE.SphereGeometry(0.012, 8, 8);
  const sparkMat = new THREE.MeshBasicMaterial({
    color: 0xffeb3b,
  });
  const sparkMesh = new THREE.Mesh(sparkGeom, sparkMat);
  sparkMesh.position.set(0.018, radius + 0.045, 0);
  group.add(sparkMesh);

  return { group, sparkMesh, radius };
}

// Active Fruit Target Script
class FruitTarget extends xb.Script {
  constructor(app, targetDef) {
    super();
    this.app = app;
    this.targetDef = targetDef;
    this.flightTime = 0;
    this.resolved = false;

    const visuals = createFruitVisuals(targetDef.fruitType);
    this.visualGroup = visuals.group;
    this.halfA = visuals.halfA;
    this.halfB = visuals.halfB;
    this.fruitRadius = visuals.radius;
    this.hitRadius = visuals.radius + 0.10;
    this.innerColor = visuals.innerColor;
    this.outerColor = visuals.outerColor;

    this.add(this.visualGroup);
    // Attach DevTools tag to active fruit target
    this.userData.xrblocksDevtools = { tag: "fruit" };
  }

  onObjectTouchStart(event) {
    if (this.resolved) return;
    this.app.onDirectTouch(this, event);
  }

  onObjectTouching(event) {
    if (this.resolved) return;
    this.app.onDirectTouch(this, event);
  }

  updateArc(delta) {
    if (this.resolved) return;
    this.flightTime += delta;
    const progress = this.flightTime / FLIGHT_DURATION;

    if (progress >= 1.0) {
      this.resolved = true;
      this.app.onTargetMissed(this);
      return;
    }

    // Reachable arc trajectory
    const yStart = 0.85;
    const yApex = 1.38;
    const currentY = yStart + (yApex - yStart) * 4 * progress * (1 - progress);
    const currentAngle =
      this.targetDef.angle + (progress - 0.5) * 0.25;

    this.position.set(
      ARC_RADIUS * Math.sin(currentAngle),
      currentY,
      -ARC_RADIUS * Math.cos(currentAngle)
    );

    // Gentle tumbling rotation
    this.visualGroup.rotation.x += delta * 1.6;
    this.visualGroup.rotation.y += delta * 2.2;
  }
}

// Active Bomb Target Script
class BombTarget extends xb.Script {
  constructor(app, targetDef) {
    super();
    this.app = app;
    this.targetDef = targetDef;
    this.flightTime = 0;
    this.resolved = false;

    const visuals = createBombVisuals();
    this.visualGroup = visuals.group;
    this.sparkMesh = visuals.sparkMesh;
    this.bombRadius = visuals.radius;
    this.hitRadius = visuals.radius + 0.10;

    this.add(this.visualGroup);
    // Attach DevTools tag to active bomb target
    this.userData.xrblocksDevtools = { tag: "bomb" };
  }

  onObjectTouchStart(event) {
    if (this.resolved) return;
    this.app.onDirectTouch(this, event);
  }

  onObjectTouching(event) {
    if (this.resolved) return;
    this.app.onDirectTouch(this, event);
  }

  updateArc(delta) { window.__debugBombTicks = (window.__debugBombTicks || 0) + 1; window.__lastBombDelta = delta; window.__lastBombFlight = this.flightTime;
    if (this.resolved) return;
    this.flightTime += delta;
    const progress = this.flightTime / FLIGHT_DURATION;

    if (progress >= 1.0) {
      this.resolved = true;
      window.__avoidedAt = { delta, flightTime: this.flightTime, ticks: window.__debugBombTicks }; this.app.onBombAvoided(this);
      return;
    }

    // Reachable arc trajectory
    const yStart = 0.85;
    const yApex = 1.38;
    const currentY = yStart + (yApex - yStart) * 4 * progress * (1 - progress);
    const currentAngle =
      this.targetDef.angle + (progress - 0.5) * 0.25;

    this.position.set(
      ARC_RADIUS * Math.sin(currentAngle),
      currentY,
      -ARC_RADIUS * Math.cos(currentAngle)
    );

    // Spark flicker
    this.sparkMesh.scale.setScalar(
      0.8 + Math.sin(this.flightTime * 25) * 0.4
    );
  }
}

// Particle/Debris Manager
class SplitEffect extends xb.Script {
  constructor(position, rotation, halfA, halfB, color) {
    super();
    this.age = 0;
    this.maxAge = 0.6;
    this.position.copy(position);
    this.rotation.copy(rotation);

    // Halves fly apart
    this.halfA = halfA;
    this.halfB = halfB;
    this.add(halfA);
    this.add(halfB);

    this.velA = new THREE.Vector3(-0.8, 0.6, 0);
    this.velB = new THREE.Vector3(0.8, 0.6, 0);

    // Juice splash droplets
    this.drops = [];
    const dropGeom = new THREE.SphereGeometry(0.012, 6, 6);
    const dropMat = new THREE.MeshBasicMaterial({ color });
    for (let i = 0; i < 10; i++) {
      const drop = new THREE.Mesh(dropGeom, dropMat);
      this.add(drop);
      this.drops.push({
        mesh: drop,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 2.2,
          Math.random() * 1.8,
          (Math.random() - 0.5) * 2.2
        ),
      });
    }
  }

  updateEffect(delta) {
    this.age += delta;
    const progress = this.age / this.maxAge;

    if (progress >= 1.0) {
      this.parent?.remove(this);
      return;
    }

    // Animate halves
    this.velA.y -= 9.8 * delta * 0.5;
    this.velB.y -= 9.8 * delta * 0.5;
    this.halfA.position.addScaledVector(this.velA, delta);
    this.halfB.position.addScaledVector(this.velB, delta);
    this.halfA.rotation.z += delta * 4;
    this.halfB.rotation.z -= delta * 4;

    const scale = Math.max(0.001, 1 - progress);
    this.halfA.scale.setScalar(scale);
    this.halfB.scale.setScalar(scale);

    // Animate juice drops
    for (const d of this.drops) {
      d.vel.y -= 9.8 * delta * 0.5;
      d.mesh.position.addScaledVector(d.vel, delta);
      d.mesh.scale.setScalar(scale);
    }
  }
}

// Bomb Explosion Effect
class ExplosionEffect extends xb.Script {
  constructor(position) {
    super();
    this.age = 0;
    this.maxAge = 0.55;
    this.position.copy(position);

    const flashGeom = new THREE.SphereGeometry(0.08, 16, 16);
    this.flashMat = new THREE.MeshBasicMaterial({
      color: 0xff5722,
      transparent: true,
      opacity: 0.9,
    });
    this.flashMesh = new THREE.Mesh(flashGeom, this.flashMat);
    this.add(this.flashMesh);

    this.sparks = [];
    const sparkGeom = new THREE.SphereGeometry(0.015, 6, 6);
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffc107 });
    for (let i = 0; i < 16; i++) {
      const spark = new THREE.Mesh(sparkGeom, sparkMat);
      this.add(spark);
      this.sparks.push({
        mesh: spark,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 3,
          (Math.random() - 0.2) * 3,
          (Math.random() - 0.5) * 3
        ),
      });
    }
  }

  updateEffect(delta) {
    this.age += delta;
    const progress = this.age / this.maxAge;
    if (progress >= 1.0) {
      this.parent?.remove(this);
      return;
    }

    const scale = 0.2 + progress * 2.8;
    this.flashMesh.scale.setScalar(scale);
    this.flashMat.opacity = Math.max(0, 0.9 * (1 - progress));

    for (const s of this.sparks) {
      s.vel.y -= 9.8 * delta * 0.4;
      s.mesh.position.addScaledVector(s.vel, delta);
      s.mesh.scale.setScalar(Math.max(0.001, 1 - progress));
    }
  }
}

// Main Game Controller App
class FruitSlicerApp extends xb.Script {
  constructor() {
    super();
    this.lives = 3;
    this.score = 0;
    this.resolvedCount = 0;
    this.targetIndex = 0;
    this.activeTarget = null;
    this.gameState = "IDLE"; // IDLE, PLAYING, GAME_OVER, WON
    this.spawnDelay = 0;
    this.prevTime = null;

    // Hand tracking state
    this.handPositions = [new THREE.Vector3(), new THREE.Vector3()];
    this.prevHandPositions = [new THREE.Vector3(), new THREE.Vector3()];
    this.prevCamPositions = [new THREE.Vector3(), new THREE.Vector3()];
    this.hasPrevPos = [false, false];
    this.handSpeeds = [0, 0];
  }

  init() {
    // Lighting
    this.add(new THREE.HemisphereLight(0xffffff, 0x444455, 3));
    const dirLight = new THREE.DirectionalLight(0xffffff, 2);
    dirLight.position.set(2, 4, 2);
    this.add(dirLight);

    this.createUI();
  }

  createUI() {
    // Title
    const title = new xb.UIText({
      text: "Fruit Slicer",
      style: {
        fontSize: 26,
        fontWeight: "bold",
        textAlign: "center",
        color: "#ffca28",
      },
    });

    // Score display
    this.scoreText = new xb.UIText({
      text: "Score: 0",
      style: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#ffffff",
      },
    });

    // Life Markers Display
    // Visible three-life display with 3 circular markers
    this.lifeBadge1 = new xb.UIPanel({
      style: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: "#f44336",
      },
    });
    this.lifeBadge2 = new xb.UIPanel({
      style: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: "#f44336",
      },
    });
    this.lifeBadge3 = new xb.UIPanel({
      style: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: "#f44336",
      },
    });

    this.lifeMarkersPanel = new xb.UIPanel({
      style: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
      },
      children: [this.lifeBadge1, this.lifeBadge2, this.lifeBadge3],
    });
    this.lifeMarkersPanel.userData.xrblocksDevtools = {
      tag: "life-markers",
      output: { text: "3 lives" },
    };

    // Resolved counter: 0 of 12 resolved initially
    this.resolvedCounter = new xb.UIText({
      text: "0 of 12 resolved",
      style: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#81d4fa",
      },
    });
    this.resolvedCounter.userData.xrblocksDevtools = {
      tag: "resolved-counter",
      output: { text: "0 of 12 resolved" },
    };

    // Row containing score, life markers, and resolved counter
    const statsRow = new xb.UIPanel({
      style: {
        width: "100%",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 4,
      },
      children: [this.scoreText, this.lifeMarkersPanel, this.resolvedCounter],
    });

    // Status / Result message
    this.statusText = new xb.UIText({
      text: "Slice fruits with quick hand motions! Avoid bombs!",
      style: {
        fontSize: 15,
        color: "#cfd8dc",
        textAlign: "center",
      },
    });

    // Play Game / Play Again button
    this.playButton = new xb.UIButton({
      label: "Play Game",
      ariaLabel: "Play Game",
      style: {
        minWidth: 150,
        height: 42,
        alignSelf: "center",
      },
      onClick: () => {
        this.startRound();
      },
    });
    this.playButton.userData.xrblocksDevtools = { tag: "play-game" };

    // Support direct-touch on play button as well
    this.playButton.onObjectTouchStart = () => {
      this.startRound();
    };

    // Main UI Card positioned in front of the user at chest level
    this.card = new xb.UICard({
      size: { width: 0.65, height: "auto" },
      manipulation: false,
      style: {
        flexDirection: "column",
        gap: 12,
        padding: 16,
        backgroundColor: "#161824",
        borderRadius: 18,
      },
      children: [title, statsRow, this.statusText, this.playButton],
    });
    this.card.position.set(0, 1.4, -0.65);
    this.add(this.card);
  }

  updateLivesDisplay() {
    const badges = [this.lifeBadge1, this.lifeBadge2, this.lifeBadge3];
    for (let i = 0; i < 3; i++) {
      if (i < this.lives) {
        badges[i].style.backgroundColor = "#f44336";
        badges[i].style.opacity = 1.0;
      } else {
        badges[i].style.backgroundColor = "#37474f";
        badges[i].style.opacity = 0.35;
      }
    }
    this.lifeMarkersPanel.userData.xrblocksDevtools.output = {
      text: `${this.lives} lives`,
    };
  }

  updateResolvedDisplay() {
    const text = `${this.resolvedCount} of 12 resolved`;
    this.resolvedCounter.text = text;
    this.resolvedCounter.userData.xrblocksDevtools.output = { text };
  }

  updateScoreDisplay() {
    this.scoreText.text = `Score: ${this.score}`;
  }

  clearOldTargets() {
    this.spawnDelay = 0;
    if (this.activeTarget) {
      delete this.activeTarget.userData.xrblocksDevtools;
      this.remove(this.activeTarget);
      this.activeTarget = null;
    }
    // Remove any leftover debris/effects
    const toRemove = [];
    for (const child of this.children) {
      if (child instanceof SplitEffect || child instanceof ExplosionEffect) {
        toRemove.push(child);
      }
    }
    for (const item of toRemove) {
      this.remove(item);
    }
  }

  startRound() {
    this.clearOldTargets();

    this.lives = 3;
    this.score = 0;
    this.resolvedCount = 0;
    this.targetIndex = 0;
    this.gameState = "PLAYING";

    this.updateLivesDisplay();
    this.updateResolvedDisplay();
    this.updateScoreDisplay();

    this.statusText.text = "Round in progress! Turn and slice!";
    this.statusText.style.color = "#80cbc4";
    this.playButton.label = "Restart";

    // Reset hand tracking so initial button click doesn't trigger false slice
    this.hasPrevPos = [false, false];

    // Promptly launches the first target
    this.spawnNextTarget();
  }

  spawnNextTarget() {
    if (this.gameState !== "PLAYING") return;
    if (this.targetIndex >= SEEDED_TARGETS.length) return;

    const targetDef = SEEDED_TARGETS[this.targetIndex];
    this.targetIndex++;

    if (targetDef.type === "fruit") {
      const fruit = new FruitTarget(this, targetDef);
      this.activeTarget = fruit;
      this.add(fruit);
    } else {
      const bomb = new BombTarget(this, targetDef);
      this.activeTarget = bomb;
      this.add(bomb);
    }
  }

  onDirectTouch(target, event) {
    if (target !== this.activeTarget || target.resolved) return;
    const handIdx = event.handIndex ?? 1;
    const speed = this.handSpeeds[handIdx] || 0;

    if (target instanceof FruitTarget) {
      if (speed >= MIN_SLICE_SPEED) {
        this.sliceFruit(target, target.position, speed);
      }
    } else if (target instanceof BombTarget) { if (speed >= 0.4) {
      this.onBombHit(target); }
    }
  }

  sliceFruit(fruit, hitPos, speed) {
    if (fruit.resolved) return;
    fruit.resolved = true;

    // Remove fruit tag immediately so it is no longer an active fruit target
    delete fruit.userData.xrblocksDevtools;

    // Spawn split halves and splash effect
    fruit.remove(fruit.visualGroup);
    const effect = new SplitEffect(
      fruit.position,
      fruit.visualGroup.rotation,
      fruit.halfA,
      fruit.halfB,
      fruit.innerColor
    );
    this.add(effect);

    // Clean up fruit target
    this.remove(fruit);
    this.activeTarget = null;

    // Increase score & advance counter
    this.score += 10;
    this.resolvedCount++;
    this.updateScoreDisplay();
    this.updateResolvedDisplay();

    this.statusText.text = `Sliced! Score: ${this.score}`;
    this.statusText.style.color = "#a5d6a7";

    this.checkRoundProgress();
  }

  onTargetMissed(fruit) {
    if (fruit !== this.activeTarget) return;
    delete fruit.userData.xrblocksDevtools;
    this.remove(fruit);
    this.activeTarget = null;

    this.resolvedCount++;
    this.updateResolvedDisplay();

    this.statusText.text = "Missed!";
    this.statusText.style.color = "#ffab91";

    this.checkRoundProgress();
  }

  onBombHit(bomb) {  
    if (bomb.resolved) return;
    bomb.resolved = true;

    // Remove bomb tag immediately
    delete bomb.userData.xrblocksDevtools;

    // Visible explosion
    const explosion = new ExplosionEffect(bomb.position);
    this.add(explosion);

    this.remove(bomb);
    this.activeTarget = null;

    // Crossing a bomb empties one life marker, adds no score, and visibly resolves
    this.lives--;
    this.updateLivesDisplay();

    this.resolvedCount++;
    this.updateResolvedDisplay();

    this.statusText.text = "BOOM! Bomb crossed! Life lost!";
    this.statusText.style.color = "#ff5252";

    if (this.lives <= 0) {
      this.endGame(false);
    } else {
      this.checkRoundProgress();
    }
  }

  onBombAvoided(bomb) {  
    if (bomb !== this.activeTarget) return;
    delete bomb.userData.xrblocksDevtools;
    this.remove(bomb);
    this.activeTarget = null;

    this.resolvedCount++;
    this.updateResolvedDisplay();

    this.statusText.text = "Bomb avoided!";
    this.statusText.style.color = "#80cbc4";

    this.checkRoundProgress();
  }

  checkRoundProgress() {
    if (this.resolvedCount >= 12) {
      this.endGame(this.lives > 0);
    } else {
      // Promptly schedule next target launch via frame timer
      this.spawnDelay = NEXT_TARGET_DELAY;
    }
  }

  endGame(isWin) {
    this.spawnDelay = 0;
    this.clearOldTargets();

    if (isWin) {
      this.gameState = "WON";
      this.statusText.text = `Victory! Final Score: ${this.score}`;
      this.statusText.style.color = "#69f0ae";
    } else {
      this.gameState = "GAME_OVER";
      this.statusText.text = `Game Over! Final Score: ${this.score}`;
      this.statusText.style.color = "#ff5252";
    }

    this.playButton.label = "Play Again";
  }

  update(time) {
    let dt = 0.016;
    if (typeof time === "number") {
      if (this.prevTime !== null && time > this.prevTime) {
        dt = Math.max(0.001, Math.min(0.2, (time - this.prevTime) / 1000));
      }
      this.prevTime = time;
    }

    // Handle spawn delay timer
    if (this.gameState === "PLAYING" && this.spawnDelay > 0) {
      this.spawnDelay -= dt;
      if (this.spawnDelay <= 0) {
        this.spawnDelay = 0;
        this.spawnNextTarget();
      }
    }

    // Update active target arc
    if (this.activeTarget && !this.activeTarget.resolved) {
      this.activeTarget.updateArc(dt);
    }

    // Update effects
    for (const child of this.children) {
      if (child.updateEffect) {
        child.updateEffect(dt);
      }
    }

    // Slicing collision check using hands / controllers
    this.checkHandSlicing(dt);
  }

  checkHandSlicing(dt) {
    if (
      this.gameState !== "PLAYING" ||
      !this.activeTarget ||
      this.activeTarget.resolved
    ) {
      return;
    }

    const hands = xb.user?.hands;
    const controllers = xb.user?.controllers;
    const cam = xb.camera;
    if (cam) {
      cam.updateMatrixWorld(true);
    }
    const camInv = cam ? cam.matrixWorldInverse : null;
    const simState = xb.core?.simulator?.simulatorControllerState;

    for (let h = 0; h < 2; h++) {
      let trackedPos = null;

      // Check index fingertip first
      const indexTip = hands?.getIndexTip?.(h);
      if (indexTip) {
        const wp = new THREE.Vector3();
        indexTip.getWorldPosition(wp);
        if (wp.lengthSq() > 0.001) {
          trackedPos = wp;
        }
      }

      // Fall back to controller position
      if (!trackedPos && controllers?.[h]) {
        const cp = new THREE.Vector3();
        controllers[h].getWorldPosition(cp);
        if (cp.lengthSq() > 0.001) {
          trackedPos = cp;
        }
      }

      if (!trackedPos) continue;

      this.handPositions[h].copy(trackedPos);

      // Camera-space local position for reliable hand motion speed (independent of head rotation)
      let localPos;
      if (simState?.localControllerPositions?.[h]) {
        localPos = simState.localControllerPositions[h].clone();
      } else if (camInv) {
        localPos = trackedPos.clone().applyMatrix4(camInv);
      } else {
        localPos = trackedPos.clone();
      }

      if (this.hasPrevPos[h]) {
        const disp = localPos.distanceTo(this.prevCamPositions[h]);
        const speed = disp / dt;
        this.handSpeeds[h] = speed;

        const target = this.activeTarget;
        if (target && !target.resolved) {
          const targetWorldPos = new THREE.Vector3();
          target.getWorldPosition(targetWorldPos);

          const segDist = distanceToSegment(
            targetWorldPos,
            this.prevHandPositions[h],
            trackedPos
          );

          if (segDist <= target.hitRadius) { 
            if (target instanceof FruitTarget) {
              if (speed >= MIN_SLICE_SPEED) {
                this.sliceFruit(target, trackedPos, speed);
                break;
              }
            } else if (target instanceof BombTarget) { if (speed >= 0.4) {
              if (speed >= 0.4) {
                this.onBombHit(target); }
                break;
              }
            }
          }
        }
      } else {
        this.hasPrevPos[h] = true;
      }

      this.prevHandPositions[h].copy(trackedPos);
      this.prevCamPositions[h].copy(localPos);
    }
  }
}
document.addEventListener("DOMContentLoaded", () => {
  const options = new xb.Options();
  options.enableHands();
  options.hands.visualization = true;
  options.simulator.defaultMode = xb.SimulatorMode.POSE;

  const app = new FruitSlicerApp();
  xb.add(app);
  xb.init(options);
});
