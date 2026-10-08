import * as THREE from "three";

import { expect, it, vi } from "@xrblocks/devtools/test";

import {
  installMediaDevices,
  installVideoDocument,
  loadCameraModules,
  makeRawRenderer,
} from "./fixtures/camera-fixtures.ts";

installVideoDocument();

const { DeviceCameraOptions, StreamState, XRDeviceCamera } =
  await loadCameraModules();

function makeCamera() {
  return new XRDeviceCamera(new DeviceCameraOptions({ enabled: true }));
}

function missingMediaDevices() {
  return installMediaDevices({
    enumerateDevices: vi.fn().mockResolvedValue([]),
    getUserMedia: vi.fn(),
  });
}

it("selects Raw Camera Access only when the immersive session grants camera-access", async () => {
  const restore = missingMediaDevices();
  const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
  const denied = makeCamera();
  const granted = makeCamera();
  const deniedRenderer = makeRawRenderer({ enabledFeatures: [] });
  const grantedRenderer = makeRawRenderer({
    enabledFeatures: ["camera-access"],
  });
  denied.setRenderer(deniedRenderer.renderer);
  granted.setRenderer(grantedRenderer.renderer);

  try {
    await denied.init();
    expect(denied.isUsingXRCameraAccess).toBe(false);
    expect(denied.state).toBe(StreamState.NO_DEVICES_FOUND);

    await granted.init();
    expect(granted.isUsingXRCameraAccess).toBe(true);
    expect(granted.state).toBe(StreamState.INITIALIZING);
  } finally {
    denied.dispose();
    granted.dispose();
    warning.mockRestore();
    restore();
  }
});

it("waits for a complete binding, reference, pose, and view before publishing", async () => {
  const restore = missingMediaDevices();
  const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
  const camera = makeCamera();
  const renderer = makeRawRenderer({ enabledFeatures: ["camera-access"] });
  const getViewerPose = vi.fn(() => null);
  const frame = { getViewerPose } as unknown as XRFrame;
  camera.setRenderer(renderer.renderer);

  try {
    await camera.init();
    camera.updateXRCamera(frame);

    renderer.setBinding({ getCameraImage: vi.fn(() => null) });
    camera.updateXRCamera(frame);
    renderer.setReferenceSpace({} as XRReferenceSpace);
    camera.updateXRCamera(frame);
    getViewerPose.mockReturnValue({ views: [{}] });
    camera.updateXRCamera(frame);

    expect(camera.isUsingXRCameraAccess).toBe(true);
    expect(camera.loaded).toBe(false);
    expect(camera.state).toBe(StreamState.INITIALIZING);
    expect(camera.texture).not.toBeInstanceOf(THREE.ExternalTexture);
  } finally {
    camera.dispose();
    warning.mockRestore();
    restore();
  }
});

it("publishes and refreshes one external texture across usable XR views and frames", async () => {
  const restore = missingMediaDevices();
  const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
  const firstCamera = { height: 240, width: 320 } as XRCamera;
  const secondCamera = { height: 600, width: 800 } as XRCamera;
  const firstImage = {} as WebGLTexture;
  const secondImage = {} as WebGLTexture;
  const getCameraImage = vi
    .fn()
    .mockReturnValueOnce(firstImage)
    .mockReturnValueOnce(secondImage);
  const renderer = makeRawRenderer({
    binding: { getCameraImage },
    enabledFeatures: ["camera-access"],
    referenceSpace: {} as XRReferenceSpace,
  });
  const camera = makeCamera();
  const states: string[] = [];
  camera.addEventListener("statechange", (event) => states.push(event.state));
  camera.setRenderer(renderer.renderer);

  try {
    await camera.init();
    camera.updateXRCamera({
      getViewerPose: () => ({ views: [{}, { camera: firstCamera }] }),
    } as unknown as XRFrame);

    const publishedTexture = camera.texture;
    expect(publishedTexture).toBeInstanceOf(THREE.ExternalTexture);
    expect([camera.width, camera.height, camera.aspectRatio]).toEqual([
      320,
      240,
      320 / 240,
    ]);
    expect(camera.state).toBe(StreamState.STREAMING);
    camera.updateXRCamera({
      getViewerPose: () => ({ views: [{ camera: secondCamera }] }),
    } as unknown as XRFrame);

    expect(camera.texture).toBe(publishedTexture);
    expect(getCameraImage).toHaveBeenNthCalledWith(1, firstCamera);
    expect(getCameraImage).toHaveBeenNthCalledWith(2, secondCamera);
    expect([camera.width, camera.height, camera.aspectRatio]).toEqual([
      800,
      600,
      800 / 600,
    ]);
    expect(
      states.filter((state) => state === StreamState.STREAMING),
    ).toHaveLength(1);
  } finally {
    camera.dispose();
    warning.mockRestore();
    restore();
  }
});

it("reports no devices when a granted Raw Camera Access session receives no frame", async () => {
  vi.useFakeTimers();
  const restore = missingMediaDevices();
  const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
  const camera = makeCamera();
  camera.setRenderer(
    makeRawRenderer({ enabledFeatures: ["camera-access"] }).renderer,
  );

  try {
    await camera.init();
    expect(camera.isUsingXRCameraAccess).toBe(true);
    expect(camera.state).toBe(StreamState.INITIALIZING);
    await vi.advanceTimersByTimeAsync(5_000);

    expect(camera.isUsingXRCameraAccess).toBe(false);
    expect(camera.state).toBe(StreamState.NO_DEVICES_FOUND);
  } finally {
    camera.dispose();
    warning.mockRestore();
    restore();
    vi.useRealTimers();
  }
});

it("cancels the Raw Camera Access timeout after the first native frame", async () => {
  vi.useFakeTimers();
  const restore = missingMediaDevices();
  const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
  const renderer = makeRawRenderer({
    binding: { getCameraImage: vi.fn(() => ({}) as WebGLTexture) },
    enabledFeatures: ["camera-access"],
    referenceSpace: {} as XRReferenceSpace,
  });
  const camera = makeCamera();
  camera.setRenderer(renderer.renderer);

  try {
    await camera.init();
    camera.updateXRCamera({
      getViewerPose: () => ({
        views: [{ camera: { height: 120, width: 160 } }],
      }),
    } as unknown as XRFrame);
    await vi.advanceTimersByTimeAsync(5_000);

    expect(camera.isUsingXRCameraAccess).toBe(true);
    expect(camera.state).toBe(StreamState.STREAMING);
  } finally {
    camera.dispose();
    warning.mockRestore();
    restore();
    vi.useRealTimers();
  }
});

it("disposes the owned native texture and ignores stale XR frames", async () => {
  const restore = missingMediaDevices();
  const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
  const getCameraImage = vi.fn(() => ({}) as WebGLTexture);
  const renderer = makeRawRenderer({
    binding: { getCameraImage },
    enabledFeatures: ["camera-access"],
    referenceSpace: {} as XRReferenceSpace,
  });
  const camera = makeCamera();
  camera.setRenderer(renderer.renderer);
  const frame = {
    getViewerPose: () => ({ views: [{ camera: { height: 240, width: 320 } }] }),
  } as unknown as XRFrame;

  try {
    await camera.init();
    camera.updateXRCamera(frame);
    const texture = camera.texture;
    const dispose = vi.fn();
    texture.addEventListener("dispose", dispose);

    camera.dispose();
    camera.updateXRCamera(frame);

    expect(dispose).toHaveBeenCalled();
    expect(camera.isUsingXRCameraAccess).toBe(false);
    expect(getCameraImage).toHaveBeenCalledTimes(1);
  } finally {
    warning.mockRestore();
    restore();
  }
});
