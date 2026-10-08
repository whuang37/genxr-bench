import type * as THREE from "three";
import { vi } from "vitest";

const platform = vi.hoisted(() => {
  const deferred = <T>() => {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((resolvePromise) => {
      resolve = resolvePromise;
    });
    return { promise, resolve };
  };

  return {
    failedSessionRequests: 0,
    sessionOptions: [] as Array<{
      optionalFeatures?: string[];
      requiredFeatures?: string[];
    }>,
    sessionRequests: 0,
    sessionStarted: deferred<void>(),
    sessions: [] as Array<{ requestedReferenceSpaces: string[] }>,
  };
});

export function getPlatform() {
  return platform;
}

vi.hoisted(() => {
  class FakeHTMLElement {
    children: unknown[] = [];
    style = {};

    appendChild(child: unknown) {
      this.children.push(child);
      return child;
    }

    remove(): void {}
    removeChild(): void {}
  }
  class FakeCanvasElement extends FakeHTMLElement {}
  Object.defineProperty(globalThis, "HTMLElement", {
    configurable: true,
    value: FakeHTMLElement,
  });
  Object.defineProperty(globalThis, "HTMLCanvasElement", {
    configurable: true,
    value: FakeCanvasElement,
  });
  Object.defineProperty(globalThis, "customElements", {
    configurable: true,
    value: { define() {}, get() {} },
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      addEventListener() {},
      AudioContext: class {
        currentTime = 0;
        destination = {};
        listener = {};

        createGain() {
          return {
            connect() {},
            disconnect() {},
            gain: { setTargetAtTime() {}, value: 1 },
          };
        }
      },
      devicePixelRatio: 1,
      innerHeight: 600,
      innerWidth: 800,
      location: { search: "" },
      removeEventListener() {},
    },
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      body: new FakeHTMLElement(),
      createElement: (tag: string) =>
        tag === "canvas" ? new FakeCanvasElement() : new FakeHTMLElement(),
    },
  });
});

function makeSession() {
  const listeners = new Map<string, Set<() => void>>();
  const session = {
    addEventListener(type: string, listener: () => void) {
      const set = listeners.get(type) ?? new Set();
      set.add(listener);
      listeners.set(type, set);
    },
    async end() {
      for (const listener of listeners.get("end") ?? []) listener();
    },
    removeEventListener(type: string, listener: () => void) {
      listeners.get(type)?.delete(listener);
    },
    async requestReferenceSpace(type: string) {
      session.requestedReferenceSpaces.push(type);
      return {};
    },
    requestedReferenceSpaces: [] as string[],
  };
  platform.sessions.push(session);
  return session;
}

vi.hoisted(() => {
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      xr: {
        async isSessionSupported() {
          return true;
        },
        async requestSession(_mode: string, options: object) {
          platform.sessionRequests += 1;
          platform.sessionOptions.push(options);
          if (platform.failedSessionRequests > 0) {
            platform.failedSessionRequests -= 1;
            throw new Error("simulated session request failure");
          }
          return makeSession();
        },
      },
    },
  });
});

vi.mock("three", async (importOriginal) => {
  const actual = await importOriginal<typeof import("three")>();
  const listeners = new WeakMap<object, Map<string, Set<() => void>>>();

  class FakeXRManager {
    cameraAutoUpdate = true;
    enabled = false;
    private referenceSpaceType = "local-floor";
    private session?: ReturnType<typeof makeSession>;

    addEventListener(type: string, listener: () => void): void {
      const byType = listeners.get(this) ?? new Map();
      const set = byType.get(type) ?? new Set();
      set.add(listener);
      byType.set(type, set);
      listeners.set(this, byType);
    }

    getCamera(camera: THREE.Camera): THREE.Camera {
      return camera;
    }

    getController(): THREE.Group {
      return new actual.Group();
    }

    getControllerGrip(): THREE.Group {
      return new actual.Group();
    }

    getFrame(): undefined {
      return undefined;
    }

    getHand(): THREE.Group {
      return new actual.Group();
    }

    getSession(): ReturnType<typeof makeSession> | undefined {
      return this.session;
    }

    setReferenceSpaceType(type: string): void {
      this.referenceSpaceType = type;
    }

    async setSession(session: ReturnType<typeof makeSession>): Promise<void> {
      this.session = session;
      await session.requestReferenceSpace(this.referenceSpaceType);
      platform.sessionStarted.resolve();
      for (const listener of listeners.get(this)?.get("sessionstart") ?? []) {
        listener();
      }
    }
  }

  class FakeRenderer {
    autoClearColor = true;
    capabilities = { isWebGL2: true };
    domElement = {};
    shadowMap = { enabled: false };
    xr = new FakeXRManager();

    clear(): void {}
    clearDepth(): void {}
    dispose(): void {}
    getRenderTarget(): null {
      return null;
    }
    render(): void {}
    setAnimationLoop(): void {}
    setPixelRatio(): void {}
    setRenderTarget(): void {}
    setSize(): void {}
  }

  return { ...actual, WebGLRenderer: FakeRenderer };
});

export async function makeCore({
  optionalFeatures = [],
  referenceSpaceType = "local-floor",
  requiredFeatures = [],
}: {
  optionalFeatures?: string[];
  referenceSpaceType?: "local" | "local-floor";
  requiredFeatures?: string[];
} = {}) {
  platform.failedSessionRequests = 0;
  platform.sessionOptions.length = 0;
  platform.sessionRequests = 0;
  let resolveSessionStarted!: () => void;
  platform.sessionStarted = {
    promise: new Promise<void>((resolve) => {
      resolveSessionStarted = resolve;
    }),
    resolve: resolveSessionStarted,
  };
  platform.sessions.length = 0;
  const [{ Core }, { Options }] = await Promise.all([
    import("@xrblocks/source/core/Core.ts"),
    import("@xrblocks/source/core/Options.ts"),
  ]);
  const options = new Options();
  options.canvas = document.createElement("canvas") as HTMLCanvasElement;
  options.formFactor = "vr";
  options.xrButton.enabled = false;
  options.controllers.enabled = false;
  options.reticles.enabled = false;
  options.hands.enabled = false;
  options.referenceSpaceType = referenceSpaceType;
  options.webxrRequiredFeatures = [...requiredFeatures];
  options.webxrOptionalFeatures = [...optionalFeatures];
  const core = new Core();
  await core.init(options);
  return core;
}
