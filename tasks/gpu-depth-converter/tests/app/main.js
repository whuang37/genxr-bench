import * as THREE from "three";
import * as xb from "xrblocks";

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function publish(parent, tag, state) {
  const result = new THREE.Object3D();
  result.name = tag;
  result.userData.xrblocksDevtools = { tag, state };
  parent.add(result);
}

function createNativeDepthTexture(gl, values, width, height) {
  const texture = gl.createTexture();
  if (!texture) throw new Error("Failed to create native depth texture.");
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage3D(
    gl.TEXTURE_2D_ARRAY,
    0,
    gl.R32F,
    width,
    height,
    1,
    0,
    gl.RED,
    gl.FLOAT,
    values,
  );
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, null);
  return texture;
}

function updateNativeDepthTexture(gl, texture, values, width, height) {
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
  gl.texSubImage3D(
    gl.TEXTURE_2D_ARRAY,
    0,
    0,
    0,
    0,
    width,
    height,
    1,
    gl.RED,
    gl.FLOAT,
    values,
  );
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, null);
}

function gpuDepth(texture, width, height, rawValueToMeters) {
  return {
    depthNear: 0.1,
    height,
    rawValueToMeters,
    texture,
    width,
  };
}

function runConverterProbe(renderer) {
  const gl = renderer.getContext();
  if (!(gl instanceof WebGL2RenderingContext)) {
    return { error: "The converter probe requires WebGL 2." };
  }

  const width = 2;
  const height = 2;
  const texture = createNativeDepthTexture(
    gl,
    new Float32Array([0.5, 0.75, 0.875, 0.9375]),
    width,
    height,
  );
  const callerTarget = new THREE.WebGLRenderTarget(3, 3);
  const targetBeforeProbe = renderer.getRenderTarget();
  const originalRender = renderer.render;
  const xrStatesDuringRender = [];

  try {
    xb.Depth.instance = undefined;
    const depth = new xb.Depth();
    const camera = new THREE.PerspectiveCamera();
    camera.updateMatrixWorld(true);
    depth.init(
      camera,
      new xb.DepthOptions({ depthMesh: { enabled: true } }),
      renderer,
      { register() {} },
      new THREE.Scene(),
    );

    renderer.setRenderTarget(callerTarget);
    renderer.xr.enabled = true;
    renderer.render = function (...args) {
      xrStatesDuringRender.push(this.xr.enabled);
      return originalRender.apply(this, args);
    };

    depth.updateGPUDepthData(gpuDepth(texture, width, height, 0.001), 0);
    const firstData = depth.cpuDepthData[0];
    const firstValues = Array.from(new Float32Array(firstData.data));

    updateNativeDepthTexture(
      gl,
      texture,
      new Float32Array([0.6, 0.8, 0.9, 0.95]),
      width,
      height,
    );
    renderer.resetState();
    renderer.setRenderTarget(callerTarget);
    depth.updateGPUDepthData(gpuDepth(texture, width, height, 0.025), 0);
    const secondData = depth.cpuDepthData[0];

    return {
      error: null,
      firstScale: firstData.rawValueToMeters,
      firstValues,
      height: secondData.height,
      readbackBufferReused: secondData.data === firstData.data,
      renderTargetRestored: renderer.getRenderTarget() === callerTarget,
      secondScale: secondData.rawValueToMeters,
      secondValues: Array.from(new Float32Array(secondData.data)),
      width: secondData.width,
      xrDisabledDuringConversion:
        xrStatesDuringRender.length > 0 &&
        xrStatesDuringRender.every((enabled) => !enabled),
      xrReenabled: renderer.xr.enabled,
    };
  } catch (error) {
    return { error: errorMessage(error) };
  } finally {
    renderer.render = originalRender;
    renderer.xr.enabled = false;
    renderer.setRenderTarget(targetBeforeProbe);
    callerTarget.dispose();
    gl.deleteTexture(texture);
    xb.Depth.instance = undefined;
  }
}

class EvaluationApp extends xb.Script {
  static dependencies = { renderer: THREE.WebGLRenderer };

  init({ renderer }) {
    this.add(new THREE.HemisphereLight(0xffffff, 0x666666, 3));
    publish(this, "gpu-depth-converter", runConverterProbe(renderer));
  }
}

xb.add(new EvaluationApp());
await xb.init(new xb.Options());
