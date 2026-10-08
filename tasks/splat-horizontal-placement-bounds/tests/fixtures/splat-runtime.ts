import * as THREE from "three";

/**
 * Adapts Spark's opaque runtime import. ModelLoader has no injectable Spark
 * seam, so this fixture controls only the external readiness and bounds API.
 */
export async function delayedSplatRuntime(bounds: THREE.Box3): Promise<{
  created: Promise<void>;
  finish: () => void;
  restore: () => void;
}> {
  const { SplatMesh } = await import(
    "@xrblocks/source/../node_modules/@sparkjsdev/spark/dist/spark.module.js"
  );
  const initialized = Object.getOwnPropertyDescriptor(
    SplatMesh.prototype,
    "initialized",
  );
  const getBoundingBox = SplatMesh.prototype.getBoundingBox;
  let announceCreated!: () => void;
  let finishLoading!: () => void;
  let ready = false;
  const created = new Promise<void>((resolve) => {
    announceCreated = resolve;
  });
  const loaded = new Promise<void>((resolve) => {
    finishLoading = () => {
      ready = true;
      resolve();
    };
  });

  Object.defineProperty(SplatMesh.prototype, "initialized", {
    configurable: true,
    get: () => loaded,
    set: () => announceCreated(),
  });
  SplatMesh.prototype.getBoundingBox = () =>
    ready ? bounds.clone() : new THREE.Box3();

  return {
    created,
    finish: finishLoading,
    restore: () => {
      if (initialized) {
        Object.defineProperty(SplatMesh.prototype, "initialized", initialized);
      } else {
        delete (SplatMesh.prototype as { initialized?: Promise<unknown> })
          .initialized;
      }
      SplatMesh.prototype.getBoundingBox = getBoundingBox;
    },
  };
}
