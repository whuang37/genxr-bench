import * as THREE from 'three';

/**
 * Shared radial-gradient sprite texture used by every flame particle.
 */
let flameTexture = null;
export function getFlameTexture() {
  if (flameTexture) return flameTexture;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );
  gradient.addColorStop(0.0, 'rgba(255,255,255,1.0)');
  gradient.addColorStop(0.25, 'rgba(255,255,255,0.75)');
  gradient.addColorStop(0.6, 'rgba(255,255,255,0.22)');
  gradient.addColorStop(1.0, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  flameTexture = new THREE.CanvasTexture(canvas);
  flameTexture.colorSpace = THREE.SRGBColorSpace;
  return flameTexture;
}

const FLAME_VERTEX_SHADER = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  attribute vec3 aColor;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vAlpha = aAlpha;
    vColor = aColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = aSize * 300.0 / max(-mvPosition.z, 0.0001);
  }
`;

const FLAME_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uTexture;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vec4 tex = texture2D(uTexture, gl_PointCoord);
    float a = tex.a * vAlpha;
    if (a <= 0.001) discard;
    gl_FragColor = vec4(vColor * a, a);
  }
`;

/**
 * Particle flame that can render either as a broad open-palm flame or as a
 * concentrated bright fingertip stream.
 */
export class Flame extends THREE.Object3D {
  /**
   * @param {object} config
   * @param {number} config.baseColor Core color of the flame.
   * @param {number} config.tipColor Color of older/cooler particles.
   * @param {number} [config.particleCount]
   */
  constructor({baseColor, tipColor, particleCount = 180, name = 'Flame'}) {
    super();
    this.name = name;
    this.particleCount = particleCount;
    this.baseColor = new THREE.Color(baseColor);
    this.tipColor = new THREE.Color(tipColor);
    /** 'palm' (open hand) or 'stream' (pinched fingertips). */
    this.mode = 'palm';
    this.intensity = 1;

    this.positions = new Float32Array(particleCount * 3);
    this.colors = new Float32Array(particleCount * 3);
    this.sizes = new Float32Array(particleCount);
    this.alphas = new Float32Array(particleCount);
    this.ages = new Float32Array(particleCount);
    this.lifetimes = new Float32Array(particleCount);
    this.velocities = new Float32Array(particleCount * 3);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.positions, 3).setUsage(
        THREE.DynamicDrawUsage
      )
    );
    geometry.setAttribute(
      'aColor',
      new THREE.BufferAttribute(this.colors, 3).setUsage(THREE.DynamicDrawUsage)
    );
    geometry.setAttribute(
      'aSize',
      new THREE.BufferAttribute(this.sizes, 1).setUsage(THREE.DynamicDrawUsage)
    );
    geometry.setAttribute(
      'aAlpha',
      new THREE.BufferAttribute(this.alphas, 1).setUsage(THREE.DynamicDrawUsage)
    );
    this.geometry = geometry;

    this.material = new THREE.ShaderMaterial({
      uniforms: {uTexture: {value: getFlameTexture()}},
      vertexShader: FLAME_VERTEX_SHADER,
      fragmentShader: FLAME_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(geometry, this.material);
    this.points.frustumCulled = false;
    this.points.name = name + ' particles';
    this.add(this.points);

    // A soft core glow so the flame reads clearly even at a distance.
    this.core = new THREE.Mesh(
      new THREE.SphereGeometry(0.022, 16, 12),
      new THREE.MeshBasicMaterial({
        color: this.baseColor.clone(),
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    this.core.name = name + ' core';
    this.add(this.core);

    this.light = new THREE.PointLight(this.baseColor.getHex(), 1.2, 0.9);
    this.add(this.light);

    for (let i = 0; i < particleCount; i++) {
      this.respawn(i, Math.random());
    }
  }

  get isStream() {
    return this.mode === 'stream';
  }

  /** Sets flame form: 'palm' or 'stream'. */
  setMode(mode) {
    this.mode = mode;
  }

  respawn(index, initialAgeFraction = 0) {
    const stream = this.isStream;
    const radius = stream ? 0.008 : 0.035;
    const angle = Math.random() * Math.PI * 2;
    const r = radius * Math.sqrt(Math.random());
    const i3 = index * 3;
    this.positions[i3] = Math.cos(angle) * r;
    this.positions[i3 + 1] = stream ? 0 : Math.random() * 0.01;
    this.positions[i3 + 2] = Math.sin(angle) * r;

    const rise = stream ? 0.5 : 0.28;
    this.velocities[i3] = (Math.random() - 0.5) * (stream ? 0.02 : 0.06);
    this.velocities[i3 + 1] = rise * (0.75 + Math.random() * 0.5);
    this.velocities[i3 + 2] = (Math.random() - 0.5) * (stream ? 0.02 : 0.06);

    this.lifetimes[index] = stream
      ? 0.35 + Math.random() * 0.25
      : 0.5 + Math.random() * 0.4;
    this.ages[index] = this.lifetimes[index] * initialAgeFraction;
  }

  update(dt) {
    const stream = this.isStream;
    const baseSize = stream ? 0.05 : 0.075;
    const maxAlpha = (stream ? 1.0 : 0.85) * this.intensity;
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      this.ages[i] += dt;
      if (this.ages[i] >= this.lifetimes[i]) {
        this.respawn(i, 0);
      }
      const t = Math.min(this.ages[i] / this.lifetimes[i], 1);
      this.positions[i3] += this.velocities[i3] * dt;
      this.positions[i3 + 1] += this.velocities[i3 + 1] * dt;
      this.positions[i3 + 2] += this.velocities[i3 + 2] * dt;
      // Flames narrow as they rise.
      const pinch = stream ? 1 - 0.5 * t : 1 - 0.25 * t;
      this.positions[i3] *= pinch;
      this.positions[i3 + 2] *= pinch;

      const color = this.baseColor.clone().lerp(this.tipColor, t);
      if (stream) {
        // Pinched flames burn brighter / whiter near their core.
        color.lerp(new THREE.Color(0xffffff), 0.45 * (1 - t));
      }
      this.colors[i3] = color.r;
      this.colors[i3 + 1] = color.g;
      this.colors[i3 + 2] = color.b;

      this.sizes[i] = baseSize * (0.45 + 0.9 * (1 - t));
      this.alphas[i] = maxAlpha * Math.sin(Math.PI * Math.min(t * 1.2, 1));
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.aColor.needsUpdate = true;
    this.geometry.attributes.aSize.needsUpdate = true;
    this.geometry.attributes.aAlpha.needsUpdate = true;

    const flicker = 0.85 + 0.15 * Math.sin(performance.now() * 0.013);
    this.core.scale.setScalar((stream ? 0.7 : 1.1) * flicker);
    this.core.material.opacity = (stream ? 0.95 : 0.7) * this.intensity;
    this.core.material.color
      .copy(this.baseColor)
      .lerp(new THREE.Color(0xffffff), stream ? 0.5 : 0.15);
    this.light.intensity = (stream ? 1.8 : 1.1) * this.intensity * flicker;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.core.geometry.dispose();
    this.core.material.dispose();
  }
}

/**
 * Merged fire orb with a success ring, shown between both pinched streams.
 */
export class FireOrb extends THREE.Object3D {
  constructor() {
    super();
    this.name = 'Fire orb';

    this.orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 32, 24),
      new THREE.MeshBasicMaterial({
        color: 0xffd27a,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    this.orb.name = 'Fire orb core';
    this.add(this.orb);

    this.halo = new THREE.Mesh(
      new THREE.SphereGeometry(0.115, 32, 24),
      new THREE.MeshBasicMaterial({
        color: 0xff7a1e,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.BackSide,
      })
    );
    this.halo.name = 'Fire orb halo';
    this.add(this.halo);

    // Success ring confirming the merge gesture.
    this.ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.14, 0.008, 12, 48),
      new THREE.MeshBasicMaterial({
        color: 0x6ad3ff,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    this.ring.name = 'Fire orb success ring';
    this.add(this.ring);

    this.flame = new Flame({
      baseColor: 0xffc46b,
      tipColor: 0xff4a12,
      particleCount: 260,
      name: 'Fire orb flame',
    });
    this.flame.position.y = -0.02;
    this.add(this.flame);

    this.light = new THREE.PointLight(0xffa33c, 3, 2.5);
    this.add(this.light);
  }

  /** @param {number} dt seconds @param {number} t progress in [0, 1] */
  update(dt, t, camera) {
    this.flame.update(dt);
    const pop = Math.min(1, t / 0.12);
    const fade = t > 0.85 ? 1 - (t - 0.85) / 0.15 : 1;
    const pulse = 1 + 0.08 * Math.sin(performance.now() * 0.009);
    this.orb.scale.setScalar(pop * pulse);
    this.halo.scale.setScalar(pop * pulse * 1.05);
    this.orb.material.opacity = 0.95 * fade;
    this.halo.material.opacity = 0.45 * fade;
    this.flame.intensity = fade;
    this.light.intensity = 3 * fade * pulse;

    const ringScale = 0.7 + 0.5 * Math.min(1, t / 0.35);
    this.ring.scale.setScalar(ringScale);
    this.ring.material.opacity = 0.95 * fade;
    if (camera) {
      this.ring.quaternion.copy(camera.quaternion);
    }
  }

  dispose() {
    for (const mesh of [this.orb, this.halo, this.ring]) {
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    this.flame.dispose();
  }
}
