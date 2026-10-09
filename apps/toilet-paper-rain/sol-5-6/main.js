import RAPIER from "@dimforge/rapier3d-simd-compat";
import * as THREE from "three";
import * as xb from "xrblocks";

// Dimensions are in meters. A real household roll is roughly 11 cm across.
const ROLL_RADIUS = 0.065;
const ROLL_HALF_WIDTH = 0.05;
const CORE_RADIUS = 0.021;
const VISUAL_ROLL_RADIUS = ROLL_RADIUS + 0.003;
const VISUAL_ROLL_HALF_WIDTH = ROLL_HALF_WIDTH * 1.02;
const FLOOR_TOP_Y = 0;
const FLOOR_CLEARANCE = 0.001;

const SPAWN_INTERVAL_MS = 650;
const MAX_ACTIVE_ROLLS = 14;
const MAX_LIFETIME_MS = 11000;
const LANDED_GRACE_MS = 2200;
const SETTLE_SPEED = 0.14;
const SPAWN_HEIGHT_MIN = 2.25;
const SPAWN_HEIGHT_MAX = 2.85;

/**
 * Passive, bounded physics shower. Every entry owns one tagged visible roll and
 * one Rapier rigid body. Room depth meshes add environment colliders to this
 * same world; the fixed local-floor plane remains as an always-available guard.
 */
class ToiletPaperRain extends xb.Script {
  constructor() {
    super();

    this.rolls = [];
    this.physics = undefined;
    this.RAPIER = undefined;
    this.floorBody = undefined;
    this.lastSpawnAt = -Infinity;
    this.randomState = 0x7f4a7c15;

    // Geometry and materials are shared by every roll and disposed once.
    this.paperSideGeometry = new THREE.CylinderGeometry(
      ROLL_RADIUS,
      ROLL_RADIUS,
      ROLL_HALF_WIDTH * 2,
      36,
      1,
      true
    );
    this.paperEndGeometry = new THREE.RingGeometry(
      CORE_RADIUS,
      ROLL_RADIUS,
      36,
      1
    );
    this.coreGeometry = new THREE.CylinderGeometry(
      CORE_RADIUS,
      CORE_RADIUS,
      ROLL_HALF_WIDTH * 2.04,
      24,
      1,
      true
    );
    this.paperMaterial = new THREE.MeshStandardMaterial({
      color: 0xfffdf4,
      roughness: 0.96,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    this.paperEndMaterial = new THREE.MeshStandardMaterial({
      color: 0xf4efe1,
      roughness: 1,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    this.coreMaterial = new THREE.MeshStandardMaterial({
      color: 0xa87848,
      roughness: 0.9,
      metalness: 0,
      side: THREE.DoubleSide,
    });
  }

  init() {
    // Supply a useful first frame before Enter XR. Simulator and XR tracking
    // subsequently own and replace this camera pose.
    xb.core.camera.position.set(0, 1.45, 0);
    xb.core.camera.lookAt(0, 1.1, -1);

    const ambient = new THREE.HemisphereLight(0xfffdf6, 0x465266, 2.3);
    this.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xfff4df, 2.8);
    keyLight.position.set(-2.5, 4.5, 1.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -3;
    keyLight.shadow.camera.right = 3;
    keyLight.shadow.camera.top = 3;
    keyLight.shadow.camera.bottom = -3;
    keyLight.shadow.camera.near = 0.1;
    keyLight.shadow.camera.far = 8;
    this.add(keyLight);

    // The translucent surface makes local-floor obvious on desktop without
    // obscuring passthrough. Detected depth geometry separately receives shade.
    this.floorVisual = new THREE.Mesh(
      new THREE.CircleGeometry(2.15, 64),
      new THREE.MeshStandardMaterial({
        color: 0xdce5ed,
        transparent: true,
        opacity: 0.16,
        roughness: 1,
        metalness: 0,
        depthWrite: false,
      })
    );
    this.floorVisual.rotation.x = -Math.PI / 2;
    this.floorVisual.position.set(0, FLOOR_TOP_Y + 0.001, -1.05);
    this.floorVisual.receiveShadow = true;
    this.add(this.floorVisual);
  }

  initPhysics(physics) {
    this.physics = physics;
    this.RAPIER = physics.RAPIER;

    // local-floor is XR Blocks' default reference space, therefore y=0 is the
    // physical floor. This backstop remains available while depth warms up.
    this.floorBody = physics.blendedWorld.createRigidBody(
      this.RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.04, 0)
    );
    physics.blendedWorld.createCollider(
      this.RAPIER.ColliderDesc.cuboid(20, 0.04, 20)
        .setFriction(0.92)
        .setRestitution(0.16),
      this.floorBody
    );
  }

  update() {
    if (!this.physics) return;

    const now = performance.now();
    if (now - this.lastSpawnAt >= SPAWN_INTERVAL_MS) {
      this.spawnRoll(now);
      this.lastSpawnAt = now;
    }

    // Lifetime removal belongs to the frame loop so it also runs while bodies
    // sleep and no longer need visual pose updates.
    for (const roll of [...this.rolls]) {
      if (
        now - roll.bornAt >= MAX_LIFETIME_MS ||
        (roll.settledAt !== undefined && now - roll.settledAt >= LANDED_GRACE_MS)
      ) {
        this.removeRoll(roll);
      }
    }
  }

  physicsStep() {
    if (!this.physics) return;

    const now = performance.now();
    for (const roll of this.rolls) {
      const translation = roll.body.translation();
      const rotation = roll.body.rotation();
      roll.object.position.copy(translation);
      roll.object.quaternion.copy(rotation);

      // The fixed collider already prevents crossing the floor. This explicit
      // correction is a final invariant guard against tunneling or noisy room
      // mesh updates. Its orientation-aware support height keeps every visible
      // part (including the raised paper seam) above local-floor before render.
      const minCenterY =
        FLOOR_TOP_Y + FLOOR_CLEARANCE + this.getVerticalSupport(rotation);
      if (translation.y < minCenterY) {
        roll.body.setTranslation(
          {
            x: translation.x,
            y: minCenterY,
            z: translation.z,
          },
          true
        );
        const velocity = roll.body.linvel();
        if (velocity.y < 0) {
          roll.body.setLinvel(
            {x: velocity.x, y: Math.min(0.35, -velocity.y * 0.16), z: velocity.z},
            true
          );
        }
        roll.object.position.y = minCenterY;
      }

      const linearVelocity = roll.body.linvel();
      const angularVelocity = roll.body.angvel();
      const linearSpeedSquared =
        linearVelocity.x * linearVelocity.x +
        linearVelocity.y * linearVelocity.y +
        linearVelocity.z * linearVelocity.z;
      const angularSpeedSquared =
        angularVelocity.x * angularVelocity.x +
        angularVelocity.y * angularVelocity.y +
        angularVelocity.z * angularVelocity.z;
      const nearlyStill =
        linearSpeedSquared < SETTLE_SPEED * SETTLE_SPEED &&
        angularSpeedSquared < 0.55 * 0.55;
      // Low speed sustained through the grace period means the roll landed
      // on some surface, including a detected table; a brief trajectory apex
      // is reset as soon as gravity accelerates the body again.
      if (roll.body.isSleeping() || nearlyStill) {
        roll.settledAt ??= now;
      } else {
        roll.settledAt = undefined;
      }
    }
  }

  getVerticalSupport(rotation) {
    // A cylinder's local Y axis is its tube axis. Projecting its half-width and
    // radial disk onto world Y gives the exact vertical support distance. The
    // slightly enlarged visual radius also encloses the loose paper seam.
    const axisVertical = THREE.MathUtils.clamp(
      1 - 2 * (rotation.x * rotation.x + rotation.z * rotation.z),
      -1,
      1
    );
    const radialVertical = Math.sqrt(
      Math.max(0, 1 - axisVertical * axisVertical)
    );
    return (
      VISUAL_ROLL_HALF_WIDTH * Math.abs(axisVertical) +
      VISUAL_ROLL_RADIUS * radialVertical
    );
  }

  spawnRoll(now = performance.now()) {
    if (!this.physics || !this.RAPIER) return;

    while (this.rolls.length >= MAX_ACTIVE_ROLLS) {
      this.removeRoll(this.rolls[0]);
    }

    const object = this.createRollObject();
    object.userData.xrblocksDevtools = {tag: "falling-toilet-paper-roll"};

    // Keep the rain centered in a clear patch roughly one meter ahead of the
    // local-floor origin, with enough spread for room-scale motion.
    object.position.set(
      this.randomRange(-0.95, 0.95),
      this.randomRange(SPAWN_HEIGHT_MIN, SPAWN_HEIGHT_MAX),
      this.randomRange(-1.8, -0.25)
    );

    const rotation = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(
        this.randomRange(-Math.PI, Math.PI),
        this.randomRange(-Math.PI, Math.PI),
        this.randomRange(-Math.PI, Math.PI)
      )
    );
    object.quaternion.copy(rotation);
    this.add(object);

    const body = this.physics.blendedWorld.createRigidBody(
      this.RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(object.position.x, object.position.y, object.position.z)
        .setRotation(rotation)
        .setLinvel(
          this.randomRange(-0.16, 0.16),
          this.randomRange(-0.12, 0),
          this.randomRange(-0.12, 0.12)
        )
        .setAngvel({
          x: this.randomRange(-5.2, 5.2),
          y: this.randomRange(-4.2, 4.2),
          z: this.randomRange(-5.2, 5.2),
        })
        .setLinearDamping(0.08)
        .setAngularDamping(0.14)
        .setCcdEnabled(true)
    );
    this.physics.blendedWorld.createCollider(
      this.RAPIER.ColliderDesc.cylinder(ROLL_HALF_WIDTH, ROLL_RADIUS)
        .setDensity(38)
        .setFriction(0.78)
        .setRestitution(0.34),
      body
    );

    this.rolls.push({object, body, bornAt: now, settledAt: undefined});
  }

  createRollObject() {
    // The group is the sole semantic owner and is the only tagged node.
    const roll = new THREE.Group();
    roll.name = "Falling toilet paper roll";

    const paperSide = new THREE.Mesh(this.paperSideGeometry, this.paperMaterial);
    const topPaper = new THREE.Mesh(this.paperEndGeometry, this.paperEndMaterial);
    const bottomPaper = new THREE.Mesh(
      this.paperEndGeometry,
      this.paperEndMaterial
    );
    const core = new THREE.Mesh(this.coreGeometry, this.coreMaterial);

    topPaper.rotation.x = -Math.PI / 2;
    topPaper.position.y = ROLL_HALF_WIDTH + 0.0008;
    bottomPaper.rotation.x = Math.PI / 2;
    bottomPaper.position.y = -ROLL_HALF_WIDTH - 0.0008;

    for (const mesh of [paperSide, topPaper, bottomPaper, core]) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      roll.add(mesh);
    }

    // A slightly raised loose sheet edge gives the silhouette a familiar seam.
    const seamGeometry = new THREE.PlaneGeometry(ROLL_HALF_WIDTH * 1.55, 0.016);
    const seam = new THREE.Mesh(seamGeometry, this.paperMaterial);
    seam.position.set(0, 0.004, ROLL_RADIUS + 0.0015);
    seam.rotation.z = Math.PI / 2;
    seam.castShadow = true;
    seam.userData.isPerRollDisposable = true;
    roll.add(seam);

    return roll;
  }

  removeRoll(roll) {
    if (!roll) return;

    const index = this.rolls.indexOf(roll);
    if (index !== -1) this.rolls.splice(index, 1);

    if (roll.body && this.physics?.blendedWorld) {
      this.physics.blendedWorld.removeRigidBody(roll.body);
    }
    roll.object.removeFromParent();
    roll.object.traverse((child) => {
      if (child.userData.isPerRollDisposable) child.geometry?.dispose();
    });
  }

  // Deterministic pseudo-randomness keeps visual variety reproducible in tests.
  random() {
    let value = this.randomState;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.randomState = value >>> 0;
    return this.randomState / 0x100000000;
  }

  randomRange(min, max) {
    return min + (max - min) * this.random();
  }

  dispose() {
    for (const roll of [...this.rolls]) this.removeRoll(roll);

    if (this.floorBody && this.physics?.blendedWorld) {
      this.physics.blendedWorld.removeRigidBody(this.floorBody);
      this.floorBody = undefined;
    }

    this.paperSideGeometry.dispose();
    this.paperEndGeometry.dispose();
    this.coreGeometry.dispose();
    this.paperMaterial.dispose();
    this.paperEndMaterial.dispose();
    this.coreMaterial.dispose();
    this.floorVisual?.geometry.dispose();
    this.floorVisual?.material.dispose();
  }
}

const options = new xb.Options();
options.physics.RAPIER = RAPIER;
options.physics.fps = 60;
options.depth = new xb.DepthOptions(xb.xrDepthMeshPhysicsOptions);
options.depth.depthMesh.colliderUpdateFps = 8;
options.reticles.enabled = false;
options.controllers.enabled = false;
options.xrButton.showEnterSimulatorButton = true;
options.setAppTitle("Toilet Paper Rain");
options.setAppDescription(
  "Step into a room-scale shower of bouncing, tumbling toilet paper rolls."
);

document.addEventListener("DOMContentLoaded", async () => {
  xb.add(new ToiletPaperRain());
  await xb.init(options);
});
