import * as THREE from "three";
import * as xb from "xrblocks";

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function addInspection(tag, state) {
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

async function imageSamples(dataUrl) {
  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Failed to create screenshot pixel context.");
  context.drawImage(image, 0, 0);
  const sample = (x, y) => Array.from(context.getImageData(x, y, 1, 1).data);
  return {
    bottom: sample(
      Math.floor(image.width / 2),
      Math.floor(image.height * 0.58),
    ),
    corner: sample(10, 10),
    height: image.height,
    top: sample(Math.floor(image.width / 2), Math.floor(image.height * 0.42)),
    width: image.width,
  };
}

const lifecycleState = {
  cameraPosition: [],
  initialized: 0,
  parented: false,
  screenshotSettled: false,
  updates: 0,
  updatesAtScreenshotSettlement: 0,
};

class OrdinaryRayTarget extends xb.MeshScript {
  constructor() {
    super(
      new THREE.BoxGeometry(0.35, 0.35, 0.18),
      new THREE.MeshBasicMaterial({ color: 0xffb02e }),
    );
    this.position.set(0.7, 0, 0.6);
    this.state = { ends: 0, starts: 0 };
    this.userData.xrblocksDevtools = {
      state: this.state,
      tag: "screenshot-ordinary-ray-target",
    };
  }

  onObjectSelectStart() {
    this.state.starts += 1;
  }

  onObjectSelectEnd() {
    this.state.ends += 1;
  }
}

class EvaluationApp extends xb.Script {
  init() {
    lifecycleState.initialized += 1;
    xb.scene.background = new THREE.Color(0x050505);
    this.captureGroup = new THREE.Group();
    const top = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 0.9),
      new THREE.MeshBasicMaterial({ color: 0xee2020 }),
    );
    const bottom = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 0.9),
      new THREE.MeshBasicMaterial({ color: 0x2040ee }),
    );
    top.position.set(0, 0.55, 0);
    bottom.position.set(0, -0.55, 0);
    this.captureGroup.add(top, bottom);
    this.add(this.captureGroup, new OrdinaryRayTarget());
    lifecycleState.parented = this.captureGroup.parent === this;
    this.userData.xrblocksDevtools = {
      state: lifecycleState,
      tag: "screenshot-render-lifecycle",
    };
  }

  update() {
    lifecycleState.updates += 1;
  }
}

xb.add(new EvaluationApp());
addInspection("screenshot-synthesis-basic-app", {
  error: null,
  renderedScene: true,
});

const options = new xb.Options();
options.enableCamera();
await xb.init(options);

xb.camera.position.set(0, 0, 3);
xb.camera.lookAt(0, 0, 0);
xb.camera.updateMatrixWorld(true);
lifecycleState.cameraPosition = xb.camera.position.toArray();

const captureState = { pending: true };
addInspection("screenshot-public-lifecycle", captureState);

const renderer = xb.core.renderer;

try {
  await xb.core.waitFrame.waitFrame();

  const initialTarget = renderer.getRenderTarget();
  const initialXrPresenting = renderer.xr.isPresenting;
  const mainSize = new THREE.Vector2();
  if (initialTarget) {
    mainSize.set(initialTarget.width, initialTarget.height);
  } else {
    renderer.getDrawingBufferSize(mainSize);
  }
  const stereo =
    renderer.xr.isPresenting && renderer.xr.getCamera().cameras.length === 2;
  const sourceEyeWidth = stereo ? mainSize.x / 2 : mainSize.x;
  const expectedHeight = Math.round(mainSize.y * (1280 / sourceEyeWidth));

  const firstPromise = xb.core.screenshotSynthesizer.getScreenshot(false);
  const secondPromise = xb.core.screenshotSynthesizer.getScreenshot(false);
  const [firstImage, secondImage] = await Promise.all([
    firstPromise,
    secondPromise,
  ]);
  const virtual = await imageSamples(firstImage);

  let cameraWaitFrames = 0;
  while (!xb.core.deviceCamera?.loaded && cameraWaitFrames < 20) {
    cameraWaitFrames += 1;
    await xb.core.waitFrame.waitFrame();
  }
  const cameraLoaded = xb.core.deviceCamera?.loaded === true;
  const overlayImage = cameraLoaded
    ? await xb.core.screenshotSynthesizer.getScreenshot(true)
    : "";
  const texturesAfterFirstOverlay = renderer.info.memory.textures;
  const repeatedOverlayImage = cameraLoaded
    ? await xb.core.screenshotSynthesizer.getScreenshot(true)
    : "";
  const texturesAfterSecondOverlay = renderer.info.memory.textures;
  const overlay = overlayImage
    ? await imageSamples(overlayImage)
    : { corner: [], height: 0, width: 0 };
  const repeatedOverlay = repeatedOverlayImage
    ? await imageSamples(repeatedOverlayImage)
    : { height: 0, width: 0 };

  Object.assign(captureState, {
    cameraLoaded,
    coalesced: firstImage === secondImage,
    error: null,
    expectedHeight,
    height: virtual.height,
    overlayCorner: overlay.corner,
    overlayImage,
    overlayPng: overlayImage.startsWith("data:image/png;base64,"),
    overlayResourcesStable:
      texturesAfterSecondOverlay === texturesAfterFirstOverlay,
    repeatedOverlayMatchesDimensions:
      repeatedOverlay.width === overlay.width &&
      repeatedOverlay.height === overlay.height,
    repeatedOverlayPng: repeatedOverlayImage.startsWith(
      "data:image/png;base64,",
    ),
    stateRestored:
      renderer.getRenderTarget() === initialTarget &&
      renderer.xr.isPresenting === initialXrPresenting,
    top: virtual.top,
    bottom: virtual.bottom,
    virtualCorner: virtual.corner,
    virtualImage: firstImage,
    width: virtual.width,
  });
  addInspection("screenshot-synthesis-output", {
    blueDominant: virtual.bottom[2] > virtual.bottom[0],
    error: null,
    height: virtual.height,
    png: firstImage.startsWith("data:image/png;base64,"),
    width: virtual.width,
  });
} catch (error) {
  Object.assign(captureState, { error: errorMessage(error) });
  addInspection("screenshot-synthesis-output", {
    error: errorMessage(error),
  });
} finally {
  captureState.pending = false;
  lifecycleState.screenshotSettled = true;
  lifecycleState.updatesAtScreenshotSettlement = lifecycleState.updates;
}
