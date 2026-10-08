import * as THREE from "three";
import * as xb from "xrblocks";

function averageLuminance(pixels, width, x, y) {
  let total = 0;
  let count = 0;
  for (let offsetY = -2; offsetY <= 2; offsetY += 1) {
    for (let offsetX = -2; offsetX <= 2; offsetX += 1) {
      const offset = ((y + offsetY) * width + x + offsetX) * 4;
      total +=
        pixels[offset] * 0.21 +
        pixels[offset + 1] * 0.72 +
        pixels[offset + 2] * 0.07;
      count += 1;
    }
  }
  return total / count;
}

function regionCoverage(pixels, width, centerX, centerY, predicate) {
  let matched = 0;
  let count = 0;
  for (let y = centerY - 10; y <= centerY + 10; y += 1) {
    for (let x = centerX - 10; x <= centerX + 10; x += 1) {
      const offset = (y * width + x) * 4;
      if (predicate(pixels[offset], pixels[offset + 1], pixels[offset + 2])) {
        matched += 1;
      }
      count += 1;
    }
  }
  return matched / count;
}

function pixelsToDataUrl(pixels, width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Failed to create occlusion image context.");
  context.putImageData(
    new ImageData(new Uint8ClampedArray(pixels), width, height),
    0,
    0,
  );
  return canvas.toDataURL("image/png");
}

function makeDepthTexture(useFloatDepth = false, depthMeters = 2) {
  const side = 16;
  const pixels = useFloatDepth
    ? new Float32Array(side * side * 4)
    : new Uint8Array(side * side * 4);
  const packedDepth = Math.round(depthMeters / (2 / 32768));
  for (let index = 0; index < pixels.length; index += 4) {
    if (useFloatDepth) {
      pixels[index] = depthMeters;
    } else {
      pixels[index] = packedDepth & 0xff;
      pixels[index + 1] = (packedDepth >> 8) & 0xff;
      pixels[index + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(
    pixels,
    side,
    side,
    THREE.RGBAFormat,
    useFloatDepth ? THREE.FloatType : THREE.UnsignedByteType,
  );
  texture.needsUpdate = true;
  return texture;
}

function createViewTransformProbe(renderer) {
  const run = ({ depthProjectionMatrix, depthViewMatrix } = {}) => {
    const side = 128;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 10);
    const target = new THREE.WebGLRenderTarget(side, side);
    const shaderRefs = [];
    const front = new THREE.Mesh(
      new THREE.PlaneGeometry(0.7, 0.7),
      makeOccludableMaterial(0x00ff00, shaderRefs),
    );
    const behind = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      makeOccludableMaterial(0xff0000, shaderRefs),
    );
    front.position.set(-0.42, 0, -1.25);
    behind.position.set(0.5, 0, -3);
    front.layers.enable(xb.OCCLUDABLE_ITEMS_LAYER);
    behind.layers.enable(xb.OCCLUDABLE_ITEMS_LAYER);
    scene.add(front, behind);

    renderer.setClearColor(0x000000, 1);
    renderPixels(renderer, scene, camera, target);

    const pass = new xb.OcclusionPass(scene, camera, false, false);
    const unselectedDepth = makeDepthTexture(false, 0.5);
    const selectedDepth = makeDepthTexture(false, 2);
    pass.setDepthTexture(unselectedDepth, 2 / 32768, 0);
    pass.setDepthTexture(
      selectedDepth,
      2 / 32768,
      1,
      undefined,
      depthViewMatrix,
      depthProjectionMatrix,
    );
    pass.render(renderer, undefined, undefined, 1);
    for (const shader of shaderRefs) {
      pass.updateOcclusionMapUniforms(shader.uniforms, renderer);
      shader.uniforms.occlusionEnabled.value = true;
    }

    const pixels = renderPixels(renderer, scene, camera, target);
    const result = {
      behindCoverage: regionCoverage(
        pixels,
        side,
        82,
        64,
        (red, green, blue) => red + green + blue > 75,
      ),
      frontCoverage: regionCoverage(
        pixels,
        side,
        27,
        64,
        (red, green) => green > red + 40 && green > 60,
      ),
    };

    pass.dispose();
    target.dispose();
    front.geometry.dispose();
    front.material.dispose();
    behind.geometry.dispose();
    behind.material.dispose();
    unselectedDepth.dispose();
    selectedDepth.dispose();
    return result;
  };

  try {
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 10);
    const selected = run();
    const viewTransform = run({
      depthViewMatrix: new THREE.Matrix4().makeTranslation(20, 0, 0),
    });
    const projectionTransform = run({
      depthProjectionMatrix: new THREE.Matrix4()
        .makeTranslation(20, 0, 0)
        .multiply(camera.projectionMatrix),
    });
    return {
      error: null,
      projectionTransformCoverage: projectionTransform.behindCoverage,
      selectedBehindCoverage: selected.behindCoverage,
      selectedFrontCoverage: selected.frontCoverage,
      viewTransformCoverage: viewTransform.behindCoverage,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

function makeOccludableMaterial(color, shaderRefs) {
  const material = new THREE.MeshBasicMaterial({ color });
  material.transparent = true;
  material.onBeforeCompile = (shader) => {
    xb.OcclusionUtils.addOcclusionToShader(shader);
    shader.uniforms.occlusionEnabled.value = false;
    shaderRefs.push(shader);
  };
  return material;
}

function renderPixels(renderer, scene, camera, target) {
  const pixels = new Uint8Array(target.width * target.height * 4);
  renderer.setRenderTarget(target);
  renderer.clear();
  renderer.render(scene, camera);
  renderer.readRenderTargetPixels(
    target,
    0,
    0,
    target.width,
    target.height,
    pixels,
  );
  renderer.setRenderTarget(null);
  return pixels;
}

function createOcclusionProbe(renderer, useFloatDepth = false) {
  try {
    const side = 128;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 10);
    const target = new THREE.WebGLRenderTarget(side, side);
    const shaderRefs = [];
    const front = new THREE.Mesh(
      new THREE.PlaneGeometry(0.7, 0.7),
      makeOccludableMaterial(0x00ff00, shaderRefs),
    );
    const behind = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      makeOccludableMaterial(0xff0000, shaderRefs),
    );
    front.position.set(-0.42, 0, -1.25);
    behind.position.set(0.5, 0, -3);
    front.layers.enable(xb.OCCLUDABLE_ITEMS_LAYER);
    behind.layers.enable(xb.OCCLUDABLE_ITEMS_LAYER);
    scene.add(front, behind);

    renderer.setClearColor(0x000000, 1);
    renderPixels(renderer, scene, camera, target);

    const pass = new xb.OcclusionPass(scene, camera, useFloatDepth, false);
    const depthTexture = makeDepthTexture(useFloatDepth);
    pass.setDepthTexture(depthTexture, useFloatDepth ? 1 : 2 / 32768, 0);
    pass.render(renderer);
    for (const shader of shaderRefs) {
      pass.updateOcclusionMapUniforms(shader.uniforms, renderer);
      shader.uniforms.occlusionEnabled.value = true;
    }

    const pixels = renderPixels(renderer, scene, camera, target);
    const frontLuminance = averageLuminance(pixels, side, 27, 64);
    const behindLuminance = averageLuminance(pixels, side, 82, 64);
    const frontCoverage = regionCoverage(
      pixels,
      side,
      27,
      64,
      (red, green) => green > red + 40 && green > 60,
    );
    const behindCoverage = regionCoverage(
      pixels,
      side,
      82,
      64,
      (red, green, blue) => red + green + blue > 75,
    );
    const image = pixelsToDataUrl(pixels, side, side);
    pass.dispose();
    target.dispose();
    front.geometry.dispose();
    front.material.dispose();
    behind.geometry.dispose();
    behind.material.dispose();
    depthTexture.dispose();

    return {
      behindCoverage,
      behindLuminance,
      error: null,
      frontCoverage,
      frontLuminance,
      image,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

function createDisabledRenderProbe(renderer) {
  try {
    const side = 64;
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 5);
    camera.position.z = 2;
    const target = new THREE.WebGLRenderTarget(side, side);
    const left = new THREE.Mesh(
      new THREE.PlaneGeometry(0.7, 0.7),
      new THREE.MeshBasicMaterial({ color: 0x33cc66 }),
    );
    const right = new THREE.Mesh(
      new THREE.PlaneGeometry(0.7, 0.7),
      new THREE.MeshBasicMaterial({ color: 0x3366cc }),
    );
    left.position.x = -0.45;
    right.position.x = 0.45;
    scene.add(left, right);
    renderer.setClearColor(0x000000, 1);
    const pixels = renderPixels(renderer, scene, camera, target);
    const leftLuminance = averageLuminance(pixels, side, 18, 32);
    const rightLuminance = averageLuminance(pixels, side, 46, 32);
    target.dispose();
    left.geometry.dispose();
    left.material.dispose();
    right.geometry.dispose();
    right.material.dispose();
    return { error: null, leftLuminance, rightLuminance };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

function publish(parent, tag, state) {
  const result = new THREE.Object3D();
  result.name = tag;
  result.userData.xrblocksDevtools = { tag, state };
  parent.add(result);
}

class EvaluationApp extends xb.Script {
  static dependencies = {
    renderer: THREE.WebGLRenderer,
  };

  init({ renderer }) {
    this.add(new THREE.HemisphereLight(0xffffff, 0x666666, 3));
    publish(this, "occlusion-live-render", createOcclusionProbe(renderer));
    publish(
      this,
      "occlusion-float-render",
      createOcclusionProbe(renderer, true),
    );
    publish(
      this,
      "occlusion-disabled-render",
      createDisabledRenderProbe(renderer),
    );
    publish(
      this,
      "occlusion-view-transform-render",
      createViewTransformProbe(renderer),
    );
  }
}

document.addEventListener("DOMContentLoaded", () => {
  xb.add(new EvaluationApp());
  xb.init(new xb.Options());
});
