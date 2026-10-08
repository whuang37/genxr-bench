import * as THREE from "three";
import * as xb from "xrblocks";

const gestureState = {
  builtInRequested: false,
  pinchConfidence: 0,
  pinchHand: null,
  pinchStarts: 0,
  pinchUpdates: 0,
  suppliedStarts: 0,
  suppliedUpdates: 0,
};

class GatedGestureRecognizer {
  constructor(state) {
    this.state = state;
    this.builtIn = new xb.HeuristicGestureRecognizer();
  }

  getGestureConfigurations() {
    return {
      ...this.builtIn.getGestureConfigurations(),
      "supplied-lifecycle": { enabled: true },
    };
  }

  recognize(context) {
    if (this.state.builtInRequested) {
      return this.builtIn.recognize(context);
    }
    return {
      "supplied-lifecycle": {
        confidence: 0.9,
        data: { hand: context.handLabel, producer: "application" },
      },
    };
  }
}

class GestureEvaluationApp extends xb.Script {
  init() {
    this.add(new THREE.HemisphereLight(0xffffff, 0x666666, 3));

    this.userData.xrblocksDevtools = {
      tag: "gesture-recognizer-state",
      state: gestureState,
    };

    const enableBuiltIn = new xb.UIButton({
      label: "Enable built-in gestures",
      onClick: () => {
        gestureState.builtInRequested = true;
      },
    });
    enableBuiltIn.userData.xrblocksDevtools = {
      tag: "enable-built-in-gestures",
    };
    const card = new xb.UICard({
      size: { width: 480, height: 120 },
      pixelSize: 0.001,
      children: [enableBuiltIn],
      style: { padding: 24 },
    });
    card.position.set(0, 1.35, -1.1);
    this.add(card);

    const recognition = xb.core.gestureRecognition;
    recognition?.addEventListener("gesturestart", (event) => {
      const { detail } = event;
      if (detail.name === "pinch") {
        gestureState.pinchStarts += 1;
        gestureState.pinchHand = detail.hand;
        gestureState.pinchConfidence = detail.confidence;
      }
      if (detail.name === "supplied-lifecycle") {
        gestureState.suppliedStarts += 1;
      }
    });
    recognition?.addEventListener("gestureupdate", (event) => {
      const { detail } = event;
      if (detail.name === "pinch") {
        gestureState.pinchUpdates += 1;
        gestureState.pinchHand = detail.hand;
        gestureState.pinchConfidence = detail.confidence;
      }
      if (detail.name === "supplied-lifecycle") {
        gestureState.suppliedUpdates += 1;
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const options = new xb.Options();
  options.enableGestures();
  options.gestures.minimumConfidence = 0.6;
  options.gestures.updateIntervalMs = 0;
  options.gestures.setGestureRecognizer(
    new GatedGestureRecognizer(gestureState),
  );
  options.simulator.defaultMode = xb.SimulatorMode.POSE;
  options.setAppTitle("Gesture recognizer verifier");
  xb.add(new GestureEvaluationApp());
  xb.init(options);
});
