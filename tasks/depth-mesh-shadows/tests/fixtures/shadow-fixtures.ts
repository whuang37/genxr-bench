import * as THREE from "three";

export function makeShadowRenderer(): THREE.WebGLRenderer {
  return {
    shadowMap: { enabled: false, type: null },
  } as unknown as THREE.WebGLRenderer;
}

export interface LightEstimate {
  ambient: THREE.Vector3;
  direction: THREE.Vector3;
  primary: THREE.Vector3;
}

/**
 * Provides only the WebXR lighting-estimation boundary that Three.js consumes.
 * The production XREstimatedLight remains the code under test.
 */
export function makeLightEstimateHarness() {
  let started = false;
  let frameCallback:
    | ((
        time: number,
        frame: { getLightEstimate: () => unknown; session: unknown },
      ) => void)
    | undefined;
  const listeners = new Map<string, () => void>();
  let estimate: LightEstimate | undefined;
  const session = {
    preferredReflectionFormat: "srgba8",
    requestAnimationFrame(
      callback: (
        time: number,
        frame: { getLightEstimate: () => unknown; session: unknown },
      ) => void,
    ) {
      frameCallback = callback;
      return 1;
    },
    async requestLightProbe() {
      return {};
    },
  };
  const renderer = {
    shadowMap: { enabled: false, type: null },
    xr: {
      addEventListener(type: string, listener: () => void) {
        listeners.set(type, listener);
      },
      getSession() {
        return session;
      },
    },
  } as unknown as THREE.WebGLRenderer;

  return {
    renderer,
    async publishEstimate(nextEstimate: LightEstimate) {
      estimate = nextEstimate;
      if (!started) {
        started = true;
        listeners.get("sessionstart")?.();
        await Promise.resolve();
        await Promise.resolve();
      }
      frameCallback?.(0, {
        getLightEstimate() {
          const coefficients = Array<number>(27).fill(0);
          coefficients[0] = estimate!.ambient.x;
          coefficients[1] = estimate!.ambient.y;
          coefficients[2] = estimate!.ambient.z;
          return {
            primaryLightDirection: estimate!.direction,
            primaryLightIntensity: estimate!.primary,
            sphericalHarmonicsCoefficients: coefficients,
          };
        },
        session,
      });
    },
  };
}

export function makeRegistry() {
  const registered: unknown[] = [];
  return {
    registered,
    registry: {
      register(value: unknown) {
        registered.push(value);
      },
    },
  };
}

export async function loadShadowModules() {
  if (!("window" in globalThis)) {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { location: { search: "" } },
    });
  }

  const [depth, depthMesh, depthOptions, lighting, lightingOptions] =
    await Promise.all([
      import("@xrblocks/source/depth/Depth.ts"),
      import("@xrblocks/source/depth/DepthMesh.ts"),
      import("@xrblocks/source/depth/DepthOptions.ts"),
      import("@xrblocks/source/lighting/Lighting.ts"),
      import("@xrblocks/source/lighting/LightingOptions.ts"),
    ]);

  return {
    Depth: depth.Depth,
    DepthMesh: depthMesh.DepthMesh,
    DepthOptions: depthOptions.DepthOptions,
    Lighting: lighting.Lighting,
    LightingOptions: lightingOptions.LightingOptions,
  };
}
