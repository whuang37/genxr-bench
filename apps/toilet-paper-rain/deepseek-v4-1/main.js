import RAPIER from "@dimforge/rapier3d-simd-compat";
import * as THREE from "three";
import * as xb from "xrblocks";

const ROLL_TAG = "falling-toilet-paper-roll";

// Toilet paper roll dimensions (meters).
const ROLL_RADIUS = 0.058;
const ROLL_HEIGHT = 0.12;
const ROLL_HALF_HEIGHT = ROLL_HEIGHT / 2;
const TUBE_RADIUS = 0.021;

// Passive shower tuning.
const SPAWN_INTERVAL_MS = 380;
const MAX_ACTIVE_ROLLS = 20;
const MAX_LIFETIME_MS = 8000;
const SETTLED_SPEED = 0.28; // m/s
const SETTLED_HOLD_MS = 380;
const LANDED_LIFETIME_MS = 1100;
const VANISH_DURATION_MS = 160;
const FLOOR_RECHECK_MS = 400;
const FLOOR_CALIBRATION_MS = 250;
const ENVIRONMENT_GRACE_MS = 1500;

// Spawn cloud above the viewer.
const SPAWN_RADIUS_MIN = 0.2;
const SPAWN_RADIUS_MAX = 1.3;
const SPAWN_HEIGHT_MIN = 0.3;
const SPAWN_HEIGHT_MAX = 0.62;
const SPAWN_CLEARANCE = 0.7; // required open drop below the viewer
const FALLBACK_FLOOR_Y = 0;

const scratch = {
  camera: new THREE.Vector3(),
  down: new THREE.Vector3(0, -1, 0),
  quaternion: new THREE.Quaternion(),
  euler: new THREE.Euler(),
};

/**
 * A passive, room-scale shower of toilet paper rolls.
 *
 * Rolls spawn overhead on a steady interval, fall as dynamic Rapier bodies,
 * collide with the detected room geometry (and a guaranteed floor), then
 * disappear shortly after settling. There are no controls or interactions.
 */
class ToiletPaperRain extends xb.Script {
  constructor() {
    super();
    this.name = "ToiletPaperRain";
    this.rolls = [];
    this.physics = null;
    this.RAPIER = null;
    this.floorBody = null;
    this.floorCollider = null;
    this.lastSpawnMs = -Infinity;
    this.detectedFloorY = Infinity;
    this.lastFloorCalibrationMs = -Infinity;
    this.spawnArmed = false;
  }

  init() {
    this.createAssets();
    this.addLights();
  }

  createAssets() {
    this.paperMaterial = new THREE.MeshStandardMaterial({
      color: 0xf6f1e4,
      roughness: 0.9,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
    this.tubeMaterial = new THREE.MeshStandardMaterial({
      color: 0xb07c40,
      roughness: 1.0,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });

    this.outerGeometry = new THREE.CylinderGeometry(
      ROLL_RADIUS,
      ROLL_RADIUS,
      ROLL_HEIGHT,
      32,
      1,
      true
    );
    this.capGeometry = new THREE.RingGeometry(
      TUBE_RADIUS,
      ROLL_RADIUS,
      32,
      1
    );
    this.tubeGeometry = new THREE.CylinderGeometry(
      TUBE_RADIUS,
      TUBE_RADIUS,
      ROLL_HEIGHT + 0.008,
      24,
      1,
      true
    );
  }

  addLights() {
    this.add(new THREE.HemisphereLight(0xffffff, 0x5a5a66, 2.8));

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(1.5, 4.0, 1.0);
    this.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xdfe8ff, 0.6);
    fillLight.position.set(-1.5, 2.0, -1.0);
    this.add(fillLight);
  }

  initPhysics(physics) {
    this.physics = physics;
    this.RAPIER = physics.RAPIER;

    // Guaranteed floor at the local-floor plane. This keeps rolls from ever
    // falling into the void when a device provides no room geometry, and acts
    // as a backstop beneath the detected floor.
    this.floorBody = physics.blendedWorld.createRigidBody(
      physics.RAPIER.RigidBodyDesc.fixed().setTranslation(
        0,
        FALLBACK_FLOOR_Y - 0.05,
        0
      )
    );
    this.floorCollider = physics.blendedWorld.createCollider(
      physics.RAPIER.ColliderDesc.cuboid(10, 0.05, 10)
        .setFriction(0.9)
        .setRestitution(0.1),
      this.floorBody
    );
  }

  update() {
    if (!this.physics || !this.RAPIER) return;

    const now = this.simNow();
    if (!Number.isFinite(this.detectedFloorY)) {
      // Keep looking for real room geometry until it appears, even if the
      // shower already started against the base floor.
      this.calibrateEnvironmentFloor(now);
    }
    if (
      !this.spawnArmed &&
      (Number.isFinite(this.detectedFloorY) || now >= ENVIRONMENT_GRACE_MS)
    ) {
      this.spawnArmed = true;
    }

    if (
      this.spawnArmed &&
      this.rolls.length < MAX_ACTIVE_ROLLS &&
      now - this.lastSpawnMs >= SPAWN_INTERVAL_MS
    ) {
      this.lastSpawnMs = now;
      this.spawnRoll(now);
    }

    this.updateVanishing(now);
  }

  physicsStep() {
    if (!this.physics) return;
    const now = this.simNow();

    for (const roll of [...this.rolls]) {
      if (roll.vanishStartMs !== null) continue;

      const position = roll.body.translation();

      if (now - roll.floorCheckMs >= FLOOR_RECHECK_MS) {
        roll.floorCheckMs = now;
        const surfaceY = this.surfaceBelow(
          position.x,
          position.y,
          position.z,
          true
        );
        if (surfaceY !== null) {
          roll.floorY = surfaceY;
          this.noteFloor(surfaceY);
        }
      }

      // If the room geometry arrived after a roll had already landed on the
      // base floor, lift that roll back up to the detected floor. Only rolls
      // that never found real room geometry are rescued, so a roll resting on
      // furniture is never displaced.
      if (Number.isFinite(this.detectedFloorY)) {
        const globalMinY = this.detectedFloorY + ROLL_RADIUS;
        if (
          roll.floorY <= FALLBACK_FLOOR_Y + 0.03 &&
          position.y < globalMinY - 0.01
        ) {
          roll.body.setTranslation(
            {x: position.x, y: globalMinY, z: position.z},
            true
          );
          const velocity = roll.body.linvel();
          roll.body.setLinvel(
            {x: velocity.x, y: Math.max(0, velocity.y), z: velocity.z},
            true
          );
          position.y = globalMinY;
          roll.floorY = this.detectedFloorY;
        }
      }

      // Never let a roll sink below its environment floor.
      const minY = roll.floorY + ROLL_RADIUS;
      if (position.y < minY - 0.001) {
        roll.body.setTranslation(
          {x: position.x, y: minY, z: position.z},
          true
        );
        const velocity = roll.body.linvel();
        if (velocity.y < 0) {
          roll.body.setLinvel(
            {x: velocity.x, y: 0, z: velocity.z},
            true
          );
        }
        position.y = minY;
      }

      roll.object.position.set(position.x, position.y, position.z);
      roll.object.quaternion.copy(roll.body.rotation());

      // A roll has landed when it is near a surface and has stopped moving.
      const velocity = roll.body.linvel();
      const speed = Math.hypot(velocity.x, velocity.y, velocity.z);
      const nearFloor = position.y <= roll.floorY + ROLL_RADIUS + 0.12;
      if (nearFloor && speed < SETTLED_SPEED) {
        roll.settledSinceMs ??= now;
      } else {
        roll.settledSinceMs = null;
      }

      if (
        roll.landedAtMs === null &&
        roll.settledSinceMs !== null &&
        now - roll.settledSinceMs >= SETTLED_HOLD_MS
      ) {
        roll.landedAtMs = now;
      }

      const landedLongEnough =
        roll.landedAtMs !== null &&
        now - roll.landedAtMs >= LANDED_LIFETIME_MS;
      const livedLongEnough = now - roll.spawnMs >= MAX_LIFETIME_MS;
      if (landedLongEnough || livedLongEnough) {
        this.startVanish(roll, now);
      }
    }
  }

  spawnRoll(now) {
    const {RAPIER, blendedWorld} = this.physics;
    const spawn = this.pickSpawnPoint();
    if (!spawn) return;

    const roll = this.createRollObject();
    roll.position.set(spawn.x, spawn.y, spawn.z);

    // Random tumble orientation so rolls fall, bounce, and roll naturally.
    scratch.euler.set(
      (Math.random() - 0.5) * Math.PI,
      Math.random() * Math.PI * 2,
      (Math.random() - 0.5) * Math.PI,
      "YXZ"
    );
    scratch.quaternion.setFromEuler(scratch.euler);
    roll.quaternion.copy(scratch.quaternion);

    const body = blendedWorld.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(spawn.x, spawn.y, spawn.z)
        .setRotation(scratch.quaternion)
        .setLinvel(
          (Math.random() - 0.5) * 0.4,
          -0.2 - Math.random() * 0.4,
          (Math.random() - 0.5) * 0.4
        )
        .setAngvel({
          x: (Math.random() - 0.5) * 5,
          y: (Math.random() - 0.5) * 5,
          z: (Math.random() - 0.5) * 5,
        })
        .setCcdEnabled(true)
        .setLinearDamping(0.05)
        .setAngularDamping(0.08)
    );

    blendedWorld.createCollider(
      RAPIER.ColliderDesc.cylinder(ROLL_HALF_HEIGHT, ROLL_RADIUS)
        .setDensity(180)
        .setFriction(0.75)
        .setRestitution(0.32),
      body
    );

    this.add(roll);
    this.rolls.push({
      object: roll,
      body,
      spawnMs: now,
      floorY: spawn.floorY,
      floorCheckMs: now,
      settledSinceMs: null,
      landedAtMs: null,
      vanishStartMs: null,
    });
  }

  createRollObject() {
    // The outer paper cylinder is the roll's semantic owner. The caps and
    // cardboard core are decorative children.
    const roll = new THREE.Mesh(this.outerGeometry, this.paperMaterial);
    roll.name = "toiletPaperRoll";
    roll.castShadow = true;
    roll.userData.xrblocksDevtools = {tag: ROLL_TAG};

    const capTop = new THREE.Mesh(this.capGeometry, this.paperMaterial);
    capTop.rotation.x = -Math.PI / 2;
    capTop.position.y = ROLL_HALF_HEIGHT;

    const capBottom = new THREE.Mesh(this.capGeometry, this.paperMaterial);
    capBottom.rotation.x = Math.PI / 2;
    capBottom.position.y = -ROLL_HALF_HEIGHT;

    const tube = new THREE.Mesh(this.tubeGeometry, this.tubeMaterial);
    tube.castShadow = true;

    roll.add(capTop, capBottom, tube);
    return roll;
  }

  /**
   * Chooses a varied overhead spawn point above a clear floor area around the
   * viewer, and reports the height of the surface directly below it.
   */
  pickSpawnPoint() {
    const camera = scratch.camera;
    xb.core.camera.getWorldPosition(camera);

    let fallback = null;
    for (let attempt = 0; attempt < 6; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const radius =
        SPAWN_RADIUS_MIN +
        Math.sqrt(Math.random()) * (SPAWN_RADIUS_MAX - SPAWN_RADIUS_MIN);
      const x = camera.x + Math.cos(angle) * radius;
      const z = camera.z + Math.sin(angle) * radius;
      const y =
        camera.y +
        SPAWN_HEIGHT_MIN +
        Math.random() * (SPAWN_HEIGHT_MAX - SPAWN_HEIGHT_MIN);

      const surfaceY = this.surfaceBelow(x, y, z);
      this.noteFloor(surfaceY);
      const point = {x, y, z, floorY: surfaceY ?? FALLBACK_FLOOR_Y};
      if (surfaceY === null || surfaceY <= camera.y - SPAWN_CLEARANCE) {
        return point;
      }
      fallback ??= point;
    }

    return (
      fallback ?? {
        x: camera.x,
        y: camera.y + 0.45,
        z: camera.z,
        floorY: FALLBACK_FLOOR_Y,
      }
    );
  }

  /** Height of the first fixed surface below the given point, if any. */
  surfaceBelow(x, y, z, excludeFallback = false) {
    if (!this.physics) return null;
    const {RAPIER, blendedWorld} = this.physics;
    const origin = {x, y: y + 0.01, z};
    const ray = new RAPIER.Ray(origin, scratch.down);
    const hit = blendedWorld.castRay(
      ray,
      20,
      false,
      RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC,
      undefined,
      excludeFallback ? this.floorCollider : undefined
    );
    if (!hit) return null;
    return origin.y - hit.timeOfImpact;
  }

  /**
   * Samples the room below and around the viewer to learn the real
   * environment floor height before the shower starts.
   */
  calibrateEnvironmentFloor(now) {
    if (now - this.lastFloorCalibrationMs < FLOOR_CALIBRATION_MS) return;
    this.lastFloorCalibrationMs = now;

    const camera = scratch.camera;
    xb.core.camera.getWorldPosition(camera);
    const offsets = [
      [0, 0],
      [0.6, 0],
      [-0.6, 0],
      [0, 0.6],
      [0, -0.6],
    ];
    for (const [dx, dz] of offsets) {
      const surfaceY = this.surfaceBelow(
        camera.x + dx,
        camera.y,
        camera.z + dz,
        true
      );
      this.noteFloor(surfaceY);
    }
  }

  /** Records a candidate environment floor, keeping the lowest one seen. */
  noteFloor(surfaceY) {
    if (
      surfaceY === null ||
      !Number.isFinite(surfaceY) ||
      surfaceY <= FALLBACK_FLOOR_Y + 0.03 ||
      surfaceY > 10
    ) {
      return;
    }
    if (surfaceY < this.detectedFloorY) this.detectedFloorY = surfaceY;
  }

  startVanish(roll, now) {
    if (roll.vanishStartMs !== null) return;
    roll.vanishStartMs = now;
    this.physics.blendedWorld.removeRigidBody(roll.body);
    roll.body = null;
  }

  updateVanishing(now) {
    for (const roll of [...this.rolls]) {
      if (roll.vanishStartMs === null) continue;
      const progress = (now - roll.vanishStartMs) / VANISH_DURATION_MS;
      if (progress >= 1) {
        this.removeRoll(roll);
        continue;
      }
      const scale = Math.max(0, 1 - progress);
      roll.object.scale.setScalar(scale);
    }
  }

  removeRoll(roll) {
    roll.object.removeFromParent();
    roll.object.scale.set(1, 1, 1);
    this.rolls = this.rolls.filter((candidate) => candidate !== roll);
  }

  simNow() {
    return xb.core.elapsedTime * 1000;
  }

  dispose() {
    for (const roll of [...this.rolls]) {
      if (roll.body && this.physics) {
        this.physics.blendedWorld.removeRigidBody(roll.body);
        roll.body = null;
      }
      roll.object.removeFromParent();
    }
    this.rolls = [];

    if (this.floorBody && this.physics) {
      this.physics.blendedWorld.removeRigidBody(this.floorBody);
    }
    this.floorBody = null;

    this.outerGeometry?.dispose();
    this.capGeometry?.dispose();
    this.tubeGeometry?.dispose();
    this.paperMaterial?.dispose();
    this.tubeMaterial?.dispose();
  }
}

const options = new xb.Options();
options.physics.RAPIER = RAPIER;
// Use the detected platform room geometry (floor, walls, tables) as static
// colliders so rolls collide with the real environment.
options.world.enableMeshDetection();
options.reticles.enabled = false;
options.setAppTitle("Toilet Paper Rain");
options.setAppDescription("A passive shower of falling toilet paper rolls.");

document.addEventListener("DOMContentLoaded", async () => {
  xb.add(new ToiletPaperRain());
  await xb.init(options);
});
