import { vi } from "@xrblocks/devtools/test";

export type CameraDevice = {
  deviceId: string;
  facingMode?: VideoFacingModeEnum;
  groupId?: string;
  label?: string;
};

function makeVideoElement(): HTMLVideoElement {
  return {
    HAVE_CURRENT_DATA: 2,
    autoplay: false,
    muted: false,
    onerror: null,
    onloadedmetadata: null,
    play: () => Promise.resolve(),
    playsInline: false,
    readyState: 4,
    srcObject: null,
    videoHeight: 0,
    videoWidth: 0,
  } as unknown as HTMLVideoElement;
}

/** Installs the minimal DOM boundary used by VideoStream's video element. */
export function installVideoDocument() {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      createElement: (tagName: string) => {
        if (tagName !== "video") {
          throw new Error(`Unexpected element requested: ${tagName}`);
        }
        return makeVideoElement();
      },
    },
  });
  return () => {
    if (descriptor) {
      Object.defineProperty(globalThis, "document", descriptor);
    } else {
      Reflect.deleteProperty(globalThis, "document");
    }
  };
}

export function makeDevice({
  deviceId,
  groupId = "physical",
  label = deviceId,
}: CameraDevice): MediaDeviceInfo {
  return {
    deviceId,
    groupId,
    kind: "videoinput",
    label,
    toJSON: () => ({}),
  } as MediaDeviceInfo;
}

export function makeStream({ deviceId, facingMode }: CameraDevice): {
  stream: MediaStream;
  stop: ReturnType<typeof vi.fn>;
} {
  const stop = vi.fn();
  const track = {
    getSettings: () => ({ deviceId, facingMode }),
    kind: "video",
    stop,
  } as unknown as MediaStreamTrack;
  return {
    stream: {
      getTracks: () => [track],
      getVideoTracks: () => [track],
    } as unknown as MediaStream,
    stop,
  };
}

export function installMediaDevices({
  enumerateDevices,
  getUserMedia,
}: {
  enumerateDevices: () => Promise<MediaDeviceInfo[]>;
  getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
}) {
  const descriptor = Object.getOwnPropertyDescriptor(navigator, "mediaDevices");
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { enumerateDevices, getUserMedia },
  });
  return () => {
    if (descriptor) {
      Object.defineProperty(navigator, "mediaDevices", descriptor);
    } else {
      Reflect.deleteProperty(navigator, "mediaDevices");
    }
  };
}

export function prepareMetadataVideo(
  video: HTMLVideoElement,
  {
    height = 720,
    playError,
    width = 1280,
  }: { height?: number; playError?: Error; width?: number } = {},
) {
  Object.defineProperty(video, "videoWidth", {
    configurable: true,
    value: width,
  });
  Object.defineProperty(video, "videoHeight", {
    configurable: true,
    value: height,
  });
  video.play = vi.fn(() => {
    queueMicrotask(() => video.onloadedmetadata?.(new Event("loadedmetadata")));
    return playError ? Promise.reject(playError) : Promise.resolve();
  });
}

export async function loadCameraModules() {
  const [camera, options, video] = await Promise.all([
    import("@xrblocks/source/camera/XRDeviceCamera.ts"),
    import("@xrblocks/source/camera/CameraOptions.ts"),
    import("@xrblocks/source/video/VideoStream.ts"),
  ]);
  return {
    DeviceCameraOptions: options.DeviceCameraOptions,
    StreamState: video.StreamState,
    XRDeviceCamera: camera.XRDeviceCamera,
  };
}
