import * as THREE from "three";
import * as xb from "xrblocks";

const cameraState = {
  appReady: false,
  autoplayAttempts: 0,
  cameraAvailable: false,
  height: 0,
  loaded: false,
  state: "unavailable",
  streamAttached: false,
  unhandledRejections: 0,
  width: 0,
};

const track = {
  kind: "video",
  getSettings: () => ({
    deviceId: "browser-rear",
    facingMode: "environment",
  }),
  stop: () => {},
};
const stream = {
  getTracks: () => [track],
  getVideoTracks: () => [track],
};

Object.defineProperty(navigator, "mediaDevices", {
  configurable: true,
  value: {
    enumerateDevices: async () => [
      {
        deviceId: "browser-rear",
        groupId: "browser",
        kind: "videoinput",
        label: "Deterministic rear camera",
      },
    ],
    getUserMedia: async () => stream,
  },
});

const createElement = document.createElement.bind(document);
document.createElement = (tagName, options) => {
  const element = createElement(tagName, options);
  if (tagName.toLowerCase() !== "video") return element;

  let srcObject = null;
  Object.defineProperties(element, {
    readyState: { configurable: true, get: () => 4 },
    srcObject: {
      configurable: true,
      get: () => srcObject,
      set: (value) => {
        srcObject = value;
        if (value) {
          queueMicrotask(() =>
            element.dispatchEvent(new Event("loadedmetadata")),
          );
        }
      },
    },
    videoHeight: { configurable: true, get: () => 480 },
    videoWidth: { configurable: true, get: () => 640 },
  });
  return element;
};

HTMLMediaElement.prototype.play = function () {
  cameraState.autoplayAttempts += 1;
  return Promise.reject(
    new DOMException("Autoplay requires user activation", "NotAllowedError"),
  );
};

window.addEventListener("unhandledrejection", () => {
  cameraState.unhandledRejections += 1;
});

class EvaluationApp extends xb.Script {
  init() {
    this.add(new THREE.HemisphereLight(0xffffff, 0x666666, 3));
    const probe = new THREE.Object3D();
    probe.userData.xrblocksDevtools = {
      tag: "blocked-camera-playback",
      state: cameraState,
    };
    this.add(probe);
  }

  update() {
    const camera = xb.core.deviceCamera;
    Object.assign(cameraState, {
      cameraAvailable: Boolean(camera),
      height: camera?.height ?? 0,
      loaded: camera?.loaded === true,
      state: camera?.state ?? "unavailable",
      streamAttached: camera?.video.srcObject === stream,
      width: camera?.width ?? 0,
    });
  }
}

xb.add(new EvaluationApp());
const options = new xb.Options();
options.enableCamera();
options.simulator.deviceCamera.enabled = false;
await xb.init(options);
cameraState.appReady = true;
