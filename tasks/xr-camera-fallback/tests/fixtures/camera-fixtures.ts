import { vi } from "@xrblocks/devtools/test";
import type * as THREE from "three";

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
  stop: ReturnType<typeof vi.fn>;
  stream: MediaStream;
} {
  const stop = vi.fn();
  const track = {
    getSettings: () => ({ deviceId, facingMode }),
    kind: "video",
    stop,
  } as unknown as MediaStreamTrack;
  return {
    stop,
    stream: {
      getTracks: () => [track],
      getVideoTracks: () => [track],
    } as unknown as MediaStream,
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

export function makeRawRenderer({
  binding,
  enabledFeatures,
  referenceSpace,
}: {
  binding?: {
    getCameraImage: (camera: XRWebGLSubImage) => WebGLTexture | null;
  };
  enabledFeatures?: string[];
  referenceSpace?: XRReferenceSpace | null;
} = {}) {
  let currentBinding = binding;
  let currentReferenceSpace = referenceSpace;
  const textureProperties: Record<string, unknown> = {};
  const renderer = {
    properties: { get: () => textureProperties },
    xr: {
      getBinding: vi.fn(() => currentBinding),
      getReferenceSpace: vi.fn(() => currentReferenceSpace),
      getSession: vi.fn(
        () =>
          ({
            enabledFeatures,
            mode: "immersive-ar",
          }) as unknown as XRSession,
      ),
    },
  } as unknown as THREE.WebGLRenderer;

  return {
    renderer,
    setBinding(binding: typeof currentBinding) {
      currentBinding = binding;
    },
    setReferenceSpace(referenceSpace: typeof currentReferenceSpace) {
      currentReferenceSpace = referenceSpace;
    },
  };
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
