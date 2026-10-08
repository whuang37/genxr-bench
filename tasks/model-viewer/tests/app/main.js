import * as THREE from "three";
import * as xb from "xrblocks";

const CDN_MODELS = [
  {
    format: "glb",
    source: {
      url: "chess/chess_compressed.glb",
      path: "https://cdn.jsdelivr.net/gh/xrblocks/proprietary-assets@main/",
      scale: 0.009,
    },
    resolvedUrl:
      "https://cdn.jsdelivr.net/gh/xrblocks/proprietary-assets@main/chess/chess_compressed.glb",
  },
  {
    format: "gltf",
    source: {
      url: "models/Cat/cat.gltf",
      path: "https://cdn.jsdelivr.net/gh/xrblocks/assets@main/",
    },
    resolvedUrl:
      "https://cdn.jsdelivr.net/gh/xrblocks/assets@main/models/Cat/cat.gltf",
  },
];

class SessionModelViewer extends xb.ModelViewer {
  constructor(state) {
    super({ origin: "bottom-center", manipulation: true });
    this.state = state;
    this.name = "Session model viewer";
    this.userData.xrblocksDevtools = {
      tag: "session-model-viewer",
      state,
    };
  }

  onObjectManipulate(event) {
    if (event.phase === "start") this.state.manipulationStarts += 1;
    if (event.phase === "end") this.state.manipulationEnds += 1;
  }

  onHoverEnter(event) {
    this.state.hoverEnters += 1;
    super.onHoverEnter?.(event);
  }
}

class OrdinaryRayTarget extends xb.MeshScript {
  constructor() {
    super(
      new THREE.BoxGeometry(0.18, 0.18, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x72d572 }),
    );
    this.name = "Ordinary ray target";
    this.position.set(0.58, 1.25, -1);
    this.state = { starts: 0, ends: 0 };
    this.userData.xrblocksDevtools = {
      tag: "ordinary-ray-target",
      state: this.state,
    };
  }

  onObjectSelectStart() {
    this.state.starts += 1;
  }

  onObjectSelectEnd() {
    this.state.ends += 1;
  }
}

class CdnLoadTarget extends xb.MeshScript {
  constructor(startLoad) {
    super(
      new THREE.BoxGeometry(0.08, 0.08, 0.08),
      new THREE.MeshBasicMaterial({ color: 0x222222 }),
    );
    this.name = "CDN load target";
    this.position.set(-4, 1, -1);
    this.startLoad = startLoad;
    this.userData.xrblocksDevtools = { tag: "cdn-load-target" };
  }

  onObjectSelectStart() {
    void this.startLoad();
  }
}

class EvaluationApp extends xb.Script {
  static dependencies = { renderer: THREE.WebGLRenderer };

  init({ renderer }) {
    renderer.shadowMap.enabled = true;
    const directional = new THREE.DirectionalLight(0xffffff, 5);
    directional.position.set(2.5, 0.55, -2.1);
    directional.castShadow = true;
    directional.shadow.mapSize.set(1024, 1024);
    directional.shadow.camera.left = -1.5;
    directional.shadow.camera.right = 1.5;
    directional.shadow.camera.top = 1.5;
    directional.shadow.camera.bottom = -1.5;
    const state = {
      contentAttached: false,
      cdnComplete: false,
      cdnStarted: false,
      cdnModels: [],
      localLoaded: false,
      localBounds: [],
      manipulationStarts: 0,
      manipulationEnds: 0,
      hoverEnters: 0,
      undersideReady: false,
    };
    const viewer = new SessionModelViewer(state);
    viewer.position.set(0, 1.25, -1);
    const content = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.4, 0.24),
      new THREE.MeshStandardMaterial({ color: 0x4f8cff }),
    );
    content.name = "Session caller-owned content";
    content.userData.xrblocksDevtools = { tag: "set-content-mesh" };
    try {
      viewer.setContent(content);
      state.contentAttached = true;
    } catch {
      state.contentAttached = false;
    }

    const localViewer = new xb.ModelViewer({
      origin: "center",
      manipulation: false,
      occlusion: true,
    });
    localViewer.name = "Local glTF viewer";
    localViewer.position.set(-0.55, 1.45, -1);
    localViewer.userData.xrblocksDevtools = {
      tag: "local-model-viewer",
      state,
    };
    this.add(
      new THREE.HemisphereLight(0xffffff, 0x666666, 3),
      directional,
      viewer,
      localViewer,
      new OrdinaryRayTarget(),
      new CdnLoadTarget(() => this.loadCdnModels(state)),
    );
    this.loadLocalModel(localViewer, state);
    this.createUndersideFixture(state, directional);
  }

  async loadLocalModel(viewer, state) {
    try {
      await viewer.load("./local-triangle.gltf");
      state.localLoaded = true;
      state.localBounds = viewer.boundingBox
        .getSize(new THREE.Vector3())
        .toArray();
    } catch {
      state.localLoaded = false;
    }
  }

  async loadCdnModels(state) {
    if (state.cdnStarted) return;
    state.cdnStarted = true;
    state.cdnModels = await Promise.all(
      CDN_MODELS.map(async ({ format, source, resolvedUrl }, index) => {
        const viewer = new xb.ModelViewer({ manipulation: false });
        viewer.name = `CDN ${format} model`;
        viewer.position.set((index - 1) * 0.7, 0.8, -2.1);
        viewer.userData.xrblocksDevtools = {
          tag: `cdn-model-${format}`,
        };
        this.add(viewer);
        try {
          await viewer.load(source);
          const size = viewer.boundingBox.getSize(new THREE.Vector3());
          const maxDimension = Math.max(size.x, size.y, size.z);
          if (Number.isFinite(maxDimension) && maxDimension > 0) {
            viewer.scale.setScalar(0.48 / maxDimension);
          }
          return {
            bounds: size.toArray(),
            error: null,
            format,
            loaded: !viewer.boundingBox.isEmpty(),
            resolvedUrl,
          };
        } catch (error) {
          return {
            bounds: [],
            error: error instanceof Error ? error.message : String(error),
            format,
            loaded: false,
            resolvedUrl,
          };
        }
      }),
    );
    state.cdnComplete = true;
  }

  createUndersideFixture(state, directional) {
    const viewer = new xb.ModelViewer({ manipulation: true });
    viewer.name = "Underside model viewer";
    viewer.position.set(2.5, 1.9, -1.9);
    viewer.userData.xrblocksDevtools = {
      tag: "underside-model-viewer",
      state,
    };
    const content = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.34, 0.3),
      new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.7 }),
    );
    body.position.y = 0.17;
    content.add(body);
    try {
      viewer.setContent(content);
    } catch {
      state.undersideReady = false;
    }

    const receiver = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 1.25),
      new THREE.MeshStandardMaterial({
        color: 0xe5e7eb,
        roughness: 1,
        side: THREE.DoubleSide,
      }),
    );
    receiver.name = "Underside shadow receiver";
    receiver.position.set(2.5, 2.55, -1.9);
    receiver.rotation.x = Math.PI / 2;
    receiver.receiveShadow = true;
    receiver.userData.xrblocksDevtools = { tag: "underside-shadow-receiver" };
    directional.target.position.copy(receiver.position);
    directional.target.name = "Underside light target";
    this.add(viewer, receiver, directional.target);
    state.undersideReady =
      !viewer.boundingBox.isEmpty() && receiver.receiveShadow;
  }
}

const options = new xb.Options();
options.simulator.defaultMode = xb.SimulatorMode.POSE;
options.setAppTitle("Model viewer verifier");
xb.add(new EvaluationApp());
await xb.init(options);
