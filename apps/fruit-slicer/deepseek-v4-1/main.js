import * as THREE from "three";
import * as xb from "xrblocks";

// ---------------------------------------------------------------------------
// Fruit Slicer
//
// A short, seeded, twelve-target hand-slicing round. Targets pop into
// reachable arcs from varied positions around the user. A fast hand crossing
// splits fruit, while bombs cost a life. The round ends when all targets are
// resolved or all three lives are gone.
// ---------------------------------------------------------------------------

const TOTAL_TARGETS = 12;
const BOMB_COUNT = 3;
const START_LIVES = 3;
const ROUND_SEED = 0x5f3a91c7;

const FRUIT_RADIUS = 0.1;
const BOMB_RADIUS = 0.11;

// The hand "blade" is forgiving: a fast crossing counts when the swept hand
// segment passes within targetRadius + BLADE_RADIUS of the target center.
const BLADE_RADIUS = 0.17;
const SLICE_SPEED = 0.55; // meters / second
const MAX_BLADE_STEP = 0.8; // guard against teleport / reconnection spikes

const SPAWN_POP_SECONDS = 0.18;
const NEXT_SPAWN_DELAY = 0.2;
// A bomb that is not sliced defuses on its own, so a careful player can clear
// every target without spending all three lives.
const BOMB_DEFUSE_SECONDS = 1.7;

const SPAWN_RADIUS_MIN = 0.42;
const SPAWN_RADIUS_MAX = 0.6;
const SPAWN_HEIGHT_MIN = -0.5;
const SPAWN_HEIGHT_MAX = 0.08;

const HALF_LIFETIME = 0.7;
const BLAST_LIFETIME = 0.5;

const FRUIT_COLORS = [0xff5a3c, 0xffb020, 0x7ed957, 0xff4d6d, 0xc06bff];

// Deterministic PRNG so a seeded round always replays identically.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Builds the immutable, seeded twelve-target plan: exactly three bombs and a
// spread of azimuths/radii/heights around the user. Target zero is always a
// fruit so the round opens with a sliceable target.
function buildRound(seed) {
  const rng = mulberry32(seed);

  // Seed three bomb slots that are never adjacent and never first, then fill
  // the rest with fruit. This spreads the bombs across the round while keeping
  // the opening target sliceable.
  const bombSlots = [];
  let guard = 0;
  while (bombSlots.length < BOMB_COUNT && guard < 1000) {
    guard++;
    const slot = 1 + Math.floor(rng() * (TOTAL_TARGETS - 1));
    if (bombSlots.some((existing) => Math.abs(existing - slot) < 2)) continue;
    bombSlots.push(slot);
  }
  bombSlots.sort((a, b) => a - b);
  const kinds = [];
  for (let i = 0; i < TOTAL_TARGETS; i++) {
    kinds.push(bombSlots.includes(i) ? "bomb" : "fruit");
  }

  const plan = [];
  const startAngle = rng() * Math.PI * 2;
  for (let i = 0; i < TOTAL_TARGETS; i++) {
    // Evenly spaced azimuth plus seeded jitter, so positions vary but always
    // wrap all the way around the user.
    const jitter = (rng() - 0.5) * 0.7;
    const azimuth =
      startAngle + (i / TOTAL_TARGETS) * Math.PI * 2 + jitter;
    const radius = THREE.MathUtils.lerp(
      SPAWN_RADIUS_MIN,
      SPAWN_RADIUS_MAX,
      rng()
    );
    const height = THREE.MathUtils.lerp(
      SPAWN_HEIGHT_MIN,
      SPAWN_HEIGHT_MAX,
      rng()
    );
    const color = FRUIT_COLORS[Math.floor(rng() * FRUIT_COLORS.length)];
    plan.push({ kind: kinds[i], azimuth, radius, height, color });
  }
  return plan;
}

const scratchTarget = new THREE.Vector3();
const scratchA = new THREE.Vector3();
const scratchB = new THREE.Vector3();
const scratchC = new THREE.Vector3();

function disposeSubtree(root) {
  root.traverse?.((child) => {
    if (child.geometry) child.geometry.dispose();
    const material = child.material;
    if (Array.isArray(material)) {
      material.forEach((entry) => entry.dispose());
    } else if (material) {
      material.dispose();
    }
  });
}

// Shortest distance from point p to segment a-b.
function segmentPointDistance(a, b, p) {
  scratchA.subVectors(b, a);
  scratchB.subVectors(p, a);
  const lengthSq = scratchA.lengthSq();
  if (lengthSq < 1e-9) return p.distanceTo(a);
  const t = THREE.MathUtils.clamp(scratchB.dot(scratchA) / lengthSq, 0, 1);
  scratchC.copy(a).addScaledVector(scratchA, t);
  return scratchC.distanceTo(p);
}

// One active fruit or bomb. The shared tag lives on the semantic owner (the
// mesh itself); helper children such as the bomb fuse are never tagged.
class Target extends xb.MeshScript {
  constructor({ kind, index, color, game }) {
    const radius = kind === "bomb" ? BOMB_RADIUS : FRUIT_RADIUS;
    const geometry = new THREE.SphereGeometry(radius, 24, 18);
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.5,
      metalness: 0.05,
      emissive: kind === "bomb" ? 0x330000 : color,
      emissiveIntensity: kind === "bomb" ? 0.45 : 0.12,
    });
    super(geometry, material);

    this.kind = kind;
    this.roundIndex = index;
    this.game = game;
    this.resolved = false;
    this.age = 0;
    this.radius = radius;
    this.baseScale = kind === "fruit" ? new THREE.Vector3(0.9, 0.96, 0.9) : new THREE.Vector3(1, 1, 1);
    this.name = `${kind === "bomb" ? "Bomb" : "Fruit"} ${index + 1}`;

    if (kind === "bomb") {
      const fuseMaterial = new THREE.MeshStandardMaterial({ color: 0x6b5433 });
      const fuse = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.016, 0.1, 8),
        fuseMaterial
      );
      fuse.position.set(0, radius + 0.05, 0);
      fuse.rotation.z = -0.45;
      this.add(fuse);

      const sparkMaterial = new THREE.MeshStandardMaterial({
        color: 0xffc400,
        emissive: 0xff4d00,
        emissiveIntensity: 2.2,
      });
      const spark = new THREE.Mesh(
        new THREE.SphereGeometry(0.022, 8, 8),
        sparkMaterial
      );
      spark.position.set(0.055, radius + 0.085, 0);
      this.add(spark);
    } else {
      const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x4caf50 });
      const leaf = new THREE.Mesh(
        new THREE.ConeGeometry(0.03, 0.07, 8),
        leafMaterial
      );
      leaf.position.set(0.015, radius + 0.03, 0);
      leaf.rotation.z = -0.5;
      this.add(leaf);
    }

    this.scale.copy(this.baseScale).multiplyScalar(0.05);
    this.userData.xrblocksDevtools = {
      tag: kind,
      state: { kind, roundIndex: index, resolved: false, age: 0 },
    };
  }

  onObjectSelectStart(event) {
    event.stopPropagation();
  }

  onObjectSelectEnd(event) {
    event.stopPropagation();
    // Desktop / controller fallback: a completed select on a target resolves
    // it, so the round is playable without hand-tracking hardware.
    this.game?.resolveTarget(this, "select");
  }

  tick(dt) {
    this.age += dt;
    const t = Math.min(1, this.age / SPAWN_POP_SECONDS);
    const eased = 1 - Math.pow(1 - t, 3);
    const popScale = 0.05 + 0.95 * eased;
    this.scale.copy(this.baseScale).multiplyScalar(popScale);
    this.rotation.y += dt * (this.kind === "bomb" ? 0.7 : 1.2);
    if (this.kind === "fruit") this.rotation.z = Math.sin(this.age * 2.4) * 0.06;

    // Bombs are hazards: ignore them and they safely defuse on their own.
    if (this.kind === "bomb" && this.age >= BOMB_DEFUSE_SECONDS) {
      this.game?.defuseBomb(this);
    }
    this.userData.xrblocksDevtools.state.resolved = this.resolved;
    this.userData.xrblocksDevtools.state.age = this.age;
  }
}

class FruitSlicerGame extends xb.Script {
  constructor() {
    super();
    this.name = "Fruit Slicer Game";
    this.round = buildRound(ROUND_SEED);
    this.status = {
      phase: "idle", // idle | playing | won | lost
      score: 0,
      lives: START_LIVES,
      maxLives: START_LIVES,
      resolved: 0,
      total: TOTAL_TARGETS,
      fruitResolved: 0,
      bombsResolved: 0,
      bombsDefused: 0,
      bombsTotal: BOMB_COUNT,
      spawned: 0,
      activeTargetType: null,
      result: null,
      message: "Press Play Game to start.",
    };
    // Untagged durable state read by Devtools getDevtoolsContext({state:true}).
    this.userData.xrblocksDevtools = { state: this.status };

    this.lastTime = 0;
    this.hasLastTime = false;
    this.spawnIndex = 0;
    this.activeTarget = null;
    this.pendingSpawn = false;
    this.spawnTimer = 0;
    this.blades = new Map();
    this.effects = [];
  }

  init() {
    this.add(new THREE.HemisphereLight(0xffffff, 0x46506b, 2.4));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.15);
    keyLight.position.set(0.7, 2.3, 0.4);
    this.add(keyLight);

    this.targetsRoot = new THREE.Group();
    this.targetsRoot.name = "Active targets";
    this.add(this.targetsRoot);

    this.effectsRoot = new THREE.Group();
    this.effectsRoot.name = "Slice effects";
    this.add(this.effectsRoot);

    this.buildHud();
    this.updateHud();
  }

  buildHud() {
    this.heartIcons = [];
    for (let i = 0; i < START_LIVES; i++) {
      const heart = new xb.UIIcon({
        icon: "favorite",
        filled: true,
        pointerEvents: "none",
        style: { fontSize: 24, color: "#ff4d6d" },
      });
      this.heartIcons.push(heart);
    }

    this.lifeMarkers = new xb.UIPanel({
      pointerEvents: "none",
      style: {
        flexDirection: "row",
        gap: 10,
        justifyContent: "center",
        alignItems: "center",
      },
      children: this.heartIcons,
    });
    this.lifeMarkers.userData.xrblocksDevtools = {
      tag: "life-markers",
      state: { lives: START_LIVES, maxLives: START_LIVES },
    };

    this.resolvedCounter = new xb.UIText({
      text: `0 of ${TOTAL_TARGETS} resolved`,
      pointerEvents: "none",
      style: {
        fontSize: 19,
        fontWeight: "bold",
        textAlign: "center",
        color: "#ffd166",
      },
    });
    this.resolvedCounter.userData.xrblocksDevtools = {
      tag: "resolved-counter",
      state: { resolved: 0, total: TOTAL_TARGETS },
    };

    this.scoreText = new xb.UIText({
      text: "Score: 0",
      pointerEvents: "none",
      style: { fontSize: 16, textAlign: "center", color: "#9fe6ff" },
    });

    this.statusText = new xb.UIText({
      text: this.status.message,
      pointerEvents: "none",
      style: {
        fontSize: 15,
        textAlign: "center",
        color: "#dbe1ea",
        lineHeight: 1.3,
      },
    });

    this.playButton = new xb.UIButton({
      label: "Play Game",
      icon: "sports_martial_arts",
      style: {
        width: "100%",
        height: 46,
        backgroundColor: "#ff7a3c",
        borderRadius: 14,
        fontSize: 20,
        fontWeight: "bold",
      },
      onClick: () => this.startRound(),
    });
    this.playButton.userData.xrblocksDevtools = {
      tag: "play-game",
      state: { label: "Play Game", disabled: false, phase: "idle" },
    };

    const card = new xb.UICard({
      size: { width: 0.62, height: "auto" },
      style: {
        flexDirection: "column",
        gap: 12,
        padding: 20,
        alignItems: "center",
        backgroundColor: "#10131b",
        borderRadius: 22,
      },
      children: [
        new xb.UIText({
          text: "FRUIT SLICER",
          pointerEvents: "none",
          style: {
            fontSize: 27,
            fontWeight: "bold",
            textAlign: "center",
            color: "#ffffff",
          },
        }),
        this.lifeMarkers,
        this.resolvedCounter,
        this.scoreText,
        this.statusText,
        this.playButton,
      ],
    });
    card.name = "Fruit Slicer HUD";
    card.position.set(0, 1.4, -1.15);
    card.add(
      new xb.FollowHead({
        offset: new THREE.Vector3(0, -0.12, -1.15),
        smoothing: 0.14,
      }),
      new xb.FaceCamera({ mode: "spherical", smoothing: 0.18 })
    );
    this.add(card);
    this.hudCard = card;
  }

  computeDelta(time) {
    if (typeof time !== "number" || !Number.isFinite(time)) {
      this.hasLastTime = true;
      this.lastTime = 0;
      return 1 / 60;
    }
    let dt;
    if (!this.hasLastTime) {
      this.hasLastTime = true;
      dt = 1 / 60;
    } else {
      dt = (time - this.lastTime) / 1000;
    }
    this.lastTime = time;
    if (!Number.isFinite(dt) || dt <= 0) dt = 1 / 240;
    return Math.min(dt, 0.08);
  }

  update(time) {
    const dt = this.computeDelta(time);

    if (this.status.phase === "playing") {
      if (this.activeTarget) this.activeTarget.tick(dt);
      if (this.pendingSpawn) {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
          this.pendingSpawn = false;
          this.spawnNext();
        }
      }
    }

    this.updateEffects(dt);
    this.updateBlades(dt);
    this.syncStatus();
  }

  // -------------------------------------------------------------- round flow
  startRound() {
    if (this.status.phase === "playing") return;

    this.clearRound();
    this.spawnIndex = 0;
    this.pendingSpawn = false;
    this.spawnTimer = 0;
    this.hasLastTime = false;

    this.status.phase = "playing";
    this.status.score = 0;
    this.status.lives = START_LIVES;
    this.status.resolved = 0;
    this.status.fruitResolved = 0;
    this.status.bombsResolved = 0;
    this.status.bombsDefused = 0;
    this.status.spawned = 0;
    this.status.activeTargetType = null;
    this.status.result = null;
    this.status.message = "Slice the fruit! Avoid the bombs.";

    this.playButton.label = "Play Game";
    this.playButton.disabled = true;
    this.updateHud();

    // Promptly launch the first target.
    this.spawnNext();
  }

  clearRound() {
    for (const child of [...this.targetsRoot.children]) {
      disposeSubtree(child);
      child.removeFromParent();
    }
    for (const child of [...this.effectsRoot.children]) {
      disposeSubtree(child);
      child.removeFromParent();
    }
    this.effects.length = 0;
    this.activeTarget = null;
    this.blades.clear();
  }

  spawnNext() {
    if (this.status.phase !== "playing") return;
    if (this.spawnIndex >= TOTAL_TARGETS) return;

    const plan = this.round[this.spawnIndex];
    const target = new Target({
      kind: plan.kind,
      index: this.spawnIndex,
      color: plan.color,
      game: this,
    });

    const head = new THREE.Vector3();
    xb.camera.getWorldPosition(head);
    target.position.set(
      head.x + Math.sin(plan.azimuth) * plan.radius,
      head.y + plan.height,
      head.z - Math.cos(plan.azimuth) * plan.radius
    );

    this.targetsRoot.add(target);
    this.activeTarget = target;
    this.spawnIndex += 1;
    this.status.spawned = this.spawnIndex;
    this.status.activeTargetType = plan.kind;
    this.syncStatus();
  }

  resolveTarget(target, cause) {
    if (!target || target.resolved) return;
    if (this.status.phase !== "playing") return;

    target.resolved = true;
    if (target === this.activeTarget) this.activeTarget = null;

    const worldPos = target.getWorldPosition(new THREE.Vector3());

    if (target.kind === "fruit") {
      this.status.score += 1;
      this.status.fruitResolved += 1;
      this.spawnSlices(worldPos, target);
    } else {
      this.status.lives = Math.max(0, this.status.lives - 1);
      this.status.bombsResolved += 1;
      this.spawnBlast(worldPos, target);
    }
    this.status.resolved += 1;
    this.status.activeTargetType = null;

    target.removeFromParent();
    disposeSubtree(target);
    this.updateHud();

    if (this.status.lives <= 0) {
      this.finish("lost");
      return;
    }
    if (this.status.resolved >= TOTAL_TARGETS) {
      this.finish("won");
      return;
    }

    this.pendingSpawn = true;
    this.spawnTimer = NEXT_SPAWN_DELAY;
  }

  // A bomb that was left alone fizzles out safely. It still counts as a
  // resolved target so the round can complete, but it costs no life or score.
  defuseBomb(target) {
    if (!target || target.resolved) return;
    if (this.status.phase !== "playing") return;
    if (target.kind !== "bomb") return;

    target.resolved = true;
    if (target === this.activeTarget) this.activeTarget = null;

    const worldPos = target.getWorldPosition(new THREE.Vector3());
    this.status.bombsResolved += 1;
    this.status.bombsDefused += 1;
    this.status.resolved += 1;
    this.status.activeTargetType = null;
    this.spawnFlash(worldPos, 0x9fd7ff, target.radius * 0.55, 0.35, 1.4);

    target.removeFromParent();
    disposeSubtree(target);
    this.updateHud();

    if (this.status.resolved >= TOTAL_TARGETS) {
      this.finish(this.status.lives > 0 ? "won" : "lost");
      return;
    }

    this.pendingSpawn = true;
    this.spawnTimer = NEXT_SPAWN_DELAY;
  }

  finish(result) {
    this.status.phase = result;
    this.status.result = result;
    this.status.activeTargetType = null;
    this.pendingSpawn = false;

    if (this.activeTarget) {
      disposeSubtree(this.activeTarget);
      this.activeTarget.removeFromParent();
      this.activeTarget = null;
    }

    const headline = result === "won" ? "You Win!" : "Game Over";
    this.status.message = `${headline}  Score: ${this.status.score}`;

    this.playButton.disabled = false;
    this.playButton.label = "Play Again";
    this.updateHud();
  }

  // ---------------------------------------------------------------- effects
  spawnSlices(position, target) {
    const radius = target.radius || FRUIT_RADIUS;
    const color = target.material?.color?.getHex
      ? target.material.color.getHex()
      : 0xff5a3c;

    for (let i = 0; i < 2; i++) {
      const geometry = new THREE.SphereGeometry(
        radius * 1.02,
        16,
        8,
        0,
        Math.PI
      );
      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.5,
        metalness: 0.02,
        transparent: true,
        opacity: 1,
        side: THREE.DoubleSide,
      });
      const half = new THREE.Mesh(geometry, material);
      half.position.copy(position);
      half.rotation.set(
        Math.PI / 2 + (i === 0 ? 0.4 : -0.4),
        i * Math.PI,
        i === 0 ? 0.5 : -0.5
      );
      this.effectsRoot.add(half);

      const away = new THREE.Vector3(
        i === 0 ? -0.8 : 0.8,
        0.55,
        i === 0 ? -0.4 : 0.4
      ).normalize();
      this.effects.push({
        object: half,
        velocity: away.multiplyScalar(0.95),
        spin: new THREE.Vector3(2.2 + i, 1.4, 1.8 - i),
        age: 0,
        life: HALF_LIFETIME,
        gravity: true,
      });
    }

    this.spawnFlash(position, 0xfff1c9, 0.09, 0.28);
  }

  spawnBlast(position, target) {
    const radius = target.radius || BOMB_RADIUS;
    this.spawnFlash(position, 0xff7a2a, radius * 0.7, BLAST_LIFETIME, 3.2);
  }

  spawnFlash(position, color, size, life, scaleRate = 0) {
    const geometry = new THREE.SphereGeometry(size, 16, 12);
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    this.effectsRoot.add(mesh);
    this.effects.push({
      object: mesh,
      velocity: new THREE.Vector3(),
      spin: new THREE.Vector3(),
      age: 0,
      life,
      scaleRate,
      gravity: false,
    });
  }

  updateEffects(dt) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i];
      effect.age += dt;
      const object = effect.object;
      if (effect.velocity) {
        object.position.addScaledVector(effect.velocity, dt);
        if (effect.gravity) effect.velocity.y -= 3.4 * dt;
      }
      if (effect.spin) {
        object.rotation.x += effect.spin.x * dt;
        object.rotation.y += effect.spin.y * dt;
        object.rotation.z += effect.spin.z * dt;
      }
      if (effect.scaleRate) {
        object.scale.setScalar(1 + effect.age * effect.scaleRate);
      }
      if (object.material) {
        object.material.opacity = Math.max(0, 1 - effect.age / effect.life);
      }
      if (effect.age >= effect.life) {
        object.removeFromParent();
        disposeSubtree(object);
        this.effects.splice(i, 1);
      }
    }
  }

  // --------------------------------------------------------- slice detection
  updateBlades(dt) {
    if (this.status.phase !== "playing" || !this.activeTarget) {
      this.blades.clear();
      return;
    }

    const hands = xb.user?.hands?.hands;
    const jointNames = [
      "index-finger-tip",
      "middle-finger-tip",
      "thumb-tip",
      "wrist",
    ];
    const sources = [];

    if (hands) {
      for (const handIndex of [xb.Handedness.LEFT, xb.Handedness.RIGHT]) {
        const hand = hands[handIndex];
        if (!hand || !hand.joints) continue;
        for (const jointName of jointNames) {
          const joint = hand.joints[jointName];
          if (joint) sources.push({ id: `${handIndex}:${jointName}`, object: joint });
        }
      }
    }

    const controllers = xb.user?.controllers;
    if (controllers) {
      for (let i = 0; i < 2; i++) {
        if (controllers[i]) sources.push({ id: `controller:${i}`, object: controllers[i] });
      }
    }

    const targetPosition = this.activeTarget.getWorldPosition(scratchTarget);
    const cutDistance = this.activeTarget.radius + BLADE_RADIUS;
    let sliced = false;

    for (const source of sources) {
      const current = new THREE.Vector3();
      source.object.getWorldPosition(current);
      const previous = this.blades.get(source.id);

      if (!previous) {
        this.blades.set(source.id, current);
        continue;
      }

      const step = current.distanceTo(previous);
      const speed = step / dt;
      if (
        !sliced &&
        step <= MAX_BLADE_STEP &&
        speed >= SLICE_SPEED &&
        segmentPointDistance(previous, current, targetPosition) <= cutDistance
      ) {
        sliced = true;
        this.resolveTarget(this.activeTarget, "slice");
      }
      previous.copy(current);
    }
  }

  // -------------------------------------------------------------------- HUD
  updateHud() {
    this.resolvedCounter.text = `${this.status.resolved} of ${TOTAL_TARGETS} resolved`;
    this.resolvedCounter.userData.xrblocksDevtools.state.resolved =
      this.status.resolved;
    this.resolvedCounter.userData.xrblocksDevtools.state.total = TOTAL_TARGETS;

    this.scoreText.text = `Score: ${this.status.score}`;
    this.statusText.text = this.status.message;

    for (let i = 0; i < this.heartIcons.length; i++) {
      const alive = i < this.status.lives;
      this.heartIcons[i].filled = alive;
      this.heartIcons[i].style.color = alive ? "#ff4d6d" : "#4a4f5a";
      this.heartIcons[i].style.opacity = alive ? 1 : 0.4;
    }
    this.lifeMarkers.userData.xrblocksDevtools.state.lives = this.status.lives;
    this.lifeMarkers.userData.xrblocksDevtools.state.maxLives = START_LIVES;

    this.playButton.userData.xrblocksDevtools.state.label = this.playButton.label;
    this.playButton.userData.xrblocksDevtools.state.disabled =
      this.playButton.disabled;
    this.playButton.userData.xrblocksDevtools.state.phase = this.status.phase;
    this.syncStatus();
  }

  syncStatus() {
    this.userData.xrblocksDevtools.state.activeTargetType =
      this.activeTarget ? this.activeTarget.kind : null;
  }

  // A completed select while idle or finished starts / restarts the round.
  // The Play Game button is the visible owner; this keeps the same action
  // reachable for controller and desktop input paths.
  onSelectEnd() {
    const phase = this.status.phase;
    if (phase === "idle" || phase === "won" || phase === "lost") {
      this.startRound();
    }
  }
}

const options = new xb.Options();
options.enableHands();
options.hands.visualization = true;
options.hands.visualizeJoints = true;
options.hands.visualizeMeshes = false;
options.simulator.defaultMode = xb.SimulatorMode.POSE;
options.xrButton.showEnterSimulatorButton = true;
options.setAppTitle("Fruit Slicer");
options.setAppDescription(
  "Slice twelve seeded targets, dodge three bombs, and clear the round."
);

document.addEventListener("DOMContentLoaded", async () => {
  xb.add(new FruitSlicerGame());
  await xb.init(options);
});
