import * as THREE from "three";
import * as xb from "xrblocks";

class EvaluationApp extends xb.Script {
  init() {
    this.add(new THREE.HemisphereLight(0xffffff, 0x666666, 3));
  }
}

xb.add(new EvaluationApp());
await xb.init(new xb.Options());
