import * as THREE from "three";

export function cpuDepth(
  values: Float32Array | Uint16Array,
  width: number,
  height: number,
  rawValueToMeters = 1,
): XRCPUDepthInformation {
  return {
    data: values.buffer,
    height,
    rawValueToMeters,
    width,
  } as XRCPUDepthInformation;
}

export function positionZValues(geometry: THREE.BufferGeometry): number[] {
  const positions = geometry.attributes.position.array as Float32Array;
  const zValues: number[] = [];
  for (let index = 2; index < positions.length; index += 3) {
    zValues.push(positions[index]);
  }
  return zValues;
}

export async function loadDepthMeshModules() {
  if (!("window" in globalThis)) {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { location: { search: "" } },
    });
  }

  const [{ DepthMesh }, { DepthOptions }] = await Promise.all([
    import("@xrblocks/source/depth/DepthMesh.ts"),
    import("@xrblocks/source/depth/DepthOptions.ts"),
  ]);
  return { DepthMesh, DepthOptions };
}

interface TestCollider {
  handle: number;
}

export interface PhysicsHarness {
  RAPIER: never;
  createdColliders: TestCollider[];
  removedColliders: TestCollider[];
  rigidBody: {
    rotations: unknown[];
    setRotation(rotation: unknown): void;
    setTranslation(translation: THREE.Vector3): void;
    translations: number[][];
  };
  world: never;
}

export function makePhysicsHarness(): PhysicsHarness {
  const createdColliders: TestCollider[] = [];
  const removedColliders: TestCollider[] = [];
  const rigidBody = {
    rotations: [] as unknown[],
    translations: [] as number[][],
    setRotation(rotation: unknown) {
      this.rotations.push(rotation);
    },
    setTranslation(translation: THREE.Vector3) {
      this.translations.push(translation.toArray());
    },
  };
  let nextHandle = 1;
  const world = {
    createCollider() {
      const collider = { handle: nextHandle++ };
      createdColliders.push(collider);
      return collider;
    },
    createRigidBody() {
      return rigidBody;
    },
    removeCollider(collider: TestCollider) {
      removedColliders.push(collider);
    },
  };
  const RAPIER = {
    ColliderDesc: {
      trimesh() {
        return {
          setDensity() {
            return this;
          },
        };
      },
    },
    RigidBodyDesc: {
      fixed() {
        return {
          setRotation() {
            return this;
          },
          setTranslation() {
            return this;
          },
        };
      },
    },
  };

  return {
    RAPIER: RAPIER as never,
    createdColliders,
    removedColliders,
    rigidBody,
    world: world as never,
  };
}
