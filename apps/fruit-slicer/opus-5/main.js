import * as THREE from "three";
import * as xb from "xrblocks";

// --- Round constants -------------------------------------------------------
const ROUND_SIZE = 12;
const BOMB_COUNT = 3;
const ROUND_SEED = 0x5eed1234;

const FRUIT_SCORE = 10;
const TARGET_RADIUS = 0.075;
const HIT_RADIUS = 0.105;
const BLADE_RADIUS = 0.025;
const SLICE_SPEED = 0.8; // meters / second required to cut.
const MAX_BLADE_TRAVEL = 5; // ignore implausible tracking jumps.
const SPAWN_DISTANCE = 0.4; // horizontal distance from the user in meters.
const MAX_REACH = 0.5; // hard cap so a target always stays in hand reach.
const ARC_SPEED = 0.32;
const ARC_GRAVITY = 0.7;
const TARGET_LIFETIME = 25; // seconds before an untouched target expires.
const FIRST_SPAWN_DELAY = 0.25;
const NEXT_SPAWN_DELAY = 0.5;
const MAX_ACTIVE_TARGETS = 1;
const HALF_LIFETIME = 0.9;
const BURST_LIFETIME = 0.6;

const FRUIT_COLORS = [0xff4d4d, 0xffa726, 0x9ccc65, 0xffd54f, 0xba68c8];

// --- Seeded pseudo random number generator --------------------------------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Builds the deterministic twelve-target round: exactly three bombs and
 * varied positions all around the user. The first target is always a fruit.
 */
function buildRound() {
  const random = mulberry32(ROUND_SEED);

  // Pick three distinct bomb slots. The first target is always a fruit and
  // the second is always a bomb, so both target kinds appear early.
  const bombSlots = new Set([1]);
  while (bombSlots.size < BOMB_COUNT) {
    bombSlots.add(2 + Math.floor(random() * (ROUND_SIZE - 2)));
  }

  const specs = [];
  for (let i = 0; i < ROUND_SIZE; i++) {
    // Golden-angle spread keeps consecutive targets far apart in yaw so the
    // user has to turn toward each one.
    const yaw = (i * 2.399963 + random() * 0.5 - 0.25) % (Math.PI * 2);
    specs.push({
      index: i,
      kind: bombSlots.has(i) ? "bomb" : "fruit",
      yaw: yaw > Math.PI ? yaw - Math.PI * 2 : yaw,
      heightOffset: -0.32 + random() * 0.24,
      colorIndex: Math.floor(random() * FRUIT_COLORS.length),
      spin: random() < 0.5 ? -1 : 1,
    });
  }
  return specs;
}

// --- Geometry helpers ------------------------------------------------------
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const tmpC = new THREE.Vector3();

/** Distance from point p to the segment a-b. */
function segmentPointDistance(a, b, p) {
  tmpA.subVectors(b, a);
  const lengthSq = tmpA.lengthSq();
  if (lengthSq < 1e-12) return a.distanceTo(p);
  let t = tmpB.subVectors(p, a).dot(tmpA) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  tmpC.copy(tmpA).multiplyScalar(t).add(a);
  return tmpC.distanceTo(p);
}

function tag(object, name) {
  object.userData.xrblocksDevtools = { tag: name };
  return object;
}

class FruitSlicer extends xb.Script {
  constructor() {
    super();
    this.name = "FruitSlicer";

    this.playing = false;
    this.roundOver = false;
    this.score = 0;
    this.lives = 3;
    this.resolved = 0;
    this.nextSpawnIndex = 0;
    this.spawnTimer = 0;
    this.round = buildRound();

    this.targets = [];
    this.effects = [];
    this.blades = new Map();

    this.userPosition = new THREE.Vector3();
  }

  init() {
    this.add(new THREE.HemisphereLight(0xffffff, 0x555566, 2.5));
    const directional = new THREE.DirectionalLight(0xffffff, 1.6);
    directional.position.set(0.6, 1.8, 0.8);
    this.add(directional);

    this.createSharedAssets();

    this.targetsGroup = new THREE.Group();
    this.targetsGroup.name = "Targets";
    this.add(this.targetsGroup);

    this.effectsGroup = new THREE.Group();
    this.effectsGroup.name = "SliceEffects";
    this.add(this.effectsGroup);

    this.createHud();
    this.refreshHud();

    if (typeof window !== "undefined") {
      window.fruitSlicer = this;
    }
  }

  // --- Assets --------------------------------------------------------------
  createSharedAssets() {
    this.fruitGeometry = new THREE.SphereGeometry(TARGET_RADIUS, 24, 18);
    this.halfGeometry = new THREE.SphereGeometry(
      TARGET_RADIUS * 0.95,
      20,
      16,
      0,
      Math.PI,
    );
    this.stemGeometry = new THREE.CylinderGeometry(0.006, 0.008, 0.035, 8);
    this.leafGeometry = new THREE.SphereGeometry(0.018, 10, 8);
    this.bombGeometry = new THREE.SphereGeometry(TARGET_RADIUS * 0.95, 24, 18);
    this.fuseGeometry = new THREE.CylinderGeometry(0.005, 0.005, 0.05, 8);
    this.sparkGeometry = new THREE.SphereGeometry(0.014, 10, 8);
    this.burstGeometry = new THREE.SphereGeometry(TARGET_RADIUS, 18, 14);

    this.stemMaterial = new THREE.MeshStandardMaterial({ color: 0x6d4c41 });
    this.leafMaterial = new THREE.MeshStandardMaterial({ color: 0x43a047 });
    this.bombMaterial = new THREE.MeshStandardMaterial({
      color: 0x202124,
      roughness: 0.45,
      metalness: 0.35,
    });
    this.fuseMaterial = new THREE.MeshStandardMaterial({ color: 0x8d6e63 });
    this.sparkMaterial = new THREE.MeshStandardMaterial({
      color: 0xffc107,
      emissive: 0xff6f00,
      emissiveIntensity: 2,
    });

    this.ownedResources = [
      this.fruitGeometry,
      this.halfGeometry,
      this.stemGeometry,
      this.leafGeometry,
      this.bombGeometry,
      this.fuseGeometry,
      this.sparkGeometry,
      this.burstGeometry,
      this.stemMaterial,
      this.leafMaterial,
      this.bombMaterial,
      this.fuseMaterial,
      this.sparkMaterial,
    ];
  }

  // --- Heads up display ----------------------------------------------------
  createHud() {
    this.statusText = new xb.UIText({
      text: "Select Play Game to start the round.",
      style: { fontSize: 20, textAlign: "center", lineHeight: 1.3 },
    });

    this.scoreText = new xb.UIText({
      text: "Score: 0",
      style: { fontSize: 26, fontWeight: "bold", textAlign: "center" },
    });

    this.resolvedText = tag(
      new xb.UIText({
        text: `0 of ${ROUND_SIZE} resolved`,
        style: { fontSize: 24, textAlign: "center" },
      }),
      "resolved-counter",
    );
    this.resolvedText.name = "ResolvedCounter";

    this.lifeMarkers = [];
    for (let i = 0; i < 3; i++) {
      const marker = new xb.UIPanel({
        style: {
          width: 30,
          height: 30,
          borderRadius: 15,
          backgroundColor: "#ea4335",
          borderWidth: 2,
          borderColor: "#ffffff",
        },
      });
      marker.name = `LifeMarker${i + 1}`;
      this.lifeMarkers.push(marker);
    }

    this.lifeMarkersPanel = tag(
      new xb.UIPanel({
        style: {
          width: "100%",
          height: 44,
          flexDirection: "row",
          gap: 12,
          justifyContent: "center",
          alignItems: "center",
        },
        children: this.lifeMarkers,
      }),
      "life-markers",
    );
    this.lifeMarkersPanel.name = "LifeMarkers";

    this.playButton = tag(
      new xb.UIButton({
        label: "Play Game",
        ariaLabel: "Play Game",
        style: { width: "100%", height: 70, fontSize: 28 },
        onClick: () => this.startRound(),
      }),
      "play-game",
    );
    this.playButton.name = "PlayGameButton";

    this.hud = new xb.UICard({
      size: { width: 0.52, height: "auto" },
      style: {
        flexDirection: "column",
        gap: 12,
        padding: 22,
      },
      children: [
        new xb.UIText({
          text: "Fruit Slicer",
          style: { fontSize: 34, fontWeight: "bold", textAlign: "center" },
        }),
        this.scoreText,
        this.resolvedText,
        this.lifeMarkersPanel,
        this.playButton,
        this.statusText,
      ],
    });
    this.hud.name = "FruitSlicerHud";
    this.hud.position.set(0, xb.user.height - 0.45, -0.9);
    this.hud.add(
      new xb.FollowHead({
        offset: new THREE.Vector3(0, -0.38, -0.95),
        smoothing: 0.06,
      }),
      new xb.FaceCamera({ mode: "spherical", smoothing: 0.08 }),
    );
    this.add(this.hud);
  }

  refreshHud() {
    this.scoreText.text = `Score: ${this.score}`;
    this.resolvedText.text = `${this.resolved} of ${ROUND_SIZE} resolved`;
    for (let i = 0; i < this.lifeMarkers.length; i++) {
      const alive = i < this.lives;
      this.lifeMarkers[i].style.backgroundColor = alive ? "#ea4335" : "#2b2c2f";
      this.lifeMarkers[i].style.borderColor = alive ? "#ffffff" : "#6b6f76";
    }
  }

  // --- Round lifecycle -----------------------------------------------------
  startRound() {
    this.clearTargets();
    this.clearEffects();
    this.blades.clear();

    this.round = buildRound();
    this.score = 0;
    this.lives = 3;
    this.resolved = 0;
    this.nextSpawnIndex = 0;
    this.spawnTimer = FIRST_SPAWN_DELAY;
    this.playing = true;
    this.roundOver = false;

    this.statusText.text = "Slice the fruit. Do not cut the bombs.";
    this.refreshHud();
  }

  finishRound(won) {
    this.playing = false;
    this.roundOver = true;
    this.clearTargets();
    this.statusText.text = won
      ? `You win! Final score: ${this.score}`
      : `You lose. Final score: ${this.score}`;
    this.refreshHud();
  }

  // --- Targets -------------------------------------------------------------
  getUserPosition(target) {
    const camera = xb.core?.camera;
    if (camera) {
      camera.getWorldPosition(target);
    } else {
      target.set(0, xb.user.height, 0);
    }
    return target;
  }

  spawnTarget(spec) {
    const group = new THREE.Group();
    group.name = spec.kind === "bomb" ? "Bomb" : "Fruit";
    tag(group, spec.kind === "bomb" ? "bomb" : "fruit");

    if (spec.kind === "bomb") {
      const body = new THREE.Mesh(this.bombGeometry, this.bombMaterial);
      const fuse = new THREE.Mesh(this.fuseGeometry, this.fuseMaterial);
      fuse.position.y = TARGET_RADIUS * 0.95 + 0.02;
      const spark = new THREE.Mesh(this.sparkGeometry, this.sparkMaterial);
      spark.position.y = TARGET_RADIUS * 0.95 + 0.05;
      group.add(body, fuse, spark);
      group.userData.spark = spark;
    } else {
      const color = FRUIT_COLORS[spec.colorIndex % FRUIT_COLORS.length];
      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.35,
        metalness: 0.05,
      });
      const body = new THREE.Mesh(this.fruitGeometry, material);
      const stem = new THREE.Mesh(this.stemGeometry, this.stemMaterial);
      stem.position.y = TARGET_RADIUS + 0.012;
      const leaf = new THREE.Mesh(this.leafGeometry, this.leafMaterial);
      leaf.position.set(0.022, TARGET_RADIUS + 0.024, 0);
      leaf.scale.set(1.6, 0.5, 1);
      group.add(body, stem, leaf);
      group.userData.fruitMaterial = material;
    }

    const direction = new THREE.Vector3(
      Math.sin(spec.yaw),
      0,
      -Math.cos(spec.yaw),
    ).multiplyScalar(SPAWN_DISTANCE);

    this.getUserPosition(this.userPosition);
    const anchor = this.userPosition.clone().add(direction);
    anchor.y = this.userPosition.y + spec.heightOffset;

    group.userData.target = {
      kind: spec.kind,
      spec,
      age: 0,
      anchor,
      resolved: false,
    };

    group.position.copy(anchor);

    this.targetsGroup.add(group);
    this.targets.push(group);
    return group;
  }

  updateTargets(dt) {
    this.getUserPosition(this.userPosition);
    for (const group of this.targets) {
      const state = group.userData.target;
      state.age += dt;

      const flightTime = (2 * ARC_SPEED) / ARC_GRAVITY;
      let height;
      if (state.age <= flightTime) {
        // Pop into a short arc in front of its spawn position.
        height =
          ARC_SPEED * state.age - 0.5 * ARC_GRAVITY * state.age * state.age;
      } else {
        height = 0.02 + 0.02 * Math.sin((state.age - flightTime) * 2.2);
      }

      group.position.set(
        state.anchor.x,
        state.anchor.y + height,
        state.anchor.z,
      );

      // Guarantee the target stays within a safe hand reach of the user.
      tmpA.subVectors(group.position, this.userPosition);
      const distance = tmpA.length();
      if (distance > MAX_REACH) {
        tmpA.multiplyScalar(MAX_REACH / distance);
        group.position.copy(this.userPosition).add(tmpA);
        state.anchor.copy(group.position);
        state.anchor.y -= height;
      }

      group.rotation.y += dt * 1.1 * state.spec.spin;

      if (state.age > TARGET_LIFETIME) {
        this.resolveTarget(group, "missed");
      }
    }
  }

  clearTargets() {
    for (const group of this.targets.slice()) {
      this.disposeTarget(group);
    }
    this.targets.length = 0;
  }

  disposeTarget(group) {
    delete group.userData.xrblocksDevtools;
    if (group.parent) group.parent.remove(group);
    const material = group.userData.fruitMaterial;
    if (material) material.dispose();
    const index = this.targets.indexOf(group);
    if (index >= 0) this.targets.splice(index, 1);
  }

  // --- Resolving -----------------------------------------------------------
  resolveTarget(group, how) {
    const state = group.userData.target;
    if (!state || state.resolved) return;
    state.resolved = true;

    const position = group.position.clone();
    const kind = state.kind;

    if (kind === "fruit" && how === "sliced") {
      this.score += FRUIT_SCORE;
      this.spawnHalves(position, group.userData.fruitMaterial);
      this.statusText.text = `Sliced! +${FRUIT_SCORE}`;
    } else if (kind === "bomb" && how === "sliced") {
      this.lives = Math.max(0, this.lives - 1);
      this.spawnBurst(position, 0x37474f);
      this.statusText.text = "Bomb! You lost a life.";
    } else {
      this.spawnBurst(position, 0x9e9e9e);
      this.statusText.text = kind === "bomb" ? "Bomb expired." : "Missed!";
    }

    this.disposeTarget(group);
    this.resolved++;
    this.refreshHud();

    if (this.lives <= 0) {
      this.finishRound(false);
      return;
    }
    if (this.resolved >= ROUND_SIZE) {
      this.finishRound(true);
      return;
    }
    this.spawnTimer = NEXT_SPAWN_DELAY;
  }

  spawnHalves(position, sourceMaterial) {
    const color = sourceMaterial ? sourceMaterial.color.getHex() : 0xff5252;
    for (let i = 0; i < 2; i++) {
      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.4,
        transparent: true,
        opacity: 1,
      });
      const half = new THREE.Mesh(this.halfGeometry, material);
      half.name = "FruitHalf";
      half.position.copy(position);
      half.rotation.z = i === 0 ? Math.PI / 2 : -Math.PI / 2;
      const velocity = new THREE.Vector3(i === 0 ? -0.45 : 0.45, 0.25, 0);
      this.effectsGroup.add(half);
      this.effects.push({
        object: half,
        material,
        velocity,
        life: HALF_LIFETIME,
        maxLife: HALF_LIFETIME,
        spin: i === 0 ? -4 : 4,
      });
    }
  }

  spawnBurst(position, color) {
    const material = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.9,
    });
    const burst = new THREE.Mesh(this.burstGeometry, material);
    burst.name = "ResolveBurst";
    burst.position.copy(position);
    this.effectsGroup.add(burst);
    this.effects.push({
      object: burst,
      material,
      velocity: new THREE.Vector3(0, 0.1, 0),
      life: BURST_LIFETIME,
      maxLife: BURST_LIFETIME,
      grow: 2.5,
      spin: 0,
    });
  }

  updateEffects(dt) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i];
      effect.life -= dt;
      if (effect.life <= 0) {
        this.effectsGroup.remove(effect.object);
        effect.material.dispose();
        this.effects.splice(i, 1);
        continue;
      }
      effect.velocity.y -= 0.9 * dt;
      effect.object.position.addScaledVector(effect.velocity, dt);
      effect.object.rotation.x += (effect.spin || 0) * dt;
      const t = 1 - effect.life / effect.maxLife;
      effect.material.opacity = Math.max(0, 1 - t);
      if (effect.grow) {
        const scale = 1 + effect.grow * t;
        effect.object.scale.setScalar(scale);
      }
    }
  }

  clearEffects() {
    for (const effect of this.effects) {
      this.effectsGroup.remove(effect.object);
      effect.material.dispose();
    }
    this.effects.length = 0;
  }

  // --- Slicing -------------------------------------------------------------
  collectBladePoints(points) {
    points.length = 0;
    this.getUserPosition(this.userPosition);
    const hands = xb.user?.hands;
    if (hands) {
      for (let handIndex = 0; handIndex < 2; handIndex++) {
        const hand = hands.hands?.[handIndex];
        const joint =
          hand?.joints?.["index-finger-tip"] ??
          hand?.joints?.["middle-finger-tip"] ??
          hand?.joints?.["wrist"];
        if (!joint || joint.visible === false) continue;
        const position = joint.getWorldPosition(new THREE.Vector3());
        if (position.lengthSq() < 1e-8) continue;
        points.push({
          id: `hand-${handIndex}`,
          position,
          // Hand motion relative to the head, so walking alone is not a swing.
          relative: position.clone().sub(this.userPosition),
        });
      }
    }
    const controllers = xb.user?.controllers;
    if (controllers) {
      for (let i = 0; i < 2; i++) {
        const controller = controllers[i];
        if (!controller || controller.visible === false) continue;
        const position = controller.getWorldPosition(new THREE.Vector3());
        if (position.lengthSq() < 1e-8) continue;
        points.push({
          id: `controller-${i}`,
          position,
          relative: position.clone().sub(this.userPosition),
        });
      }
    }
    return points;
  }

  updateSlicing(dt) {
    if (dt <= 0) return;
    const points = this.collectBladePoints(this.bladePoints ?? []);
    this.bladePoints = points;

    const seen = new Set();
    for (const point of points) {
      seen.add(point.id);
      let blade = this.blades.get(point.id);
      if (!blade) {
        blade = {
          previous: point.position.clone(),
          previousRelative: point.relative.clone(),
          speed: 0,
        };
        this.blades.set(point.id, blade);
        continue;
      }
      const travel = point.relative.distanceTo(blade.previousRelative);
      blade.speed = travel > MAX_BLADE_TRAVEL ? 0 : travel / dt;

      if (blade.speed >= SLICE_SPEED) {
        for (const group of this.targets.slice()) {
          const state = group.userData.target;
          if (!state || state.resolved) continue;
          const distance = segmentPointDistance(
            blade.previous,
            point.position,
            group.position,
          );
          if (distance <= HIT_RADIUS + BLADE_RADIUS) {
            this.resolveTarget(group, "sliced");
          }
        }
      }
      blade.previous.copy(point.position);
      blade.previousRelative.copy(point.relative);
    }

    for (const id of Array.from(this.blades.keys())) {
      if (!seen.has(id)) this.blades.delete(id);
    }
  }

  /**
   * A deliberate ray select (desktop mouse or hand ray) also cuts a target.
   * Direct contact is ignored here: only a fast hand crossing cuts by touch.
   */
  onObjectSelectStart(event) {
    if (!this.playing) return;
    if (event?.source?.type === "direct-touch") return;
    let object = event?.target ?? event?.surface;
    while (object) {
      if (object.userData?.target && this.targets.includes(object)) {
        this.resolveTarget(object, "sliced");
        return;
      }
      object = object.parent;
    }
  }

  update() {
    const dt = Math.min(xb.core?.timer?.getDelta?.() ?? 0.016, 0.1);
    this.updateEffects(dt);

    if (!this.playing) {
      this.blades.clear();
      return;
    }

    this.updateTargets(dt);
    this.updateSlicing(dt);

    if (
      this.playing &&
      this.nextSpawnIndex < ROUND_SIZE &&
      this.targets.length < MAX_ACTIVE_TARGETS
    ) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTarget(this.round[this.nextSpawnIndex]);
        this.nextSpawnIndex++;
      }
    }
  }

  dispose() {
    this.clearTargets();
    this.clearEffects();
    for (const resource of this.ownedResources ?? []) {
      resource.dispose?.();
    }
  }
}

function start() {
  const options = new xb.Options();
  options.enableHands();
  options.hands.visualization = true;
  options.hands.visualizeJoints = true;
  options.enableReticles();
  options.controllers.visualizeRays = true;
  options.simulator.defaultMode = xb.SimulatorMode.POSE;
  options.simulator.reachDistance.enabled = true;
  options.simulator.reachDistance.radius = 0.75;
  options.xrButton.showEnterSimulatorButton = true;

  xb.add(new FruitSlicer());
  xb.init(options);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
