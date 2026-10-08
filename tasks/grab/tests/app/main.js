import * as THREE from "three";
import * as xb from "xrblocks";

class GrabTarget extends xb.MeshScript {
  constructor() {
    super(
      new THREE.BoxGeometry(0.36, 0.36, 0.16),
      new THREE.MeshStandardMaterial({ color: 0xf28c4b }),
    );
    this.name = "Grab target";
    this.position.set(0, 1.45, -0.7);
    this.xb = { manipulation: true };
    this.state = {
      touchStarts: 0,
      touchEnds: 0,
      grabStarts: 0,
      grabbing: 0,
      grabEnds: 0,
      manipulationStarts: 0,
      manipulationUpdates: 0,
      manipulationEnds: 0,
      lastSource: null,
      position: [0, 1.45, -0.7],
    };
    this.userData.xrblocksDevtools = {
      tag: "grab-target",
      state: this.state,
    };
  }

  onObjectTouchStart() {
    this.state.touchStarts += 1;
  }

  onObjectTouchEnd() {
    this.state.touchEnds += 1;
  }

  onObjectGrabStart(event) {
    this.state.grabStarts += 1;
    this.state.lastSource = event.source.type;
  }

  onObjectGrabbing() {
    this.state.grabbing += 1;
  }

  onObjectGrabEnd() {
    this.state.grabEnds += 1;
  }

  onObjectManipulate(event) {
    if (event.phase === "start") this.state.manipulationStarts += 1;
    if (event.phase === "update") this.state.manipulationUpdates += 1;
    if (event.phase === "end") this.state.manipulationEnds += 1;
    this.state.position = this.position.toArray();
  }
}

const options = new xb.Options();
options.enableHands();
options.simulator.defaultMode = xb.SimulatorMode.POSE;
options.setAppTitle("Grab verifier");

xb.add(new THREE.HemisphereLight(0xffffff, 0x666666, 3));
xb.add(new GrabTarget());
await xb.init(options);
