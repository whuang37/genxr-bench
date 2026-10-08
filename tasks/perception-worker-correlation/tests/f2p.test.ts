import { expect, it, vi } from "@xrblocks/devtools/test";

import {
  FakeBlob,
  FakeWorker,
  IMAGE_DATA,
  INIT_CONFIG,
  installWorkerEnvironment,
  loadWorkerModule,
} from "./fixtures/worker-fixtures.ts";

const { MediaPipeVisionWorkerClient } = await loadWorkerModule();

async function createInitializedClient() {
  const client = new MediaPipeVisionWorkerClient("TestBackend");
  const pending = client.init(INIT_CONFIG);
  void pending.catch(() => {});
  expect(FakeWorker.instances).toHaveLength(1);
  const worker = FakeWorker.instances[0];
  worker.replyOk(worker.posted[0].message.id);
  await pending;
  return { client, worker };
}

it("creates one Blob worker, sends configuration, and keeps successful init idempotent", async () => {
  const environment = installWorkerEnvironment();
  const client = new MediaPipeVisionWorkerClient("TestBackend");
  const pending = client.init(INIT_CONFIG);
  void pending.catch(() => {});

  try {
    expect(FakeWorker.instances).toHaveLength(1);
    expect(FakeBlob.instances).toHaveLength(1);
    expect(environment.createObjectURL).toHaveBeenCalledWith(
      FakeBlob.instances[0],
    );
    const worker = FakeWorker.instances[0];
    expect(worker.url).toBe("blob:perception-worker");
    expect(worker.posted[0].message).toMatchObject({
      config: INIT_CONFIG,
      type: "init",
    });

    worker.replyOk(worker.posted[0].message.id);
    await pending;
    await client.init(INIT_CONFIG);
    expect(FakeWorker.instances).toHaveLength(1);
  } finally {
    client.dispose();
    environment.restore();
  }
});

it("surfaces unavailable-worker and worker-init failures", async () => {
  const environment = installWorkerEnvironment();
  const unavailable = new MediaPipeVisionWorkerClient("UnavailableBackend");

  try {
    vi.stubGlobal("Worker", undefined);
    const unavailableError = await unavailable
      .init(INIT_CONFIG)
      .catch((reason: unknown) => reason);
    expectUsefulError(unavailableError);

    vi.stubGlobal("Worker", FakeWorker);
    const client = new MediaPipeVisionWorkerClient("TestBackend");
    const pending = client.init(INIT_CONFIG);
    void pending.catch(() => {});
    expect(FakeWorker.instances).toHaveLength(1);
    const worker = FakeWorker.instances[0];
    worker.replyError(worker.posted[0].message.id, "model download failed");
    const initError = await pending.catch((reason: unknown) => reason);
    expectUsefulError(initError);
    client.dispose();
  } finally {
    unavailable.dispose();
    environment.restore();
  }
});

function expectUsefulError(reason: unknown): void {
  expect(reason).toBeInstanceOf(Error);
  expect((reason as Error).message.trim().length).toBeGreaterThan(0);
}

it("returns worker detections after transferring the ImageBitmap", async () => {
  const environment = installWorkerEnvironment();
  let client: { dispose: () => void } | undefined;

  try {
    const initialized = await createInitializedClient();
    client = initialized.client;
    const pending = initialized.client.detect(IMAGE_DATA);
    await vi.waitFor(() => expect(initialized.worker.posted).toHaveLength(2));
    const detect = initialized.worker.posted[1];
    expect(detect.message).toMatchObject({ type: "detect" });
    expect(detect.transfer).toEqual([detect.message.imageBitmap]);
    expect(detect.message.imageBitmap).toBe(environment.bitmap);

    initialized.worker.replyOk(detect.message.id, {
      landmarks: [[{ x: 0.5 }]],
    });
    await expect(pending).resolves.toEqual({ landmarks: [[{ x: 0.5 }]] });
  } finally {
    client?.dispose();
    environment.restore();
  }
});

it("correlates overlapping detections despite out-of-order and unknown replies", async () => {
  const environment = installWorkerEnvironment();
  let client: { dispose: () => void } | undefined;

  try {
    const initialized = await createInitializedClient();
    client = initialized.client;
    const first = initialized.client.detect(IMAGE_DATA);
    const second = initialized.client.detect(IMAGE_DATA);
    await vi.waitFor(() => expect(initialized.worker.posted).toHaveLength(3));
    const firstRequest = initialized.worker.posted[1].message;
    const secondRequest = initialized.worker.posted[2].message;

    expect(() =>
      initialized.worker.replyOk(999, { tag: "late" }),
    ).not.toThrow();
    initialized.worker.replyOk(secondRequest.id, { tag: "second" });
    initialized.worker.replyOk(firstRequest.id, { tag: "first" });

    await expect(first).resolves.toEqual({ tag: "first" });
    await expect(second).resolves.toEqual({ tag: "second" });
  } finally {
    client?.dispose();
    environment.restore();
  }
});

it("isolates unavailable, bitmap, and worker detection failures as null results", async () => {
  const environment = installWorkerEnvironment();
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  const beforeInit = new MediaPipeVisionWorkerClient("BeforeInitBackend");
  let client: { dispose: () => void } | undefined;

  try {
    await expect(beforeInit.detect(IMAGE_DATA)).resolves.toBeNull();

    const initialized = await createInitializedClient();
    client = initialized.client;

    environment.createImageBitmap.mockRejectedValueOnce(
      new Error("detached buffer"),
    );
    await expect(initialized.client.detect(IMAGE_DATA)).resolves.toBeNull();

    const pending = initialized.client.detect(IMAGE_DATA);
    await vi.waitFor(() => expect(initialized.worker.posted).toHaveLength(2));
    initialized.worker.replyError(
      initialized.worker.posted[1].message.id,
      "inference failed",
    );
    await expect(pending).resolves.toBeNull();
  } finally {
    beforeInit.dispose();
    client?.dispose();
    error.mockRestore();
    environment.restore();
  }
});

it("terminates, revokes, and settles an in-flight detection during disposal", async () => {
  const environment = installWorkerEnvironment();
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  let client: { dispose: () => void } | undefined;

  try {
    const initialized = await createInitializedClient();
    client = initialized.client;
    const pending = initialized.client.detect(IMAGE_DATA);
    await vi.waitFor(() => expect(initialized.worker.posted).toHaveLength(2));
    initialized.client.dispose();

    expect(initialized.worker.terminated).toBe(true);
    expect(environment.revokedUrls).toEqual(["blob:perception-worker"]);
    await expect(pending).resolves.toBeNull();
  } finally {
    client?.dispose();
    error.mockRestore();
    environment.restore();
  }
});
