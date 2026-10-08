import * as THREE from "three";
import * as xb from "xrblocks";

class ReticleSurface extends xb.MeshScript {
  constructor() {
    super(
      new THREE.PlaneGeometry(0.7, 0.45),
      new THREE.MeshStandardMaterial({
        color: 0x4f8cff,
        side: THREE.DoubleSide,
      }),
    );
    this.name = "Transformed reticle surface";
    this.userData.xrblocksDevtools = { tag: "reticle-surface" };
  }
  onObjectSelectStart() {}
}
class ReticleObserver extends xb.Script {
  init() {
    this.surface = this.parent.getObjectByName("Transformed reticle surface");
    this.state = {
      visible: false,
      hasIntersection: false,
      target: null,
      pressedScale: 1,
      surfaceAlignment: -1,
    };
    this.userData.xrblocksDevtools = {
      tag: "reticle-observer",
      state: this.state,
    };
  }
  update() {
    const controllers = xb.Core.instance.input.controllers;
    const reticles = controllers
      .map((controller) => controller.reticle)
      .filter(Boolean);
    const reticle =
      controllers.find(
        (controller) =>
          controller.userData.selected &&
          controller.reticle?.targetObject === this.surface,
      )?.reticle ??
      reticles.find((item) => item.targetObject === this.surface) ??
      reticles.find((item) => item.visible) ??
      reticles[0];
    if (!reticle) return;
    const center = this.surface.localToWorld(new THREE.Vector3());
    const u = this.surface
      .localToWorld(new THREE.Vector3(0.2, 0, 0))
      .sub(center)
      .normalize();
    const v = this.surface
      .localToWorld(new THREE.Vector3(0, 0.2, 0))
      .sub(center)
      .normalize();
    const normal = new THREE.Vector3(0, 0, 1)
      .applyQuaternion(reticle.quaternion)
      .normalize();
    this.state.visible = reticle.visible;
    this.state.hasIntersection = reticle.intersection !== undefined;
    this.state.target = reticle.targetObject?.name ?? null;
    this.state.pressedScale = reticle.scale.x;
    this.state.surfaceAlignment = Math.max(
      Math.abs(normal.dot(u)),
      Math.abs(normal.dot(v)),
    );
  }
}
const outer = new THREE.Group();
outer.position.set(0, 1.45, -1.1);
outer.rotation.set(0.35, -0.42, 0.2);
outer.scale.set(-1.5, 0.65, 1.2);
const inner = new THREE.Group();
inner.rotation.set(-0.18, 0.24, 0.1);
inner.add(new ReticleSurface());
outer.add(inner);
const app = new xb.Script();
app.add(
  new THREE.HemisphereLight(0xffffff, 0x666666, 3),
  outer,
  new ReticleObserver(),
);
const options = new xb.Options();
options.enableReticles();
options.simulator.defaultMode = xb.SimulatorMode.POSE;
xb.add(app);
await xb.init(options);
for (const controller of xb.Core.instance.input.controllers)
  if (controller.reticle) controller.reticle.rotationSmoothing = 0;
