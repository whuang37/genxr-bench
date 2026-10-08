import * as THREE from "three";
import * as xb from "xrblocks";

class SessionStrokeRecognizer extends xb.StrokeRecognizer {
  constructor(state) {
    super();
    this.state = state;
    this.name = "Session stroke recognizer";
    this.userData.xrblocksDevtools = { tag: "stroke-recognizer", state };
  }

  init(dependencies) {
    try {
      super.init(dependencies);
      this.addEventListener("unistrokestart", () => {
        this.state.starts += 1;
      });
      this.addEventListener("unistrokeupdate", () => {
        this.state.updates += 1;
      });
      this.addEventListener("unistrokeend", (event) => {
        this.state.ends += 1;
        this.state.result = event.detail.result;
      });
      this.activate();
      this.state.ready = true;
    } catch {
      this.state.ready = false;
    }
  }

  update() {
    if (this.state.ready) super.update();
  }
}

class EvaluationApp extends xb.Script {
  init() {
    const state = { ready: false, starts: 0, updates: 0, ends: 0 };
    this.add(
      new THREE.HemisphereLight(0xffffff, 0x666666, 3),
      new SessionStrokeRecognizer(state),
    );
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const options = new xb.Options();
  options.enableStrokes();
  options.strokes.startDelay = 0;
  options.strokes.endDelay = 0;
  options.strokes.maxPoints = 1000;
  xb.add(new EvaluationApp());
  xb.init(options);
});
