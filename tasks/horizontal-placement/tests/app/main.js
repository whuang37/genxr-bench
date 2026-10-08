import * as THREE from "three";
import * as xb from "xrblocks";

class EvaluationApp extends xb.Script {
  init() {
    this.add(new THREE.HemisphereLight(0xffffff, 0x666666, 3));
  }
}

const options = new xb.Options();
options.enablePlaneDetection();
xb.add(new EvaluationApp());
await xb.init(options);

const state = {
  avoidsObstacle: false,
  error: null,
  grounded: false,
  localComplete: false,
  localObjects: [],
  placed: false,
  upright: false,
};
const result = new THREE.Object3D();
result.name = "horizontal-placement-session";
result.userData.xrblocksDevtools = {
  tag: "horizontal-placement-session",
  state,
};
xb.add(result);

try {
  xb.camera.position.set(0, 1.4, 0);
  xb.camera.lookAt(0, 0, -2);
  xb.camera.updateMatrixWorld(true);
  xb.world.planes.setSimulatorPlanes([
    {
      type: "horizontal",
      label: "table",
      area: 36,
      position: new THREE.Vector3(0, 0, -2),
      quaternion: new THREE.Quaternion(),
      polygon: [
        new THREE.Vector2(-3, -3),
        new THREE.Vector2(3, -3),
        new THREE.Vector2(3, 3),
        new THREE.Vector2(-3, 3),
      ],
    },
  ]);
  const object = new THREE.Group();
  const content = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.3, 0.3),
    new THREE.MeshBasicMaterial({ color: 0x22c55e }),
  );
  content.position.y = 0.15;
  object.add(content);
  const obstacle = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.7, 0.7),
    new THREE.MeshBasicMaterial({ color: 0xef4444 }),
  );
  obstacle.position.set(0, 0.35, -2);
  xb.add(object, obstacle);
  state.placed = await xb.world.placeOnHorizontalSurface(
    object,
    { milliseconds: 250 },
    5,
  );
  object.updateMatrixWorld(true);
  obstacle.updateMatrixWorld(true);
  const objectBounds = new THREE.Box3().setFromObject(object);
  const obstacleBounds = new THREE.Box3().setFromObject(obstacle);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(object.quaternion);
  state.avoidsObstacle = !objectBounds.intersectsBox(obstacleBounds);
  state.grounded = Math.abs(objectBounds.min.y) < 0.0001;
  state.upright = up.y > 0.999;
  state.localObjects = await placeLocalObjects(obstacle);
  state.localComplete = true;
} catch (error) {
  state.error = error instanceof Error ? error.message : String(error);
}

function makeLocalObjects() {
  const offsetBox = new THREE.Group();
  const boxContent = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.2, 0.28),
    new THREE.MeshBasicMaterial({ color: 0x4f46e5 }),
  );
  boxContent.position.y = 0.1;
  offsetBox.add(boxContent);

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0x0ea5e9 }),
  );

  const tallCylinder = new THREE.Group();
  const cylinderContent = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.2, 0.6, 12),
    new THREE.MeshBasicMaterial({ color: 0xf59e0b }),
  );
  cylinderContent.position.y = 0.3;
  tallCylinder.add(cylinderContent);

  return [
    { kind: "offset-box", object: offsetBox },
    { kind: "sphere", object: sphere },
    { kind: "tall-cylinder", object: tallCylinder },
  ];
}

async function placeLocalObjects(obstacle) {
  const records = [];
  for (const { kind, object } of makeLocalObjects()) {
    object.name = `Placed local ${kind} object`;
    object.position.set(50 + records.length * 5, 10, 50);
    object.userData.xrblocksDevtools = {
      tag: `placed-local-object-${kind}`,
    };
    xb.add(object);
    const record = {
      bounds: [],
      error: null,
      finiteBounds: false,
      grounded: false,
      kind,
      obstacleFree: false,
      pairwiseFree: false,
      placed: false,
    };
    try {
      record.placed = await xb.world.placeOnHorizontalSurface(
        object,
        { seconds: 3 },
        9,
      );
      object.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(object);
      record.bounds = [bounds.min.toArray(), bounds.max.toArray()];
      record.finiteBounds = record.bounds
        .flat()
        .every((value) => Number.isFinite(value));
      record.grounded = Math.abs(bounds.min.y) < 0.025;
      record.obstacleFree = !bounds.intersectsBox(
        new THREE.Box3().setFromObject(obstacle),
      );
      record.worldBounds = bounds;
    } catch (error) {
      record.error = error instanceof Error ? error.message : String(error);
    }
    records.push(record);
  }

  for (const record of records) {
    if (!record.worldBounds) continue;
    record.pairwiseFree = records.every(
      (other) =>
        other === record ||
        !other.worldBounds ||
        !record.worldBounds.intersectsBox(other.worldBounds),
    );
  }
  return records.map(({ worldBounds: _worldBounds, ...record }) => record);
}
