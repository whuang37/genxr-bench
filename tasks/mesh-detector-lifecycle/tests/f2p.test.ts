import * as THREE from "three";

import { expect, it, vi } from "@xrblocks/devtools/test";

Object.defineProperty(globalThis, "window", {
  value: { location: { search: "" } },
  configurable: true,
});

const { MeshDetector } = await import(
  "@xrblocks/source/world/mesh/MeshDetector.ts"
);
const { MeshDetectionOptions } = await import(
  "@xrblocks/source/world/mesh/MeshDetectionOptions.ts"
);

type WebMesh = {
  vertices: Float32Array;
  indices: Uint32Array;
  lastChangedTime: number;
  semanticLabel?: string;
  meshSpace: object;
};

type Pose = {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
};

function webMesh(overrides: Partial<WebMesh> = {}): WebMesh {
  return {
    vertices: new Float32Array([
      -0.25, -0.25, 0, 0.25, -0.25, 0, 0.25, 0.25, 0, -0.25, 0.25, 0,
    ]),
    indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
    lastChangedTime: 1,
    semanticLabel: "floor",
    meshSpace: {},
    ...overrides,
  };
}

function pose(position: THREE.Vector3, quaternion = new THREE.Quaternion()) {
  return { position, quaternion };
}

function frame(
  meshes: WebMesh[] | undefined,
  poses: Map<object, Pose>,
  viewer: "default" | null = "default",
) {
  const viewerMatrix = new THREE.Matrix4().identity().elements;
  const projectionMatrix = new THREE.PerspectiveCamera(50, 1, 0.1, 10)
    .projectionMatrix.elements;
  return {
    detectedMeshes: meshes === undefined ? undefined : new Set(meshes),
    getPose: vi.fn((space: object) => {
      const value = poses.get(space);
      if (!value) return null;
      return {
        transform: {
          matrix: new THREE.Matrix4().compose(
            value.position,
            value.quaternion,
            new THREE.Vector3(1, 1, 1),
          ).elements,
          orientation: value.quaternion,
          position: value.position,
        },
      };
    }),
    getViewerPose: vi.fn(() =>
      viewer === null
        ? null
        : {
            views: [
              {
                projectionMatrix,
                transform: { matrix: viewerMatrix },
              },
            ],
          },
    ),
  } as unknown as XRFrame;
}

function detector(
  referenceSpace: XRReferenceSpace | null = {} as XRReferenceSpace,
) {
  const result = new MeshDetector();
  result.init({
    options: new MeshDetectionOptions(),
    renderer: { xr: { getReferenceSpace: () => referenceSpace } } as never,
  });
  return result;
}

function physicsHarness() {
  const bodies: Array<{
    rotation: THREE.Quaternion;
    setRotation: ReturnType<typeof vi.fn>;
    setTranslation: ReturnType<typeof vi.fn>;
    translation: THREE.Vector3;
  }> = [];
  const colliders: object[] = [];
  const fixed = vi.fn(() => {
    const description: {
      setRotation(rotation: THREE.Quaternion): typeof description;
      setTranslation(x: number, y: number, z: number): typeof description;
    } = {
      setRotation: vi.fn(() => description),
      setTranslation: vi.fn(() => description),
    };
    return description;
  });
  const RAPIER = {
    ColliderDesc: { trimesh: vi.fn(() => ({})) },
    RigidBodyDesc: { fixed },
  };
  const blendedWorld = {
    createCollider: vi.fn(() => {
      const collider = { id: `collider-${colliders.length}` };
      colliders.push(collider);
      return collider;
    }),
    createRigidBody: vi.fn(() => {
      const rotation = new THREE.Quaternion();
      const translation = new THREE.Vector3();
      const body = {
        rotation,
        setRotation: vi.fn((nextRotation: THREE.Quaternion) => {
          rotation.copy(nextRotation);
        }),
        setTranslation: vi.fn((nextTranslation: THREE.Vector3) => {
          translation.copy(nextTranslation);
        }),
        translation,
      };
      bodies.push(body);
      return body;
    }),
    removeCollider: vi.fn(),
    removeRigidBody: vi.fn(),
  };
  return { RAPIER, blendedWorld, bodies, colliders };
}

it("tracks multiple labelled meshes and attaches physics before and after their creation", () => {
  const now = vi.spyOn(performance, "now").mockReturnValue(1000);
  const referenceSpace = {} as XRReferenceSpace;
  const meshes = detector(referenceSpace);
  const source = webMesh({ semanticLabel: "floor" });
  const poses = new Map<object, Pose>([
    [source.meshSpace, pose(new THREE.Vector3(0, 0, -2))],
  ]);

  try {
    meshes.updateMeshes(0, frame([source], poses));
    const threeMesh = meshes.xrMeshToThreeMesh.get(source as never)!;
    const physics = physicsHarness();
    meshes.initPhysics({
      RAPIER: physics.RAPIER,
      blendedWorld: physics.blendedWorld,
    } as never);

    expect(meshes.threeMeshToXrMesh.get(threeMesh)).toBe(source as never);
    expect(meshes.children).toContain(threeMesh);
    expect(threeMesh.position.toArray()).toEqual([0, 0, -2]);
    expect(threeMesh.getRigidBody).toBe(physics.bodies[0]);

    const laterSource = webMesh({ semanticLabel: "wall" });
    poses.set(laterSource.meshSpace, pose(new THREE.Vector3(0.5, 0, -2)));
    now.mockReturnValue(2000);
    meshes.updateMeshes(1, frame([source, laterSource], poses));
    const laterMesh = meshes.xrMeshToThreeMesh.get(laterSource as never)!;
    expect(laterMesh).toBeDefined();
    expect(meshes.threeMeshToXrMesh.get(laterMesh)).toBe(laterSource as never);
    expect(laterMesh.getRigidBody).toBe(physics.bodies[1]);
    expect(meshes.children).toEqual(
      expect.arrayContaining([threeMesh, laterMesh]),
    );

    const geometry = threeMesh.geometry;
    source.lastChangedTime = 2;
    source.vertices = new Float32Array([
      -0.5, -0.25, 0, 0.5, -0.25, 0, 0.5, 0.25, 0, -0.5, 0.25, 0,
    ]);
    const nextQuaternion = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      Math.PI / 2,
    );
    poses.set(
      source.meshSpace,
      pose(new THREE.Vector3(1, 0.5, -1.5), nextQuaternion),
    );
    now.mockReturnValue(3000);
    meshes.updateMeshes(2, frame([source, laterSource], poses));

    expect(meshes.xrMeshToThreeMesh.get(source as never)).toBe(threeMesh);
    expect(meshes.threeMeshToXrMesh.get(threeMesh)).toBe(source as never);
    expect(threeMesh.geometry).toBe(geometry);
    expect(Array.from(geometry.getAttribute("position").array)).toEqual(
      Array.from(source.vertices),
    );
    expect(threeMesh.position.toArray()).toEqual([1, 0.5, -1.5]);
    expect(threeMesh.quaternion.toArray()).toEqual(nextQuaternion.toArray());
    expect(physics.bodies[0]!.translation.toArray()).toEqual(
      threeMesh.position.toArray(),
    );
    expect(physics.bodies[0]!.rotation.toArray()).toEqual(
      threeMesh.quaternion.toArray(),
    );
  } finally {
    meshes.dispose();
    now.mockRestore();
  }
});

it("throttles updates and culls distant, rear, and camera-frustum-outside WebXR meshes", () => {
  const now = vi.spyOn(performance, "now").mockReturnValue(1000);
  const meshes = detector();
  const front = webMesh({ semanticLabel: "floor" });
  const distant = webMesh({ semanticLabel: "wall" });
  const rear = webMesh({ semanticLabel: "ceiling" });
  const outsideCamera = webMesh();
  const poses = new Map<object, Pose>([
    [front.meshSpace, pose(new THREE.Vector3(0, 0, -2))],
    [distant.meshSpace, pose(new THREE.Vector3(0, 0, -3.1))],
    [rear.meshSpace, pose(new THREE.Vector3(0, 0, 1))],
    [outsideCamera.meshSpace, pose(new THREE.Vector3(2.8, 0, -0.5))],
  ]);

  try {
    meshes.updateMeshes(0, frame([front, distant, rear, outsideCamera], poses));
    const threeMesh = meshes.xrMeshToThreeMesh.get(front as never)!;
    const position = threeMesh.geometry.getAttribute("position");
    const initialVersion = position.version;

    front.lastChangedTime = 2;
    front.vertices = new Float32Array([
      -1, -0.25, 0, 1, -0.25, 0, 1, 0.25, 0, -1, 0.25, 0,
    ]);
    now.mockReturnValue(1999);
    meshes.updateMeshes(1, frame([front, distant, rear, outsideCamera], poses));
    expect(position.version).toBe(initialVersion);

    now.mockReturnValue(2000);
    meshes.updateMeshes(2, frame([front, distant, rear, outsideCamera], poses));
    expect(position.version).toBeGreaterThan(initialVersion);
    expect(meshes.xrMeshToThreeMesh.size).toBe(1);
    expect(meshes.xrMeshToThreeMesh.get(front as never)).toBe(threeMesh);
    expect(meshes.xrMeshToThreeMesh.has(distant as never)).toBe(false);
    expect(meshes.xrMeshToThreeMesh.has(rear as never)).toBe(false);
    expect(meshes.xrMeshToThreeMesh.has(outsideCamera as never)).toBe(false);
  } finally {
    meshes.dispose();
    now.mockRestore();
  }
});

it("handles missing WebXR boundaries and removes only meshes that remain stale after refresh", () => {
  const now = vi.spyOn(performance, "now").mockReturnValue(1000);
  const source = webMesh();
  const poses = new Map<object, Pose>([
    [source.meshSpace, pose(new THREE.Vector3(0, 0, -2))],
  ]);
  const withoutReference = detector(null);
  const meshes = detector();

  try {
    expect(() =>
      withoutReference.updateMeshes(0, frame(undefined, poses)),
    ).not.toThrow();
    expect(() =>
      withoutReference.updateMeshes(1, frame([source], poses)),
    ).not.toThrow();
    expect(withoutReference.xrMeshToThreeMesh.size).toBe(0);

    meshes.updateMeshes(0, frame([source], poses, null));
    const threeMesh = meshes.xrMeshToThreeMesh.get(source as never)!;
    const disposeGeometry = vi.spyOn(threeMesh.geometry, "dispose");
    expect(threeMesh.position.toArray()).toEqual([0, 0, -2]);

    now.mockReturnValue(2000);
    meshes.updateMeshes(1, frame([source], poses, null));
    now.mockReturnValue(4000);
    meshes.updateMeshes(2, frame([], poses, null));
    expect(meshes.xrMeshToThreeMesh.get(source as never)).toBe(threeMesh);

    now.mockReturnValue(8000);
    meshes.updateMeshes(3, frame([], poses, null));
    expect(meshes.xrMeshToThreeMesh.size).toBe(0);
    expect(meshes.threeMeshToXrMesh.size).toBe(0);
    expect(meshes.children).not.toContain(threeMesh);
    expect(disposeGeometry).toHaveBeenCalledTimes(1);
  } finally {
    withoutReference.dispose();
    meshes.dispose();
    now.mockRestore();
  }
});
