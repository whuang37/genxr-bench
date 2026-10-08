import * as THREE from "three";
import * as xb from "xrblocks";

class App extends xb.Script {
  init() {
    this.add(new THREE.HemisphereLight(0xffffff, 0x666666, 3));
  }
}

document.addEventListener("DOMContentLoaded", () => {
  xb.add(new App());
  xb.init(new xb.Options());
});
