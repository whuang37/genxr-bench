import * as THREE from "three";
import * as xb from "xrblocks";

const gestureState = { events: [] };

class BuiltInRecognizerAdapter {
  constructor() {
    this.builtIn = new xb.HeuristicHeadGestureRecognizer();
  }

  getGestureConfigurations() {
    return this.builtIn.getGestureConfigurations();
  }

  recognize(context) {
    try {
      return this.builtIn.recognize(context);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Head gestures are not implemented."
      ) {
        return {};
      }
      throw error;
    }
  }
}

class EvaluationApp extends xb.Script {
  init() {
    this.add(new THREE.HemisphereLight(0xffffff, 0x666666, 3));
    this.userData.xrblocksDevtools = {
      tag: "head-gesture-state",
      state: gestureState,
    };
    xb.input.headGestures?.addEventListener("gesture", (event) => {
      gestureState.events.push({
        confidence: event.detail.confidence,
        name: event.detail.name,
      });
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  xb.add(new EvaluationApp());
  const options = new xb.Options();
  options.enableHeadGestures();
  options.headGestures.updateIntervalMs = 200;
  options.headGestures.warmupDurationMs = 200;
  options.headGestures.maximumSampleGapMs = 1_000;
  options.headGestures.maximumSampleAngleRadians = Math.PI;
  options.headGestures.setGestureRecognizer(new BuiltInRecognizerAdapter());
  xb.init(options);
});
