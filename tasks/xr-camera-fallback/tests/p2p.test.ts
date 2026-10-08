import { expect, it, vi } from "@xrblocks/devtools/test";

import {
  installMediaDevices,
  installVideoDocument,
  loadCameraModules,
  makeDevice,
  makeRawRenderer,
  makeStream,
  prepareMetadataVideo,
} from "./fixtures/camera-fixtures.ts";

installVideoDocument();

const { DeviceCameraOptions, StreamState, XRDeviceCamera } =
  await loadCameraModules();

function makeCamera(
  videoConstraints: MediaTrackConstraints = { facingMode: "environment" },
) {
  return new XRDeviceCamera(
    new DeviceCameraOptions({ enabled: true, videoConstraints }),
  );
}

it("keeps normal streaming metadata when autoplay is rejected even with a renderer", async () => {
  const { stream } = makeStream({
    deviceId: "rear",
    facingMode: "environment",
  });
  const restore = installMediaDevices({
    enumerateDevices: vi
      .fn()
      .mockResolvedValue([makeDevice({ deviceId: "rear" })]),
    getUserMedia: vi.fn().mockResolvedValue(stream),
  });
  const camera = makeCamera();
  const playError = new Error("autoplay denied");
  const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
  camera.setRenderer(
    makeRawRenderer({ enabledFeatures: ["camera-access"] }).renderer,
  );
  prepareMetadataVideo(camera.video, { height: 480, playError, width: 640 });

  try {
    await camera.init();

    expect(camera.isUsingXRCameraAccess).toBe(false);
    expect(camera.state).toBe(StreamState.STREAMING);
    expect([camera.width, camera.height, camera.aspectRatio]).toEqual([
      640,
      480,
      640 / 480,
    ]);
    expect(camera.getCurrentDevice()).toMatchObject({ deviceId: "rear" });
  } finally {
    camera.dispose();
    warning.mockRestore();
    restore();
  }
});

it("keeps the normal no-device result when no renderer fallback is supplied", async () => {
  const restore = installMediaDevices({
    enumerateDevices: vi.fn().mockResolvedValue([]),
    getUserMedia: vi.fn(),
  });
  const camera = makeCamera();
  const warning = vi.spyOn(console, "warn").mockImplementation(() => {});

  try {
    await camera.init();
    expect(camera.isUsingXRCameraAccess).toBe(false);
    expect(camera.state).toBe(StreamState.NO_DEVICES_FOUND);
  } finally {
    camera.dispose();
    warning.mockRestore();
    restore();
  }
});

it("keeps normal browser acquisition errors when no renderer fallback is supplied", async () => {
  const failure = new Error("camera busy");
  const restore = installMediaDevices({
    enumerateDevices: vi
      .fn()
      .mockResolvedValue([makeDevice({ deviceId: "rear" })]),
    getUserMedia: vi.fn().mockRejectedValue(failure),
  });
  const camera = makeCamera();
  const error = vi.spyOn(console, "error").mockImplementation(() => {});

  try {
    await expect(camera.init()).rejects.toThrow(failure);
    expect(camera.isUsingXRCameraAccess).toBe(false);
    expect(camera.state).toBe(StreamState.ERROR);
  } finally {
    camera.dispose();
    error.mockRestore();
    restore();
  }
});

it("keeps facing and device selection while stopping replaced normal streams", async () => {
  const rear = makeStream({ deviceId: "rear", facingMode: "environment" });
  const front = makeStream({ deviceId: "front", facingMode: "user" });
  const external = makeStream({
    deviceId: "external",
    facingMode: "environment",
  });
  const getUserMedia = vi
    .fn()
    .mockResolvedValueOnce(rear.stream)
    .mockResolvedValueOnce(front.stream)
    .mockResolvedValueOnce(external.stream);
  const restore = installMediaDevices({
    enumerateDevices: vi
      .fn()
      .mockResolvedValue([
        makeDevice({ deviceId: "rear" }),
        makeDevice({ deviceId: "front" }),
        makeDevice({ deviceId: "external" }),
      ]),
    getUserMedia,
  });
  const camera = makeCamera();
  prepareMetadataVideo(camera.video);

  try {
    await camera.init();
    await camera.setFacingMode("user");
    await camera.setDeviceId("external");

    expect(getUserMedia).toHaveBeenNthCalledWith(1, {
      video: { facingMode: "environment" },
    });
    expect(getUserMedia).toHaveBeenNthCalledWith(2, {
      video: { facingMode: "user" },
    });
    expect(getUserMedia).toHaveBeenNthCalledWith(3, {
      video: { deviceId: { exact: "external" } },
    });
    expect(rear.stop).toHaveBeenCalledTimes(1);
    expect(front.stop).toHaveBeenCalledTimes(1);
    expect(camera.getCurrentDevice()).toMatchObject({ deviceId: "external" });
  } finally {
    camera.dispose();
    restore();
  }
});

it("keeps an empty device ID as an unconstrained browser request", async () => {
  const resolved = makeStream({
    deviceId: "resolved-rear",
    facingMode: "environment",
  });
  const enumerateDevices = vi
    .fn()
    .mockResolvedValueOnce([makeDevice({ deviceId: "" })])
    .mockResolvedValueOnce([makeDevice({ deviceId: "resolved-rear" })]);
  const getUserMedia = vi.fn().mockResolvedValue(resolved.stream);
  const restore = installMediaDevices({ enumerateDevices, getUserMedia });
  const camera = makeCamera({ deviceId: "" });
  prepareMetadataVideo(camera.video);

  try {
    await camera.init();
    expect(getUserMedia).toHaveBeenCalledWith({ video: {} });
    expect(camera.getCurrentDevice()).toMatchObject({
      deviceId: "resolved-rear",
    });
  } finally {
    camera.dispose();
    restore();
  }
});

it("keeps browser enumeration filtered to video inputs and merges simulator cameras", async () => {
  const browserVideo = makeDevice({ deviceId: "browser-rear" });
  const browserAudio = {
    ...makeDevice({ deviceId: "microphone" }),
    kind: "audioinput",
  } as MediaDeviceInfo;
  const simulatorVideo = makeDevice({
    deviceId: "simulator-rear",
    groupId: "simulator",
  });
  const restore = installMediaDevices({
    enumerateDevices: vi.fn().mockResolvedValue([browserAudio, browserVideo]),
    getUserMedia: vi.fn(),
  });
  const camera = makeCamera();
  camera.registerSimulatorCamera({
    enumerateDevices: vi.fn().mockResolvedValue([simulatorVideo]),
    getMedia: vi.fn(),
  });

  try {
    await expect(camera.getAvailableVideoDevices()).resolves.toEqual([
      browserVideo,
      simulatorVideo,
    ]);
  } finally {
    camera.dispose();
    restore();
  }
});

it("keeps environment-facing acquisition on the registered simulator source", async () => {
  const browser = makeDevice({ deviceId: "browser-rear" });
  const simulator = makeDevice({
    deviceId: "simulator-rear",
    groupId: "simulator",
  });
  const simulated = makeStream({
    deviceId: "simulator-rear",
    facingMode: "environment",
  });
  const getUserMedia = vi.fn();
  const simulatorGetMedia = vi.fn(() => simulated.stream);
  const restore = installMediaDevices({
    enumerateDevices: vi.fn().mockResolvedValue([browser]),
    getUserMedia,
  });
  const camera = makeCamera();
  camera.registerSimulatorCamera({
    enumerateDevices: vi.fn().mockResolvedValue([simulator]),
    getMedia: simulatorGetMedia,
  });
  prepareMetadataVideo(camera.video, { height: 360, width: 640 });

  try {
    await camera.init();

    expect(simulatorGetMedia).toHaveBeenCalledWith({
      facingMode: "environment",
    });
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(camera.state).toBe(StreamState.STREAMING);
    expect(camera.getCurrentDevice()).toMatchObject({
      deviceId: "simulator-rear",
    });
  } finally {
    camera.dispose();
    restore();
  }
});

it("keeps selecting an already active browser device as a no-op", async () => {
  const active = makeStream({
    deviceId: "rear",
    facingMode: "environment",
  });
  const getUserMedia = vi.fn().mockResolvedValue(active.stream);
  const restore = installMediaDevices({
    enumerateDevices: vi
      .fn()
      .mockResolvedValue([makeDevice({ deviceId: "rear" })]),
    getUserMedia,
  });
  const camera = makeCamera();
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  prepareMetadataVideo(camera.video);

  try {
    await camera.init();
    await camera.setDeviceId("rear");

    expect(getUserMedia).toHaveBeenCalledOnce();
    expect(active.stop).not.toHaveBeenCalled();
  } finally {
    log.mockRestore();
    camera.dispose();
    restore();
  }
});

it("keeps normal stream disposal idempotent and stops the active track once", async () => {
  const active = makeStream({
    deviceId: "rear",
    facingMode: "environment",
  });
  const restore = installMediaDevices({
    enumerateDevices: vi
      .fn()
      .mockResolvedValue([makeDevice({ deviceId: "rear" })]),
    getUserMedia: vi.fn().mockResolvedValue(active.stream),
  });
  const camera = makeCamera();
  prepareMetadataVideo(camera.video);

  try {
    await camera.init();
    camera.dispose();
    camera.dispose();

    expect(active.stop).toHaveBeenCalledOnce();
    expect(camera.loaded).toBe(false);
  } finally {
    camera.dispose();
    restore();
  }
});
