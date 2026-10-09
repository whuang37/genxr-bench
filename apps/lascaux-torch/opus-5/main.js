/**
 * Lascaux Torch
 *
 * An indefinite mixed-reality wall exploration. The user selects a virtual
 * torch with the controller ray and aims its beam across prepared wall
 * regions. Animal outlines, pigment, engravings, and hand stencils appear only
 * inside the moving pool of light and fade again when the beam moves away.
 *
 * There is no score, discovery count, completion state, replay, or reset.
 */

import * as THREE from "three";
import * as xb from "xrblocks";

const TEXTURE_WIDTH = 1024;
const TEXTURE_HEIGHT = 640;

/* ------------------------------------------------------------------ */
/* Cave-art drawing helpers (Canvas2D authored artwork layers).        */
/* ------------------------------------------------------------------ */

function createCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = TEXTURE_WIDTH;
  canvas.height = TEXTURE_HEIGHT;
  return canvas;
}

function canvasTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/** Traces a bison body: heavy hump, low head, short legs. */
function bisonPath(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x - 0.5 * s, y + 0.02 * s);
  ctx.bezierCurveTo(
    x - 0.46 * s,
    y - 0.26 * s,
    x - 0.24 * s,
    y - 0.42 * s,
    x - 0.02 * s,
    y - 0.34 * s,
  );
  ctx.bezierCurveTo(
    x + 0.18 * s,
    y - 0.28 * s,
    x + 0.3 * s,
    y - 0.22 * s,
    x + 0.4 * s,
    y - 0.12 * s,
  );
  ctx.bezierCurveTo(
    x + 0.52 * s,
    y - 0.02 * s,
    x + 0.56 * s,
    y + 0.06 * s,
    x + 0.5 * s,
    y + 0.14 * s,
  );
  ctx.bezierCurveTo(
    x + 0.44 * s,
    y + 0.2 * s,
    x + 0.3 * s,
    y + 0.18 * s,
    x + 0.2 * s,
    y + 0.16 * s,
  );
  ctx.lineTo(x + 0.16 * s, y + 0.4 * s);
  ctx.lineTo(x + 0.08 * s, y + 0.4 * s);
  ctx.lineTo(x + 0.1 * s, y + 0.16 * s);
  ctx.lineTo(x - 0.12 * s, y + 0.18 * s);
  ctx.lineTo(x - 0.14 * s, y + 0.42 * s);
  ctx.lineTo(x - 0.22 * s, y + 0.42 * s);
  ctx.lineTo(x - 0.2 * s, y + 0.18 * s);
  ctx.bezierCurveTo(
    x - 0.34 * s,
    y + 0.18 * s,
    x - 0.46 * s,
    y + 0.16 * s,
    x - 0.5 * s,
    y + 0.02 * s,
  );
  ctx.closePath();
}

/** Traces a horse: long neck, small muzzle, flowing back. */
function horsePath(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x - 0.46 * s, y - 0.1 * s);
  ctx.bezierCurveTo(
    x - 0.4 * s,
    y - 0.3 * s,
    x - 0.24 * s,
    y - 0.34 * s,
    x - 0.06 * s,
    y - 0.28 * s,
  );
  ctx.bezierCurveTo(
    x + 0.12 * s,
    y - 0.24 * s,
    x + 0.22 * s,
    y - 0.34 * s,
    x + 0.3 * s,
    y - 0.44 * s,
  );
  ctx.bezierCurveTo(
    x + 0.38 * s,
    y - 0.52 * s,
    x + 0.5 * s,
    y - 0.48 * s,
    x + 0.48 * s,
    y - 0.36 * s,
  );
  ctx.bezierCurveTo(
    x + 0.46 * s,
    y - 0.26 * s,
    x + 0.34 * s,
    y - 0.18 * s,
    x + 0.26 * s,
    y - 0.08 * s,
  );
  ctx.bezierCurveTo(
    x + 0.2 * s,
    y + 0.0 * s,
    x + 0.18 * s,
    y + 0.08 * s,
    x + 0.16 * s,
    y + 0.14 * s,
  );
  ctx.lineTo(x + 0.18 * s, y + 0.38 * s);
  ctx.lineTo(x + 0.1 * s, y + 0.38 * s);
  ctx.lineTo(x + 0.08 * s, y + 0.14 * s);
  ctx.lineTo(x - 0.16 * s, y + 0.16 * s);
  ctx.lineTo(x - 0.18 * s, y + 0.4 * s);
  ctx.lineTo(x - 0.26 * s, y + 0.4 * s);
  ctx.lineTo(x - 0.24 * s, y + 0.14 * s);
  ctx.bezierCurveTo(
    x - 0.38 * s,
    y + 0.12 * s,
    x - 0.48 * s,
    y + 0.04 * s,
    x - 0.46 * s,
    y - 0.1 * s,
  );
  ctx.closePath();
}

/** Traces a deer with a pair of simple antlers. */
function deerPath(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x - 0.42 * s, y - 0.04 * s);
  ctx.bezierCurveTo(
    x - 0.36 * s,
    y - 0.24 * s,
    x - 0.18 * s,
    y - 0.28 * s,
    x + 0.0 * s,
    y - 0.24 * s,
  );
  ctx.bezierCurveTo(
    x + 0.14 * s,
    y - 0.22 * s,
    x + 0.22 * s,
    y - 0.3 * s,
    x + 0.28 * s,
    y - 0.4 * s,
  );
  ctx.lineTo(x + 0.42 * s, y - 0.44 * s);
  ctx.lineTo(x + 0.4 * s, y - 0.34 * s);
  ctx.bezierCurveTo(
    x + 0.34 * s,
    y - 0.24 * s,
    x + 0.26 * s,
    y - 0.14 * s,
    x + 0.2 * s,
    y - 0.04 * s,
  );
  ctx.lineTo(x + 0.18 * s, y + 0.32 * s);
  ctx.lineTo(x + 0.1 * s, y + 0.32 * s);
  ctx.lineTo(x + 0.1 * s, y - 0.02 * s);
  ctx.lineTo(x - 0.14 * s, y + 0.0 * s);
  ctx.lineTo(x - 0.16 * s, y + 0.34 * s);
  ctx.lineTo(x - 0.24 * s, y + 0.34 * s);
  ctx.lineTo(x - 0.22 * s, y - 0.02 * s);
  ctx.bezierCurveTo(
    x - 0.34 * s,
    y - 0.02 * s,
    x - 0.42 * s,
    y + 0.06 * s,
    x - 0.42 * s,
    y - 0.04 * s,
  );
  ctx.closePath();
}

function antlerStrokes(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x + 0.34 * s, y - 0.4 * s);
  ctx.lineTo(x + 0.3 * s, y - 0.62 * s);
  ctx.moveTo(x + 0.3 * s, y - 0.62 * s);
  ctx.lineTo(x + 0.18 * s, y - 0.7 * s);
  ctx.moveTo(x + 0.3 * s, y - 0.62 * s);
  ctx.lineTo(x + 0.4 * s, y - 0.74 * s);
  ctx.moveTo(x + 0.38 * s, y - 0.42 * s);
  ctx.lineTo(x + 0.46 * s, y - 0.6 * s);
  ctx.moveTo(x + 0.46 * s, y - 0.6 * s);
  ctx.lineTo(x + 0.58 * s, y - 0.66 * s);
}

/** Traces one hand stencil: palm plus five splayed fingers. */
function handPath(ctx, x, y, s, flip = false) {
  const dir = flip ? -1 : 1;
  ctx.beginPath();
  ctx.ellipse(x, y, 0.26 * s, 0.3 * s, 0, 0, Math.PI * 2);
  const fingers = [
    [-0.22, -0.52, 0.075],
    [-0.07, -0.64, 0.08],
    [0.08, -0.6, 0.08],
    [0.21, -0.44, 0.07],
  ];
  for (const [fx, fy, fr] of fingers) {
    ctx.moveTo(x + dir * fx * s + fr * s, y + fy * s);
    ctx.ellipse(
      x + dir * fx * s,
      y + fy * s,
      fr * s,
      0.2 * s,
      dir * fx * 0.6,
      0,
      Math.PI * 2,
    );
  }
  ctx.moveTo(x + dir * -0.4 * s, y - 0.06 * s);
  ctx.ellipse(
    x + dir * -0.38 * s,
    y - 0.04 * s,
    0.085 * s,
    0.19 * s,
    dir * -1.1,
    0,
    Math.PI * 2,
  );
  ctx.closePath();
}

/**
 * Authors the four artwork layers for one wall region.
 * Every layer is drawn into its own alpha canvas so the reveal shader can
 * bring each one in at a different depth inside the torch pool.
 */
function createArtworkLayers(variant) {
  const outline = createCanvas();
  const pigment = createCanvas();
  const engraving = createCanvas();
  const stencils = createCanvas();

  const oc = outline.getContext("2d");
  const pc = pigment.getContext("2d");
  const ec = engraving.getContext("2d");
  const sc = stencils.getContext("2d");

  const animals = {
    "bison-horse": [
      { path: bisonPath, x: 340, y: 300, s: 520 },
      { path: horsePath, x: 760, y: 270, s: 420 },
    ],
    "deer-herd": [
      { path: deerPath, x: 330, y: 300, s: 470, antlers: true },
      { path: horsePath, x: 760, y: 330, s: 360 },
    ],
    "horse-bison": [
      { path: horsePath, x: 320, y: 280, s: 470 },
      { path: bisonPath, x: 750, y: 320, s: 430 },
    ],
    "bison-deer": [
      { path: bisonPath, x: 330, y: 290, s: 480 },
      { path: deerPath, x: 780, y: 300, s: 400, antlers: true },
    ],
  }[variant] ?? [{ path: bisonPath, x: 512, y: 300, s: 540 }];

  // Pigment: warm ochre and red fills, applied slightly off-register from the
  // outlines the way worn cave pigment sits inside its contour.
  for (const animal of animals) {
    pc.save();
    pc.translate(6, 8);
    const gradient = pc.createLinearGradient(
      animal.x - animal.s * 0.5,
      animal.y - animal.s * 0.5,
      animal.x + animal.s * 0.5,
      animal.y + animal.s * 0.5,
    );
    gradient.addColorStop(0, "rgba(196, 108, 46, 0.95)");
    gradient.addColorStop(0.5, "rgba(160, 66, 38, 0.92)");
    gradient.addColorStop(1, "rgba(118, 62, 34, 0.9)");
    pc.fillStyle = gradient;
    animal.path(pc, animal.x, animal.y, animal.s);
    pc.fill();
    pc.restore();
  }
  // Loose pigment dabs and blown-ochre spatter.
  for (let i = 0; i < 220; i++) {
    const x = Math.random() * TEXTURE_WIDTH;
    const y = Math.random() * TEXTURE_HEIGHT;
    const r = 2 + Math.random() * 12;
    pc.fillStyle = `rgba(${(150 + Math.random() * 60) | 0}, ${
      (70 + Math.random() * 40) | 0
    }, ${(30 + Math.random() * 30) | 0}, ${0.05 + Math.random() * 0.2})`;
    pc.beginPath();
    pc.arc(x, y, r, 0, Math.PI * 2);
    pc.fill();
  }

  // Outlines: charcoal contours, the first layer the light picks up.
  oc.lineJoin = "round";
  oc.lineCap = "round";
  for (const animal of animals) {
    oc.strokeStyle = "rgba(28, 20, 16, 0.95)";
    oc.lineWidth = Math.max(5, animal.s * 0.022);
    animal.path(oc, animal.x, animal.y, animal.s);
    oc.stroke();
    if (animal.antlers) {
      oc.lineWidth = Math.max(4, animal.s * 0.016);
      antlerStrokes(oc, animal.x, animal.y, animal.s);
      oc.stroke();
    }
    // Charcoal eye and muzzle marks.
    oc.fillStyle = "rgba(24, 18, 14, 0.9)";
    oc.beginPath();
    oc.arc(
      animal.x + animal.s * 0.34,
      animal.y - animal.s * 0.28,
      Math.max(3, animal.s * 0.012),
      0,
      Math.PI * 2,
    );
    oc.fill();
  }

  // Engravings: fine incised scratches that only read in strong light.
  ec.lineCap = "round";
  for (const animal of animals) {
    ec.save();
    animal.path(ec, animal.x, animal.y, animal.s);
    ec.clip();
    ec.strokeStyle = "rgba(238, 226, 205, 0.85)";
    ec.lineWidth = 2;
    for (let i = -30; i < 40; i++) {
      ec.beginPath();
      ec.moveTo(animal.x - animal.s * 0.6 + i * 16, animal.y - animal.s * 0.6);
      ec.lineTo(animal.x - animal.s * 0.3 + i * 16, animal.y + animal.s * 0.6);
      ec.stroke();
    }
    ec.restore();
  }
  ec.strokeStyle = "rgba(232, 220, 200, 0.7)";
  ec.lineWidth = 1.6;
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * TEXTURE_WIDTH;
    const y = Math.random() * TEXTURE_HEIGHT;
    ec.beginPath();
    ec.moveTo(x, y);
    ec.lineTo(x + (Math.random() - 0.5) * 160, y + (Math.random() - 0.5) * 90);
    ec.stroke();
  }

  // Hand stencils: pale blown pigment halo around a reserved hand shape.
  const hands = [
    { x: 130, y: 500, s: 120, flip: false },
    { x: 905, y: 530, s: 105, flip: true },
    { x: 560, y: 560, s: 88, flip: false },
  ];
  for (const hand of hands) {
    sc.save();
    sc.shadowColor = "rgba(236, 224, 206, 0.95)";
    sc.shadowBlur = 34;
    sc.strokeStyle = "rgba(232, 220, 200, 0.85)";
    sc.lineWidth = 14;
    handPath(sc, hand.x, hand.y, hand.s, hand.flip);
    sc.stroke();
    sc.restore();
    sc.fillStyle = "rgba(46, 32, 24, 0.85)";
    handPath(sc, hand.x, hand.y, hand.s, hand.flip);
    sc.fill();
  }

  return {
    outline: canvasTexture(outline),
    pigment: canvasTexture(pigment),
    engraving: canvasTexture(engraving),
    stencils: canvasTexture(stencils),
  };
}

/* ------------------------------------------------------------------ */
/* Torch-lit reveal shader.                                            */
/* ------------------------------------------------------------------ */

const REVEAL_VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const REVEAL_FRAGMENT_SHADER = /* glsl */ `
precision highp float;

uniform sampler2D uOutline;
uniform sampler2D uPigment;
uniform sampler2D uEngraving;
uniform sampler2D uStencils;
uniform vec2 uSize;
uniform vec2 uBeamUv;
uniform float uRadius;
uniform float uIntensity;
uniform float uTime;
varying vec2 vUv;

float layerReveal(float mask, float low, float high) {
  return smoothstep(low, high, mask);
}

/** Source-over composite of one layer onto the accumulated result. */
vec3 blendOver(vec3 dstColor, inout float dstAlpha, vec3 srcColor,
               float srcAlpha) {
  float outAlpha = srcAlpha + dstAlpha * (1.0 - srcAlpha);
  vec3 outColor = outAlpha > 0.0001
    ? (srcColor * srcAlpha + dstColor * dstAlpha * (1.0 - srcAlpha)) / outAlpha
    : dstColor;
  dstAlpha = outAlpha;
  return outColor;
}

void main() {
  // Distance from this point on the wall to the centre of the torch pool.
  vec2 offset = (vUv - uBeamUv) * uSize;
  float beamDistance = length(offset);

  // Flickering torch flame: the pool breathes instead of being a hard disk.
  float flicker = 1.0
    + 0.07 * sin(uTime * 7.3 + vUv.x * 9.0)
    + 0.05 * sin(uTime * 3.1 + vUv.y * 6.0);
  float radius = max(0.06, uRadius * flicker);

  // Soft edge that follows the illuminated area.
  float mask = 1.0 - smoothstep(radius * 0.28, radius, beamDistance);
  mask *= clamp(uIntensity, 0.0, 1.0);

  vec4 outline = texture2D(uOutline, vUv);
  vec4 pigment = texture2D(uPigment, vUv);
  vec4 engraving = texture2D(uEngraving, vUv);
  vec4 stencils = texture2D(uStencils, vUv);

  // Each authored layer appears at a different depth inside the light:
  // outlines first, then pigment, hand stencils, and finally fine engravings.
  float outlineAlpha = outline.a * layerReveal(mask, 0.02, 0.34);
  float pigmentAlpha = pigment.a * layerReveal(mask, 0.20, 0.62);
  float stencilAlpha = stencils.a * layerReveal(mask, 0.34, 0.78);
  float engravingAlpha = engraving.a * layerReveal(mask, 0.52, 0.92);

  // Straight source-over compositing from the deepest layer upward.
  vec3 color = vec3(0.0);
  float alpha = 0.0;
  color = blendOver(color, alpha, pigment.rgb, pigmentAlpha);
  color = blendOver(color, alpha, stencils.rgb, stencilAlpha);
  color = blendOver(color, alpha, engraving.rgb, engravingAlpha);
  color = blendOver(color, alpha, outline.rgb, outlineAlpha);

  // Warm torchlight tint with a hot centre and a cool, quiet surround.
  vec3 torchColor = vec3(1.0, 0.78, 0.52);
  color *= mix(vec3(0.5), torchColor * 1.35, mask);

  // A prepared wall patch stays faintly present so the region reads as
  // authored rock even when unlit, then blooms inside the torch pool.
  float quiet = 0.07;
  alpha *= max(mask, quiet);
  if (alpha < 0.002) discard;
  gl_FragColor = vec4(color, alpha);
}
`;

/**
 * One prepared wall region. It stays visually quiet until the torch beam
 * touches it and fades back out when the beam leaves.
 */
export class ArtworkRevealRegion extends THREE.Mesh {
  constructor({ width, height, variant, radius = 0.42 }) {
    const layers = createArtworkLayers(variant);
    const material = new THREE.ShaderMaterial({
      vertexShader: REVEAL_VERTEX_SHADER,
      fragmentShader: REVEAL_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide,
      uniforms: {
        uOutline: { value: layers.outline },
        uPigment: { value: layers.pigment },
        uEngraving: { value: layers.engraving },
        uStencils: { value: layers.stencils },
        uSize: { value: new THREE.Vector2(width, height) },
        uBeamUv: { value: new THREE.Vector2(0.5, 0.5) },
        uRadius: { value: radius },
        uIntensity: { value: 0 },
        uTime: { value: 0 },
      },
    });
    super(new THREE.PlaneGeometry(width, height), material);
    this.name = "ArtworkRevealRegion";
    this.regionWidth = width;
    this.regionHeight = height;
    this.layers_ = layers;
    this.targetIntensity = 0;
    this.renderOrder = 2;
  }

  /** Moves the pool of light to a hit on this region. */
  setBeam(uv, intensity) {
    if (uv) this.material.uniforms.uBeamUv.value.copy(uv);
    this.targetIntensity = intensity;
  }

  /** Eases the unlit layers back out instead of retaining a discovery. */
  updateReveal(deltaTime, elapsedTime) {
    const uniforms = this.material.uniforms;
    const current = uniforms.uIntensity.value;
    const rate = this.targetIntensity > current ? 12 : 4.5;
    const lerp = 1 - Math.exp(-rate * Math.max(deltaTime, 0));
    uniforms.uIntensity.value =
      current + (this.targetIntensity - current) * lerp;
    uniforms.uTime.value = elapsedTime;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    for (const texture of Object.values(this.layers_)) texture.dispose();
  }
}

/* ------------------------------------------------------------------ */
/* The ray-selectable virtual torch.                                   */
/* ------------------------------------------------------------------ */

export class VirtualTorch extends xb.Script {
  constructor() {
    super();
    this.name = "VirtualTorch";
    this.userData.xrblocksDevtools = { tag: "virtual-torch" };

    this.handleMaterial = new THREE.MeshStandardMaterial({
      color: 0x6b4a2f,
      roughness: 0.85,
      metalness: 0.05,
    });
    this.wrapMaterial = new THREE.MeshStandardMaterial({
      color: 0x3b2a1c,
      roughness: 0.95,
    });
    this.flameMaterial = new THREE.MeshStandardMaterial({
      color: 0xffb457,
      emissive: new THREE.Color(0xff9a3c),
      emissiveIntensity: 2.4,
      roughness: 0.4,
    });
    this.beamMaterial = new THREE.MeshBasicMaterial({
      color: 0xffc178,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    // Handle: the torch axis points along -Z so it aims where the user aims.
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.017, 0.022, 0.34, 16),
      this.handleMaterial,
    );
    handle.rotation.x = Math.PI / 2;
    handle.position.z = 0.1;
    this.add(handle);

    const wrap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.028, 0.07, 16),
      this.wrapMaterial,
    );
    wrap.rotation.x = Math.PI / 2;
    wrap.position.z = -0.03;
    this.add(wrap);

    this.flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.035, 0.13, 18),
      this.flameMaterial,
    );
    this.flame.rotation.x = -Math.PI / 2;
    this.flame.position.z = -0.13;
    this.add(this.flame);

    this.light = new THREE.PointLight(0xffb066, 2.2, 5.0, 2.0);
    this.light.position.set(0, 0, -0.14);
    this.add(this.light);

    // Visual beam cone; never a pointer target. Its unit length is scaled
    // each frame so the cone stops at the illuminated surface.
    this.beamLength = 1.0;
    this.beam = new THREE.Mesh(
      new THREE.ConeGeometry(0.34, this.beamLength, 24, 1, true),
      this.beamMaterial,
    );
    this.beam.rotation.x = -Math.PI / 2;
    this.beam.visible = false;
    this.beam.xb = { pointerEvents: "none" };
    this.add(this.beam);
    this.setBeamLength(2.4);

    this.held = false;
    this.heldController = null;
  }

  /** Stops the visual cone at the lit surface. */
  setBeamLength(length) {
    const clamped = Math.max(0.3, length);
    this.beam.scale.set(1, clamped / this.beamLength, 1);
    this.beam.position.z = -0.16 - clamped / 2;
  }

  onObjectSelectStart(event) {
    this.held = true;
    this.beam.visible = true;
    this.heldController = event.source?.controller ?? this.heldController;
    event.stopPropagation();
  }

  onObjectSelectEnd(event) {
    // The torch stays carried after it is picked up; aiming continues freely.
    this.heldController = event.source?.controller ?? this.heldController;
    event.stopPropagation();
  }

  onHoverEnter() {
    if (!this.held) this.flameMaterial.emissiveIntensity = 3.4;
  }

  onHoverExit() {
    if (!this.held) this.flameMaterial.emissiveIntensity = 2.4;
  }

  dispose() {
    this.traverse((object) => {
      if (object.isMesh) object.geometry?.dispose();
    });
    this.handleMaterial.dispose();
    this.wrapMaterial.dispose();
    this.flameMaterial.dispose();
    this.beamMaterial.dispose();
  }
}

/* ------------------------------------------------------------------ */
/* Application.                                                        */
/* ------------------------------------------------------------------ */

export class LascauxTorch extends xb.Script {
  constructor() {
    super();
    this.name = "LascauxTorch";
    this.regions = [];
    this.walls = [];
    this.wallMaterials = [];
    this.beamRay = new THREE.Ray();
    this.maxBeamDistance = 12;
    this.forward = new THREE.Vector3();
    this.origin = new THREE.Vector3();
    this.beamUv = new THREE.Vector2();
    this.lastTime = null;
    this.carryOffset = new THREE.Vector3(0.09, -0.16, 0);
    this.parentQuaternion = new THREE.Quaternion();
    this.aimQuaternion = new THREE.Quaternion();
    this.localRay = new THREE.Ray();
    this.inverseMatrix = new THREE.Matrix4();
    this.elapsed = 0;
    this.hintUpdated = false;
  }

  init() {
    // Quiet cave lighting: enough to read rock, not enough to read art.
    this.add(new THREE.HemisphereLight(0x38312c, 0x100c0a, 0.55));
    const fill = new THREE.DirectionalLight(0x5a4636, 0.25);
    fill.position.set(0.4, 2.2, 1.4);
    this.add(fill);

    this.buildWalls();
    this.buildRegions();
    this.buildTorch();
    this.buildHint();
  }

  buildWalls() {
    const rock = () =>
      new THREE.MeshStandardMaterial({
        color: 0x4a423a,
        roughness: 0.98,
        metalness: 0.0,
      });
    const wallLayout = [
      { size: [5.2, 3.0], position: [0, 1.5, -2.4], rotationY: 0 },
      { size: [4.6, 3.0], position: [-2.4, 1.5, -0.1], rotationY: Math.PI / 2 },
      { size: [4.6, 3.0], position: [2.4, 1.5, -0.1], rotationY: -Math.PI / 2 },
    ];
    for (const wall of wallLayout) {
      const material = rock();
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(wall.size[0], wall.size[1]),
        material,
      );
      mesh.position.set(...wall.position);
      mesh.rotation.y = wall.rotationY;
      mesh.name = "CaveWall";
      this.walls.push(mesh);
      this.wallMaterials.push(material);
      this.add(mesh);
    }

    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x2b2521,
      roughness: 1.0,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.name = "CaveFloor";
    this.walls.push(floor);
    this.wallMaterials.push(floorMaterial);
    this.add(floor);
  }

  buildRegions() {
    const layout = [
      {
        width: 2.0,
        height: 1.25,
        variant: "bison-horse",
        position: [-0.55, 1.45, -2.38],
        rotationY: 0,
        primary: true,
      },
      {
        width: 1.4,
        height: 0.9,
        variant: "deer-herd",
        position: [1.35, 1.5, -2.38],
        rotationY: 0,
      },
      {
        width: 1.8,
        height: 1.15,
        variant: "horse-bison",
        position: [-2.38, 1.45, -0.5],
        rotationY: Math.PI / 2,
      },
      {
        width: 1.8,
        height: 1.15,
        variant: "bison-deer",
        position: [2.38, 1.45, -0.5],
        rotationY: -Math.PI / 2,
      },
    ];

    for (const entry of layout) {
      const region = new ArtworkRevealRegion({
        width: entry.width,
        height: entry.height,
        variant: entry.variant,
      });
      region.position.set(...entry.position);
      region.rotation.y = entry.rotationY;
      if (entry.primary) {
        region.userData.xrblocksDevtools = { tag: "artwork-reveal-region" };
      }
      this.regions.push(region);
      this.add(region);
    }
  }

  buildTorch() {
    const pedestalMaterial = new THREE.MeshStandardMaterial({
      color: 0x3d352d,
      roughness: 1.0,
    });
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.2, 0.8, 18),
      pedestalMaterial,
    );
    pedestal.position.set(0.42, 0.4, -1.0);
    pedestal.name = "TorchStand";
    this.pedestal = pedestal;
    this.pedestalMaterial = pedestalMaterial;
    this.add(pedestal);

    this.torch = new VirtualTorch();
    this.torch.position.set(0.42, 1.0, -1.0);
    this.torch.rotation.set(-0.5, 0, 0.25);
    this.add(this.torch);
  }

  buildHint() {
    this.hintText = new xb.UIText({
      text: "Select the torch with your ray, then aim the beam at the walls.",
      style: { fontSize: 17, lineHeight: 1.35, textAlign: "center" },
    });
    this.hintCard = new xb.UICard({
      size: { width: 0.52, height: "auto" },
      style: { flexDirection: "column", gap: 10, padding: 18 },
      children: [
        new xb.UIText({
          text: "Lascaux Torch",
          style: { fontSize: 26, fontWeight: "bold", textAlign: "center" },
        }),
        this.hintText,
      ],
    });
    this.hintCard.position.set(-1.05, 1.1, -1.2);
    this.hintCard.rotation.y = 0.5;
    this.add(this.hintCard);
  }

  /**
   * Resolves the controller whose ray aims the torch. The select event
   * normally supplies it; a connected controller is used when a source does
   * not expose one.
   */
  getAimController() {
    const held = this.torch?.heldController;
    if (held) return held;
    const controllers = xb.user?.controllers;
    if (!controllers) return null;
    for (const controller of controllers) {
      if (controller?.userData?.connected) return controller;
    }
    return null;
  }

  /** Returns the world-space aim ray of the carried torch. */
  getBeamRay() {
    const torch = this.torch;
    if (!torch?.held) return null;
    const controller = this.getAimController();
    if (controller) {
      controller.updateMatrixWorld?.();
      controller.getWorldPosition(this.origin);
      controller.getWorldQuaternion(this.aimQuaternion);
      this.forward
        .set(0, 0, -1)
        .applyQuaternion(this.aimQuaternion)
        .normalize();
    } else {
      torch.getWorldPosition(this.origin);
      torch.getWorldQuaternion(this.aimQuaternion);
      this.forward
        .set(0, 0, -1)
        .applyQuaternion(this.aimQuaternion)
        .normalize();
    }
    this.beamRay.origin.copy(this.origin);
    this.beamRay.direction.copy(this.forward);
    return this.beamRay;
  }

  /**
   * Keeps the carried torch in the user's hand, aimed along the aim ray. The
   * pose comes from the holding controller, never from the torch's own
   * previous transform, so the torch cannot drift down its own beam.
   */
  carryTorch(ray) {
    const torch = this.torch;
    if (!this.getAimController()) return;
    torch.position
      .copy(ray.origin)
      .addScaledVector(ray.direction, 0.34)
      .add(this.carryOffset);
    // The torch model aims along its local -Z, matching the controller, so
    // the aim orientation can be copied straight across.
    this.getWorldQuaternion(this.parentQuaternion).invert();
    torch.quaternion.copy(this.parentQuaternion).multiply(this.aimQuaternion);
    torch.updateMatrixWorld(true);
    if (this.pedestal) this.pedestal.visible = false;
  }

  /**
   * Projects the torch beam onto one prepared region. The lit region is the
   * one whose plane the beam reaches closest to, so the pool of light still
   * grazes a painting when the beam lands just outside its edge.
   */
  findLitRegion(ray) {
    let best = null;
    for (const region of this.regions) {
      region.updateMatrixWorld();
      this.localRay
        .copy(ray)
        .applyMatrix4(this.inverseMatrix.copy(region.matrixWorld).invert());
      const direction = this.localRay.direction;
      if (Math.abs(direction.z) < 1e-5) continue;
      const t = -this.localRay.origin.z / direction.z;
      if (t <= 0 || t > this.maxBeamDistance) continue;
      const x = this.localRay.origin.x + direction.x * t;
      const y = this.localRay.origin.y + direction.y * t;
      const halfWidth = region.regionWidth / 2;
      const halfHeight = region.regionHeight / 2;
      const edgeDistance = Math.hypot(
        Math.max(0, Math.abs(x) - halfWidth),
        Math.max(0, Math.abs(y) - halfHeight),
      );
      // Beyond this margin the beam is simply somewhere else on the wall.
      if (edgeDistance > 0.32) continue;
      if (
        !best ||
        edgeDistance < best.edgeDistance - 1e-4 ||
        (Math.abs(edgeDistance - best.edgeDistance) <= 1e-4 &&
          t < best.distance)
      ) {
        best = {
          region,
          distance: t,
          edgeDistance,
          u: THREE.MathUtils.clamp(x / region.regionWidth + 0.5, 0, 1),
          v: THREE.MathUtils.clamp(y / region.regionHeight + 0.5, 0, 1),
        };
      }
    }
    return best;
  }

  update(time) {
    const now =
      typeof time === "number" ? time / 1000 : performance.now() / 1000;
    const deltaTime =
      this.lastTime === null
        ? 1 / 60
        : THREE.MathUtils.clamp(now - this.lastTime, 0, 0.1);
    this.lastTime = now;
    this.elapsed += deltaTime;

    const ray = this.getBeamRay();
    let lit = null;

    if (ray) {
      this.carryTorch(ray);
      lit = this.findLitRegion(ray);
      if (this.hintText && !this.hintUpdated) {
        this.hintText.text =
          "Sweep the beam across the walls to reveal the paintings.";
        this.hintUpdated = true;
      }
    }

    for (const region of this.regions) {
      if (lit && region === lit.region) {
        // The pool grows and weakens with distance, and dims when the beam
        // only grazes the edge of the prepared area.
        const graze = Math.exp(-lit.edgeDistance / 0.12);
        const falloff =
          THREE.MathUtils.clamp(1.3 - lit.distance * 0.1, 0.5, 1.0) * graze;
        region.material.uniforms.uRadius.value = THREE.MathUtils.clamp(
          0.2 + lit.distance * 0.14,
          0.22,
          0.8,
        );
        this.beamUv.set(lit.u, lit.v);
        region.setBeam(this.beamUv, falloff);
      } else {
        region.setBeam(null, 0);
      }
      region.updateReveal(deltaTime, this.elapsed);
    }

    if (this.torch?.held) {
      const flicker =
        2.0 +
        Math.sin(this.elapsed * 9.0) * 0.25 +
        Math.sin(this.elapsed * 23.0) * 0.12;
      this.torch.light.intensity = flicker;
      this.torch.flameMaterial.emissiveIntensity = 2.2 + flicker * 0.35;
      this.torch.beam.material.opacity =
        0.1 + Math.max(0, Math.sin(this.elapsed * 6.0)) * 0.03;
      this.torch.setBeamLength(lit ? lit.distance : 2.4);
    }
  }

  dispose() {
    for (const region of this.regions) region.dispose();
    this.regions.length = 0;
    for (const wall of this.walls) wall.geometry.dispose();
    for (const material of this.wallMaterials) material.dispose();
    this.pedestal?.geometry.dispose();
    this.pedestalMaterial?.dispose();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const options = new xb.Options();
  options.enableReticles();
  options.simulator.defaultMode = xb.SimulatorMode.POSE;
  options.xrButton.showEnterSimulatorButton = true;

  xb.add(new LascauxTorch());
  xb.init(options);
});
