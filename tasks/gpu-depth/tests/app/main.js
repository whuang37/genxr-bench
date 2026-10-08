import * as THREE from "three";
import * as xb from "xrblocks";

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function makeGpuDepth(texture, rawValueToMeters) {
  return { texture, width: 1, height: 1, rawValueToMeters };
}

function createNativeTexture(gl, color) {
  const texture = gl.createTexture();
  if (!texture) throw new Error("Failed to create native depth texture.");
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texImage3D(
    gl.TEXTURE_2D_ARRAY,
    0,
    gl.RGBA8,
    1,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array(color),
  );
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, null);
  return texture;
}

function sampleNativeTexture(renderer, texture) {
  const target = new THREE.WebGLRenderTarget(1, 1);
  const material = new THREE.ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    fragmentShader: `
      precision highp float;
      precision highp sampler2DArray;
      uniform sampler2DArray uTexture;
      varying vec2 vUv;
      void main() {
        gl_FragColor = texture(uTexture, vec3(vUv, 0.0));
      }
    `,
    uniforms: { uTexture: { value: texture } },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `,
  });
  const geometry = new THREE.PlaneGeometry(2, 2);
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(geometry, material));
  const pixels = new Uint8Array(4);
  const previousTarget = renderer.getRenderTarget();
  const xrEnabled = renderer.xr.enabled;
  try {
    renderer.xr.enabled = false;
    renderer.setRenderTarget(target);
    renderer.clear();
    renderer.render(scene, new THREE.Camera());
    renderer.readRenderTargetPixels(target, 0, 0, 1, 1, pixels);
    return Array.from(pixels);
  } finally {
    renderer.setRenderTarget(previousTarget);
    renderer.xr.enabled = xrEnabled;
    geometry.dispose();
    material.dispose();
    target.dispose();
  }
}

function runGpuRoutingProbe(renderer) {
  const gl = renderer.getContext();
  const nativeTextures = [
    createNativeTexture(gl, [255, 0, 0, 255]),
    createNativeTexture(gl, [0, 0, 255, 255]),
    createNativeTexture(gl, [0, 255, 0, 255]),
  ];
  try {
    const leftDepth = makeGpuDepth(nativeTextures[0], 0.125);
    const rightDepth = makeGpuDepth(nativeTextures[1], 0.25);
    xb.Depth.instance = undefined;
    const depth = new xb.Depth();
    const camera = new THREE.PerspectiveCamera();
    camera.updateMatrixWorld(true);
    depth.init(
      camera,
      new xb.DepthOptions({ depthTexture: { enabled: true } }),
      renderer,
      { register() {} },
      new THREE.Scene(),
    );

    depth.updateGPUDepthData(leftDepth, 0);
    depth.updateGPUDepthData(rightDepth, 1);

    const leftWrapper = depth.getTexture(0);
    const rightWrapper = depth.getTexture(1);
    const leftRawDepthPublished = depth.gpuDepthData[0] === leftDepth;
    const rightRawDepthPublished = depth.gpuDepthData[1] === rightDepth;
    const leftPixel = sampleNativeTexture(renderer, leftWrapper);
    const rightPixel = sampleNativeTexture(renderer, rightWrapper);
    depth.updateGPUDepthData(makeGpuDepth(nativeTextures[2], 0.5), 0);
    const refreshedWrapper = depth.getTexture(0);
    const refreshedPixel = sampleNativeTexture(renderer, refreshedWrapper);

    return {
      error: null,
      leftRawDepthPublished,
      leftPixel,
      rightRawDepthPublished,
      rightPixel,
      leftWrapperPublished: leftWrapper?.isExternalTexture === true,
      refreshedWrapperVisible:
        refreshedWrapper === leftWrapper &&
        refreshedPixel[1] > 200 &&
        refreshedPixel[0] < 30,
      refreshedPixel,
      rightWrapperPublished: rightWrapper?.isExternalTexture === true,
      separateViewWrappers: leftWrapper !== rightWrapper,
      stereoWrappersVisible:
        leftPixel[0] > 200 &&
        leftPixel[2] < 30 &&
        rightPixel[2] > 200 &&
        rightPixel[0] < 30,
    };
  } catch (error) {
    return { error: errorMessage(error) };
  } finally {
    for (const texture of nativeTextures) gl.deleteTexture(texture);
  }
}

function runCpuRoutingProbe() {
  try {
    const view = { eye: "left" };
    let cpuRequests = 0;
    let gpuRequests = 0;
    const renderer = {
      shadowMap: { enabled: false, type: null },
      xr: {
        enabled: true,
        getBinding() {
          return {
            getDepthInformation() {
              gpuRequests += 1;
              return undefined;
            },
          };
        },
        getCamera: () => undefined,
        getReferenceSpace: () => ({}),
      },
    };
    xb.Depth.instance = undefined;
    const depth = new xb.Depth();
    const camera = new THREE.PerspectiveCamera();
    camera.updateMatrixWorld(true);
    depth.init(
      camera,
      new xb.DepthOptions(),
      renderer,
      { register() {} },
      new THREE.Scene(),
    );
    const values = new Float32Array([1.5, 2.5, 3.5, 4.5]);

    depth.updateLocalDepth({
      session: { depthUsage: "cpu-optimized", depthDataFormat: "float32" },
      getDepthInformation() {
        cpuRequests += 1;
        return {
          width: 2,
          height: 2,
          data: values.buffer,
          rawValueToMeters: 0.25,
        };
      },
      getViewerPose() {
        return { views: [view] };
      },
    });

    return {
      error: null,
      cpuRequests,
      gpuRequests,
      width: depth.width,
      height: depth.height,
      topLeftMeters: depth.getDepth(0, 1),
      bottomRightMeters: depth.getDepth(1, 0),
    };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

class EvaluationApp extends xb.Script {
  static dependencies = { renderer: THREE.WebGLRenderer };

  init({ renderer }) {
    this.add(new THREE.HemisphereLight(0xffffff, 0x666666, 3));
    for (const [tag, state] of [
      ["gpu-depth-routing", runGpuRoutingProbe(renderer)],
      ["cpu-depth-routing", runCpuRoutingProbe()],
    ]) {
      const result = new THREE.Object3D();
      result.name = tag;
      result.userData.xrblocksDevtools = { tag, state };
      this.add(result);
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  xb.add(new EvaluationApp());
  xb.init(new xb.Options());
});
