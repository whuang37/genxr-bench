/** Exercise the same Rapier body/collider recipe used by Toilet Paper Rain. */
import RAPIER from "../node_modules/@dimforge/rapier3d-simd-compat/rapier.mjs";

await RAPIER.init();

const ROLL_RADIUS = 0.065;
const ROLL_HALF_WIDTH = 0.05;
const VISUAL_ROLL_RADIUS = ROLL_RADIUS + 0.003;
const VISUAL_ROLL_HALF_WIDTH = ROLL_HALF_WIDTH * 1.02;
const FLOOR_CLEARANCE = 0.001;

function verticalSupport(rotation) {
  const axisVertical = Math.max(
    -1,
    Math.min(1, 1 - 2 * (rotation.x ** 2 + rotation.z ** 2))
  );
  return (
    VISUAL_ROLL_HALF_WIDTH * Math.abs(axisVertical) +
    VISUAL_ROLL_RADIUS * Math.sqrt(Math.max(0, 1 - axisVertical ** 2))
  );
}
const world = new RAPIER.World({x: 0, y: -9.81, z: 0});
world.timestep = 1 / 60;
const floor = world.createRigidBody(
  RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.04, 0)
);
world.createCollider(
  RAPIER.ColliderDesc.cuboid(20, 0.04, 20)
    .setFriction(0.92)
    .setRestitution(0.16),
  floor
);

function createRoll(x, y, velocityX) {
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(x, y, -1)
      .setRotation({x: 0.31, y: 0.22, z: 0.17, w: 0.91})
      .setLinvel(velocityX, 0, 0)
      .setAngvel({x: 4.2, y: -2.1, z: 3.4})
      .setLinearDamping(0.08)
      .setAngularDamping(0.14)
      .setCcdEnabled(true)
  );
  world.createCollider(
    RAPIER.ColliderDesc.cylinder(0.05, 0.065)
      .setDensity(38)
      .setFriction(0.78)
      .setRestitution(0.34),
    body
  );
  return body;
}

const rolls = [createRoll(-0.16, 2.65, 0.2), createRoll(0.16, 2.9, -0.2)];
let minimumVisibleBottom = Infinity;
let firstFloorContact = -1;
let upwardAfterContact = false;
let bodiesMet = false;

for (let step = 0; step < 720; step++) {
  world.step();
  for (const body of rolls) {
    const position = body.translation();
    const minimumCenterY =
      FLOOR_CLEARANCE + verticalSupport(body.rotation());

    // Mirror the application's no-below-floor invariant guard.
    if (position.y < minimumCenterY) {
      body.setTranslation(
        {x: position.x, y: minimumCenterY, z: position.z},
        true
      );
      const velocity = body.linvel();
      if (velocity.y < 0) {
        body.setLinvel(
          {
            x: velocity.x,
            y: Math.min(0.35, -velocity.y * 0.16),
            z: velocity.z,
          },
          true
        );
      }
    }

    minimumVisibleBottom = Math.min(
      minimumVisibleBottom,
      body.translation().y - verticalSupport(body.rotation())
    );
    if (body.translation().y <= 0.105 && firstFloorContact < 0) {
      firstFloorContact = step;
    }
    if (
      firstFloorContact >= 0 &&
      step > firstFloorContact &&
      body.linvel().y > 0.02
    ) {
      upwardAfterContact = true;
    }
  }

  const a = rolls[0].translation();
  const b = rolls[1].translation();
  if (Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) < 0.14) {
    bodiesMet = true;
  }
}

if (firstFloorContact < 0) throw new Error("rolls never contacted the floor");
if (!upwardAfterContact) throw new Error("rolls did not bounce after contact");
if (!bodiesMet) throw new Error("roll bodies did not meet during simulation");
if (minimumVisibleBottom < FLOOR_CLEARANCE - 1e-5) {
  throw new Error(`visible roll crossed floor: ${minimumVisibleBottom}`);
}

console.log(`PASS: floor contact at ${(firstFloorContact / 60).toFixed(2)}s`);
console.log("PASS: bounce and body-body contact paths exercised");
console.log(
  `PASS: minimum rendered bottom y=${minimumVisibleBottom.toFixed(5)}m ` +
    `(clearance ${FLOOR_CLEARANCE}m)`
);

for (const body of rolls) world.removeRigidBody(body);
world.removeRigidBody(floor);
if (world.bodies.len() !== 0) {
  throw new Error(`rigid-body cleanup failed: ${world.bodies.len()} remain`);
}
console.log("PASS: rigid-body cleanup leaves zero bodies");
world.free();
