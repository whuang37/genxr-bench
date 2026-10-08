import * as THREE from "three";

import { expect, it, vi } from "@xrblocks/devtools/test";

Object.defineProperty(globalThis, "window", {
  value: { location: { search: "" } },
  configurable: true,
});

const { ModelViewer } = await import(
  "@xrblocks/source/ui/model/ModelViewer.ts"
);

it("replaces nested caller content, refreshes bounds, and leaves caller resources usable", () => {
  const first = nestedContent(2, 4, 6);
  const second = nestedContent(4, 2, 8);
  const viewer = new ModelViewer({ origin: "center", manipulation: false });

  viewer.setContent(first.root);
  viewer.setContent(second.root);

  expect(first.root.parent).toBeNull();
  expect(second.root.parent).toBeDefined();
  expect(viewer.boundingBox.getSize(new THREE.Vector3()).toArray()).toEqual([
    4, 2, 8,
  ]);
  viewer.dispose();
  expect(second.mesh.geometry.attributes.position.count).toBeGreaterThan(0);
  expect(second.mesh.material).toBeDefined();
  dispose(first.mesh);
  dispose(second.mesh);
});

it("keeps the latest public load and rejects a stale completion", async () => {
  const oldResponse = deferred<Response>();
  const currentResponse = deferred<Response>();
  const platformFetch = globalThis.fetch;
  vi.stubGlobal(
    "ProgressEvent",
    class ProgressEvent {
      constructor(public type: string) {}
    },
  );
  vi.stubGlobal(
    "fetch",
    vi.fn((request: string | { url: string }) =>
      (typeof request === "string" ? request : request.url).startsWith("data:")
        ? platformFetch(request as Request)
        : (typeof request === "string" ? request : request.url).endsWith(
              "old.gltf",
            )
          ? oldResponse.promise
          : currentResponse.promise,
    ),
  );
  const viewer = new ModelViewer({ manipulation: false });
  const oldLoad = viewer.load("https://models.test/old.gltf").then(
    () => undefined,
    (error: unknown) => error,
  );
  const currentLoad = viewer.load("https://models.test/current.gltf");
  currentResponse.resolve(gltfResponse());
  await currentLoad;
  oldResponse.resolve(gltfResponse());
  expect(await oldLoad).toBeInstanceOf(Error);
  expect(viewer.boundingBox.isEmpty()).toBe(false);
  viewer.dispose();
  vi.unstubAllGlobals();
});

it("applies public shadow options to nested caller content", () => {
  const { root, mesh } = nestedContent(1, 1, 1);
  const viewer = new ModelViewer({
    manipulation: false,
    castShadow: false,
    receiveShadow: true,
  });
  viewer.setContent(root);
  expect(mesh.castShadow).toBe(false);
  expect(mesh.receiveShadow).toBe(true);
  viewer.dispose();
  dispose(mesh);
});

function nestedContent(
  x: number,
  y: number,
  z: number,
): { root: THREE.Group; mesh: THREE.Mesh } {
  const root = new THREE.Group();
  const proxy = new THREE.Group();
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(x, y, z),
    new THREE.MeshBasicMaterial(),
  );
  proxy.add(mesh);
  root.add(proxy);
  return { root, mesh };
}
function dispose(mesh: THREE.Mesh): void {
  mesh.geometry.dispose();
  (mesh.material as THREE.Material).dispose();
}
function gltfResponse(): Response {
  return new Response(
    JSON.stringify({
      asset: { version: "2.0" },
      buffers: [
        {
          uri: "data:application/octet-stream;base64,mpmZvgAAAAAAAAAAmpmZPgAAAAAAAAAAAAAAAJqZGT8AAAAA",
          byteLength: 36,
        },
      ],
      bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36 }],
      accessors: [
        {
          bufferView: 0,
          componentType: 5126,
          count: 3,
          type: "VEC3",
          min: [-0.3, 0, 0],
          max: [0.3, 0.6, 0],
        },
      ],
      meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
      nodes: [{ mesh: 0 }],
      scenes: [{ nodes: [0] }],
      scene: 0,
    }),
    { headers: { "Content-Type": "model/gltf+json" } },
  );
}
function deferred<T>(): { promise: Promise<T>; resolve(value: T): void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}
