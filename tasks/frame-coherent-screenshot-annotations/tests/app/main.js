import * as THREE from "three";
import * as xb from "xrblocks";

const state = {
  pending: true,
  evaluated: null,
};
const inspection = new THREE.Object3D();
inspection.userData.xrblocksDevtools = {
  tag: "screenshot-capture-observation",
  state,
};
const target = new THREE.Mesh(
  new THREE.PlaneGeometry(0.3, 0.3),
  new THREE.MeshBasicMaterial({ color: 0x00ff00 }),
);
target.name = "Rendered capture target";
target.position.set(0.35, 1.5, -2);
xb.add(new THREE.HemisphereLight(0xffffff, 0x666666, 3), target, inspection);

const options = new xb.Options();
options.enableSetOfMarkContext();
await xb.init(options);
xb.camera.lookAt(0, 1.5, -2);

function setCamera(x, fov) {
  xb.camera.position.set(x, 1.5, 0);
  xb.camera.fov = fov;
  xb.camera.updateProjectionMatrix();
  xb.camera.updateMatrixWorld(true);
}

async function summarize(context) {
  const mark = context?.marks.find(
    (candidate) => candidate.name === target.name,
  );
  const image = new Image();
  image.src = context?.image ?? "";
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error("Failed to load capture image."));
  });
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context2d = canvas.getContext("2d", { willReadFrequently: true });
  if (!context2d)
    throw new Error("A 2D canvas is required for capture checks.");
  context2d.drawImage(image, 0, 0);
  const pixels = context2d.getImageData(0, 0, canvas.width, canvas.height).data;
  let targetPixels = 0;
  let totalX = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];
    if (green < 180 || red > 100 || blue > 100) continue;
    targetPixels += 1;
    totalX += (index / 4) % canvas.width;
  }
  return {
    image: context?.image.startsWith("data:image/png;base64,") ?? false,
    markX: mark?.x ?? null,
    snapshotId: context?.snapshotId ?? null,
    targetPixels,
    targetX: targetPixels > 0 ? totalX / targetPixels / canvas.width : null,
  };
}

try {
  setCamera(0, 90);
  await xb.core.waitFrame.waitFrame();
  const detection = xb.context.scene.runContextDetection({
    semanticTree: false,
    visibleObjects: true,
    setOfMark: true,
  });
  await xb.core.waitFrame.waitFrame();
  setCamera(0.65, 50);
  state.evaluated = await summarize((await detection).setOfMark);
} finally {
  state.pending = false;
}
