import RAPIER from "@dimforge/rapier3d-simd-compat";
import * as THREE from "three";
import * as xb from "xrblocks";

/** Roll dimensions in meters. */
const ROLL_RADIUS = 0.055;
const ROLL_HEIGHT = 0.11;
const ROLL_HOLE_RADIUS = 0.018;

/** Shower tuning. */
const SPAWN_INTERVAL_MS = 700;
const MAX_ACTIVE_ROLLS = 24;
const SPAWN_HEIGHT_ABOVE_HEAD = 0.4;
const MIN_SPAWN_HEIGHT = 1.8;
const MAX_SPAWN_HEIGHT = 2.2;
const SPAWN_SPREAD = 1.4;
const MAX_LIFETIME_MS = 11000;
const LINGER_AFTER_LANDING_MS = 1600;
const RESTING_SPEED = 0.18;
const RESTING_TIME_MS = 350;
const FLOOR_SAFETY_Y = -0.04;

/**
 * Toilet Paper Rain: a passive room-scale shower of toilet paper rolls that
 * fall under gravity, collide with the detected environment, and disappear
 * shortly after landing.
 */
class ToiletPaperRain extends xb.Script {
  constructor() {
    super();
    this.rolls = [];
    this.physics = null;
    this.RAPIER = null;
    this.lastSpawnTime = -Infinity;
    this.spawnCenter = new THREE.Vector3(0, 0, 0);
    this.cameraPosition = new THREE.Vector3();

    // Shared resources owned by this script.
    this.paperMaterial = new THREE.MeshStandardMaterial({
      color: 0xfdfdfa,
      roughness: 0.92,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
    this.coreMaterial = new THREE.MeshStandardMaterial({
      color: 0xc8a071,
      roughness: 0.95,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
    this.tubeGeometry = new THREE.CylinderGeometry(
      ROLL_RADIUS,
      ROLL_RADIUS,
      ROLL_HEIGHT,
      28,
      1,
      true
    );
    this.capGeometry = new THREE.RingGeometry(
      ROLL_HOLE_RADIUS,
      ROLL_RADIUS,
      28
    );
    this.coreGeometry = new THREE.CylinderGeometry(
      ROLL_HOLE_RADIUS,
      ROLL_HOLE_RADIUS,
      ROLL_HEIGHT * 1.02,
      20,
      1,
      true
    );
    this.sheetGeometry = new THREE.PlaneGeometry(
      ROLL_HEIGHT * 0.9,
      ROLL_RADIUS * 1.6
    );
  }

  init() {
    this.add(new THREE.HemisphereLight(0xffffff, 0x666666, 3));
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(1.5, 4, 1.5);
    this.add(sun);
  }

  initPhysics(physics) {
    this.physics = physics;
    this.RAPIER = physics.RAPIER;
    // Safety floor at the environment floor level (local-floor origin) so
    // rolls can never fall below the room floor, even before the depth or
    // scene mesh colliders are available.
    this.floorBody = physics.blendedWorld.createRigidBody(
      this.RAPIER.RigidBodyDesc.fixed().setTranslation(0, FLOOR_SAFETY_Y, 0)
    );
    physics.blendedWorld.createCollider(
      this.RAPIER.ColliderDesc.cuboid(25, 0.04, 25).setRestitution(0.25),
      this.floorBody
    );
  }

  /** Creates a recognizable toilet paper roll mesh group. */
  createRollObject() {
    const roll = new THREE.Group();
    roll.name = "ToiletPaperRoll";

    const tube = new THREE.Mesh(this.tubeGeometry, this.paperMaterial);
    roll.add(tube);

    for (const sign of [1, -1]) {
      const cap = new THREE.Mesh(this.capGeometry, this.paperMaterial);
      cap.rotation.x = -sign * Math.PI / 2;
      cap.position.y = (sign * ROLL_HEIGHT) / 2;
      roll.add(cap);
    }

    const core = new THREE.Mesh(this.coreGeometry, this.coreMaterial);
    roll.add(core);

    // A loose hanging sheet makes the roll instantly recognizable.
    const sheet = new THREE.Mesh(this.sheetGeometry, this.paperMaterial);
    sheet.rotation.y = Math.PI / 2;
    sheet.position.set(0, -ROLL_RADIUS * 0.55, ROLL_RADIUS * 1.02);
    roll.add(sheet);

    roll.userData.xrblocksDevtools = {tag: "falling-toilet-paper-roll"};
    return roll;
  }

  /** Spawns one dynamic roll above a clear floor area. */
  spawnRoll(now) {
    if (!this.physics) return;
    const center = this.getSpawnCenter();
    const baseHeight = THREE.MathUtils.clamp(
      this.cameraPosition.y + SPAWN_HEIGHT_ABOVE_HEAD,
      MIN_SPAWN_HEIGHT,
      MAX_SPAWN_HEIGHT
    );
    const position = new THREE.Vector3(
      center.x + (Math.random() * 2 - 1) * SPAWN_SPREAD,
      baseHeight + Math.random() * 0.25,
      center.z + (Math.random() * 2 - 1) * SPAWN_SPREAD
    );

    const object = this.createRollObject();
    object.position.copy(position);
    object.quaternion.setFromEuler(
      new THREE.Euler(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      )
    );
    this.add(object);

    const body = this.physics.blendedWorld.createRigidBody(
      this.RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(position.x, position.y, position.z)
        .setRotation({
          x: object.quaternion.x,
          y: object.quaternion.y,
          z: object.quaternion.z,
          w: object.quaternion.w,
        })
        .setLinvel(
          (Math.random() - 0.5) * 0.3,
          -0.2,
          (Math.random() - 0.5) * 0.3
        )
        .setAngvel({
          x: (Math.random() - 0.5) * 3,
          y: (Math.random() - 0.5) * 3,
          z: (Math.random() - 0.5) * 3,
        })
        .setCcdEnabled(true)
    );
    this.physics.blendedWorld.createCollider(
      this.RAPIER.ColliderDesc.cylinder(ROLL_HEIGHT / 2, ROLL_RADIUS)
        .setRestitution(0.42)
        .setFriction(0.6)
        .setDensity(120),
      body
    );

    this.rolls.push({object, body, bornAt: now, restingSince: 0, landedAt: 0});
    while (this.rolls.length > MAX_ACTIVE_ROLLS) {
      this.removeRoll(this.rolls[0]);
    }
  }

  getSpawnCenter() {
    const camera = xb.core?.camera;
    if (camera) {
      camera.getWorldPosition(this.cameraPosition);
      this.spawnCenter.set(this.cameraPosition.x, 0, this.cameraPosition.z);
    }
    return this.spawnCenter;
  }

  update() {
    if (!this.physics) return;
    const now = performance.now();
    if (now - this.lastSpawnTime >= SPAWN_INTERVAL_MS) {
      this.lastSpawnTime = now;
      this.spawnRoll(now);
    }
  }

  physicsStep() {
    if (!this.physics) return;
    const now = performance.now();
    for (const roll of [...this.rolls]) {
      const {object, body} = roll;
      object.position.copy(body.translation());
      object.quaternion.copy(body.rotation());

      // Landing detection: the roll has come (nearly) to rest.
      const velocity = body.linvel();
      const speed = Math.hypot(velocity.x, velocity.y, velocity.z);
      if (speed < RESTING_SPEED) {
        if (roll.restingSince === 0) roll.restingSince = now;
        if (!roll.landedAt && now - roll.restingSince > RESTING_TIME_MS) {
          roll.landedAt = now;
        }
      } else {
        roll.restingSince = 0;
      }

      const landedTooLong =
        roll.landedAt && now - roll.landedAt > LINGER_AFTER_LANDING_MS;
      if (
        landedTooLong ||
        now - roll.bornAt > MAX_LIFETIME_MS ||
        object.position.y < -1.5
      ) {
        this.removeRoll(roll);
      }
    }
  }

  removeRoll(roll) {
    if (!roll) return;
    this.rolls = this.rolls.filter((candidate) => candidate !== roll);
    if (roll.body) this.physics?.blendedWorld.removeRigidBody(roll.body);
    delete roll.object.userData.xrblocksDevtools;
    this.remove(roll.object);
  }

  dispose() {
    for (const roll of [...this.rolls]) this.removeRoll(roll);
    if (this.floorBody) {
      this.physics?.blendedWorld.removeRigidBody(this.floorBody);
      this.floorBody = null;
    }
    for (const geometry of [
      this.tubeGeometry,
      this.capGeometry,
      this.coreGeometry,
      this.sheetGeometry,
    ]) {
      geometry.dispose();
    }
    this.paperMaterial.dispose();
    this.coreMaterial.dispose();
  }
}

const options = new xb.Options();
options.physics.RAPIER = RAPIER;
options.depth = new xb.DepthOptions(xb.xrDepthMeshPhysicsOptions);
options.reticles.enabled = false;
options.xrButton.showEnterSimulatorButton = true;
options.setAppTitle("Toilet Paper Rain");
options.setAppDescription("Toilet paper rolls rain down and pile up in your room.");

document.addEventListener("DOMContentLoaded", async () => {
  xb.add(new ToiletPaperRain());
  await xb.init(options);
});
