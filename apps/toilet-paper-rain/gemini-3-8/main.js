import RAPIER from "@dimforge/rapier3d-simd-compat";
import * as THREE from "three";
import * as xb from "xrblocks";

const SPAWN_INTERVAL_MS = 500;
const MAX_ACTIVE_ROLLS = 24;
const LANDED_LIFETIME_MS = 2500;
const FADE_DURATION_MS = 500;
const MAX_ROLL_LIFETIME_MS = 8000;

const ROLL_RADIUS = 0.055;
const ROLL_HALF_HEIGHT = 0.05;
const ROLL_HEIGHT = ROLL_HALF_HEIGHT * 2;
const CORE_RADIUS = 0.022;

export class ToiletPaperRain extends xb.Script {
  constructor() {
    super();

    this.rolls = [];
    this.colliderToRoll = new Map();
    this.detectedPlaneColliders = new Map();
    this.floorY = 0.0;
    this.floorBody = null;
    this.floorCollider = null;
    this.lastSpawnTime = 0;
    this.physics = null;
    this.RAPIER = null;

    this.tempVec = new THREE.Vector3();
    this.tempQuat = new THREE.Quaternion();
    this.tempEuler = new THREE.Euler();

    // Procedural toilet paper roll geometries
    const paperShape = new THREE.Shape();
    paperShape.absarc(0, 0, ROLL_RADIUS, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, CORE_RADIUS, 0, Math.PI * 2, true);
    paperShape.holes.push(hole);

    this.paperGeometry = new THREE.ExtrudeGeometry(paperShape, {
      depth: ROLL_HEIGHT,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.002,
      bevelThickness: 0.002,
      curveSegments: 24,
    });
    this.paperGeometry.center();
    // Rotate to align cylinder axis along Y
    this.paperGeometry.rotateX(Math.PI / 2);

    this.coreGeometry = new THREE.CylinderGeometry(
      CORE_RADIUS,
      CORE_RADIUS,
      ROLL_HEIGHT + 0.001,
      24,
      1,
      true,
    );

    this.flapGeometry = new THREE.PlaneGeometry(0.045, ROLL_HEIGHT * 0.95);
    this.flapGeometry.translate(0.0225, 0, 0);

    // Shared materials
    this.paperMaterial = new THREE.MeshStandardMaterial({
      color: 0xf6f6f4,
      roughness: 0.92,
      metalness: 0.0,
    });
    this.flapMaterial = new THREE.MeshStandardMaterial({
      color: 0xf6f6f4,
      roughness: 0.92,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
    this.coreMaterial = new THREE.MeshStandardMaterial({
      color: 0x937047,
      roughness: 0.88,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
  }

  init() {
    this.add(new THREE.HemisphereLight(0xffffff, 0x555555, 2.5));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(2, 6, 2);
    dirLight.castShadow = true;
    this.add(dirLight);
  }

  initPhysics(physics) {
    this.physics = physics;
    this.RAPIER = physics.RAPIER;

    // Create a static floor collider at floor level
    this.floorBody = this.physics.blendedWorld.createRigidBody(
      this.RAPIER.RigidBodyDesc.fixed().setTranslation(
        0,
        this.floorY - 0.05,
        0,
      ),
    );
    this.floorCollider = this.physics.blendedWorld.createCollider(
      this.RAPIER.ColliderDesc.cuboid(50, 0.05, 50)
        .setRestitution(0.28)
        .setFriction(0.65),
      this.floorBody,
    );

    // Automatically start the shower immediately upon load
    this.spawnRoll();
    this.lastSpawnTime = performance.now();
  }

  getClearAreaCenter() {
    // 1. Check simulator named locations
    if (xb.core?.simulator?.getLocations) {
      const locations = xb.core.simulator.getLocations();
      if (locations?.["floor-primary"]?.position) {
        const p = locations["floor-primary"].position;
        return new THREE.Vector3(p[0], this.floorY, p[2]);
      }
    }

    // 2. Check detected floor planes
    if (xb.core?.world?.planes?.get) {
      const planes = xb.core.world.planes.get();
      for (const plane of planes) {
        if (
          plane.label === "floor" ||
          (plane.orientation?.toLowerCase() === "horizontal" &&
            plane.position.y < 0.3)
        ) {
          return new THREE.Vector3(
            plane.position.x,
            this.floorY,
            plane.position.z,
          );
        }
      }
    }

    // 3. Fallback: area in front of camera
    const camera = xb.core?.camera;
    if (camera) {
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(
        camera.quaternion,
      );
      forward.y = 0;
      if (forward.lengthSq() > 0.001) {
        forward.normalize();
      } else {
        forward.set(0, 0, -1);
      }
      return new THREE.Vector3(
        camera.position.x + forward.x * 1.5,
        this.floorY,
        camera.position.z + forward.z * 1.5,
      );
    }

    return new THREE.Vector3(0, this.floorY, -1.5);
  }

  updateFloor() {
    // Track floor planes from plane detection
    if (xb.core?.world?.planes?.get) {
      const planes = xb.core.world.planes.get();
      for (const plane of planes) {
        if (
          plane.label === "floor" ||
          (plane.orientation?.toLowerCase() === "horizontal" &&
            plane.position.y < 0.3)
        ) {
          if (Math.abs(plane.position.y - this.floorY) > 0.01) {
            this.floorY = plane.position.y;
            if (this.floorBody) {
              this.floorBody.setTranslation(
                { x: 0, y: this.floorY - 0.05, z: 0 },
                true,
              );
            }
          }
          break;
        }
      }

      // Add physics colliders for any elevated surfaces (like tables/desks) if needed
      if (this.physics) {
        for (const plane of planes) {
          if (this.detectedPlaneColliders.has(plane)) continue;
          const isTable =
            plane.label === "table" ||
            plane.label === "desk" ||
            (plane.orientation?.toLowerCase() === "horizontal" &&
              plane.position.y >= 0.3);
          if (isTable && plane.geometry) {
            const box = new THREE.Box3().setFromObject(plane);
            const size = new THREE.Vector3();
            box.getSize(size);
            const center = new THREE.Vector3();
            box.getCenter(center);
            if (size.x > 0.1 && size.z > 0.1) {
              const tableBody = this.physics.blendedWorld.createRigidBody(
                this.RAPIER.RigidBodyDesc.fixed().setTranslation(
                  center.x,
                  center.y - 0.02,
                  center.z,
                ),
              );
              const tableCollider = this.physics.blendedWorld.createCollider(
                this.RAPIER.ColliderDesc.cuboid(size.x / 2, 0.02, size.z / 2)
                  .setRestitution(0.28)
                  .setFriction(0.65),
                tableBody,
              );
              this.detectedPlaneColliders.set(plane, {
                body: tableBody,
                collider: tableCollider,
              });
            }
          }
        }
      }
    }
  }

  createRollMesh() {
    const group = new THREE.Group();
    group.name = "toilet-paper-roll";

    const paperMesh = new THREE.Mesh(this.paperGeometry, this.paperMaterial);
    paperMesh.castShadow = true;
    paperMesh.receiveShadow = true;

    const coreMesh = new THREE.Mesh(this.coreGeometry, this.coreMaterial);

    const flapMesh = new THREE.Mesh(this.flapGeometry, this.flapMaterial);
    flapMesh.position.set(ROLL_RADIUS, 0, 0);
    flapMesh.rotation.y = 0.35;
    flapMesh.castShadow = true;

    group.add(paperMesh, coreMesh, flapMesh);

    // Tag the semantic owner
    group.userData.xrblocksDevtools = { tag: "falling-toilet-paper-roll" };

    return group;
  }

  spawnRoll() {
    if (!this.physics) return;

    // Keep active roll count strictly bounded
    if (this.rolls.length >= MAX_ACTIVE_ROLLS) {
      this.removeRoll(this.rolls[0]);
    }

    const center = this.getClearAreaCenter();
    const camera = xb.core?.camera;
    const cameraY = camera ? camera.position.y : 1.5;

    // Varied positions overhead above the clear floor area
    const spreadX = 1.4;
    const spreadZ = 1.4;
    const spawnX = center.x + (Math.random() - 0.5) * spreadX;
    const spawnZ = center.z + (Math.random() - 0.5) * spreadZ;
    const spawnY =
      Math.max(cameraY + 0.8, this.floorY + 2.2) + Math.random() * 0.4;

    const rollMesh = this.createRollMesh();
    rollMesh.position.set(spawnX, spawnY, spawnZ);

    // Varied initial rotation
    this.tempEuler.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
    );
    this.tempQuat.setFromEuler(this.tempEuler);
    rollMesh.quaternion.copy(this.tempQuat);

    // Dynamic physics body
    const bodyDesc = this.RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(spawnX, spawnY, spawnZ)
      .setRotation(this.tempQuat)
      .setLinvel(
        (Math.random() - 0.5) * 0.3,
        -0.4 - Math.random() * 0.3,
        (Math.random() - 0.5) * 0.3,
      )
      .setAngvel({
        x: (Math.random() - 0.5) * 4,
        y: (Math.random() - 0.5) * 4,
        z: (Math.random() - 0.5) * 4,
      })
      .setLinearDamping(0.1)
      .setAngularDamping(0.2)
      .setCcdEnabled(true);

    const body = this.physics.blendedWorld.createRigidBody(bodyDesc);

    const colliderDesc = this.RAPIER.ColliderDesc.cylinder(
      ROLL_HALF_HEIGHT,
      ROLL_RADIUS,
    )
      .setRestitution(0.28)
      .setFriction(0.65)
      .setDensity(0.2)
      .setActiveEvents(this.RAPIER.ActiveEvents.COLLISION_EVENTS);

    const collider = this.physics.blendedWorld.createCollider(
      colliderDesc,
      body,
    );

    this.add(rollMesh);

    const roll = {
      mesh: rollMesh,
      body,
      collider,
      bornAt: performance.now(),
      hasLanded: false,
      landedAt: 0,
      initialY: spawnY,
      prevLinvelY: -0.4,
    };

    this.rolls.push(roll);
    this.colliderToRoll.set(collider.handle, roll);
  }

  physicsStep() {
    if (!this.physics) return;

    const now = performance.now();

    // Drain collision events
    if (this.physics.eventQueue) {
      this.physics.eventQueue.drainCollisionEvents((h1, h2, started) => {
        if (!started) return;
        const r1 = this.colliderToRoll.get(h1);
        const r2 = this.colliderToRoll.get(h2);

        if (r1 && (!r2 || r2.hasLanded)) {
          if (!r1.hasLanded) {
            r1.hasLanded = true;
            r1.landedAt = now;
          }
        }
        if (r2 && (!r1 || r1.hasLanded)) {
          if (!r2.hasLanded) {
            r2.hasLanded = true;
            r2.landedAt = now;
          }
        }
      });
    }

    const minCenterY =
      this.floorY + Math.min(ROLL_HALF_HEIGHT, ROLL_RADIUS) * 0.96;

    for (let i = this.rolls.length - 1; i >= 0; i--) {
      const roll = this.rolls[i];
      const translation = roll.body.translation();
      const rotation = roll.body.rotation();
      const linvel = roll.body.linvel();

      // Constraint: Rolls must NEVER pass below the environment floor
      if (translation.y < minCenterY) {
        translation.y = minCenterY;
        roll.body.setTranslation(
          { x: translation.x, y: minCenterY, z: translation.z },
          true,
        );
        if (linvel.y < 0) {
          roll.body.setLinvel(
            {
              x: linvel.x * 0.9,
              y: Math.max(0, -linvel.y * 0.25),
              z: linvel.z * 0.9,
            },
            true,
          );
        }
      }

      // Synchronize Three.js visual pose with physics
      roll.mesh.position.set(
        translation.x,
        Math.max(translation.y, minCenterY),
        translation.z,
      );
      roll.mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);

      // Contact & landing detection
      if (!roll.hasLanded) {
        if (translation.y <= this.floorY + ROLL_RADIUS + 0.02) {
          roll.hasLanded = true;
          roll.landedAt = now;
        } else if (
          roll.prevLinvelY < -0.3 &&
          linvel.y >= -0.05 &&
          translation.y < roll.initialY - 0.2
        ) {
          // Contact with elevated room surface
          roll.hasLanded = true;
          roll.landedAt = now;
        }
      }
      roll.prevLinvelY = linvel.y;

      // Disappear shortly after landing
      if (roll.hasLanded) {
        const elapsedSinceLanded = now - roll.landedAt;
        if (elapsedSinceLanded > LANDED_LIFETIME_MS) {
          const progress =
            (elapsedSinceLanded - LANDED_LIFETIME_MS) / FADE_DURATION_MS;
          if (progress >= 1.0) {
            this.removeRoll(roll);
            continue;
          }
          const scale = Math.max(0.001, 1.0 - progress);
          roll.mesh.scale.setScalar(scale);
        }
      }

      // Disappear after bounded lifetime
      if (now - roll.bornAt > MAX_ROLL_LIFETIME_MS) {
        this.removeRoll(roll);
        continue;
      }

      // Out of bounds safety
      if (roll.mesh.position.y < this.floorY - 0.2) {
        this.removeRoll(roll);
        continue;
      }
    }
  }

  update() {
    this.updateFloor();

    const now = performance.now();
    if (now - this.lastSpawnTime >= SPAWN_INTERVAL_MS) {
      this.lastSpawnTime = now;
      this.spawnRoll();
    }
  }

  removeRoll(roll) {
    if (!roll) return;
    this.colliderToRoll.delete(roll.collider.handle);
    if (this.physics?.blendedWorld) {
      this.physics.blendedWorld.removeRigidBody(roll.body);
    }
    delete roll.mesh.userData.xrblocksDevtools;
    this.remove(roll.mesh);
    const index = this.rolls.indexOf(roll);
    if (index !== -1) {
      this.rolls.splice(index, 1);
    }
  }

  dispose() {
    for (const roll of [...this.rolls]) {
      this.removeRoll(roll);
    }
    this.rolls = [];
    this.colliderToRoll.clear();

    for (const [, { body }] of this.detectedPlaneColliders) {
      if (this.physics?.blendedWorld) {
        this.physics.blendedWorld.removeRigidBody(body);
      }
    }
    this.detectedPlaneColliders.clear();

    if (this.floorBody && this.physics?.blendedWorld) {
      this.physics.blendedWorld.removeRigidBody(this.floorBody);
      this.floorBody = null;
      this.floorCollider = null;
    }

    this.paperGeometry.dispose();
    this.coreGeometry.dispose();
    this.flapGeometry.dispose();
    this.paperMaterial.dispose();
    this.flapMaterial.dispose();
    this.coreMaterial.dispose();
  }
}

const options = new xb.Options();
options.physics.RAPIER = RAPIER;
options.physics.useEventQueue = true;
options.world.enableMeshDetection();
options.enablePlaneDetection();
options.depth = new xb.DepthOptions(xb.xrDepthMeshPhysicsOptions);
options.reticles.enabled = false;
options.xrButton.showEnterSimulatorButton = true;
options.setAppTitle("Toilet Paper Rain");
options.setAppDescription(
  "Toilet paper rolls continuously appear overhead, fall under gravity, collide with the environment, and disappear shortly after landing.",
);

document.addEventListener("DOMContentLoaded", async () => {
  xb.add(new ToiletPaperRain());
  await xb.init(options);
});
