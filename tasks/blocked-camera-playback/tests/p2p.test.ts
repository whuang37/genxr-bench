import * as THREE from "three";

import { afterEach, expect, it, vi } from "@xrblocks/devtools/test";

import { createCameraFixture, makeStream } from "./fixtures/camera-fixture.ts";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it("reports a denied camera permission without publishing a stream", async () => {
  const denied = new Error("permission denied");
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  const { camera } = createCameraFixture({
    getUserMedia: () => Promise.reject(denied),
  });

  try {
    await expect(camera.init()).rejects.toThrow(denied);
    expect(camera.state).toBe("error");
    expect(camera.loaded).toBe(false);
    expect(camera.video.srcObject).toBeNull();
  } finally {
    error.mockRestore();
    camera.dispose();
  }
});

it("stops the replaced stream and publishes the selected camera", async () => {
  const rear = makeStream({ deviceId: "rear" });
  const front = makeStream({ deviceId: "front", facingMode: "user" });
  const { camera } = createCameraFixture({
    devices: [
      { deviceId: "rear", facingMode: "environment" },
      { deviceId: "front", facingMode: "user" },
    ],
    getUserMedia: vi
      .fn()
      .mockResolvedValueOnce(rear.stream)
      .mockResolvedValueOnce(front.stream),
  });

  try {
    await camera.init();
    await camera.setDeviceId("front");

    expect(rear.track.stop).toHaveBeenCalledOnce();
    expect(camera.getCurrentDevice()).toMatchObject({ deviceId: "front" });
    expect(camera.getCurrentTrackSettings()).toMatchObject({
      deviceId: "front",
      facingMode: "user",
    });
  } finally {
    camera.dispose();
  }
});

it("allows a later user retry to replace a stream after an autoplay rejection", async () => {
  const { camera, video } = createCameraFixture({
    devices: [
      { deviceId: "rear", facingMode: "environment" },
      { deviceId: "front", facingMode: "user" },
    ],
    playback: [
      () => Promise.reject(new Error("autoplay denied")),
      () => Promise.resolve(),
    ],
  });

  try {
    await camera.init();
    await camera.setFacingMode("user");

    expect(camera.state).toBe("streaming");
    expect(camera.getCurrentTrackSettings()).toMatchObject({
      deviceId: "front",
      facingMode: "user",
    });
    expect(video.srcObject).not.toBeNull();
  } finally {
    camera.dispose();
  }
});

it("does not retain a stream that resolves after disposal", async () => {
  const late = makeStream({ deviceId: "rear" });
  let resolveStream!: (stream: MediaStream) => void;
  const pending = new Promise<MediaStream>((resolve) => {
    resolveStream = resolve;
  });
  const { camera, mediaDevices } = createCameraFixture({
    getUserMedia: () => pending,
  });

  try {
    const first = camera.init();
    await Promise.resolve();
    const overlapping = camera.init();
    await Promise.resolve();
    expect(mediaDevices.getUserMedia).toHaveBeenCalledOnce();

    camera.dispose();
    resolveStream(late.stream);
    await Promise.all([first, overlapping]);

    expect(late.track.stop).toHaveBeenCalledOnce();
    expect(camera.loaded).toBe(false);
    expect(camera.video.srcObject).toBeNull();
  } finally {
    camera.dispose();
  }
});

it("uses Raw Camera Access when browser acquisition is unavailable", async () => {
  const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
  const { camera } = createCameraFixture({
    getUserMedia: () => Promise.reject(new Error("camera unavailable")),
  });
  const renderer = {
    xr: {
      getSession: () => ({ enabledFeatures: ["camera-access"] }),
    },
  } as unknown as THREE.WebGLRenderer;
  camera.setRenderer(renderer);

  try {
    await camera.init();
    expect(camera.isUsingXRCameraAccess).toBe(true);
    expect(camera.loaded).toBe(false);
    expect(camera.state).toBe("initializing");
  } finally {
    warning.mockRestore();
    camera.dispose();
  }
});
