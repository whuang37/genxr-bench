import * as THREE from "three";
import * as xb from "xrblocks";

class SliderEvaluationApp extends xb.Script {
  init() {
    const state = { value: 0, inputs: [], changes: [] };
    const slider = new xb.UISlider({
      ariaLabel: "Volume",
      min: 0,
      max: 100,
      step: 25,
      value: 0,
      style: { width: "100%", height: 72 },
      onInput: (value) => {
        state.value = value;
        state.inputs.push(value);
      },
      onChange: (value) => {
        state.value = value;
        state.changes.push(value);
      },
    });

    const buttonState = { clicks: 0 };
    const button = new xb.UIButton({
      label: "Keep button",
      onClick: () => {
        buttonState.clicks += 1;
      },
    });
    button.userData.xrblocksDevtools = {
      tag: "unrelated-button",
      state: buttonState,
    };

    const children = [];
    try {
      void slider.value;
      slider.userData.xrblocksDevtools = {
        tag: "volume-slider",
        state,
      };
      children.unshift(slider);
    } catch {
      state.unavailable = true;
    }

    const card = new xb.UICard({
      size: { width: 640, height: 180 },
      pixelSize: 0.001,
      children,
      style: { padding: 32 },
    });
    card.position.set(0, 1.45, -1.2);
    card.userData.xrblocksDevtools = { tag: "slider-card" };

    const buttonCard = new xb.UICard({
      size: { width: 220, height: 100 },
      pixelSize: 0.001,
      children: [button],
      style: { padding: 16 },
    });
    buttonCard.position.set(0.52, 1.15, -1.2);
    this.add(
      new THREE.HemisphereLight(0xffffff, 0x666666, 3),
      card,
      buttonCard,
    );
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const options = new xb.Options();
  options.enableContext();
  options.simulator.defaultMode = xb.SimulatorMode.POSE;
  options.setAppTitle("UI slider verifier");
  xb.add(new SliderEvaluationApp());
  xb.init(options);
});
