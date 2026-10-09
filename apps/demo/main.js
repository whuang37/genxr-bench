import * as THREE from 'three';
import * as xb from 'xrblocks';

// Two small hand-authored scenes inside the standard XR Blocks simulator.
// Replace the URL in data/demos.json to load a generated app instead.
export async function start() {
  const params = new URLSearchParams(location.search);
  const color = { green: 0x66c2a5, orange: 0xf29472, blue: 0x8da0cb }[params.get('variant')] || 0x66c2a5;
  const isBlocks = params.get('scene') === 'blocks';
  let moving = !matchMedia('(prefers-reduced-motion: reduce)').matches;

  class Demo extends xb.Script {
    init() {
      this.add(new THREE.HemisphereLight(0xffffff, 0xb8c8be, 3));
      const light = new THREE.DirectionalLight(0xffffff, 3);
      light.position.set(3, 6, 4); this.add(light);
      const material = new THREE.MeshStandardMaterial({ color, roughness: .32, metalness: .15 });
      this.sculpture = new THREE.Group();
      this.sculpture.position.set(0, 1.3, -1.5);
      this.sculpture.scale.setScalar(.45);
      this.add(this.sculpture);
      if (isBlocks) {
        const geometry = new THREE.BoxGeometry(.48, .48, .48);
        for (let index = 0; index < 9; index++) {
          const block = new THREE.Mesh(geometry, material);
          const angle = index / 9 * Math.PI * 2;
          block.position.set(Math.cos(angle) * 1.05, Math.sin(angle * 2) * .25, Math.sin(angle) * 1.05);
          block.rotation.set(index * .2, angle, .15);
          this.sculpture.add(block);
        }
      } else {
        const core = new THREE.Mesh(new THREE.IcosahedronGeometry(.46, 0), material); this.sculpture.add(core);
        for (let index = 0; index < 3; index++) {
          const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, .018, 10, 100), material);
          ring.rotation.set(index * Math.PI / 3, Math.PI / 3, index * .5); this.sculpture.add(ring);
        }
        for (let index = 0; index < 5; index++) {
          const sphere = new THREE.Mesh(new THREE.SphereGeometry(.09, 20, 16), material);
          const angle = index / 5 * Math.PI * 2;
          sphere.position.set(Math.cos(angle), Math.sin(angle) * .7, Math.sin(angle));
          this.sculpture.add(sphere);
        }
      }
    }
    onSelectStart() {
      moving = !moving;
    }
    update() {
      if (moving && this.sculpture) this.sculpture.rotation.y += Math.min(xb.getDeltaTime(), .05) * .25;
    }
  }

  const options = new xb.Options().enableHands();
  options.simulator.defaultMode = xb.SimulatorMode.POSE;
  options.formFactor = 'desktop';
  xb.add(new Demo());
  await xb.init(options);
  window.addEventListener('pagehide', () => {
    void xb.core.dispose();
  }, { once: true });
}
