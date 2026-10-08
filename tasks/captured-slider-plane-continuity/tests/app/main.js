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
    slider.userData.xrblocksDevtools = { tag: "volume-slider", state };

    const card = new xb.UICard({
      size: { width: 640, height: 180 },
      pixelSize: 0.001,
      children: [slider],
      style: { padding: 32 },
    });
    card.position.set(0, 1.45, -1.2);
    this.add(card);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const options = new xb.Options();
  options.enableContext();
  options.simulator.defaultMode = xb.SimulatorMode.POSE;
  xb.add(new SliderEvaluationApp());
  await xb.init(options);
});
