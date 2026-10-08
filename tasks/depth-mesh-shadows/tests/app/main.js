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

function depthOptions(renderShadow) {
  return new xb.DepthOptions({
    enabled: true,
    depthMesh: {
      depthFullResolution: 6,
      enabled: true,
      renderShadow,
      shadowOpacity: 0.6,
    },
  });
}

function sampleLuminance(pixels, width, centerX, centerY) {
  let total = 0;
  let count = 0;
  for (let y = centerY - 3; y <= centerY + 3; y += 1) {
    for (let x = centerX - 3; x <= centerX + 3; x += 1) {
      const offset = (y * width + x) * 4;
      total +=
        pixels[offset] * 0.21 +
        pixels[offset + 1] * 0.72 +
        pixels[offset + 2] * 0.07;
      count += 1;
    }
  }
  return total / count;
}

function pixelsToDataUrl(pixels, width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Failed to create shadow image context.");
  context.putImageData(
    new ImageData(new Uint8ClampedArray(pixels), width, height),
    0,
    0,
  );
  return canvas.toDataURL("image/png");
}

function renderShadowComparison(renderer) {
  const size = 64;
  const target = new THREE.WebGLRenderTarget(size, size);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1.2, 1.2, 1.2, -1.2, 0.1, 5);
  const receiver = new xb.DepthMesh(depthOptions(true), 2, 2);
  const caster = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.35, 0.35),
    new THREE.MeshBasicMaterial({ color: 0xdddddd }),
  );
  const light = new THREE.DirectionalLight(0xffffff, 2);
  const pixels = new Uint8Array(size * size * 4);
  const clearColor = renderer.getClearColor(new THREE.Color());
  const clearAlpha = renderer.getClearAlpha();
  const previousTarget = renderer.getRenderTarget();

  try {
    camera.position.set(0, 0, 3);
    camera.lookAt(0, 0, 0);
    receiver.scale.setScalar(2);
    receiver.receiveShadow = true;
    caster.position.set(0, 0, 0.4);
    caster.castShadow = true;
    light.position.set(-1, -1, 2);
    light.castShadow = true;
    light.shadow.mapSize.set(512, 512);
    light.shadow.camera.left = -2;
    light.shadow.camera.right = 2;
    light.shadow.camera.top = 2;
    light.shadow.camera.bottom = -2;
    scene.add(receiver, caster, light, light.target);

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.setClearColor(0xffffff, 1);
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    renderer.readRenderTargetPixels(target, 0, 0, size, size, pixels);
    const shadowLuminance = sampleLuminance(pixels, size, 40, 40);
    const shadowImage = pixelsToDataUrl(pixels, size, size);

    caster.castShadow = false;
    light.shadow.needsUpdate = true;
    renderer.shadowMap.needsUpdate = true;
    renderer.render(scene, camera);
    renderer.readRenderTargetPixels(target, 0, 0, size, size, pixels);
    const litLuminance = sampleLuminance(pixels, size, 40, 40);

    return { litLuminance, shadowImage, shadowLuminance };
  } finally {
    renderer.setRenderTarget(previousTarget);
    renderer.setClearColor(clearColor, clearAlpha);
    target.dispose();
    caster.geometry.dispose();
    caster.material.dispose();
    receiver.geometry.dispose();
    receiver.material.dispose();
  }
}

function makeLightEstimateHarness(webglRenderer) {
  let frameCallback;
  let started = false;
  let estimate;
  const listeners = new Map();
  const session = {
    preferredReflectionFormat: "srgba8",
    requestAnimationFrame(callback) {
      frameCallback = callback;
      return 1;
    },
    async requestLightProbe() {
      return {};
    },
  };
  const renderer = {
    getContext() {
      return webglRenderer.getContext();
    },
    properties: webglRenderer.properties,
    shadowMap: { enabled: false, type: null },
    xr: {
      addEventListener(type, listener) {
        listeners.set(type, listener);
      },
      getSession() {
        return session;
      },
    },
  };

  return {
    renderer,
    async publishEstimate(nextEstimate) {
      estimate = nextEstimate;
      if (!started) {
        started = true;
        const xrWebglBinding = window.XRWebGLBinding;
        try {
          delete window.XRWebGLBinding;
          listeners.get("sessionstart")?.();
          await Promise.resolve();
          await Promise.resolve();
        } finally {
          if (xrWebglBinding) window.XRWebGLBinding = xrWebglBinding;
        }
      }
      frameCallback?.(0, {
        getLightEstimate() {
          const coefficients = Array(27).fill(0);
          coefficients[0] = estimate.ambient.x;
          coefficients[1] = estimate.ambient.y;
          coefficients[2] = estimate.ambient.z;
          return {
            primaryLightDirection: estimate.direction,
            primaryLightIntensity: estimate.primary,
            sphericalHarmonicsCoefficients: coefficients,
          };
        },
        session,
      });
    },
  };
}

function readShadowPixels(renderer, target, scene, camera, caster, light) {
  const pixels = new Uint8Array(target.width * target.height * 4);
  caster.castShadow = false;
  light.shadow.needsUpdate = true;
  renderer.shadowMap.needsUpdate = true;
  renderer.render(scene, camera);
  renderer.readRenderTargetPixels(
    target,
    0,
    0,
    target.width,
    target.height,
    pixels,
  );
  const reference = pixels.slice();

  caster.castShadow = true;
  light.shadow.needsUpdate = true;
  renderer.shadowMap.needsUpdate = true;
  renderer.render(scene, camera);
  renderer.readRenderTargetPixels(
    target,
    0,
    0,
    target.width,
    target.height,
    pixels,
  );

  const attenuation = [];
  for (let offset = 0; offset < pixels.length; offset += 4) {
    const referenceLuminance =
      reference[offset] * 0.21 +
      reference[offset + 1] * 0.72 +
      reference[offset + 2] * 0.07;
    const shadowLuminance =
      pixels[offset] * 0.21 +
      pixels[offset + 1] * 0.72 +
      pixels[offset + 2] * 0.07;
    attenuation.push(Math.max(0, referenceLuminance - shadowLuminance));
  }
  const darkness = Math.max(...attenuation);
  const edgeSpread = attenuation.filter(
    (value) => value > darkness * 0.08 && value < darkness * 0.75,
  ).length;
  return { darkness, edgeSpread };
}

async function renderAdaptiveShadowComparison(renderer) {
  const size = 128;
  const target = new THREE.WebGLRenderTarget(size, size);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1.3, 1.3, 1.3, -1.3, 0.1, 5);
  const options = depthOptions(true);
  const receiver = new xb.DepthMesh(options, 2, 2);
  const caster = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.45, 0.45),
    new THREE.MeshStandardMaterial({ color: 0xdddddd }),
  );
  const harness = makeLightEstimateHarness(renderer);
  const previousTarget = renderer.getRenderTarget();
  const clearColor = renderer.getClearColor(new THREE.Color());
  const clearAlpha = renderer.getClearAlpha();
  const xrEnabled = renderer.xr.enabled;

  xb.Lighting.instance = undefined;
  try {
    camera.position.set(0, 0, 3);
    camera.lookAt(0, 0, 0);
    receiver.scale.setScalar(2);
    receiver.receiveShadow = true;
    caster.position.set(0, 0, 0.45);
    scene.add(receiver, caster);

    const lighting = new xb.Lighting();
    lighting.init(
      new xb.LightingOptions({
        castDirectionalLightShadow: true,
        enabled: true,
        useDirectionalLight: true,
        useDynamicSoftShadow: true,
      }),
      harness.renderer,
      scene,
      { depthMesh: receiver, options },
    );
    lighting.dirLight.shadow.mapSize.set(256, 256);

    renderer.xr.enabled = false;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.setClearColor(0xffffff, 1);
    renderer.setRenderTarget(target);

    await harness.publishEstimate({
      ambient: new THREE.Vector3(0.02, 0.02, 0.02),
      direction: new THREE.Vector3(1, 2, 3).normalize(),
      primary: new THREE.Vector3(10, 10, 10),
    });
    lighting.update();
    const lowAmbient = readShadowPixels(
      renderer,
      target,
      scene,
      camera,
      caster,
      lighting.dirLight,
    );

    await harness.publishEstimate({
      ambient: new THREE.Vector3(2, 2, 2),
      direction: new THREE.Vector3(1, 2, 3).normalize(),
      primary: new THREE.Vector3(1, 1, 1),
    });
    lighting.update();
    const highAmbient = readShadowPixels(
      renderer,
      target,
      scene,
      camera,
      caster,
      lighting.dirLight,
    );

    return {
      error: null,
      highAmbientDarkness: highAmbient.darkness,
      highAmbientEdgeSpread: highAmbient.edgeSpread,
      lowAmbientDarkness: lowAmbient.darkness,
      lowAmbientEdgeSpread: lowAmbient.edgeSpread,
    };
  } catch (error) {
    return { error: errorMessage(error) };
  } finally {
    renderer.setRenderTarget(previousTarget);
    renderer.setClearColor(clearColor, clearAlpha);
    renderer.xr.enabled = xrEnabled;
    target.dispose();
    caster.geometry.dispose();
    caster.material.dispose();
    receiver.geometry.dispose();
    receiver.material.dispose();
    xb.Lighting.instance = undefined;
  }
}

function createDepthShadowProbe(renderer, camera, parent) {
  try {
    const depth = new xb.Depth();
    depth.init(camera, depthOptions(true), renderer, { register() {} }, parent);
    const mesh = depth.depthMesh;
    mesh.position.set(0, -1, -2);
    mesh.rotation.x = -Math.PI / 2;

    const caster = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.4, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x6699ff }),
    );
    caster.position.set(0, -0.4, -2);
    caster.castShadow = true;
    parent.add(caster);
    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(2, 4, 1);
    light.castShadow = true;
    parent.add(light);
    const rendered = renderShadowComparison(renderer);

    return {
      casterCasts: caster.castShadow,
      depthWrite: mesh.material.depthWrite,
      error: null,
      receivesShadow: mesh.receiveShadow,
      rendererShadowMap: renderer.shadowMap.enabled,
      rendererShadowType: renderer.shadowMap.type === THREE.PCFShadowMap,
      shadowLuminance: rendered.shadowLuminance,
      shadowImage: rendered.shadowImage,
      litLuminance: rendered.litLuminance,
      visible: mesh.material.visible,
    };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

function createBaselineProbe() {
  try {
    const mesh = new xb.DepthMesh(depthOptions(false), 2, 2);
    return {
      castsShadow: mesh.castShadow,
      error: null,
      receivesShadow: mesh.receiveShadow,
      visible: mesh.material.visible,
    };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

class EvaluationApp extends xb.Script {
  static dependencies = {
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
  };

  init({ camera, renderer }) {
    publish(
      this,
      "depth-shadow-live",
      createDepthShadowProbe(renderer, camera, this),
    );
    publish(this, "depth-shadow-baseline", createBaselineProbe());
    const adaptiveState = { pending: true };
    publish(this, "depth-shadow-adaptive", adaptiveState);
    void renderAdaptiveShadowComparison(renderer).then(
      (state) => {
        Object.assign(adaptiveState, state, { pending: false });
      },
      (error) => {
        Object.assign(adaptiveState, {
          error: errorMessage(error),
          pending: false,
        });
      },
    );
  }
}

xb.add(new EvaluationApp());
await xb.init(new xb.Options());
