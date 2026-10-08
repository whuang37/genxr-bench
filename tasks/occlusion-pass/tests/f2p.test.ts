import * as THREE from "three";

import { expect, it, it_session, judge } from "@xrblocks/devtools/test";

import {
  loadOcclusionModules,
  makeDepthTexture,
  makePassRenderer,
} from "./fixtures/occlusion-fixtures.ts";

const { OcclusionPass, OcclusionUtils } = await loadOcclusionModules();

it("prepares supported material shaders and publishes the current XR camera transform", () => {
  const camera = new THREE.PerspectiveCamera();
  const xrCamera = new THREE.PerspectiveCamera();
  xrCamera.position.set(1, 2, 3);
  xrCamera.updateMatrixWorld(true);
  const scene = new THREE.Scene();
  const pass = new OcclusionPass(scene, camera);
  const shader = {
    defines: {},
    fragmentShader:
      "uniform vec3 diffuse;\nvec4 diffuseColor = vec4( diffuse, opacity );",
    uniforms: {},
    vertexShader: "#include <common>\n#include <fog_vertex>",
  };
  const originalVertexShader = shader.vertexShader;
  const originalFragmentShader = shader.fragmentShader;

  OcclusionUtils.addOcclusionToShader(shader as never);
  pass.setDepthTexture(makeDepthTexture(), 4 / 255, 0);
  pass.updateOcclusionMapUniforms(
    shader.uniforms as never,
    makePassRenderer(64, 48, [xrCamera]).renderer,
  );

  const overrideMaterial = OcclusionUtils.createOcclusionMapOverrideMaterial();
  expect(overrideMaterial.isMaterial).toBe(true);
  expect(shader.vertexShader).not.toBe(originalVertexShader);
  expect(shader.fragmentShader).not.toBe(originalFragmentShader);
  const values = uniformValues(shader.uniforms);
  expect(values.some((value) => value instanceof THREE.Texture)).toBe(true);
  const expectedTransform = xrCamera.projectionMatrix
    .clone()
    .multiply(xrCamera.matrixWorldInverse);
  expect(
    values.some(
      (value) =>
        value instanceof THREE.Matrix4 && value.equals(expectedTransform),
    ),
  ).toBe(true);
  overrideMaterial.dispose();
  pass.dispose();
});

it("renders a selected depth view and restores scene, camera, and target state", () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  const selectedCamera = new THREE.PerspectiveCamera();
  selectedCamera.layers.set(5);
  const originalLayerMask = selectedCamera.layers.mask;
  const pass = new OcclusionPass(scene, camera, true, false, 3);
  const renderer = makePassRenderer(80, 40, [camera, selectedCamera]);

  pass.setDepthTexture(
    makeDepthTexture(),
    4 / 255,
    1,
    undefined,
    new THREE.Matrix4().makeTranslation(2, 0, 0),
    new THREE.Matrix4().makeScale(1.5, 1, 1),
  );
  pass.render(renderer.renderer, undefined, undefined, 1);

  expect(renderer.currentTarget).toBe(renderer.originalTarget);
  expect(renderer.targetCalls.at(-1)).toBe(renderer.originalTarget);
  expect(scene.overrideMaterial).toBeNull();
  expect(selectedCamera.layers.mask).toBe(originalLayerMask);
  expect(
    renderer.drawCalls.some((drawCall) => drawCall.camera === selectedCamera),
  ).toBe(true);
  expect(renderer.drawCalls.length).toBeGreaterThan(0);
  pass.dispose();
});

it("composes the read buffer across stable and resized drawing dimensions", () => {
  const pass = new OcclusionPass(
    new THREE.Scene(),
    new THREE.PerspectiveCamera(),
  );
  const renderer = makePassRenderer(64, 48);
  const readBuffer = new THREE.WebGLRenderTarget(64, 48);
  readBuffer.depthTexture = new THREE.DepthTexture(64, 48);
  const writeBuffer = new THREE.WebGLRenderTarget(64, 48);
  try {
    pass.setDepthTexture(makeDepthTexture(), 4 / 255, 0);
    pass.render(renderer.renderer, writeBuffer, readBuffer);
    const drawsAtInitialSize = renderer.drawCalls.length;
    const firstOwnedTargets = new Set(
      renderer.targetCalls.filter(
        (target) =>
          target &&
          target !== renderer.originalTarget &&
          target !== readBuffer &&
          target !== writeBuffer,
      ),
    );
    expect(firstOwnedTargets.size).toBeGreaterThan(0);

    pass.render(renderer.renderer, writeBuffer, readBuffer);
    expect(renderer.drawCalls.length).toBeGreaterThan(drawsAtInitialSize);
    expect(
      renderer.targetCalls.some((target) => firstOwnedTargets.has(target!)),
    ).toBe(true);
    const drawsAtStableSize = renderer.drawCalls.length;

    renderer.setDrawingBufferSize(96, 72);
    pass.render(renderer.renderer, writeBuffer, readBuffer);
    expect(renderer.drawCalls.length).toBeGreaterThan(drawsAtStableSize);
    expect(
      renderer.targetCalls.some(
        (target) =>
          target &&
          target !== renderer.originalTarget &&
          target !== readBuffer &&
          target !== writeBuffer &&
          target.width === 96 &&
          target.height === 72,
      ),
    ).toBe(true);
    expect(renderer.currentTarget).toBe(renderer.originalTarget);

    pass.dispose();
  } finally {
    readBuffer.dispose();
    writeBuffer.dispose();
  }
});

it("binds environment depth to a material rendered by the read-buffer path", () => {
  const pass = new OcclusionPass(
    new THREE.Scene(),
    new THREE.PerspectiveCamera(),
  );
  const renderer = makePassRenderer(64, 48);
  const environmentDepth = makeDepthTexture();
  const readBuffer = new THREE.WebGLRenderTarget(64, 48);
  readBuffer.depthTexture = new THREE.DepthTexture(64, 48);

  try {
    pass.setDepthTexture(environmentDepth, 4 / 255, 0);
    pass.renderOcclusionMapFromReadBuffer(
      renderer.renderer,
      readBuffer,
      new THREE.Vector2(64, 48),
      0,
    );

    expect(renderer.drawCalls.length).toBeGreaterThan(0);
    expect(renderedUniformValues(renderer.drawCalls)).toContain(
      environmentDepth,
    );
  } finally {
    pass.dispose();
    environmentDepth.dispose();
    readBuffer.dispose();
  }
});

it_session(
  "renders a supplied depth surface in front of one virtual region and over another",
  async (session) => {
    await session.stepFrame(2);
    const inspection = await session.objects.inspect({
      tag: "occlusion-live-render",
    });

    expect(inspection.state).toMatchObject({
      behindLuminance: expect.any(Number),
      error: null,
      frontCoverage: expect.any(Number),
      frontLuminance: expect.any(Number),
      image: expect.stringMatching(/^data:image\/png;base64,/),
    });
    const state = inspection.state as {
      behindCoverage: number;
      behindLuminance: number;
      frontCoverage: number;
      frontLuminance: number;
      image: string;
    };
    expect(state.frontLuminance).toBeGreaterThan(30);
    expect(state.frontLuminance).toBeGreaterThan(state.behindLuminance + 20);
    expect(state.frontCoverage).toBeGreaterThan(0.45);
    expect(state.behindCoverage).toBeLessThan(0.15);

    const visualJudgment = await judge({
      prompt:
        "Return a positive verdict only if the image shows a clearly visible green virtual primitive on the left while the red virtual primitive on the right is substantially hidden by the supplied environment depth. Allow soft occlusion edges and small rasterization differences. Return a negative verdict if both primitives are equally visible, the green primitive is missing, or the image is blank.",
      evidence: [
        {
          type: "image",
          label: "Occlusion render",
          image: state.image,
        },
      ],
    });
    expect(visualJudgment.verdict, visualJudgment.reason).toBe(true);
    expectNoSessionErrors(session.diagnostics);
  },
);

it_session(
  "renders float depth with the same front-versus-behind result",
  async (session) => {
    await session.stepFrame(2);
    const inspection = await session.objects.inspect({
      tag: "occlusion-float-render",
    });

    expectOcclusionResult(inspection.state);
    expectNoSessionErrors(session.diagnostics);
  },
);

it_session(
  "selects the requested depth view and applies supplied depth-camera transforms",
  async (session) => {
    await session.stepFrame(2);
    const inspection = await session.objects.inspect({
      tag: "occlusion-view-transform-render",
    });

    expect(inspection.state).toMatchObject({
      error: null,
      projectionTransformCoverage: expect.any(Number),
      selectedBehindCoverage: expect.any(Number),
      selectedFrontCoverage: expect.any(Number),
      viewTransformCoverage: expect.any(Number),
    });
    const state = inspection.state as {
      projectionTransformCoverage: number;
      selectedBehindCoverage: number;
      selectedFrontCoverage: number;
      viewTransformCoverage: number;
    };
    expect(state.selectedFrontCoverage).toBeGreaterThan(0.45);
    expect(state.selectedBehindCoverage).toBeLessThan(0.15);
    expect(state.viewTransformCoverage).toBeGreaterThan(0.45);
    expect(state.projectionTransformCoverage).toBeGreaterThan(0.45);
    expectNoSessionErrors(session.diagnostics);
  },
);

function expectOcclusionResult(state: unknown): void {
  expect(state).toMatchObject({
    behindLuminance: expect.any(Number),
    error: null,
    frontCoverage: expect.any(Number),
    frontLuminance: expect.any(Number),
  });
  const result = state as {
    behindCoverage: number;
    behindLuminance: number;
    frontCoverage: number;
    frontLuminance: number;
  };
  expect(result.frontLuminance).toBeGreaterThan(30);
  expect(result.frontLuminance).toBeGreaterThan(result.behindLuminance + 20);
  expect(result.frontCoverage).toBeGreaterThan(0.45);
  expect(result.behindCoverage).toBeLessThan(0.15);
}

function uniformValues(
  uniforms: Record<string, { value: unknown }>,
): unknown[] {
  return Object.values(uniforms).map((uniform) => uniform.value);
}

function renderedUniformValues(
  drawCalls: Array<{
    overrideMaterial: THREE.Material | null;
    scene: THREE.Object3D;
  }>,
): unknown[] {
  const values: unknown[] = [];
  for (const drawCall of drawCalls) {
    const materials = new Set<THREE.Material>();
    if (drawCall.overrideMaterial) materials.add(drawCall.overrideMaterial);
    drawCall.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const meshMaterials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      for (const material of meshMaterials) materials.add(material);
    });
    for (const material of materials) {
      const uniforms = (
        material as THREE.Material & {
          uniforms?: Record<string, { value: unknown }>;
        }
      ).uniforms;
      if (uniforms) values.push(...uniformValues(uniforms));
    }
  }
  return values;
}

function expectNoSessionErrors(diagnostics: {
  consoleEntries: Array<{ level?: unknown }>;
  pageErrors: unknown[];
  networkErrors: unknown[];
}): void {
  expect(
    diagnostics.consoleEntries.filter((entry) => entry.level === "error"),
  ).toEqual([]);
  expect(diagnostics.pageErrors).toEqual([]);
  expect(diagnostics.networkErrors).toEqual([]);
}
