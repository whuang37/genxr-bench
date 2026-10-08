import * as THREE from "three";
import * as xb from "xrblocks";

class EvaluationApp extends xb.Script {
  init() {
    this.add(new THREE.HemisphereLight(0xffffff, 0x666666, 3));
  }
}

const options = new xb.Options();
options.world.enableMeshDetection();
xb.add(new EvaluationApp());
await xb.init(options);

try {
  const source = {
    vertices: new Float32Array([
      -0.5, -0.5, -2, 0.5, -0.5, -2, 0.5, 0.5, -2, -0.5, 0.5, -2,
    ]),
    indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
    lastChangedTime: 0,
    semanticLabel: "floor",
  };
  const [mesh] = xb.world.meshes.setSimulatorMeshes([source]);
  mesh.updateWorldMatrix(true, false);
  const hit = new THREE.Raycaster(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ).intersectObject(mesh)[0];
  const result = new THREE.Object3D();
  result.name = "mesh-detector-lifecycle-simulator";
  result.userData.xrblocksDevtools = {
    tag: "mesh-detector-lifecycle-simulator",
    state: {
      error: null,
      geometry: {
        indexCount: mesh.geometry.getIndex()?.count,
        positionCount: mesh.geometry.getAttribute("position").count,
      },
      label: mesh.semanticLabel,
      mapIdentity:
        xb.world.meshes.xrMeshToThreeMesh.get(source) === mesh &&
        xb.world.meshes.threeMeshToXrMesh.get(mesh) === source,
      rayHit: hit?.object === mesh,
    },
  };
  xb.add(result);
} catch (error) {
  const result = new THREE.Object3D();
  result.name = "mesh-detector-lifecycle-simulator";
  result.userData.xrblocksDevtools = {
    tag: "mesh-detector-lifecycle-simulator",
    state: { error: error instanceof Error ? error.message : String(error) },
  };
  xb.add(result);
}
