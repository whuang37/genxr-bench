import * as THREE from "three";

import { expect, it, it_session } from "@xrblocks/devtools/test";

import { loadOcclusionModules } from "./fixtures/occlusion-fixtures.ts";

const { OcclusionUtils } = await loadOcclusionModules();

Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: { location: { search: "" } },
});

const { Depth } = await import("@xrblocks/source/depth/Depth.ts");
const { DepthOptions } = await import("@xrblocks/source/depth/DepthOptions.ts");
const { ModelViewer } = await import(
  "@xrblocks/source/ui/model/ModelViewer.ts"
);

it("keeps occlusion opt-in disabled in independent depth options", () => {
  const configured = new DepthOptions({
    enabled: true,
    depthTexture: { enabled: true },
  });
  const explicit = new DepthOptions({ occlusion: { enabled: false } });

  expect(configured.occlusion.enabled).toBe(false);
  expect(explicit.occlusion.enabled).toBe(false);
  expect(configured.depthTexture.enabled).toBe(true);
  expect(explicit.depthTexture.enabled).toBe(false);
});

it("keeps disabled occlusion from changing scene and renderer state", () => {
  Depth.instance = undefined;
  const depth = new Depth();
  const scene = new THREE.Scene();
  const existingOverride = new THREE.MeshDepthMaterial();
  scene.overrideMaterial = existingOverride;
  const renderer = {
    shadowMap: { enabled: false, type: null },
    xr: {
      enabled: true,
      isPresenting: true,
      getCamera: () => undefined,
    },
  } as unknown as THREE.WebGLRenderer;
  const camera = new THREE.PerspectiveCamera();

  depth.init(
    camera,
    new DepthOptions({ enabled: true, occlusion: { enabled: false } }),
    renderer,
    { register() {} } as never,
    scene,
  );
  depth.update(undefined);

  expect(scene.overrideMaterial).toBe(existingOverride);
  expect(renderer.xr.enabled).toBe(true);
  expect(renderer.xr.isPresenting).toBe(true);
  expect(depth.occludableShaders.size).toBe(0);
  existingOverride.dispose();
});

it("keeps common Three.js materials unchanged without an occlusion hook", () => {
  const materials = [
    new THREE.MeshBasicMaterial({ color: 0xff0000 }),
    new THREE.MeshLambertMaterial({ color: 0x00ff00 }),
    new THREE.MeshPhongMaterial({ color: 0x0000ff }),
    new THREE.MeshStandardMaterial({ color: 0x112233 }),
  ];

  for (const material of materials) {
    const compile = material.onBeforeCompile;
    expect(material.transparent).toBe(false);
    expect(material.opacity).toBe(1);
    expect(material.onBeforeCompile).toBe(compile);
    material.dispose();
  }
});

it("keeps ModelViewer content unmodified when occlusion is not requested", () => {
  const material = new THREE.MeshStandardMaterial({ color: 0x336699 });
  const compile = material.onBeforeCompile;
  const content = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 3), material);
  const viewer = new ModelViewer({
    manipulation: false,
    occlusion: false,
    castShadow: false,
    receiveShadow: false,
  });

  viewer.setContent(content);

  expect(content.parent).not.toBeNull();
  expect(material.transparent).toBe(false);
  expect(material.onBeforeCompile).toBe(compile);
  expect(viewer.boundingBox.getSize(new THREE.Vector3()).toArray()).toEqual([
    1, 2, 3,
  ]);
  viewer.dispose();
});

it("keeps ordinary material rendering untouched until an application opts into occlusion", () => {
  const material = new THREE.MeshStandardMaterial({ color: 0x336699 });
  const originalCompile = material.onBeforeCompile;

  expect(material.transparent).toBe(false);
  expect(material.onBeforeCompile).toBe(originalCompile);
  expect(material.color.getHex()).toBe(0x336699);
  expect(OcclusionUtils).toBeDefined();
});

it_session(
  "keeps a built SDK scene visibly rendered when occlusion is disabled",
  async (session) => {
    await session.stepFrame(2);
    const inspection = await session.objects.inspect({
      tag: "occlusion-disabled-render",
    });

    expect(inspection.state).toMatchObject({
      error: null,
      leftLuminance: expect.any(Number),
      rightLuminance: expect.any(Number),
    });
    const state = inspection.state as {
      leftLuminance: number;
      rightLuminance: number;
    };
    expect(state.leftLuminance).toBeGreaterThan(30);
    expect(state.rightLuminance).toBeGreaterThan(30);
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
