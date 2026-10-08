import * as THREE from "three";

import type { SceneDetector } from "@xrblocks/source/context/scene/SceneDetector.ts";

export function sceneWithMarkedObject(position: THREE.Vector3): {
  object: THREE.Mesh;
  scene: THREE.Scene;
} {
  const scene = new THREE.Scene();
  const object = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2));
  object.name = "Tracked object";
  object.position.copy(position);
  scene.add(object);
  return { object, scene };
}

export async function createDetector({
  scene,
  camera,
  getScreenshot,
  capturedAt = 12.5,
  deviceCamera,
}: {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  getScreenshot: (overlayOnCamera: boolean) => Promise<string>;
  capturedAt?: number | (() => number);
  deviceCamera?: { loaded: boolean };
}): Promise<SceneDetector> {
  installWindow();
  const [{ ContextOptions }, { SceneDetector }] = await Promise.all([
    import("@xrblocks/source/context/ContextOptions.ts"),
    import("@xrblocks/source/context/scene/SceneDetector.ts"),
  ]);
  const detector = new SceneDetector();
  detector.init({
    options: new ContextOptions().enableSetOfMark(),
    scene,
    camera,
    screenshotSynthesizer: { getScreenshot } as never,
    simulationTimer: {
      getElapsedMs: () =>
        typeof capturedAt === "function" ? capturedAt() : capturedAt,
    } as never,
    deviceCamera: deviceCamera as never,
  });
  return detector;
}

function installWindow(): void {
  if ("window" in globalThis) return;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      addEventListener() {},
      location: { search: "" },
      removeEventListener() {},
    },
  });
}

export function markByName(
  context: { marks: Array<{ name?: string; x: number; y: number }> },
  name: string,
): { name?: string; nodeId?: string; x: number; y: number } {
  const mark = context.marks.find((candidate) => candidate.name === name);
  if (!mark) throw new Error(`Missing Set-of-Mark label: ${name}`);
  return mark;
}
