import * as THREE from "three";
import * as xb from "xrblocks";

class DirectTouchTarget extends xb.MeshScript {
  constructor() {
    super(
      new THREE.BoxGeometry(0.24, 0.24, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x4f8cff }),
    );
    this.name = "Direct touch target";
    this.position.set(0, 1.45, -0.7);
    this.contact = {
      touchStarts: 0,
      touching: 0,
      touchEnds: 0,
      selectStarts: 0,
      selecting: 0,
      selectEnds: 0,
      lastSource: null,
      lastEndReason: null,
    };
    this.userData.xrblocksDevtools = {
      tag: "direct-touch-target",
      state: this.contact,
    };
  }

  onObjectTouchStart(event) {
    this.contact.touchStarts += 1;
    this.contact.lastSource = event.source.type;
  }

  onObjectTouching() {
    this.contact.touching += 1;
  }

  onObjectTouchEnd() {
    this.contact.touchEnds += 1;
  }

  onObjectSelectStart() {
    this.contact.selectStarts += 1;
  }

  onSelecting(event) {
    if (event.source.type === "direct-touch") this.contact.selecting += 1;
  }

  onObjectSelectEnd(event) {
    this.contact.selectEnds += 1;
    this.contact.lastEndReason = event.reason;
  }
}

class RayTarget extends xb.MeshScript {
  constructor() {
    super(
      new THREE.BoxGeometry(0.2, 0.2, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x72d572 }),
    );
    this.name = "Ray-only target";
    this.position.set(0.36, 1.2, -0.8);
    this.selection = {
      selectStarts: 0,
      selectEnds: 0,
      lastSource: null,
      completed: null,
    };
    this.userData.xrblocksDevtools = {
      tag: "ray-only-target",
      state: this.selection,
    };
  }

  onObjectSelectStart(event) {
    this.selection.selectStarts += 1;
    this.selection.lastSource = event.source.type;
  }

  onObjectSelectEnd(event) {
    this.selection.selectEnds += 1;
    this.selection.completed = event.completed;
  }
}

const options = new xb.Options();
options.enableHands();
options.simulator.defaultMode = xb.SimulatorMode.POSE;
options.setAppTitle("Direct touch verifier");

xb.add(new THREE.HemisphereLight(0xffffff, 0x666666, 3));
xb.add(new DirectTouchTarget());
xb.add(new RayTarget());
await xb.init(options);
