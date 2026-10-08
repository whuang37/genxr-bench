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
    this.name = "Reticle presentation surface";
    this.position.set(0, 1.45, -1.1);
    this.rotation.set(0.18, 0.4, -0.08);
    this.scale.set(1.5, 0.65, 1.2);
    this.state = { selectStarts: 0, selectEnds: 0, completed: null };
    this.userData.xrblocksDevtools = {
      tag: "reticle-surface",
      state: this.state,
    };
  }

  onObjectSelectStart() {
    this.state.selectStarts += 1;
  }

  onObjectSelectEnd(event) {
    this.state.selectEnds += 1;
    this.state.completed = event.completed;
  }
}

class ReticleObserver extends xb.Script {
  init() {
    this.surface = this.parent.getObjectByName("Reticle presentation surface");
    this.state = {
      visible: false,
      hasIntersection: false,
      target: null,
      pressedScale: 1,
      positionError: -1,
      normalAlignment: -1,
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
      reticles.find((candidate) => candidate.targetObject === this.surface) ??
      reticles.find((candidate) => candidate.visible) ??
      reticles[0];
    if (!reticle) return;

    const hit = reticle.intersection;
    const expectedNormal = new THREE.Vector3(0, 0, 1)
      .applyMatrix3(
        new THREE.Matrix3().getNormalMatrix(this.surface.matrixWorld),
      )
      .normalize();
    const presentedNormal = new THREE.Vector3(0, 0, 1)
      .applyQuaternion(reticle.quaternion)
      .normalize();
    this.state.visible = reticle.visible;
    this.state.hasIntersection = hit !== undefined;
    this.state.target = reticle.targetObject?.name ?? null;
    this.state.pressedScale = reticle.scale.x;
    this.state.positionError = hit
      ? reticle.position.distanceTo(hit.point)
      : -1;
    this.state.normalAlignment = presentedNormal.dot(expectedNormal);
  }
}

const options = new xb.Options();
options.enableReticles();
options.simulator.defaultMode = xb.SimulatorMode.POSE;
options.setAppTitle("Reticle presentation verifier");

const app = new xb.Script();
app.add(
  new THREE.HemisphereLight(0xffffff, 0x666666, 3),
  new ReticleSurface(),
  new ReticleObserver(),
);
xb.add(app);
await xb.init(options);
for (const controller of xb.Core.instance.input.controllers) {
  if (controller.reticle) controller.reticle.rotationSmoothing = 0;
}
