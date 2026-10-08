import { expect, it, vi } from "@xrblocks/devtools/test";

import {
  installMediaDevices,
  installVideoDocument,
  loadCameraModules,
  makeDevice,
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

it("enumerates browser and simulator video inputs without non-camera devices", async () => {
  const simulated = makeStream({
    deviceId: "sim",
    facingMode: "environment",
  });
  const getUserMedia = vi.fn();
  const restore = installMediaDevices({
    enumerateDevices: vi
      .fn()
      .mockResolvedValue([
        makeDevice({ deviceId: "rear", label: "Rear" }),
        { kind: "audioinput" },
      ]),
    getUserMedia,
  });
  const camera = makeCamera();
  const simulator = {
    enumerateDevices: vi.fn().mockResolvedValue([
      makeDevice({
        deviceId: "sim",
        groupId: "simulator",
        label: "Simulator",
      }),
      { kind: "audiooutput" },
    ]),
    getMedia: vi.fn().mockReturnValue(simulated.stream),
  };
  camera.registerSimulatorCamera(simulator);
  prepareMetadataVideo(camera.video);

  try {
    expect(await camera.getAvailableVideoDevices()).toEqual([
      expect.objectContaining({ deviceId: "rear" }),
      expect.objectContaining({ deviceId: "sim" }),
    ]);
    await camera.init();
    expect(simulator.getMedia).toHaveBeenCalledWith({
      facingMode: "environment",
    });
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(camera.getCurrentDevice()).toMatchObject({ deviceId: "sim" });
  } finally {
    camera.dispose();
    restore();
  }
});

it("publishes valid metadata and keeps streaming after autoplay rejection", async () => {
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
  const stateChanges: string[] = [];
  const playError = new Error("autoplay denied");
  const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
  prepareMetadataVideo(camera.video, {
    height: 480,
    playError,
    width: 640,
  });
  camera.addEventListener("statechange", (event) => {
    stateChanges.push(event.state);
  });

  try {
    await camera.init();
    expect(camera.state).toBe(StreamState.STREAMING);
    expect(camera.loaded).toBe(true);
    expect([camera.width, camera.height, camera.aspectRatio]).toEqual([
      640,
      480,
      640 / 480,
    ]);
    expect(camera.getCurrentTrackSettings()).toMatchObject({
      deviceId: "rear",
      facingMode: "environment",
    });
    expect(camera.getCurrentDevice()).toMatchObject({ deviceId: "rear" });
    expect(stateChanges).toContain(StreamState.STREAMING);
  } finally {
    warning.mockRestore();
    camera.dispose();
    restore();
  }
});

it("distinguishes no devices from an unrecoverable browser acquisition error", async () => {
  const noDevicesRestore = installMediaDevices({
    enumerateDevices: vi.fn().mockResolvedValue([]),
    getUserMedia: vi.fn(),
  });
  const noDevicesCamera = makeCamera();
  const warning = vi.spyOn(console, "warn").mockImplementation(() => {});

  try {
    await noDevicesCamera.init();
    expect(noDevicesCamera.state).toBe(StreamState.NO_DEVICES_FOUND);
  } finally {
    warning.mockRestore();
    noDevicesCamera.dispose();
    noDevicesRestore();
  }

  const failure = new Error("camera busy");
  const failureRestore = installMediaDevices({
    enumerateDevices: vi
      .fn()
      .mockResolvedValue([makeDevice({ deviceId: "rear" })]),
    getUserMedia: vi.fn().mockRejectedValue(failure),
  });
  const failedCamera = makeCamera();
  const error = vi.spyOn(console, "error").mockImplementation(() => {});

  try {
    await expect(failedCamera.init()).rejects.toThrow(failure);
    expect(failedCamera.state).toBe(StreamState.ERROR);
    expect(failedCamera.isUsingXRCameraAccess).toBe(false);
  } finally {
    error.mockRestore();
    failedCamera.dispose();
    failureRestore();
  }
});

it("switches facing and device constraints while stopping each replaced browser track", async () => {
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
    expect(camera.getCurrentTrackSettings()).toMatchObject({
      deviceId: "external",
    });
  } finally {
    camera.dispose();
    restore();
  }
});

it("uses an unconstrained request for an empty device ID and retains the resolved ID", async () => {
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
    expect(camera.getCurrentDeviceIndex()).toBe(0);
  } finally {
    camera.dispose();
    restore();
  }
});

it("deduplicates concurrent acquisition and stops a stream that resolves after disposal", async () => {
  const late = makeStream({ deviceId: "rear", facingMode: "environment" });
  let resolveStream!: (stream: MediaStream) => void;
  const pendingStream = new Promise<MediaStream>((resolve) => {
    resolveStream = resolve;
  });
  const getUserMedia = vi.fn().mockReturnValue(pendingStream);
  const restore = installMediaDevices({
    enumerateDevices: vi
      .fn()
      .mockResolvedValue([makeDevice({ deviceId: "rear" })]),
    getUserMedia,
  });
  const camera = makeCamera();
  let first: Promise<void> | undefined;
  let second: Promise<void> | undefined;
  let streamResolved = false;

  try {
    first = camera.init();
    void first.catch(() => {});
    await Promise.resolve();
    await Promise.resolve();
    second = camera.init();
    void second.catch(() => {});
    await Promise.resolve();
    expect(getUserMedia).toHaveBeenCalledTimes(1);

    camera.dispose();
    resolveStream(late.stream);
    streamResolved = true;
    await Promise.all([first, second]);

    expect(late.stop).toHaveBeenCalledTimes(1);
    expect(camera.state).toBe(StreamState.IDLE);
    expect(camera.loaded).toBe(false);
  } finally {
    camera.dispose();
    if (!streamResolved) {
      resolveStream(late.stream);
    }
    await Promise.allSettled([first, second].filter(Boolean));
    restore();
  }
});
