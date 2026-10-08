import * as THREE from "three";
import * as xb from "xrblocks";

class EvaluationApp extends xb.Script {
  init() {
    this.add(new THREE.HemisphereLight(0xffffff, 0x666666, 3));
  }
}

function renderCoverage(renderer, geometry) {
  const side = 64;
  const target = new THREE.WebGLRenderTarget(side, side);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 5);
  const material = new THREE.MeshBasicMaterial({
    color: 0xff00ff,
    side: THREE.DoubleSide,
  });
  const visual = new THREE.Mesh(geometry, material);
  const pixels = new Uint8Array(side * side * 4);
  const previousTarget = renderer.getRenderTarget();
  const previousColor = renderer.getClearColor(new THREE.Color());
  const previousAlpha = renderer.getClearAlpha();
  let coloredPixels = 0;
  let centerPixels = 0;
  let outerColoredPixels = 0;
  let minX = side;
  let maxX = -1;
  let minY = side;
  let maxY = -1;

  try {
    scene.add(visual);
    renderer.setClearColor(0x000000, 1);
    renderer.setRenderTarget(target);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.readRenderTargetPixels(target, 0, 0, side, side, pixels);

    for (let y = 0; y < side; y += 1) {
      for (let x = 0; x < side; x += 1) {
        const offset = (y * side + x) * 4;
        const colored =
          pixels[offset] > 150 &&
          pixels[offset + 1] < 100 &&
          pixels[offset + 2] > 150;
        if (!colored) continue;
        coloredPixels += 1;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        if (x >= 20 && x < 44 && y >= 20 && y < 44) centerPixels += 1;
        if (x < 8 || x >= 56 || y < 8 || y >= 56) outerColoredPixels += 1;
      }
    }
    return {
      bounds: [minX, minY, maxX, maxY],
      centerCoverage: centerPixels / (24 * 24),
      coloredPixels,
      outerColoredPixels,
    };
  } finally {
    renderer.setRenderTarget(previousTarget);
    renderer.setClearColor(previousColor, previousAlpha);
    target.dispose();
    material.dispose();
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
  result.name = "detected-mesh-geometry-session";
  result.userData.xrblocksDevtools = {
    tag: "detected-mesh-geometry-session",
    state: {
      error: null,
      geometry: {
        indexCount: mesh.geometry.getIndex()?.count,
        normalCount: mesh.geometry.getAttribute("normal").count,
        positionCount: mesh.geometry.getAttribute("position").count,
      },
      label: mesh.semanticLabel,
      mapIdentity:
        xb.world.meshes.xrMeshToThreeMesh.get(source) === mesh &&
        xb.world.meshes.threeMeshToXrMesh.get(mesh) === source,
      normalZ: Array.from(mesh.geometry.getAttribute("normal").array).filter(
        (_, index) => index % 3 === 2,
      ),
      renderCoverage: renderCoverage(xb.core.renderer, mesh.geometry),
      rayHit: hit?.object === mesh,
      rayPoint: hit?.point.toArray(),
    },
  };
  xb.add(result);
} catch (error) {
  const result = new THREE.Object3D();
  result.name = "detected-mesh-geometry-session";
  result.userData.xrblocksDevtools = {
    tag: "detected-mesh-geometry-session",
    state: { error: error instanceof Error ? error.message : String(error) },
  };
  xb.add(result);
}
