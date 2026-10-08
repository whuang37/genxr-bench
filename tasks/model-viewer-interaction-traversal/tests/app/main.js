import * as THREE from "three";
import * as xb from "xrblocks";

class SessionModelViewer extends xb.ModelViewer {
  constructor(state) {
    super({
      origin: "center",
      manipulation: true,
      castShadow: true,
      receiveShadow: true,
    });
    this.state = state;
    this.name = "Session model viewer";
    this.userData.xrblocksDevtools = { tag: "session-model-viewer", state };
  }

  onHoverEnter(event) {
    if (event.target === this) this.state.hoverPublic += 1;
    super.onHoverEnter(event);
  }

  onObjectSelectStart(event) {
    if (event.target === this) this.state.selectPublic += 1;
  }

  onObjectManipulate(event) {
    if (event.target === this) {
      this.state.manipulationPublic += 1;
      if (event.action === "rotate")
        this.state.manipulationTransform = event.quaternion.toArray();
    }
  }
}

class EvaluationApp extends xb.Script {
  init() {
    const state = {
      hoverPublic: 0,
      selectPublic: 0,
      manipulationPublic: 0,
      manipulationTransform: [],
    };
    const viewer = new SessionModelViewer(state);
    viewer.position.set(0, 1.25, -1);
    const first = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.3, 0.2),
      new THREE.MeshStandardMaterial({ color: 0xf97316 }),
    );
    const second = new THREE.Mesh(
      new THREE.BoxGeometry(0.44, 0.36, 0.24),
      new THREE.MeshStandardMaterial({ color: 0x4f8cff }),
    );
    viewer.setContent(first);
    viewer.setContent(second);
    this.add(new THREE.HemisphereLight(0xffffff, 0x666666, 3), viewer);
  }
}

const options = new xb.Options();
options.simulator.defaultMode = xb.SimulatorMode.POSE;
xb.add(new EvaluationApp());
await xb.init(options);
