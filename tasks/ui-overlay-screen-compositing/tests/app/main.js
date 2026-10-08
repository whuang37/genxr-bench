import * as THREE from "three";
import * as xb from "xrblocks";

const BACKGROUND = new THREE.Color(0x304050);
const BLACK = new THREE.Color(0x000000);

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function publish(tag, state) {
  const result = new THREE.Object3D();
  result.name = tag;
  result.userData.xrblocksDevtools = { tag, state };
  xb.add(result);
}

function panel(style) {
  return new xb.UIPanel({ style });
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error(`Failed to decode image ${source}.`));
    image.src = source;
  });
}

function imageData(image) {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Failed to create screenshot pixel context.");
  context.drawImage(image, 0, 0);
  return {
    context,
    height: image.height,
    pixels: context.getImageData(0, 0, image.width, image.height).data,
    width: image.width,
  };
}

function averageSample(context, width, height, xRatio, yRatio) {
  const centerX = Math.floor(width * xRatio);
  const centerY = Math.floor(height * yRatio);
  const data = context.getImageData(centerX - 2, centerY - 2, 5, 5).data;
  const sample = [0, 0, 0, 0];
  for (let index = 0; index < data.length; index += 4) {
    for (let channel = 0; channel < 4; channel += 1) {
      sample[channel] += data[index + channel];
    }
  }
  return sample.map((value) => Math.round(value / 25));
}

function colorBounds(pixels, width, height, predicate) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let count = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      if (!predicate(pixels, offset)) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      count += 1;
    }
  }
  return count === 0
    ? { centerX: 0, centerY: 0, count, height: 0, width: 0 }
    : {
        centerX: (minX + maxX + 1) / (2 * width),
        centerY: (minY + maxY + 1) / (2 * height),
        count,
        height: maxY - minY + 1,
        width: maxX - minX + 1,
      };
}

async function inspectImage(dataUrl) {
  const decoded = imageData(await loadImage(dataUrl));
  const { context, height, pixels, width } = decoded;
  return {
    background: averageSample(context, width, height, 0.9, 0.9),
    blackCenter: averageSample(context, width, height, 0.5, 0.5),
    cyanBounds: colorBounds(
      pixels,
      width,
      height,
      (values, offset) =>
        values[offset] < 120 &&
        values[offset + 1] > 140 &&
        values[offset + 2] > 140,
    ),
    height,
    magentaBounds: colorBounds(
      pixels,
      width,
      height,
      (values, offset) =>
        values[offset] > 120 &&
        values[offset + 1] < 130 &&
        values[offset + 2] > 150,
    ),
    redBounds: colorBounds(
      pixels,
      width,
      height,
      (values, offset) =>
        values[offset] > 150 &&
        values[offset] > values[offset + 1] + 45 &&
        values[offset] > values[offset + 2] + 45,
    ),
    redMarker: averageSample(context, width, height, 0.75, 0.25),
    transparentCorner: averageSample(context, width, height, 0.9, 0.1),
    whiteMarker: averageSample(context, width, height, 0.15, 0.2),
    width,
    yellowBounds: colorBounds(
      pixels,
      width,
      height,
      (values, offset) =>
        values[offset] > 150 &&
        values[offset + 1] > 150 &&
        values[offset + 2] < 120,
    ),
  };
}

async function compareImages(firstUrl, secondUrl, threshold = 12) {
  const [first, second] = await Promise.all([
    loadImage(firstUrl),
    loadImage(secondUrl),
  ]);
  if (first.width !== second.width || first.height !== second.height) {
    return {
      differingPixelRatio: 1,
      dimensionMatch: false,
      maxChannelDelta: 255,
      meanChannelDelta: 255,
    };
  }
  const firstPixels = imageData(first).pixels;
  const secondPixels = imageData(second).pixels;
  let differingPixels = 0;
  let maxChannelDelta = 0;
  let totalChannelDelta = 0;
  for (let offset = 0; offset < firstPixels.length; offset += 4) {
    let pixelDiffers = false;
    for (let channel = 0; channel < 3; channel += 1) {
      const delta = Math.abs(
        firstPixels[offset + channel] - secondPixels[offset + channel],
      );
      maxChannelDelta = Math.max(maxChannelDelta, delta);
      totalChannelDelta += delta;
      pixelDiffers ||= delta > threshold;
    }
    if (pixelDiffers) differingPixels += 1;
  }
  const pixelCount = first.width * first.height;
  return {
    differingPixelRatio: differingPixels / pixelCount,
    dimensionMatch: true,
    maxChannelDelta,
    meanChannelDelta: totalChannelDelta / (pixelCount * 3),
  };
}

async function waitFrames(count = 2) {
  for (let frame = 0; frame < count; frame += 1) {
    await xb.core.waitFrame.waitFrame();
  }
}

async function captureImage() {
  await waitFrames();
  const image = await xb.core.screenshotSynthesizer.getScreenshot(false);
  return { image, samples: await inspectImage(image) };
}

async function captureReadyDirectImage() {
  let capture;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    capture = await captureImage();
    if (
      capture.samples.cyanBounds.count > 50 &&
      capture.samples.magentaBounds.count > 50 &&
      capture.samples.yellowBounds.count > 50
    ) {
      return capture;
    }
  }
  return capture;
}

class UnderlayTarget extends xb.MeshScript {
  constructor(tag, positionX) {
    super(
      new THREE.BoxGeometry(0.14, 0.14, 0.14),
      new THREE.MeshBasicMaterial({ color: BACKGROUND }),
    );
    this.position.x = positionX;
    this.state = { ends: 0, starts: 0 };
    this.userData.xrblocksDevtools = { tag, state: this.state };
  }

  onObjectSelectStart() {
    this.state.starts += 1;
  }

  onObjectSelectEnd() {
    this.state.ends += 1;
  }
}

const screenOverlay = new xb.UIOverlay({
  appearance: "none",
  compositing: "screen",
  style: { height: "100%", position: "absolute", width: "100%" },
  children: [
    panel({
      backgroundColor: "#000000",
      height: 180,
      left: "50%",
      position: "absolute",
      top: "50%",
      transform: { translateX: "-50%", translateY: "-50%" },
      width: 220,
    }),
    panel({
      backgroundColor: "#ff2020",
      borderRadius: 60,
      height: 120,
      left: "75%",
      position: "absolute",
      top: "25%",
      transform: { translateX: "-50%", translateY: "-50%" },
      width: 120,
    }),
    panel({
      backgroundColor: "#ffffff",
      height: 72,
      left: "15%",
      position: "absolute",
      top: "20%",
      transform: { translateX: "-50%", translateY: "-50%" },
      width: 72,
    }),
  ],
});

function directChildren() {
  return [
    panel({
      backgroundColor: "#20d0e0",
      borderRadius: 22,
      height: 96,
      left: "68%",
      position: "absolute",
      top: "34%",
      transform: { translateX: "-50%", translateY: "-50%" },
      width: 180,
    }),
    panel({
      backgroundColor: "#b040d0",
      height: 70,
      left: "28%",
      position: "absolute",
      top: "66%",
      transform: { translateX: "-50%", translateY: "-50%" },
      width: 70,
    }),
    panel({
      backgroundColor: "#ffff20",
      height: 52,
      left: "82%",
      position: "absolute",
      top: "78%",
      transform: { translateX: "-50%", translateY: "-50%" },
      width: 92,
    }),
  ];
}

const defaultDirectOverlay = new xb.UIOverlay({
  appearance: "none",
  pointerEvents: "none",
  style: { height: "100%", position: "absolute", width: "100%" },
  children: directChildren(),
});

const explicitDirectOverlay = new xb.UIOverlay({
  appearance: "none",
  compositing: "direct",
  pointerEvents: "none",
  visible: false,
  style: { height: "100%", position: "absolute", width: "100%" },
  children: directChildren(),
});

const directInteraction = { clicks: 0 };
const directButton = new xb.UIButton({
  ariaLabel: "Direct overlay target",
  onClick: () => {
    directInteraction.clicks += 1;
  },
  style: {
    backgroundColor: "#40c060",
    height: 100,
    left: "50%",
    position: "absolute",
    top: "50%",
    transform: { translateX: "-50%", translateY: "-50%" },
    width: 160,
  },
});
directButton.userData.xrblocksDevtools = {
  tag: "direct-overlay-button",
  state: directInteraction,
};
const directInteractionOverlay = new xb.UIOverlay({
  appearance: "none",
  visible: false,
  style: { height: "100%", position: "absolute", width: "100%" },
  children: [directButton],
});

const lifecycle = { initialized: 0, updates: 0 };

class EvaluationApp extends xb.Script {
  init() {
    lifecycle.initialized += 1;
    xb.scene.background = BACKGROUND;
    this.add(
      new UnderlayTarget("screen-composite-underlay-target", -0.85),
      screenOverlay,
      defaultDirectOverlay,
      explicitDirectOverlay,
      directInteractionOverlay,
    );
  }

  update() {
    lifecycle.updates += 1;
  }
}

const capture = { pending: true };
publish("screen-composite-capture", capture);
publish("screen-composite-lifecycle", lifecycle);
xb.add(new EvaluationApp());

await xb.init(new xb.Options());
xb.camera.position.set(0, 0, 3);
xb.camera.lookAt(0, 0, 0);
xb.camera.updateMatrixWorld(true);

try {
  screenOverlay.visible = false;
  directInteractionOverlay.visible = false;
  defaultDirectOverlay.visible = true;
  explicitDirectOverlay.visible = false;
  xb.scene.background = BACKGROUND;
  const direct = await captureReadyDirectImage();

  defaultDirectOverlay.visible = false;
  screenOverlay.visible = false;
  const worldOnly = await captureImage();

  screenOverlay.visible = true;
  xb.scene.background = BLACK;
  const screenSource = await captureImage();

  xb.scene.background = BACKGROUND;
  const screenComposite = await captureImage();
  const texturesAfterComposite = xb.core.renderer.info.memory.textures;
  const repeatedComposite = await captureImage();
  const texturesAfterRepeat = xb.core.renderer.info.memory.textures;

  screenOverlay.visible = false;
  const hiddenScreen = await captureImage();
  screenOverlay.visible = true;
  const reappearedScreen = await captureImage();
  screenOverlay.removeFromParent();
  const removedScreen = await captureImage();
  xb.add(screenOverlay);
  const readdedScreen = await captureImage();

  const repeatedScreenParity = await compareImages(
    screenComposite.image,
    repeatedComposite.image,
  );

  Object.assign(capture, {
    directImage: direct.image,
    directSamples: direct.samples,
    directCompositing: defaultDirectOverlay.compositing,
    error: null,
    explicitDirectCompositing: explicitDirectOverlay.compositing,
    hiddenScreen: hiddenScreen.samples,
    readdedScreen: readdedScreen.samples,
    reappearedScreen: reappearedScreen.samples,
    removedScreen: removedScreen.samples,
    repeatedScreenParity,
    screenComposite: screenComposite.samples,
    screenCompositeImage: screenComposite.image,
    screenCompositing: screenOverlay.compositing,
    screenPointerEvents: screenOverlay.xb?.pointerEvents,
    screenSource: screenSource.samples,
    texturesStable: texturesAfterRepeat === texturesAfterComposite,
    worldOnly: worldOnly.samples,
  });

  directInteractionOverlay.visible = true;
  await waitFrames();
} catch (error) {
  Object.assign(capture, { error: errorMessage(error) });
} finally {
  capture.pending = false;
}
