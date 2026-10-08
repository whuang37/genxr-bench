import * as THREE from "three";
import * as xb from "xrblocks";

const EYE_WIDTH = 320;
const EYE_HEIGHT = 180;
const TARGET_WIDTH = EYE_WIDTH * 2;
const TARGET_HEIGHT = EYE_HEIGHT;

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function publish(tag, state) {
  const result = new THREE.Object3D();
  result.name = tag;
  result.userData.xrblocksDevtools = { tag, state };
  xb.add(result);
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to decode screenshot PNG."));
    image.src = dataUrl;
  });
}

async function sampleImage(dataUrl, xRatio, yRatio) {
  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Failed to create screenshot pixel context.");
  context.drawImage(image, 0, 0);
  return Array.from(
    context.getImageData(
      Math.floor(image.width * xRatio),
      Math.floor(image.height * yRatio),
      1,
      1,
    ).data,
  );
}

function markerBounds(pixels, startX) {
  let minX = EYE_WIDTH;
  let minY = EYE_HEIGHT;
  let maxX = -1;
  let maxY = -1;
  let count = 0;
  for (let y = 0; y < EYE_HEIGHT; y += 1) {
    for (let x = 0; x < EYE_WIDTH; x += 1) {
      const offset = (y * TARGET_WIDTH + startX + x) * 4;
      const red = pixels[offset];
      const green = pixels[offset + 1];
      const blue = pixels[offset + 2];
      if (red < 150 || red < green + 45 || red < blue + 45) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      count += 1;
    }
  }
  if (count === 0) {
    return { centerX: 0, centerY: 0, count, height: 0, width: 0 };
  }
  return {
    centerX: (minX + maxX + 1) / (2 * EYE_WIDTH),
    centerY: (minY + maxY + 1) / (2 * EYE_HEIGHT),
    count,
    height: maxY - minY + 1,
    width: maxX - minX + 1,
  };
}

function pixelsToDataUrl(pixels) {
  const flipped = new Uint8ClampedArray(pixels.length);
  const rowBytes = TARGET_WIDTH * 4;
  for (let y = 0; y < TARGET_HEIGHT; y += 1) {
    const source = (TARGET_HEIGHT - 1 - y) * rowBytes;
    flipped.set(pixels.subarray(source, source + rowBytes), y * rowBytes);
  }
  const canvas = document.createElement("canvas");
  canvas.width = TARGET_WIDTH;
  canvas.height = TARGET_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Failed to create stereo image context.");
  context.putImageData(
    new ImageData(flipped, TARGET_WIDTH, TARGET_HEIGHT),
    0,
    0,
  );
  return canvas.toDataURL("image/png");
}

function makeEyeCamera(viewport) {
  const camera = new THREE.PerspectiveCamera(
    60,
    viewport.width / viewport.height,
    0.1,
    10,
  );
  camera.position.set(0, 0, 3);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);
  camera.viewport = viewport;
  return camera;
}

const result = { pending: true };
publish("screen-overlay-stereo-result", result);

const overlay = new xb.UIOverlay({
  appearance: "none",
  compositing: "screen",
  style: { height: "100%", position: "absolute", width: "100%" },
  children: [
    new xb.UIPanel({
      style: {
        backgroundColor: "#ff2020",
        borderRadius: 70,
        height: 140,
        left: "50%",
        position: "absolute",
        top: "50%",
        transform: { translateX: "-50%", translateY: "-50%" },
        width: 140,
      },
    }),
    new xb.UIPanel({
      style: {
        backgroundColor: "#ffffff",
        height: 32,
        left: "12%",
        position: "absolute",
        top: "15%",
        transform: { translateX: "-50%", translateY: "-50%" },
        width: 32,
      },
    }),
  ],
});

class StereoHarness extends xb.Script {
  enabled = false;
  phase = "idle";

  update() {
    if (!this.enabled) return;
    if (this.phase === "idle") {
      this.configureStereoFrame();
      this.phase = "read";
      return;
    }
    if (this.phase !== "read") return;
    this.phase = "done";
    this.readStereoFrame();
  }

  configureStereoFrame() {
    const renderer = xb.core.renderer;
    const simulator = xb.core.simulator;
    if (!simulator) {
      throw new Error("Stereo proof requires the running test simulator.");
    }
    this.renderer = renderer;
    this.simulator = simulator;
    this.previous = {
      cameraAutoUpdate: renderer.xr.cameraAutoUpdate,
      cameras: [...renderer.xr.getCamera().cameras],
      enabled: renderer.xr.enabled,
      presenting: renderer.xr.isPresenting,
      renderSimulatorScene: simulator.renderSimulatorScene,
      target: renderer.getRenderTarget(),
      viewport: renderer.getViewport(new THREE.Vector4()),
    };
    this.target = new THREE.WebGLRenderTarget(TARGET_WIDTH, TARGET_HEIGHT, {
      colorSpace: THREE.SRGBColorSpace,
      depthBuffer: false,
      stencilBuffer: false,
    });
    const xrCamera = renderer.xr.getCamera();
    xrCamera.cameras.length = 0;
    xrCamera.cameras.push(
      makeEyeCamera(new THREE.Vector4(0, 0, EYE_WIDTH, EYE_HEIGHT)),
      makeEyeCamera(new THREE.Vector4(EYE_WIDTH, 0, EYE_WIDTH, EYE_HEIGHT)),
    );
    renderer.setRenderTarget(this.target);
    renderer.setViewport(0, 0, TARGET_WIDTH, TARGET_HEIGHT);
    renderer.xr.cameraAutoUpdate = false;
    renderer.xr.enabled = true;
    renderer.xr.isPresenting = true;
    simulator.renderSimulatorScene = () => {
      renderer.setRenderTarget(this.target);
      renderer.setViewport(0, 0, TARGET_WIDTH, TARGET_HEIGHT);
      renderer.setScissorTest(false);
      renderer.setClearColor(0x304050, 1);
      renderer.clear(true, false, false);
    };
  }

  readStereoFrame() {
    const renderer = this.renderer;
    const target = this.target;
    const pixels = new Uint8Array(TARGET_WIDTH * TARGET_HEIGHT * 4);
    try {
      const targetSelectedDuringRead = renderer.getRenderTarget() === target;
      const presentingDuringRead = renderer.xr.isPresenting;
      renderer.readRenderTargetPixels(
        target,
        0,
        0,
        TARGET_WIDTH,
        TARGET_HEIGHT,
        pixels,
      );
      const left = markerBounds(pixels, 0);
      const right = markerBounds(pixels, EYE_WIDTH);
      const stereoImage = pixelsToDataUrl(pixels);
      this.restore();
      Object.assign(result, {
        error: null,
        left,
        presentingDuringRead,
        restored:
          renderer.getRenderTarget() === this.previous.target &&
          renderer.xr.enabled === this.previous.enabled &&
          renderer.xr.isPresenting === this.previous.presenting,
        right,
        stereoImage,
        targetSelectedDuringRead,
      });
    } catch (error) {
      this.restore();
      Object.assign(result, { error: errorMessage(error) });
    } finally {
      target.dispose();
      result.pending = false;
    }
  }

  restore() {
    const renderer = this.renderer;
    const xrCamera = renderer.xr.getCamera();
    xrCamera.cameras.length = 0;
    xrCamera.cameras.push(...this.previous.cameras);
    renderer.xr.cameraAutoUpdate = this.previous.cameraAutoUpdate;
    renderer.xr.enabled = this.previous.enabled;
    renderer.xr.isPresenting = this.previous.presenting;
    this.simulator.renderSimulatorScene = this.previous.renderSimulatorScene;
    renderer.setRenderTarget(this.previous.target);
    renderer.setViewport(this.previous.viewport);
  }
}

const harness = new StereoHarness();
xb.add(overlay, harness);

const options = new xb.Options();
options.xrButton.enabled = false;
options.xrButton.alwaysAutostartSimulator = true;
await xb.init(options);
xb.scene.background = new THREE.Color(0x304050);
xb.camera.position.set(0, 0, 3);
xb.camera.lookAt(0, 0, 0);
xb.camera.updateMatrixWorld(true);

try {
  await xb.core.waitFrame.waitFrame();
  await xb.core.waitFrame.waitFrame();
  const monoImage = await xb.core.screenshotSynthesizer.getScreenshot(false);
  Object.assign(result, {
    monoImage,
    monoRed: await sampleImage(monoImage, 0.5, 0.5),
  });
  harness.enabled = true;
} catch (error) {
  Object.assign(result, { error: errorMessage(error), pending: false });
}
