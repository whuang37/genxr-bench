import * as THREE from "three";

import { expect, it, vi } from "@xrblocks/devtools/test";

import {
  installMediaDevices,
  installVideoDocument,
  loadCameraModules,
} from "./fixtures/camera-fixtures.ts";

installVideoDocument();

const { DeviceCameraOptions, StreamState, XRDeviceCamera } =
  await loadCameraModules();

function makeFallbackRenderer() {
  const properties = { get: vi.fn(() => ({})) };
  return {
    properties,
    xr: {
      getBinding: () => ({ getCameraImage: () => ({}) }),
      getReferenceSpace: () => ({}),
      getSession: () => ({
        enabledFeatures: ["camera-access"],
        mode: "immersive-ar",
      }),
    },
  } as unknown as THREE.WebGLRenderer;
}

it("keeps the supplied Raw Camera Access fallback selected when normal devices are absent", async () => {
  const restore = installMediaDevices({
    enumerateDevices: vi.fn().mockResolvedValue([]),
    getUserMedia: vi.fn(),
  });
  const camera = new XRDeviceCamera(new DeviceCameraOptions({ enabled: true }));
  const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
  camera.setRenderer(makeFallbackRenderer());

  try {
    await camera.init();
    expect(camera.isUsingXRCameraAccess).toBe(true);
    expect(camera.state).toBe(StreamState.INITIALIZING);
  } finally {
    warning.mockRestore();
    camera.dispose();
    restore();
  }
});

it("keeps supplied Raw Camera Access frame publication and dimensions", async () => {
  const restore = installMediaDevices({
    enumerateDevices: vi.fn().mockResolvedValue([]),
    getUserMedia: vi.fn(),
  });
  const camera = new XRDeviceCamera(new DeviceCameraOptions({ enabled: true }));
  const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
  camera.setRenderer(makeFallbackRenderer());
  const xrCamera = { height: 240, width: 320 };

  try {
    await camera.init();
    camera.updateXRCamera({
      getViewerPose: () => ({ views: [{ camera: xrCamera }] }),
    } as unknown as XRFrame);

    expect(camera.isUsingXRCameraAccess).toBe(true);
    expect(camera.state).toBe(StreamState.STREAMING);
    expect(camera.texture).toBeInstanceOf(THREE.ExternalTexture);
    expect([camera.width, camera.height, camera.aspectRatio]).toEqual([
      320,
      240,
      320 / 240,
    ]);
  } finally {
    warning.mockRestore();
    camera.dispose();
    restore();
  }
});

it("keeps the supplied Raw Camera Access timeout when no XR frames arrive", async () => {
  vi.useFakeTimers();
  const restore = installMediaDevices({
    enumerateDevices: vi.fn().mockResolvedValue([]),
    getUserMedia: vi.fn(),
  });
  const camera = new XRDeviceCamera(new DeviceCameraOptions({ enabled: true }));
  const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
  camera.setRenderer(makeFallbackRenderer());

  try {
    await camera.init();
    expect(camera.state).toBe(StreamState.INITIALIZING);

    await vi.advanceTimersByTimeAsync(5_000);

    expect(camera.isUsingXRCameraAccess).toBe(false);
    expect(camera.state).toBe(StreamState.NO_DEVICES_FOUND);
  } finally {
    warning.mockRestore();
    camera.dispose();
    restore();
    vi.useRealTimers();
  }
});

it("keeps Raw Camera Access disabled when the XR session did not grant camera access", async () => {
  const restore = installMediaDevices({
    enumerateDevices: vi.fn().mockResolvedValue([]),
    getUserMedia: vi.fn(),
  });
  const camera = new XRDeviceCamera(new DeviceCameraOptions({ enabled: true }));
  const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
  const renderer = makeFallbackRenderer() as unknown as {
    xr: { getSession: () => { enabledFeatures: string[]; mode: string } };
  };
  renderer.xr.getSession = () => ({
    enabledFeatures: ["depth-sensing"],
    mode: "immersive-ar",
  });
  camera.setRenderer(renderer as unknown as THREE.WebGLRenderer);

  try {
    await camera.init();

    expect(camera.isUsingXRCameraAccess).toBe(false);
    expect(camera.state).toBe(StreamState.NO_DEVICES_FOUND);
  } finally {
    warning.mockRestore();
    camera.dispose();
    restore();
  }
});

it("keeps Raw Camera Access unready when the XR frame has no viewer pose", async () => {
  const restore = installMediaDevices({
    enumerateDevices: vi.fn().mockResolvedValue([]),
    getUserMedia: vi.fn(),
  });
  const camera = new XRDeviceCamera(new DeviceCameraOptions({ enabled: true }));
  const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
  const renderer = makeFallbackRenderer();
  camera.setRenderer(renderer);

  try {
    await camera.init();
    camera.updateXRCamera({
      getViewerPose: () => null,
    } as unknown as XRFrame);

    expect(camera.loaded).toBe(false);
    expect(camera.texture).not.toBeInstanceOf(THREE.ExternalTexture);
    expect(camera.state).toBe(StreamState.INITIALIZING);
  } finally {
    warning.mockRestore();
    camera.dispose();
    restore();
  }
});

it("keeps Raw Camera Access resource ownership and terminal disposal", async () => {
  const restore = installMediaDevices({
    enumerateDevices: vi.fn().mockResolvedValue([]),
    getUserMedia: vi.fn(),
  });
  const camera = new XRDeviceCamera(new DeviceCameraOptions({ enabled: true }));
  const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
  camera.setRenderer(makeFallbackRenderer());

  try {
    await camera.init();
    camera.updateXRCamera({
      getViewerPose: () => ({ views: [{ camera: { height: 8, width: 12 } }] }),
    } as unknown as XRFrame);
    expect(camera.loaded).toBe(true);
    const texture = camera.texture as THREE.ExternalTexture;
    const disposeTexture = vi.spyOn(texture, "dispose");

    camera.dispose();
    camera.dispose();

    expect(disposeTexture).toHaveBeenCalled();
    expect(camera.isUsingXRCameraAccess).toBe(false);
    expect(() =>
      camera.updateXRCamera({ getViewerPose: vi.fn() } as unknown as XRFrame),
    ).not.toThrow();
    disposeTexture.mockRestore();
  } finally {
    warning.mockRestore();
    camera.dispose();
    restore();
  }
});
