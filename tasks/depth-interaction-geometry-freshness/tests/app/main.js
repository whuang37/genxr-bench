import * as THREE from "three";
import * as xb from "xrblocks";

function cpuDepth(value, width = 2, height = 2) {
  return {
    data: new Float32Array(width * height).fill(value).buffer,
    height,
    rawValueToMeters: 1,
    width,
  };
}

function renderMetricDepth(renderer, mesh, camera) {
  const target = new THREE.WebGLRenderTarget(32, 32);
  const pixels = new Uint8Array(32 * 32 * 4);
  const scene = new THREE.Scene();
  const material = new THREE.ShaderMaterial({
    fragmentShader:
      "varying float vDepth; void main() { gl_FragColor = vec4(vDepth / 4.0, 0.0, 0.0, 1.0); }",
    vertexShader:
      "varying float vDepth; void main() { vDepth = -position.z; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  });
  const previousMaterial = mesh.material;
  const previousTarget = renderer.getRenderTarget();
  const previousXrEnabled = renderer.xr.enabled;
  mesh.material = material;
  scene.add(mesh);
  try {
    renderer.xr.enabled = false;
    renderer.setRenderTarget(target);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.readRenderTargetPixels(target, 0, 0, 32, 32, pixels);
    return pixels[(16 * 32 + 16) * 4];
  } finally {
    scene.remove(mesh);
    mesh.material = previousMaterial;
    renderer.setRenderTarget(previousTarget);
    renderer.xr.enabled = previousXrEnabled;
    material.dispose();
    target.dispose();
  }
}

function raycastDistance(mesh) {
  return new THREE.Raycaster(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ).intersectObject(mesh)[0]?.distance;
}

function runDepthFreshnessProbe(renderer) {
  let mesh;
  try {
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 10);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    mesh = new xb.DepthMesh(
      new xb.DepthOptions({
        depthMesh: {
          depthFullResolution: 4,
          ignoreEdgePixels: 0,
          updateFullResolutionGeometry: true,
          useDownsampledGeometry: true,
        },
      }),
      2,
      2,
    );
    mesh.updateDepth(cpuDepth(1), camera.projectionMatrixInverse, "float32");
    const firstRed = renderMetricDepth(renderer, mesh, camera);
    const firstDistance = raycastDistance(mesh);
    mesh.updateDepth(cpuDepth(3), camera.projectionMatrixInverse, "float32");
    const secondRed = renderMetricDepth(renderer, mesh, camera);
    const secondDistance = raycastDistance(mesh);
    mesh.updateDepth(
      cpuDepth(4, 3, 2),
      camera.projectionMatrixInverse,
      "float32",
    );

    return {
      error: null,
      firstDistance,
      firstRed,
      secondDistance,
      secondRed,
      thirdDistance: raycastDistance(mesh),
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  } finally {
    mesh?.geometry.dispose();
    mesh?.downsampledGeometry?.dispose();
    mesh?.material.dispose();
  }
}

class EvaluationApp extends xb.Script {
  static dependencies = { renderer: THREE.WebGLRenderer };

  init({ renderer }) {
    this.add(new THREE.HemisphereLight(0xffffff, 0x666666, 3));
    const observation = new THREE.Object3D();
    observation.userData.xrblocksDevtools = {
      tag: "depth-freshness-live",
      state: runDepthFreshnessProbe(renderer),
    };
    this.add(observation);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  xb.add(new EvaluationApp());
  xb.init(new xb.Options());
});
