import { vi } from "@xrblocks/devtools/test";

import { DeviceCameraOptions } from "@xrblocks/source/camera/CameraOptions.ts";
import { XRDeviceCamera } from "@xrblocks/source/camera/XRDeviceCamera.ts";

export type CameraStream = {
  deviceId: string;
  facingMode?: VideoFacingModeEnum;
};

export function makeStream({
  deviceId,
  facingMode = "environment",
}: CameraStream) {
  const track = {
    kind: "video",
    getSettings: () => ({ deviceId, facingMode }),
    stop: vi.fn(),
  } as unknown as MediaStreamTrack;
  return {
    stream: {
      getVideoTracks: () => [track],
      getTracks: () => [track],
    } as unknown as MediaStream,
    track,
  };
}

type FixtureOptions = {
  devices?: readonly CameraStream[];
  dimensions?: readonly [number, number];
  getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  playback?: readonly (() => Promise<void>)[];
};

/** Installs only the browser media seams used by XRDeviceCamera. */
export function createCameraFixture({
  devices = [{ deviceId: "camera-1", facingMode: "environment" }],
  dimensions = [1280, 720],
  getUserMedia,
  playback = [() => Promise.resolve()],
}: FixtureOptions = {}) {
  const createdStreams = devices.map(makeStream);
  const mediaDevices = {
    enumerateDevices: vi.fn().mockResolvedValue(
      devices.map(({ deviceId }) => ({
        kind: "videoinput",
        deviceId,
        label: deviceId,
        groupId: "physical",
      })),
    ),
    getUserMedia: vi.fn(
      getUserMedia ?? (() => Promise.resolve(createdStreams.shift()!.stream)),
    ),
  };
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: mediaDevices,
  });

  let srcObject: MediaStream | null = null;
  let playCount = 0;
  const video = {
    HAVE_CURRENT_DATA: 2,
    autoplay: true,
    muted: true,
    playsInline: true,
    readyState: 4,
    src: "",
    videoWidth: dimensions[0],
    videoHeight: dimensions[1],
    onerror: null,
    onloadedmetadata: null,
    play: vi.fn(() => playback[Math.min(playCount++, playback.length - 1)]!()),
  } as unknown as HTMLVideoElement;
  Object.defineProperty(video, "srcObject", {
    configurable: true,
    get: () => srcObject,
    set: (value: MediaStream | null) => {
      srcObject = value;
      if (value) {
        queueMicrotask(() =>
          video.onloadedmetadata?.call(video, new Event("loadedmetadata")),
        );
      }
    },
  });
  vi.stubGlobal("document", { createElement: vi.fn(() => video) });
  const camera = new XRDeviceCamera(
    new DeviceCameraOptions({
      enabled: true,
      videoConstraints: { facingMode: "environment" },
    }),
  );
  return { camera, createdStreams, mediaDevices, video };
}
