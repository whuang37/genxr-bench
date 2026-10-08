import * as THREE from "three";

import { expect, it, vi } from "@xrblocks/devtools/test";

import { ModelLoader } from "@xrblocks/source/utils/ModelLoader.ts";

it("keeps a loaded splat usable without automatic placement", async () => {
  const splat = await new ModelLoader().loadSplat({ url: "" });

  expect(splat).toBeInstanceOf(THREE.Object3D);
  splat.position.set(1, 2, 3);
  expect(splat.position.toArray()).toEqual([1, 2, 3]);
});

it("keeps normal glTF loading available through ModelLoader", async () => {
  vi.stubGlobal(
    "ProgressEvent",
    class ProgressEvent {
      constructor(
        public type: string,
        init: Record<string, unknown> = {},
      ) {
        Object.assign(this, init);
      }
    },
  );
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(JSON.stringify(triangleGltf()), {
          headers: { "Content-Type": "model/gltf+json" },
        }),
    ),
  );

  const loaded = await new ModelLoader().load({
    url: "https://models.test/triangle.gltf",
  });
  const gltf = loaded as { scene: THREE.Object3D };
  const bounds = new THREE.Box3().setFromObject(gltf.scene);

  expect(gltf.scene.children).toHaveLength(1);
  expect(bounds.isEmpty()).toBe(false);
  expect(bounds.min.toArray()).toEqual([-0.3, 0, 0]);
  expect(bounds.max.toArray()).toEqual([0.3, 0.6, 0]);
  vi.unstubAllGlobals();
});

it("keeps binary GLB loading available through ModelLoader", async () => {
  vi.stubGlobal(
    "ProgressEvent",
    class ProgressEvent {
      constructor(
        public type: string,
        init: Record<string, unknown> = {},
      ) {
        Object.assign(this, init);
      }
    },
  );
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(triangleGlb(), {
          headers: { "Content-Type": "model/gltf-binary" },
        }),
    ),
  );

  const loaded = await new ModelLoader().load({
    url: "https://models.test/triangle.glb",
  });
  const gltf = loaded as { scene: THREE.Object3D };
  const bounds = new THREE.Box3().setFromObject(gltf.scene);

  expect(gltf.scene.children).toHaveLength(1);
  expect(bounds.min.toArray()).toEqual([-0.3, 0, 0]);
  expect(bounds.max.toArray()).toEqual([0.3, 0.6, 0]);
  vi.unstubAllGlobals();
});

function triangleGltf() {
  return {
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
  };
}

function triangleGlb(): ArrayBuffer {
  const gltf = triangleGltf();
  const encoded = new TextEncoder().encode(
    JSON.stringify({
      ...gltf,
      buffers: gltf.buffers.map(({ byteLength }) => ({ byteLength })),
    }),
  );
  const jsonLength = Math.ceil(encoded.length / 4) * 4;
  const binary = new Uint8Array(
    new Float32Array([-0.3, 0, 0, 0.3, 0, 0, 0, 0.6, 0]).buffer,
  );
  const totalLength = 12 + 8 + jsonLength + 8 + binary.byteLength;
  const buffer = new ArrayBuffer(totalLength);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, totalLength, true);
  view.setUint32(12, jsonLength, true);
  view.setUint32(16, 0x4e4f534a, true);
  bytes.fill(0x20, 20, 20 + jsonLength);
  bytes.set(encoded, 20);
  const binaryHeader = 20 + jsonLength;
  view.setUint32(binaryHeader, binary.byteLength, true);
  view.setUint32(binaryHeader + 4, 0x004e4942, true);
  bytes.set(binary, binaryHeader + 8);
  return buffer;
}
