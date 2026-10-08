import * as THREE from "three";
import * as xb from "xrblocks";

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function cpuDepth(values, width, height, rawValueToMeters = 1) {
  return {
    data: new Float32Array(values).buffer,
    height,
    rawValueToMeters,
    width,
  };
}

function averageChannel(pixels, width, centerX, centerY, channel) {
  let total = 0;
  let count = 0;
  for (let y = centerY - 3; y <= centerY + 3; y += 1) {
    for (let x = centerX - 3; x <= centerX + 3; x += 1) {
      total += pixels[(y * width + x) * 4 + channel];
      count += 1;
    }
  }
  return total / count;
}

function renderDepthPattern(renderer, values) {
  const size = 96;
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 10);
  camera.updateProjectionMatrix();
  const mesh = new xb.DepthMesh(
    new xb.DepthOptions({
      depthMesh: {
        depthFullResolution: 4,
        ignoreEdgePixels: 0,
        updateFullResolutionGeometry: true,
        useDownsampledGeometry: false,
      },
    }),
    4,
    4,
  );
  mesh.updateDepth(
    cpuDepth(values, 4, 4),
    camera.projectionMatrixInverse,
    "float32",
  );
  mesh.material = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    vertexShader: `
      varying float vMetricDepth;
      void main() {
        vMetricDepth = -position.z;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying float vMetricDepth;
      void main() {
        float normalizedDepth = clamp((vMetricDepth - 1.0) / 2.0, 0.0, 1.0);
        gl_FragColor = vec4(normalizedDepth, 0.25, 1.0 - normalizedDepth, 1.0);
      }
    `,
  });
  const scene = new THREE.Scene();
  scene.add(mesh);
  const target = new THREE.WebGLRenderTarget(size, size);
  const pixels = new Uint8Array(size * size * 4);
  const previousTarget = renderer.getRenderTarget();
  const previousClearColor = renderer.getClearColor(new THREE.Color());
  const previousClearAlpha = renderer.getClearAlpha();
  try {
    renderer.setClearColor(0x000000, 1);
    renderer.setRenderTarget(target);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.readRenderTargetPixels(target, 0, 0, size, size, pixels);
    return {
      centerRed: averageChannel(pixels, size, 48, 48, 0),
      leftRed: averageChannel(pixels, size, 18, 48, 0),
      rightRed: averageChannel(pixels, size, 78, 48, 0),
      vertexDepths: Array.from(mesh.geometry.attributes.position.array)
        .filter((_, index) => index % 3 === 2)
        .map((value) => -value),
    };
  } finally {
    renderer.setRenderTarget(previousTarget);
    renderer.setClearColor(previousClearColor, previousClearAlpha);
    target.dispose();
    mesh.geometry.dispose();
    mesh.material.dispose();
  }
}

function runDepthVisualProbe(renderer) {
  try {
    const rows = (row) => [...row, ...row, ...row, ...row];
    return {
      error: null,
      flat: renderDepthPattern(renderer, rows([2, 2, 2, 2])),
      slope: renderDepthPattern(renderer, rows([1, 1.67, 2.33, 3])),
      step: renderDepthPattern(renderer, rows([1, 1, 3, 3])),
    };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

function runMeshProbe() {
  try {
    const mesh = new xb.DepthMesh(
      new xb.DepthOptions({
        depthMesh: {
          depthFullResolution: 6,
          ignoreEdgePixels: 1,
          updateFullResolutionGeometry: true,
          useDownsampledGeometry: true,
        },
      }),
      2,
      2,
    );
    mesh.updateDepth(
      cpuDepth([2, 2, 2, 2], 2, 2),
      new THREE.Matrix4(),
      "float32",
    );
    mesh.updatePose(
      new THREE.Vector3(1, 2, 3),
      new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        Math.PI / 2,
      ),
    );
    const hits = [];
    mesh.raycast(
      new THREE.Raycaster(
        new THREE.Vector3(5, 2, 3),
        new THREE.Vector3(-1, 0, 0),
      ),
      hits,
    );

    return {
      downsampledVertexCount:
        mesh.downsampledGeometry.attributes.position.count,
      error: null,
      fullVertexCount: mesh.geometry.attributes.position.count,
      hitOwnedByMesh: hits[0]?.object === mesh,
      hitPoint: hits[0]?.point.toArray(),
      positionInvalidated: mesh.geometry.attributes.position.version > 0,
    };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

function runDepthReferenceProbe() {
  try {
    xb.Depth.instance = undefined;
    const depth = new xb.Depth();
    depth.width = 2;
    depth.height = 2;
    depth.depthArray[0] = new Float32Array([10, 20, 30, 40]);
    depth.cpuDepthData[0] = { rawValueToMeters: 0.1 };
    depth.depthProjectionInverseMatrices[0] = new THREE.Matrix4();
    const vertex = depth.getVertex(0, 1);

    return {
      bottomRightMeters: depth.getDepth(1, 0),
      error: null,
      topLeftMeters: depth.getDepth(0, 1),
      topLeftVertex: vertex?.toArray(),
    };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

function runSimulatorDepthProbe() {
  try {
    const mesh = xb.depth.depthMesh;
    const depthArray = xb.depth.depthArray[0];
    if (!mesh || !depthArray) {
      return { ready: false };
    }

    const positions = mesh.downsampledGeometry?.attributes.position;
    if (!positions) {
      return { ready: false };
    }

    mesh.updateWorldMatrix(true, false);
    const depthCamera = new THREE.Vector3();
    mesh.getWorldPosition(depthCamera);
    const uvs = mesh.downsampledGeometry.attributes.uv;
    const environment = xb.core.simulator?.simulatorScene;
    const samples = [0.25, 0.5, 0.75].map((u) => {
      let closestIndex = 0;
      let closestDistance = Infinity;
      for (let index = 0; index < uvs.count; index += 1) {
        const distance = Math.hypot(uvs.getX(index) - u, uvs.getY(index) - 0.5);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      }

      const sampleU = uvs.getX(closestIndex);
      const sampleV = uvs.getY(closestIndex);
      const depthX = Math.round(sampleU * (xb.depth.width - 1));
      const depthY = Math.round((1 - sampleV) * (xb.depth.height - 1));
      const expectedDepth =
        depthArray[depthY * xb.depth.width + depthX] *
        xb.depth.rawValueToMeters;
      const expectedPosition = new THREE.Vector3(
        2 * (sampleU - 0.5),
        2 * (sampleV - 0.5),
        -1,
      ).applyMatrix4(xb.depth.depthProjectionInverseMatrices[0]);
      expectedPosition.multiplyScalar(-expectedDepth / expectedPosition.z);
      const position = new THREE.Vector3().fromBufferAttribute(
        positions,
        closestIndex,
      );
      const expectedWorld = mesh.localToWorld(expectedPosition);
      const actualWorld = mesh.localToWorld(position);
      const direction = actualWorld.clone().sub(depthCamera);
      const distance = direction.length();
      const environmentHit = environment
        ? new THREE.Raycaster(
            depthCamera,
            direction.normalize(),
            0,
            distance + 0.5,
          ).intersectObject(environment, true)[0]
        : undefined;

      return {
        environmentDistanceError: environmentHit
          ? environmentHit.point.distanceTo(actualWorld)
          : null,
        expectedDepth,
        geometryError: expectedWorld.distanceTo(actualWorld),
        u: sampleU,
      };
    });

    return {
      depthRange: [Math.min(...depthArray), Math.max(...depthArray)],
      ready: true,
      samples,
    };
  } catch (error) {
    return { error: errorMessage(error), ready: false };
  }
}

class EvaluationApp extends xb.Script {
  static dependencies = { renderer: THREE.WebGLRenderer };

  init({ renderer }) {
    this.add(new THREE.HemisphereLight(0xffffff, 0x666666, 3));
    for (const [tag, state] of [
      ["depth-mesh-live", runMeshProbe()],
      ["depth-reference", runDepthReferenceProbe()],
      ["depth-mesh-visual", runDepthVisualProbe(renderer)],
    ]) {
      const result = new THREE.Object3D();
      result.name = tag;
      result.userData.xrblocksDevtools = { tag, state };
      this.add(result);
    }

    this.simulatorDepthResult = new THREE.Object3D();
    this.simulatorDepthResult.name = "simulator-depth";
    this.simulatorDepthResult.userData.xrblocksDevtools = {
      tag: "simulator-depth",
      state: { ready: false },
    };
    this.add(this.simulatorDepthResult);
  }

  update() {
    this.simulatorDepthResult.userData.xrblocksDevtools.state =
      runSimulatorDepthProbe();
  }
}

xb.add(new EvaluationApp());
const options = new xb.Options();
try {
  const supportProbe = new xb.DepthMesh(new xb.DepthOptions(), 2, 2);
  supportProbe.geometry.dispose();
  supportProbe.material.dispose();
  options.enableDepth();
} catch {
  // Keep the baseline app available for P2P depth consumers.
}
options.simulator.initialCameraPosition = { x: 0, y: 1.5, z: 0 };
await xb.init(options);
