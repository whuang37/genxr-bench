import * as THREE from "three";
import * as xb from "xrblocks";

class ContextEvaluationApp extends xb.Script {
  init() {
    this.add(new THREE.HemisphereLight(0xffffff, 0x666666, 3));

    const torus = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.07, 12, 24),
      new THREE.MeshStandardMaterial({ color: 0x3b82f6 }),
    );
    torus.name = "Session torus";
    torus.position.set(-0.9, 1.6, -3);
    torus.userData.xrblocksDevtools = { tag: "session-torus" };

    const text = new xb.UIText({ text: "Session status" });
    const panel = new xb.UIPanel({ children: [text] });
    const button = new xb.UIButton({ label: "Session button" });
    const imageTexture = new THREE.DataTexture(
      new Uint8Array([59, 130, 246, 255]),
      1,
      1,
    );
    imageTexture.needsUpdate = true;
    const image = new xb.UIImage({
      src: imageTexture,
      ariaLabel: "Session image",
    });
    const card = new xb.UICard({
      size: { width: 0.9, height: 0.45 },
      children: [button, image, panel],
    });
    card.name = "Session card";
    card.position.set(0, 1.6, -4);
    button.position.set(-0.2, 0.1, 0);
    image.position.set(0.2, 0.1, 0);
    panel.position.set(-0.2, -0.1, 0);
    text.position.x = 0.12;
    card.userData.xrblocksDevtools = { tag: "session-card" };
    button.userData.xrblocksDevtools = { tag: "session-button" };
    image.userData.xrblocksDevtools = { tag: "session-image" };

    this.add(torus, card);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const options = new xb.Options();
  options.enableContext();
  xb.add(new ContextEvaluationApp());
  xb.init(options);
});
