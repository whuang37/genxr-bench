import * as THREE from "three";

import { expect, it, vi } from "@xrblocks/devtools/test";

import {
  FakeBlob,
  FakeWorker,
  installWorkerEnvironment,
  loadWorkerModule,
} from "./fixtures/worker-fixtures.ts";

const {
  MEDIAPIPE_MODULE_URL,
  MEDIA_PIPE_VISION_WORKER_SOURCE,
  MediaPipeVisionWorkerClient,
} = await loadWorkerModule();

it("keeps the static worker support query accurate for Worker and Blob availability", () => {
  const environment = installWorkerEnvironment();

  try {
    expect(MediaPipeVisionWorkerClient.isSupported()).toBe(true);
    vi.stubGlobal("Worker", undefined);
    expect(MediaPipeVisionWorkerClient.isSupported()).toBe(false);
    vi.stubGlobal("Worker", FakeWorker);
    vi.stubGlobal("Blob", undefined);
    expect(MediaPipeVisionWorkerClient.isSupported()).toBe(false);
  } finally {
    environment.restore();
  }
});

it("keeps a valid module URL and a constructible worker-program export", () => {
  const moduleUrl = new URL(MEDIAPIPE_MODULE_URL);
  const environment = installWorkerEnvironment();

  try {
    expect(moduleUrl.protocol).toBe("https:");
    expect(MEDIA_PIPE_VISION_WORKER_SOURCE.trim()).not.toBe("");

    const program = new Blob([MEDIA_PIPE_VISION_WORKER_SOURCE]);
    expect(program).toBeInstanceOf(FakeBlob);
    expect(FakeBlob.instances).toHaveLength(1);
    expect(FakeBlob.instances[0].parts).toEqual([
      MEDIA_PIPE_VISION_WORKER_SOURCE,
    ]);
  } finally {
    environment.restore();
  }
});

it("keeps dispose safe before initialization and after repeated calls", () => {
  const client = new MediaPipeVisionWorkerClient("TestBackend");

  expect(() => client.dispose()).not.toThrow();
  expect(() => client.dispose()).not.toThrow();
});

it("keeps the supplied worker program's errors correlated to the request ID", async () => {
  const replies: unknown[] = [];
  const scope = {
    onmessage: undefined as
      | ((event: { data: Record<string, unknown> }) => Promise<void>)
      | undefined,
    postMessage: (message: unknown) => replies.push(message),
  };
  new Function("self", MEDIA_PIPE_VISION_WORKER_SOURCE)(scope);

  await scope.onmessage?.({ data: { id: 41, type: "detect" } });
  await scope.onmessage?.({ data: { id: 73, type: "unsupported" } });

  expect(replies).toHaveLength(2);
  expect(replies[0]).toMatchObject({ id: 41, ok: false });
  expect(replies[1]).toMatchObject({ id: 73, ok: false });
  for (const reply of replies as Array<{ error?: unknown }>) {
    expect(typeof reply.error).toBe("string");
    expect((reply.error as string).trim().length).toBeGreaterThan(0);
  }
});

it("keeps face-result conversion independent from worker request plumbing", async () => {
  const { processFaceLandmarkerResult } = await import(
    "@xrblocks/source/world/faces/backends/MediaPipeFaceBackend.ts"
  );
  const transform = new THREE.Matrix4().makeTranslation(1, 2, 3);
  const faces = processFaceLandmarkerResult(
    {
      faceBlendshapes: [
        { categories: [{ categoryName: "jawOpen", score: 0.75 }] },
      ],
      faceLandmarks: [[{ x: 0.2, y: 0.3, z: 0.1 }]],
      facialTransformationMatrixes: [{ data: transform.toArray() }],
    } as never,
    new THREE.Mesh(),
    {
      worldFromClip: new THREE.Matrix4(),
      worldFromView: new THREE.Matrix4(),
    },
  );

  expect(faces).toHaveLength(1);
  expect(faces[0].landmarks).toHaveLength(1);
  expect(faces[0].detection2DBoundingBox.min.toArray()).toEqual([0.2, 0.3]);
  expect(faces[0].detection2DBoundingBox.max.toArray()).toEqual([0.2, 0.3]);
  expect(faces[0].getBlendshape("jawOpen")).toBe(0.75);
  expect(faces[0].position.toArray()).toEqual([1, 2, 3]);
});

it("keeps pose-result conversion and metric skeleton placement independent from workers", async () => {
  const { processPoseLandmarkerResult } = await import(
    "@xrblocks/source/world/humans/backends/MediaPipeHumanBackend.ts"
  );
  const poses = processPoseLandmarkerResult(
    {
      landmarks: [[{ visibility: 0.8, x: 0.4, y: 0.6, z: 0 }]],
      worldLandmarks: [[{ x: 0.1, y: 0.2, z: 0.3 }]],
    } as never,
    new THREE.Mesh(),
    {
      worldFromClip: new THREE.Matrix4(),
      worldFromView: new THREE.Matrix4(),
    },
    { useDepthProjection: false },
  );

  expect(poses).toHaveLength(1);
  expect(poses[0].landmarks[0]).toMatchObject({
    visibility: 0.8,
    x: 0.4,
    y: 0.6,
    z: 0.3,
  });
  expect(poses[0].landmarks[0].metricPosition?.toArray()).toEqual([
    0.1, 0.2, 0.3,
  ]);
  expect(poses[0].landmarks[0].worldPosition?.toArray()).toEqual([
    0.1, -0.2, -2.3,
  ]);
});
