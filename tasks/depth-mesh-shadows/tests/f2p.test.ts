import * as THREE from "three";

import { expect, it, it_session, judge } from "@xrblocks/devtools/test";

import {
  loadShadowModules,
  makeLightEstimateHarness,
  makeRegistry,
  makeShadowRenderer,
} from "./fixtures/shadow-fixtures.ts";

const { Depth, DepthMesh, DepthOptions, Lighting, LightingOptions } =
  await loadShadowModules();

it("builds a visible shadow receiver from the configured live depth mesh", () => {
  const mesh = new DepthMesh(
    new DepthOptions({
      depthMesh: {
        depthFullResolution: 6,
        enabled: true,
        renderShadow: true,
        shadowOpacity: 0.55,
      },
    }),
    2,
    2,
  );
  const material = mesh.material as THREE.Material & { opacity: number };

  expect(material.visible).toBe(true);
  expect(material.depthWrite).toBe(false);
  expect(material.opacity).toBeCloseTo(0.55);
  expect(mesh.receiveShadow).toBe(true);
  expect(mesh.castShadow).toBe(false);
});

it("enables the renderer shadow map when Depth installs a shadow receiver", () => {
  Depth.instance = undefined;
  try {
    const depth = new Depth();
    const renderer = makeShadowRenderer();
    const scene = new THREE.Scene();
    const { registry, registered } = makeRegistry();

    depth.init(
      new THREE.PerspectiveCamera(),
      new DepthOptions({
        enabled: true,
        depthMesh: { enabled: true, renderShadow: true },
      }),
      renderer,
      registry as never,
      scene,
    );

    expect(depth.depthMesh).toBeDefined();
    expect(scene.children).toContain(depth.depthMesh);
    expect(registered).toContain(depth.depthMesh);
    expect(renderer.shadowMap.enabled).toBe(true);
    expect(renderer.shadowMap.type).toBe(THREE.PCFShadowMap);
  } finally {
    Depth.instance = undefined;
  }
});

it("configures the estimated directional light as a shadow caster", () => {
  Lighting.instance = undefined;
  try {
    const lighting = new Lighting();
    const { renderer } = makeLightEstimateHarness();
    const scene = new THREE.Scene();

    lighting.init(
      new LightingOptions({
        castDirectionalLightShadow: true,
        enabled: true,
        useDirectionalLight: true,
      }),
      renderer,
      scene,
    );

    const camera = lighting.dirLight.shadow.camera;
    expect(renderer.shadowMap).toMatchObject({
      enabled: true,
      type: THREE.PCFShadowMap,
    });
    expect(lighting.dirLight.castShadow).toBe(true);
    expect(lighting.dirLight.target.parent).toBeTruthy();
    expect(lighting.dirLight.shadow.mapSize.width).toBeGreaterThan(0);
    expect(lighting.dirLight.shadow.mapSize.height).toBeGreaterThan(0);
    expect(camera.near).toBeGreaterThan(0);
    expect(camera.far).toBeGreaterThan(camera.near);
    expect(camera.left).toBeLessThan(0);
    expect(camera.right).toBeGreaterThan(0);
    expect(camera.bottom).toBeLessThan(0);
    expect(camera.top).toBeGreaterThan(0);
  } finally {
    Lighting.instance = undefined;
  }
});

it_session(
  "renders a configured depth receiver through the built SDK application",
  async (session) => {
    await session.stepFrame(2);
    const inspection = await session.objects.inspect({
      tag: "depth-shadow-live",
    });

    expect(inspection.state).toMatchObject({
      error: null,
      casterCasts: true,
      depthWrite: false,
      receivesShadow: true,
      rendererShadowMap: true,
      rendererShadowType: true,
      shadowImage: expect.stringMatching(/^data:image\/png;base64,/),
      visible: true,
    });
    const state = inspection.state as {
      litLuminance: number;
      shadowImage: string;
      shadowLuminance: number;
    };
    expect(state.litLuminance).toBeGreaterThan(state.shadowLuminance);
    expect(state.litLuminance - state.shadowLuminance).toBeGreaterThan(5);

    const visualJudgment = await judge({
      prompt:
        "Return a positive verdict only if this fixed rendered scene contains a visible, plausible cast shadow on the light receiver near the raised box. Allow soft shadow edges and small browser rasterization differences. Return a negative verdict for a uniformly lit receiver, a blank image, or darkness unrelated to the box.",
      evidence: [
        {
          type: "image",
          label: "Depth mesh shadow render",
          image: state.shadowImage,
        },
      ],
    });
    expect(visualJudgment.verdict, visualJudgment.reason).toBe(true);
    expectNoSessionErrors(session.diagnostics);
  },
);

it_session(
  "visibly softens and lightens shadows as ambient light rises",
  async (session) => {
    const state = await waitForAdaptiveShadowState(session);

    expect(state.error).toBeNull();
    expect(state.lowAmbientDarkness, JSON.stringify(state)).toBeGreaterThan(
      state.highAmbientDarkness + 10,
    );
    expect(state.highAmbientEdgeSpread, JSON.stringify(state)).toBeGreaterThan(
      state.lowAmbientEdgeSpread,
    );
    expectNoSessionErrors(session.diagnostics);
  },
);

async function waitForAdaptiveShadowState(session: {
  stepFrame(count?: number): Promise<unknown>;
  objects: { inspect(target: { tag: string }): Promise<unknown> };
}): Promise<{
  error: string | null;
  highAmbientDarkness: number;
  highAmbientEdgeSpread: number;
  lowAmbientDarkness: number;
  lowAmbientEdgeSpread: number;
  pending: boolean;
}> {
  let inspection: { state?: { pending?: boolean } } | undefined;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    inspection = (await session.objects.inspect({
      tag: "depth-shadow-adaptive",
    })) as { state?: { pending?: boolean } };
    if (inspection.state?.pending === false) break;
    await session.stepFrame(1);
  }
  expect(inspection?.state).toBeDefined();
  expect(inspection!.state!.pending).toBe(false);
  return inspection!.state as {
    error: string | null;
    highAmbientDarkness: number;
    highAmbientEdgeSpread: number;
    lowAmbientDarkness: number;
    lowAmbientEdgeSpread: number;
    pending: boolean;
  };
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
