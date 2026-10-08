import * as THREE from "three";
import * as xb from "xrblocks";

class SemanticTreeEvaluationApp extends xb.Script {
  init() {
    this.add(new THREE.HemisphereLight(0xffffff, 0x666666, 3));

    const exhibit = new THREE.Group();
    const torus = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.07, 12, 24),
      new THREE.MeshStandardMaterial({ color: 0x3b82f6 }),
    );
    exhibit.userData.semantic = { role: "group", name: "Session exhibit" };
    exhibit.position.set(-0.8, 1.5, -3);
    torus.userData.semantic = { role: "object", name: "Session torus" };
    torus.userData.xrblocksDevtools = { tag: "session-torus" };
    exhibit.add(torus);

    const text = new xb.UIText({ text: "Session status" });
    const slider = new xb.UISlider({
      ariaLabel: "Session volume",
      value: 0.75,
    });
    const panel = new xb.UIPanel({ children: [text, slider] });
    const button = new xb.UIButton({ label: "Session button" });
    const texture = new THREE.DataTexture(
      new Uint8Array([59, 130, 246, 255]),
      1,
      1,
    );
    texture.needsUpdate = true;
    const image = new xb.UIImage({
      src: texture,
      ariaLabel: "Session image",
    });
    const card = new xb.UICard({
      size: { width: 0.9, height: 0.45 },
      children: [button, image, panel],
    });
    card.name = "Session card";
    card.position.set(0, 1.5, -4);
    button.position.set(-0.2, 0.1, 0);
    image.position.set(0.2, 0.1, 0);
    panel.position.set(-0.2, -0.1, 0);
    text.position.x = 0.12;
    button.userData.xrblocksDevtools = { tag: "session-button" };
    image.userData.xrblocksDevtools = { tag: "session-image" };
    slider.userData.xrblocksDevtools = { tag: "session-slider" };

    const hiddenCylinder = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.15, 0.4, 12),
    );
    hiddenCylinder.name = "Session hidden cylinder";
    hiddenCylinder.position.set(0, 0.5, -2);
    hiddenCylinder.visible = false;
    hiddenCylinder.userData.xrblocksDevtools = { tag: "session-hidden" };

    this.add(exhibit, card, hiddenCylinder);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const options = new xb.Options();
  options.enableSceneContext();
  xb.add(new SemanticTreeEvaluationApp());
  xb.init(options);
});
