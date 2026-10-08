import * as THREE from "three";
import * as xb from "xrblocks";

function polygonLiesOnLocalXZ(mesh) {
  const positions = mesh.geometry.getAttribute("position");
  return Array.from(
    { length: positions.count },
    (_, index) => Math.abs(positions.getY(index)) < 0.000001,
  ).every(Boolean);
}

function inspectLivingRoomPlanes(planes) {
  const floor = planes.find((plane) => plane.label === "floor");
  if (!floor) {
    return { error: "The stable Living Room floor was not detected." };
  }
  const positions = floor.geometry.getAttribute("position");
  const localYIsFlat = Array.from(
    { length: positions.count },
    (_, index) => Math.abs(positions.getY(index)) < 0.000001,
  ).every(Boolean);

  return {
    count: planes.length,
    error: null,
    floor: {
      area: floor.simulatorPlane?.area,
      localYIsFlat,
      position: floor.position.toArray(),
      vertexCount: positions.count,
    },
    horizontalCount: planes.filter(
      (plane) => plane.orientation === "horizontal",
    ).length,
    wallCount: planes.filter((plane) => plane.label === "wall").length,
  };
}

class EvaluationApp extends xb.Script {
  init() {
    this.add(new THREE.HemisphereLight(0xffffff, 0x666666, 3));
    this.stableEnvironmentResult = new THREE.Object3D();
    this.stableEnvironmentResult.name = "detected-planes-stable-environment";
    this.stableEnvironmentResult.userData.xrblocksDevtools = {
      tag: "detected-planes-stable-environment",
      state: { error: "The simulator environment is not ready." },
    };
    this.add(this.stableEnvironmentResult);
  }

  update() {
    this.stableEnvironmentResult.userData.xrblocksDevtools.state =
      inspectLivingRoomPlanes(xb.world.planes.get());
  }
}

const options = new xb.Options();
options.enablePlaneDetection();
xb.add(new EvaluationApp());
await xb.init(options);

try {
  xb.world.planes.setSimulatorPlanes([
    {
      type: "horizontal",
      label: "session-table",
      area: 1.5,
      position: new THREE.Vector3(0.5, 0.75, -2),
      quaternion: new THREE.Quaternion(),
      polygon: [
        new THREE.Vector2(-0.5, -0.4),
        new THREE.Vector2(0.5, -0.4),
        new THREE.Vector2(0.5, 0.4),
        new THREE.Vector2(-0.5, 0.4),
      ],
    },
    {
      type: "vertical",
      label: "session-wall",
      area: 2,
      position: new THREE.Vector3(-1, 1, -3),
      quaternion: new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(1, 0, 0),
        Math.PI / 2,
      ),
      polygon: [
        new THREE.Vector2(-0.7, -0.5),
        new THREE.Vector2(0.7, -0.5),
        new THREE.Vector2(0.7, 0.5),
        new THREE.Vector2(-0.7, 0.5),
      ],
    },
  ]);
  const planes = xb.world.planes.get();
  const result = new THREE.Object3D();
  result.name = "detected-planes-session";
  result.userData.xrblocksDevtools = {
    tag: "detected-planes-session",
    state: {
      error: null,
      labels: planes.map((plane) => plane.label),
      orientations: planes.map((plane) => plane.orientation),
      positions: planes.map((plane) => plane.position.toArray()),
      polygonsLieOnLocalXZ: planes.map(polygonLiesOnLocalXZ),
    },
  };
  xb.add(result);
} catch (error) {
  const result = new THREE.Object3D();
  result.name = "detected-planes-session";
  result.userData.xrblocksDevtools = {
    tag: "detected-planes-session",
    state: { error: error instanceof Error ? error.message : String(error) },
  };
  xb.add(result);
}
