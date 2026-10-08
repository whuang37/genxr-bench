import * as THREE from "three";

import { expect, it, it_session } from "@xrblocks/devtools/test";

import {
  loadShadowModules,
  makeLightEstimateHarness,
  makeShadowRenderer,
} from "./fixtures/shadow-fixtures.ts";

const { DepthMesh, DepthOptions, Lighting, LightingOptions } =
  await loadShadowModules();

it("keeps disabled lighting from changing the renderer or scene", () => {
  Lighting.instance = undefined;
  try {
    const lighting = new Lighting();
    const renderer = makeShadowRenderer();
    const scene = new THREE.Scene();

    lighting.init(new LightingOptions(), renderer, scene);
    lighting.update();

    expect(renderer.shadowMap.enabled).toBe(false);
    expect(renderer.shadowMap.type).toBeNull();
    expect(scene.children).toEqual([]);
    expect(lighting.dirLight.castShadow).toBe(false);
  } finally {
    Lighting.instance = undefined;
  }
});

it("keeps non-shadow light selection limited to requested light types", () => {
  Lighting.instance = undefined;
  try {
    const ambientLighting = new Lighting();
    const ambientScene = new THREE.Scene();
    ambientLighting.init(
      new LightingOptions({ enabled: true, useAmbientSH: true }),
      makeLightEstimateHarness().renderer,
      ambientScene,
    );
    const ambientDescendants: THREE.Object3D[] = [];
    ambientScene.traverse((object) => ambientDescendants.push(object));
    expect(ambientDescendants).toContain(ambientLighting.ambientProbe);
    expect(ambientDescendants).not.toContain(ambientLighting.dirLight);

    Lighting.instance = undefined;
    const directionalLighting = new Lighting();
    const directionalScene = new THREE.Scene();
    directionalLighting.init(
      new LightingOptions({ enabled: true, useDirectionalLight: true }),
      makeLightEstimateHarness().renderer,
      directionalScene,
    );
    const directionalDescendants: THREE.Object3D[] = [];
    directionalScene.traverse((object) => directionalDescendants.push(object));
    expect(directionalDescendants).toContain(directionalLighting.dirLight);
    expect(directionalDescendants).not.toContain(
      directionalLighting.ambientProbe,
    );
  } finally {
    Lighting.instance = undefined;
  }
});

it("keeps simulator lighting deterministic without enabling shadows", async () => {
  Lighting.instance = undefined;
  try {
    const lighting = new Lighting();
    const harness = makeLightEstimateHarness();
    const scene = new THREE.Scene();
    lighting.init(
      new LightingOptions({
        enabled: true,
        useAmbientSH: true,
        useDirectionalLight: true,
      }),
      harness.renderer,
      scene,
    );
    await harness.publishEstimate({
      ambient: new THREE.Vector3(0.1, 0.1, 0.1),
      direction: new THREE.Vector3(9, 8, 7),
      primary: new THREE.Vector3(1, 1, 1),
    });
    lighting.simulatorRunning = true;

    lighting.update();

    expect(lighting.dirLight.position.toArray()).toEqual([-10, 10, -2]);
    expect(lighting.dirLight.intensity).toBeCloseTo(3.8);
    expect(lighting.dirLight.castShadow).toBe(false);
    expect(harness.renderer.shadowMap.enabled).toBe(false);
  } finally {
    Lighting.instance = undefined;
  }
});

it("keeps non-shadow depth options independent from shadow configuration", () => {
  const debug = new DepthOptions({
    depthMesh: {
      enabled: true,
      showDebugTexture: true,
      useDepthTexture: true,
      opacity: 0.4,
    },
  });
  const defaults = new DepthOptions();

  expect(debug.depthMesh).toMatchObject({
    enabled: true,
    opacity: 0.4,
    renderShadow: false,
    showDebugTexture: true,
    useDepthTexture: true,
  });
  expect(defaults.depthMesh.renderShadow).toBe(false);
  expect(defaults.depthMesh.showDebugTexture).toBe(false);
});

it("keeps estimated directional and ambient lighting updates without shadows", async () => {
  Lighting.instance = undefined;
  try {
    const lighting = new Lighting();
    const lightEstimate = makeLightEstimateHarness();
    lighting.init(
      new LightingOptions({
        enabled: true,
        useAmbientSH: true,
        useDirectionalLight: true,
      }),
      lightEstimate.renderer,
      new THREE.Scene(),
    );
    await lightEstimate.publishEstimate({
      ambient: new THREE.Vector3(0.3, 0.5, 0.7),
      direction: new THREE.Vector3(1, 2, 3),
      primary: new THREE.Vector3(0.5, 1, 1.5),
    });

    lighting.update();

    expect(lighting.dirLight.position.toArray()).toEqual([20, 40, 60]);
    expect(lighting.dirLight.color.toArray()).toEqual([1 / 3, 2 / 3, 1]);
    expect(lighting.dirLight.intensity).toBeCloseTo(1.5);
    expect(lighting.ambientProbe.intensity).toBeCloseTo(1);
    expect(lighting.ambientLight.toArray()).toEqual([0.3, 0.5, 0.7]);
  } finally {
    Lighting.instance = undefined;
  }
});

it("keeps diagnostic depth visualization independent from shadow receiving", () => {
  const mesh = new DepthMesh(
    new DepthOptions({
      depthMesh: {
        enabled: true,
        renderShadow: false,
        showDebugTexture: true,
        useDepthTexture: true,
      },
    }),
    2,
    2,
  );

  expect(mesh.material).toBeInstanceOf(THREE.ShaderMaterial);
  expect(mesh.material.visible).toBe(true);
  expect(mesh.receiveShadow).toBe(false);
  expect(mesh.castShadow).toBe(false);
});

it_session(
  "keeps the built SDK default depth surface non-shadowing when disabled",
  async (session) => {
    await session.stepFrame(1);
    const inspection = await session.objects.inspect({
      tag: "depth-shadow-baseline",
    });

    expect(inspection.state).toMatchObject({
      error: null,
      castsShadow: false,
      receivesShadow: false,
      visible: false,
    });
    expectNoSessionErrors(session.diagnostics);
  },
);

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
