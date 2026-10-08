import * as THREE from "three";
import * as xb from "xrblocks";

function makeDepthTexture(depthMeters = 2) {
  const side = 16;
  const pixels = new Uint8Array(side * side * 4);
  const metersToRaw = 2 / 32768;
  const packedDepth = Math.round(depthMeters / metersToRaw);
  for (let index = 0; index < pixels.length; index += 4) {
    pixels[index] = packedDepth & 0xff;
    pixels[index + 1] = (packedDepth >> 8) & 0xff;
    pixels[index + 3] = 255;
  }
  const texture = new THREE.DataTexture(pixels, side, side, THREE.RGBAFormat);
  texture.needsUpdate = true;
  return { metersToRaw, texture };
}

function makeOccludableMaterial(shaderRefs) {
  const material = new THREE.MeshBasicMaterial({ color: 0xff5533 });
  material.transparent = true;
  material.onBeforeCompile = (shader) => {
    xb.OcclusionUtils.addOcclusionToShader(shader);
    shader.uniforms.occlusionEnabled.value = false;
    shaderRefs.push(shader);
  };
  return material;
}

function renderTarget(renderer, scene, camera, target) {
  renderer.setRenderTarget(target);
  renderer.clear();
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
}

function renderPixels(renderer, scene, camera, target) {
  const pixels = new Uint8Array(target.width * target.height * 4);
  renderTarget(renderer, scene, camera, target);
  renderer.readRenderTargetPixels(
    target,
    0,
    0,
    target.width,
    target.height,
    pixels,
  );
  return pixels;
}

function visibleCoverage(pixels, side) {
  let visible = 0;
  let total = 0;
  const start = Math.floor(side * 0.375);
  const end = Math.ceil(side * 0.625);
  for (let y = start; y <= end; y += 1) {
    for (let x = start; x <= end; x += 1) {
      const offset = (y * side + x) * 4;
      if (pixels[offset] > 80 && pixels[offset] > pixels[offset + 1] + 30) {
        visible += 1;
      }
      total += 1;
    }
  }
  return visible / total;
}

function renderOcclusionCase(
  renderer,
  {
    depthImageOffset,
    depthMeters = 2,
    objectDepth = 3,
    occludable = true,
    occlusionShader = true,
    side = 128,
    viewId = 0,
  } = {},
) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 10);
  const target = new THREE.WebGLRenderTarget(side, side);
  const shaderRefs = [];
  const material = occlusionShader
    ? makeOccludableMaterial(shaderRefs)
    : new THREE.MeshBasicMaterial({ color: 0xff5533 });
  const object = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  object.position.z = -objectDepth;
  if (occludable) {
    object.layers.enable(xb.OCCLUDABLE_ITEMS_LAYER);
  } else {
    // Keep the object renderable to the viewer but outside the pass layer.
    object.layers.set(5);
    camera.layers.enable(5);
  }
  scene.add(object);

  renderer.setClearColor(0x000000, 1);
  renderTarget(renderer, scene, camera, target);

  const pass = new xb.OcclusionPass(scene, camera, false, false);
  const { metersToRaw, texture } = makeDepthTexture(depthMeters);
  const depthProjectionMatrix = depthImageOffset
    ? new THREE.Matrix4()
        .makeTranslation(depthImageOffset[0], depthImageOffset[1], 0)
        .multiply(camera.projectionMatrix)
    : undefined;
  pass.setDepthTexture(
    texture,
    metersToRaw,
    viewId,
    undefined,
    undefined,
    depthProjectionMatrix,
  );
  pass.render(renderer, undefined, undefined, viewId);
  for (const shader of shaderRefs) {
    pass.updateOcclusionMapUniforms(shader.uniforms, renderer);
    shader.uniforms.occlusionEnabled.value = true;
  }

  const coverage = visibleCoverage(
    renderPixels(renderer, scene, camera, target),
    side,
  );
  const renderStateRestored =
    scene.overrideMaterial === null && renderer.getRenderTarget() === null;
  pass.dispose();
  target.dispose();
  object.geometry.dispose();
  material.dispose();
  texture.dispose();
  return { coverage, renderStateRestored };
}

function createBoundsProbe(renderer) {
  const behind = renderOcclusionCase(renderer);
  const front = renderOcclusionCase(renderer, { objectDepth: 1 });
  const nonOccludable = renderOcclusionCase(renderer, {
    occludable: false,
    occlusionShader: false,
  });
  const outside = [
    renderOcclusionCase(renderer, { depthImageOffset: [20, 0] }),
    renderOcclusionCase(renderer, { depthImageOffset: [-20, 0] }),
    renderOcclusionCase(renderer, { depthImageOffset: [0, 20] }),
    renderOcclusionCase(renderer, { depthImageOffset: [0, -20] }),
  ];
  const partialEdge = renderOcclusionCase(renderer, {
    depthImageOffset: [1, 0],
  });
  const transformedView = renderOcclusionCase(renderer, {
    depthImageOffset: [20, 0],
    viewId: 1,
  });
  const resizedTargets = [96, 192].map((side) =>
    renderOcclusionCase(renderer, { side }),
  );
  return {
    inBoundsBehindCoverage: behind.coverage,
    inBoundsFrontCoverage: front.coverage,
    nonOccludableCoverage: nonOccludable.coverage,
    outOfBoundsCoverages: outside.map(({ coverage }) => coverage),
    partialEdgeCoverage: partialEdge.coverage,
    transformedViewCoverage: transformedView.coverage,
    resizedTargetCoverages: resizedTargets.map(({ coverage }) => coverage),
    renderStateRestored: [
      behind,
      front,
      nonOccludable,
      ...outside,
      partialEdge,
      transformedView,
      ...resizedTargets,
    ].every(({ renderStateRestored }) => renderStateRestored),
  };
}

function publish(parent, state) {
  const result = new THREE.Object3D();
  result.userData.xrblocksDevtools = {
    tag: "occlusion-frustum-bounds",
    state,
  };
  parent.add(result);
}

class EvaluationApp extends xb.Script {
  static dependencies = {
    renderer: THREE.WebGLRenderer,
  };

  init({ renderer }) {
    this.add(new THREE.HemisphereLight(0xffffff, 0x666666, 3));
    publish(this, createBoundsProbe(renderer));
  }
}

document.addEventListener("DOMContentLoaded", () => {
  xb.add(new EvaluationApp());
  xb.init(new xb.Options());
});
