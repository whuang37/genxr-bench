import * as THREE from "three";
import * as xb from "xrblocks";

/* =========================================================================
 * Lascaux Torch
 *
 * A free-form mixed-reality wall exploration.  A ray-selectable virtual torch
 * is carried in front of the controller.  Its beam is the only source of
 * "light" on prepared cave walls: animal outlines, pigment, engravings and
 * hand stencils exist only inside the moving pool of light and fade away as
 * soon as the beam leaves them.  There is no score, completion or reset.
 * ========================================================================= */

/* ----------------------------- tiny helpers ----------------------------- */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function range(rng, lo, hi) {
  return lo + (hi - lo) * rng();
}

function pick(rng, list) {
  return list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
}

function makeCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return { canvas, ctx: canvas.getContext("2d") };
}

function canvasTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

/* ----------------------- procedural prehistoric art --------------------- */

const CREATURE_STYLES = {
  aurochs: {
    L: 1.18, H: 0.62, hump: 0.20, neck: 0.62, head: 0.30, headDrop: 0.02,
    horns: "curved", tail: "tuft", legs: 0.58, belly: 0.50,
  },
  horse: {
    L: 1.02, H: 0.44, hump: 0.07, neck: 0.74, head: 0.32, headDrop: 0.06,
    horns: null, tail: "long", legs: 0.72, belly: 0.30,
  },
  deer: {
    L: 0.96, H: 0.42, hump: 0.06, neck: 0.62, head: 0.25, headDrop: 0.03,
    antlers: true, tail: "short", legs: 0.74, belly: 0.28,
  },
  bison: {
    L: 1.12, H: 0.70, hump: 0.28, neck: 0.50, head: 0.24, headDrop: 0.08,
    horns: "short", tail: "short", legs: 0.52, belly: 0.54,
  },
};

/**
 * Draws one stylised cave creature as thick charcoal / ochre strokes.
 * Local coordinates: body length ~1, origin near the shoulder, y+ is down.
 */
function drawCreature(ctx, rng, cx, cy, s, styleName, color, lineWidth) {
  const st = CREATURE_STYLES[styleName];
  const flip = rng() < 0.5 ? -1 : 1;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(range(rng, -0.13, 0.13));
  ctx.scale(flip * s, s);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(0.6, lineWidth / s);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const L = st.L;
  const H = st.H;
  const hump = st.hump;

  // Body.
  ctx.beginPath();
  ctx.moveTo(-L * 0.55, -H * 0.5 - hump);
  ctx.bezierCurveTo(
    -L * 0.14, -H * 0.5 - hump * 1.5,
    L * 0.26, -H * 0.5 - hump * 0.6,
    L * 0.52, -H * 0.16
  );
  ctx.bezierCurveTo(L * 0.64, H * 0.02, L * 0.62, H * 0.34, L * 0.4, H * 0.46);
  ctx.bezierCurveTo(
    L * 0.1, H * 0.6, -L * 0.28, H * 0.6, -L * 0.46, H * 0.42
  );
  ctx.bezierCurveTo(
    -L * 0.64, H * 0.24, -L * 0.68, -H * 0.16,
    -L * 0.55, -H * 0.5 - hump
  );
  ctx.stroke();

  // Shoulder + neck + head.
  const sx = -L * 0.52;
  const sy = -H * 0.5 - hump * 0.7;
  const hx = sx - st.neck;
  const hy = sy - st.neck * 0.42 + st.headDrop;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.quadraticCurveTo(sx - st.neck * 0.52, sy - st.neck * 0.30, hx, hy - st.head * 0.28);
  ctx.moveTo(sx, sy + H * 0.48);
  ctx.quadraticCurveTo(sx - st.neck * 0.48, sy + H * 0.10, hx - st.head * 0.18, hy + st.head * 0.55);
  ctx.stroke();

  // Head.
  ctx.beginPath();
  ctx.moveTo(hx, hy - st.head * 0.52);
  ctx.bezierCurveTo(
    hx + st.head * 0.42, hy - st.head * 0.55,
    hx + st.head * 0.5, hy + st.head * 0.3,
    hx - st.head * 0.12, hy + st.head * 0.62
  );
  ctx.bezierCurveTo(
    hx - st.head * 0.62, hy + st.head * 0.78,
    hx - st.head * 1.15, hy + st.head * 0.18,
    hx - st.head * 0.92, hy - st.head * 0.22
  );
  ctx.stroke();

  // Legs (two pairs, near + far).
  const leg = (x, y, swing) => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + swing * 0.6, y + st.legs * 0.55, x + swing, y + st.legs);
    ctx.stroke();
  };
  leg(-L * 0.34, H * 0.44, range(rng, -0.08, 0.02));
  leg(-L * 0.20, H * 0.52, range(rng, 0.0, 0.1));
  leg(L * 0.26, H * 0.48, range(rng, -0.03, 0.08));
  leg(L * 0.42, H * 0.40, range(rng, -0.1, 0.02));

  // Tail.
  if (st.tail) {
    ctx.beginPath();
    ctx.moveTo(L * 0.5, -H * 0.12);
    if (st.tail === "long") {
      ctx.quadraticCurveTo(L * 0.86, H * 0.12, L * 0.72, H * 0.62);
    } else if (st.tail === "tuft") {
      ctx.quadraticCurveTo(L * 0.74, H * 0.1, L * 0.62, H * 0.4);
      ctx.moveTo(L * 0.62, H * 0.4);
      ctx.quadraticCurveTo(L * 0.72, H * 0.52, L * 0.56, H * 0.58);
    } else {
      ctx.quadraticCurveTo(L * 0.68, H * 0.12, L * 0.58, H * 0.36);
    }
    ctx.stroke();
  }

  // Horns / antlers.
  const topX = hx - st.head * 0.35;
  const topY = hy - st.head * 0.48;
  if (st.horns === "curved") {
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(topX - 0.1, topY - 0.3, topX + 0.18, topY - 0.32);
    ctx.moveTo(topX + 0.16, topY);
    ctx.quadraticCurveTo(topX + 0.32, topY - 0.26, topX + 0.6, topY - 0.16);
    ctx.stroke();
  } else if (st.horns === "short") {
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(topX - 0.12, topY - 0.2, topX + 0.08, topY - 0.22);
    ctx.moveTo(topX + 0.08, topY);
    ctx.quadraticCurveTo(topX + 0.2, topY - 0.18, topX + 0.42, topY - 0.12);
    ctx.stroke();
  }
  if (st.antlers) {
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(topX - 0.16, topY - 0.34, topX - 0.34, topY - 0.6);
    ctx.moveTo(topX - 0.12, topY - 0.2);
    ctx.lineTo(topX + 0.12, topY - 0.42);
    ctx.moveTo(topX - 0.22, topY - 0.38);
    ctx.lineTo(topX - 0.44, topY - 0.46);
    ctx.moveTo(topX - 0.28, topY - 0.5);
    ctx.lineTo(topX - 0.5, topY - 0.62);
    ctx.stroke();
  }

  // Optional inner contour, a common cave-art touch.
  if (rng() < 0.55) {
    ctx.beginPath();
    ctx.moveTo(-L * 0.42, -H * 0.34);
    ctx.bezierCurveTo(-L * 0.05, -H * 0.42, L * 0.2, -H * 0.36, L * 0.38, -H * 0.1);
    ctx.stroke();
  }

  ctx.restore();
}

function drawOutlineLayer(ctx, W, H, rng) {
  ctx.clearRect(0, 0, W, H);
  const count = 5 + Math.floor(rng() * 3);
  for (let i = 0; i < count; i++) {
    const style = pick(rng, ["aurochs", "horse", "deer", "bison", "horse"]);
    const s = range(rng, H * 0.17, H * 0.28);
    const cx = range(rng, W * 0.14, W * 0.86);
    const cy = range(rng, H * 0.32, H * 0.72);
    drawCreature(ctx, rng, cx, cy, s, style, "#171310", H * 0.013);
  }
  // Scattered charcoal marks and a few abstract signs.
  ctx.fillStyle = "#171310";
  for (let i = 0; i < 70; i++) {
    const x = rng() * W;
    const y = rng() * H;
    const r = range(rng, 1, H * 0.012);
    ctx.globalAlpha = range(rng, 0.25, 0.8);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 4; i++) {
    const x = range(rng, W * 0.1, W * 0.9);
    const y = range(rng, H * 0.1, H * 0.4);
    ctx.strokeStyle = "#171310";
    ctx.lineWidth = H * 0.008;
    ctx.beginPath();
    for (let k = 0; k < 5; k++) {
      ctx.lineTo(x + k * H * 0.03, y + Math.sin(k * 2.2) * H * 0.02);
    }
    ctx.stroke();
  }
}

function drawPigmentLayer(ctx, W, H, rng) {
  ctx.clearRect(0, 0, W, H);
  // Broad ochre washes.
  for (let i = 0; i < 26; i++) {
    const x = rng() * W;
    const y = rng() * H;
    const r = range(rng, H * 0.05, H * 0.2);
    const g = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
    g.addColorStop(0, "rgba(150,52,24,0.55)");
    g.addColorStop(0.7, "rgba(120,38,18,0.24)");
    g.addColorStop(1, "rgba(90,28,14,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Painted (thick) animals.
  for (let i = 0; i < 3; i++) {
    const style = pick(rng, ["aurochs", "bison", "horse"]);
    const s = range(rng, H * 0.16, H * 0.26);
    const cx = range(rng, W * 0.18, W * 0.82);
    const cy = range(rng, H * 0.35, H * 0.7);
    drawCreature(
      ctx, rng, cx, cy, s, style, "rgba(158,54,26,0.5)", H * 0.05
    );
  }
  // Positive hand prints.
  ctx.fillStyle = "rgba(158,54,26,0.42)";
  for (let i = 0; i < 4; i++) {
    drawHand(ctx, rng() * W, rng() * H, range(rng, H * 0.05, H * 0.1), range(rng, -0.3, 0.3));
  }
}

function drawEngravingLayer(ctx, W, H, rng) {
  ctx.clearRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineCap = "round";
  // Fine incised animal outlines.
  for (let i = 0; i < 4; i++) {
    const style = pick(rng, ["horse", "deer", "aurochs"]);
    const s = range(rng, H * 0.14, H * 0.24);
    ctx.lineWidth = Math.max(1, H * 0.0035);
    drawCreature(ctx, rng, rng() * W, range(rng, H * 0.3, H * 0.75), s, style, "rgba(255,255,255,0.8)", H * 0.0035);
  }
  // Hatching / raking-light scratches.
  for (let c = 0; c < 16; c++) {
    const x = rng() * W;
    const y = rng() * H;
    const len = range(rng, H * 0.04, H * 0.16);
    const ang = range(rng, -1.1, 1.1);
    const n = 4 + Math.floor(rng() * 7);
    ctx.lineWidth = Math.max(0.7, H * 0.0022);
    for (let k = 0; k < n; k++) {
      const off = (k - n / 2) * H * 0.008;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(ang + Math.PI / 2) * off, y + Math.sin(ang + Math.PI / 2) * off);
      ctx.lineTo(
        x + Math.cos(ang) * len + Math.cos(ang + Math.PI / 2) * off,
        y + Math.sin(ang) * len + Math.sin(ang + Math.PI / 2) * off
      );
      ctx.stroke();
    }
  }
  // Chevrons along a few paths.
  for (let c = 0; c < 5; c++) {
    let x = rng() * W;
    let y = rng() * H;
    ctx.lineWidth = Math.max(0.8, H * 0.0026);
    ctx.beginPath();
    for (let k = 0; k < 8; k++) {
      const nx = x + H * 0.05;
      ctx.moveTo(x, y);
      ctx.lineTo(nx, y - H * 0.02);
      ctx.moveTo(x, y);
      ctx.lineTo(nx, y + H * 0.02);
      x = nx;
      y += Math.sin(k) * H * 0.01;
    }
    ctx.stroke();
  }
}

function drawStencilLayer(ctx, W, H, rng) {
  ctx.clearRect(0, 0, W, H);
  const count = 5 + Math.floor(rng() * 3);
  for (let i = 0; i < count; i++) {
    const x = rng() * W;
    const y = rng() * H;
    const s = range(rng, H * 0.06, H * 0.12);
    const rot = range(rng, -0.4, 0.4);
    // Ochre spray cloud.
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(s, s);
    for (let k = 0; k < 3; k++) {
      const ox = range(rng, -0.25, 0.25);
      const oy = range(rng, -0.2, 0.2);
      const r = range(rng, 0.85, 1.35);
      const g = ctx.createRadialGradient(ox, oy, 0.1, ox, oy, r);
      g.addColorStop(0, "rgba(150,52,24,0.85)");
      g.addColorStop(0.6, "rgba(126,40,20,0.55)");
      g.addColorStop(1, "rgba(90,28,14,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(ox, oy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // Punch the hand out of the spray -> negative stencil.
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "#000";
    drawHand(ctx, 0, 0, 1, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
  }
  // A few sprayed finger flicks.
  ctx.strokeStyle = "rgba(150,52,24,0.6)";
  for (let i = 0; i < 14; i++) {
    ctx.lineWidth = range(rng, H * 0.004, H * 0.014);
    ctx.beginPath();
    const x = rng() * W;
    const y = rng() * H;
    ctx.moveTo(x, y);
    ctx.lineTo(x + range(rng, -H * 0.06, H * 0.06), y + range(rng, -H * 0.02, H * 0.06));
    ctx.stroke();
  }
}

function drawHand(ctx, x, y, s, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.ellipse(0, 0.06, 0.2, 0.25, 0, 0, Math.PI * 2);
  ctx.ellipse(-0.13, -0.16, 0.055, 0.16, -0.22, 0, Math.PI * 2);
  ctx.ellipse(-0.04, -0.22, 0.055, 0.18, -0.07, 0, Math.PI * 2);
  ctx.ellipse(0.06, -0.21, 0.055, 0.17, 0.1, 0, Math.PI * 2);
  ctx.ellipse(0.15, -0.15, 0.05, 0.15, 0.28, 0, Math.PI * 2);
  ctx.ellipse(-0.2, 0.07, 0.075, 0.13, -0.85, 0, Math.PI * 2);
  ctx.ellipse(0, 0.3, 0.13, 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Builds the four authored layers for one wall. */
function makeArtworkTextures(width, height, seed) {
  const rng = mulberry32(seed);
  const outline = makeCanvas(width, height);
  const pigment = makeCanvas(width, height);
  const engraving = makeCanvas(width, height);
  const stencil = makeCanvas(width, height);

  drawOutlineLayer(outline.ctx, width, height, rng);
  drawPigmentLayer(pigment.ctx, width, height, rng);
  drawEngravingLayer(engraving.ctx, width, height, rng);
  drawStencilLayer(stencil.ctx, width, height, rng);

  return {
    outline: canvasTexture(outline.canvas),
    pigment: canvasTexture(pigment.canvas),
    engraving: canvasTexture(engraving.canvas),
    stencil: canvasTexture(stencil.canvas),
  };
}

/* ------------------------------- shaders -------------------------------- */

const WALL_VERTEX = `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const WALL_FRAGMENT = `
  precision highp float;
  varying vec2 vUv;
  varying vec3 vWorldPos;

  uniform vec3 uTorchPos;
  uniform vec3 uTorchDir;
  uniform float uReveal;
  uniform float uTime;
  uniform float uRange;
  uniform float uInnerCos;
  uniform float uOuterCos;
  uniform float uSeed;

  uniform sampler2D uOutlineMap;
  uniform sampler2D uPigmentMap;
  uniform sampler2D uEngravingMap;
  uniform sampler2D uStencilMap;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 345.45));
    p += dot(p, p + 34.345);
    return fract(p.x * p.y);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * vnoise(p);
      p = p * 2.03 + 17.1;
      a *= 0.5;
    }
    return v;
  }
  float ridged(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      float n = 1.0 - abs(vnoise(p) * 2.0 - 1.0);
      v += a * n * n;
      p = p * 2.11 + 9.3;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    vec2 rp = uv * vec2(7.0, 4.5) + uSeed * 11.0;
    float grain = fbm(rp * 4.0);
    float mott = fbm(rp * 1.1 + 3.7);
    float veins = ridged(rp * 1.7 + fbm(rp * 0.9) * 1.2);

    vec3 rock = mix(
      vec3(0.055, 0.045, 0.035),
      vec3(0.155, 0.130, 0.100),
      clamp(mott * 0.9 + grain * 0.25, 0.0, 1.0)
    );
    rock *= 1.0 - smoothstep(0.55, 0.95, veins) * 0.45;
    rock += (grain - 0.5) * 0.025;

    // Moving pool of light.
    vec3 toFrag = vWorldPos - uTorchPos;
    float dist = length(toFrag);
    vec3 d = toFrag / max(dist, 1e-4);
    float cosA = dot(d, uTorchDir);
    float cone = smoothstep(uOuterCos, uInnerCos, cosA);
    float rangeFade = 1.0 - smoothstep(uRange * 0.55, uRange, dist);
    float mask = cone * rangeFade * clamp(uReveal, 0.0, 1.0);
    float flick = 0.88 + 0.12 * sin(uTime * 8.0 + vWorldPos.x * 15.0 + vWorldPos.y * 11.0);
    mask *= flick;
    mask = smoothstep(0.02, 0.92, clamp(mask, 0.0, 1.0));
    float light = mask;

    float engrave = texture2D(uEngravingMap, uv).r;
    float outline = texture2D(uOutlineMap, uv).r;
    float pigment = texture2D(uPigmentMap, uv).r;
    float stencil = texture2D(uStencilMap, uv).r;

    // Different layers need different amounts of light; engravings show first,
    // pigment and outlines resolve only in the bright core.  Nothing is stored:
    // moving the beam away recomputes the mask and the layers fade out again.
    float aEng = engrave * smoothstep(0.04, 0.28, mask) * 0.9;
    float aPig = pigment * smoothstep(0.30, 0.70, mask);
    float aSt = stencil * smoothstep(0.22, 0.60, mask);
    float aOut = outline * smoothstep(0.16, 0.52, mask);

    vec3 col = rock * (0.14 + 1.55 * light);
    col *= mix(vec3(1.0), vec3(1.18, 1.02, 0.78), light);
    col += vec3(0.16, 0.085, 0.035) * pow(light, 2.2);

    col = mix(col, vec3(0.60, 0.55, 0.47), aEng * 0.55);
    col = mix(col, vec3(0.72, 0.24, 0.11), aPig * 0.92);
    col = mix(col, vec3(0.80, 0.35, 0.19), aSt * 0.92);
    col = mix(col, vec3(0.045, 0.032, 0.024), aOut);
    col += vec3(0.10, 0.05, 0.02) * pow(light, 3.0);

    gl_FragColor = vec4(col, 1.0);
  }
`;

const BEAM_VERTEX = `
  varying float vT;
  void main() {
    vT = clamp(-position.z / 6.0, 0.0, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const BEAM_FRAGMENT = `
  precision highp float;
  uniform float uFade;
  varying float vT;
  void main() {
    float a = uFade * (1.0 - vT) * (1.0 - vT) * 0.13;
    gl_FragColor = vec4(vec3(1.0, 0.72, 0.42), a);
  }
`;

/* ------------------------------- the torch ------------------------------ */

const TORCH_HIT_RADIUS = 0.12;

class Torch extends xb.Script {
  constructor(state) {
    super();
    this.name = "Virtual Torch";
    this.state = state;
    this.carried = false;
    this.heldBy = null;
    this.hovered = false;
    this._hover = 0;
    this._t = 0;
    this._last = 0;
    this._isDesktop = false;

    this._tmp = new THREE.Vector3();
    this._origin = new THREE.Vector3();
    this._up = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._forward = new THREE.Vector3();
    this._aim = new THREE.Vector3();
    this._quat = new THREE.Quaternion();
    this._desired = new THREE.Quaternion();
    this._axis = new THREE.Vector3(0, 0, -1);

    // Semantic tag: the ray-selectable torch.
    this.userData.xrblocksDevtools = { tag: "virtual-torch" };
  }

  init() {
    this.buildModel();
    this.rest = new THREE.Vector3(0.44, 1.16, -1.02);
    this.restEuler = new THREE.Euler(0.32, -0.55, 0.28);
    this.position.copy(this.rest);
    this.quaternion.setFromEuler(this.restEuler);
  }

  buildModel() {
    // Handle.
    const handleGeo = new THREE.CylinderGeometry(0.017, 0.024, 0.34, 14);
    handleGeo.rotateX(Math.PI / 2);
    const handleMat = new THREE.MeshStandardMaterial({
      color: 0x4a3320,
      roughness: 0.85,
      metalness: 0.05,
      emissive: 0x140b04,
    });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.z = 0.19;
    this.add(handle);
    this.handle = handle;

    // Grip rings.
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x2c1d10,
      roughness: 1,
    });
    for (const z of [0.08, 0.16, 0.24]) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.022, 0.004, 6, 16),
        ringMat
      );
      ring.position.z = z;
      this.add(ring);
    }

    // Bowl / head.
    const bowlGeo = new THREE.CylinderGeometry(0.05, 0.036, 0.07, 18);
    bowlGeo.rotateX(Math.PI / 2);
    const bowlMat = new THREE.MeshStandardMaterial({
      color: 0x3a2a1c,
      roughness: 0.7,
      metalness: 0.25,
      emissive: 0x2a1305,
    });
    const bowl = new THREE.Mesh(bowlGeo, bowlMat);
    bowl.position.z = -0.005;
    this.add(bowl);
    this.bowl = bowl;

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.05, 0.008, 8, 22),
      bowlMat
    );
    rim.position.z = -0.04;
    this.add(rim);

    // Flame.
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffcf7a });
    this.flame = new THREE.Mesh(new THREE.IcosahedronGeometry(0.028, 1), flameMat);
    this.flame.position.z = -0.035;
    this.add(this.flame);

    // Soft glow sprite.
    const glowCanvas = makeCanvas(128, 128);
    const gctx = glowCanvas.ctx;
    const grad = gctx.createRadialGradient(64, 64, 2, 64, 64, 64);
    grad.addColorStop(0, "rgba(255,220,150,1)");
    grad.addColorStop(0.35, "rgba(255,170,80,0.55)");
    grad.addColorStop(1, "rgba(255,120,40,0)");
    gctx.fillStyle = grad;
    gctx.fillRect(0, 0, 128, 128);
    this.glowTexture = canvasTexture(glowCanvas.canvas);
    this.glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.glowTexture,
        color: 0xffffff,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.9,
      })
    );
    this.glow.position.z = -0.035;
    this.glow.scale.setScalar(0.28);
    this.glow.xb = { pointerEvents: "none" };
    this.add(this.glow);

    // Lights.
    this.point = new THREE.PointLight(0xffa94d, 3.0, 3.0, 2.0);
    this.point.position.z = -0.05;
    this.add(this.point);

    this.spot = new THREE.SpotLight(0xffb060, 0.0, 12.0, 0.33, 0.6, 1.3);
    this.spot.position.set(0, 0, 0);
    this.spotTarget = new THREE.Object3D();
    this.spotTarget.position.set(0, 0, -1);
    this.add(this.spot);
    this.add(this.spotTarget);
    this.spot.target = this.spotTarget;

    // Beam cone (apex at the torch head, opening forward / -Z).
    const beamGeo = new THREE.ConeGeometry(2.0, 6, 40, 1, true);
    beamGeo.rotateX(Math.PI / 2);
    beamGeo.translate(0, 0, -3);
    this.beam = new THREE.Mesh(
      beamGeo,
      new THREE.ShaderMaterial({
        uniforms: { uFade: { value: 0 } },
        vertexShader: BEAM_VERTEX,
        fragmentShader: BEAM_FRAGMENT,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      })
    );
    this.beam.visible = false;
    this.beam.xb = { pointerEvents: "none" };
    this.add(this.beam);

    // Invisible, slightly enlarged hit volume so the torch is easy to select.
    const hitMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.hitVolume = new THREE.Mesh(
      new THREE.SphereGeometry(TORCH_HIT_RADIUS, 16, 12),
      hitMat
    );
    this.hitVolume.name = "Torch hit volume";
    this.add(this.hitVolume);

    // Selection affordance ring.
    this.selectRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.13, 0.004, 6, 36),
      new THREE.MeshBasicMaterial({
        color: 0xffb066,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      })
    );
    this.selectRing.xb = { pointerEvents: "none" };
    this.add(this.selectRing);

    // Materials that must be disposed later.
    this._materials = [handleMat, ringMat, bowlMat, flameMat, hitMat];
  }

  /* -------------------------- interaction -------------------------- */

  onHoverEnter() {
    this.hovered = true;
  }

  onHoverExit() {
    this.hovered = false;
  }

  onObjectSelectStart(event) {
    if (!this.carried) {
      this.pickUp(event.source && event.source.controller);
      event.stopPropagation();
    }
  }

  pickUp(controller) {
    this.carried = true;
    this.heldBy = controller || null;
    this.hovered = false;
    // The torch is now part of the controller; it should not keep capturing
    // pointer events from itself.
    this.xb = Object.assign({}, this.xb, { pointerEvents: "none" });
    // A small pop of feedback on pickup.
    this._pickBurst = 1;
  }

  /* ----------------------------- runtime ----------------------------- */

  update(time) {
    const now = typeof time === "number" ? time : performance.now();
    let dt = (now - this._last) / 1000;
    if (!(dt > 0) || dt > 0.25) dt = 1 / 60;
    this._last = now;
    this._t += dt;

    this._hover += ((this.hovered ? 1 : 0) - this._hover) * Math.min(1, dt * 10);

    const targetReveal = this.carried ? 1 : 0;
    this.state.reveal += (targetReveal - this.state.reveal) * Math.min(1, dt * 3);

    if (this.carried) {
      this.updateCarried(dt);
    } else {
      this.updateRest(dt);
    }

    // Keep a lightly damped copy of the beam for the walls. On the first
    // carried frame snap it to the torch so pick-up does not sweep the pool.
    if (this.carried && !this._carriedLast) {
      this.state.lightOrigin.copy(this.state.origin);
      this.state.lightDir.copy(this.state.dir);
    }
    this._carriedLast = this.carried;
    const k = Math.min(1, dt * 7.0);
    this.state.lightOrigin.lerp(this.state.origin, k);
    this.state.lightDir.lerp(this.state.dir, k);
    if (this.state.lightDir.lengthSq() > 1e-6) this.state.lightDir.normalize();

    const r = this.state.reveal;
    this.beam.visible = r > 0.01;
    if (this.beam.material.uniforms) {
      this.beam.material.uniforms.uFade.value = r;
    }
    const pulse = 0.5 + 0.5 * Math.sin(this._t * 6.0);
    this.glow.material.opacity = (this.carried ? 0.55 : 0.75) + pulse * 0.25;
    this.glow.scale.setScalar(0.22 + r * 0.1 + pulse * 0.03);
    this.flame.scale.setScalar(0.8 + 0.25 * Math.sin(this._t * 13.0) + r * 0.4);
    this.spot.intensity = 95 * r;
    this.point.intensity = 2.2 + 5.5 * r;

    // Selection affordance: hover pop + slow rotating ring.
    const pop = this._hover * 0.12 + (this.carried ? 0 : 0);
    this.scale.setScalar(1 + pop);
    this.selectRing.rotation.z += dt * 1.2;
    this.selectRing.visible = !this.carried;
    this.selectRing.material.opacity =
      (0.22 + 0.22 * this._hover) * (0.7 + 0.3 * pulse);
  }

  updateRest(dt) {
    const bob = Math.sin(this._t * 1.4) * 0.035;
    this.position.set(
      this.rest.x,
      this.rest.y + bob,
      this.rest.z
    );
    this.rotation.set(
      this.restEuler.x,
      this.restEuler.y + Math.sin(this._t * 0.5) * 0.18,
      this.restEuler.z + Math.sin(this._t * 0.37) * 0.05
    );
    this.getWorldPosition(this._origin);
    this.getWorldQuaternion(this._quat);
    this._forward.set(0, 0, -1).applyQuaternion(this._quat).normalize();
    this.state.origin.copy(this._origin);
    this.state.dir.copy(this._forward);
  }

  updateCarried(dt) {
    if (!this.heldBy) {
      this.heldBy = this.findController();
    }
    if (!this.heldBy) {
      this.updateRest(dt);
      return;
    }
    const c = this.heldBy;
    this._isDesktop = !!(c.userData && c.userData.id === 3);

    c.updateWorldMatrix(true, false);
    c.getWorldPosition(this._origin);
    c.getWorldQuaternion(this._quat);

    const forward = this._forward.set(0, 0, -1).applyQuaternion(this._quat).normalize();
    const right = this._right.set(1, 0, 0).applyQuaternion(this._quat).normalize();
    const up = this._up.set(0, 1, 0).applyQuaternion(this._quat).normalize();

    // The user aims with the controller ray; find where it meets a prepared
    // wall so the pool of light lands exactly where they point.
    const aim = this.raycastWalls(this._origin, forward);

    const fwdOff = this._isDesktop ? 0.34 : 0.15;
    const sideOff = this._isDesktop ? 0.18 : 0.09;
    const downOff = this._isDesktop ? 0.13 : 0.06;
    const torchPos = this._tmp
      .copy(this._origin)
      .addScaledVector(forward, fwdOff)
      .addScaledVector(right, sideOff)
      .addScaledVector(up, -downOff);
    this.position.copy(torchPos);

    const beamDir = this._aim.copy(aim).sub(torchPos);
    if (beamDir.lengthSq() < 1e-6) beamDir.copy(forward);
    beamDir.normalize();
    // Orient so the torch's local -Z (the beam / bowl) points at the aim point.
    this._desired.setFromUnitVectors(this._axis, beamDir);
    this.quaternion.slerp(this._desired, Math.min(1, dt * 18));

    this.state.origin.copy(torchPos);
    this.state.dir.copy(beamDir);
  }

  raycastWalls(origin, dir) {
    let bestT = Infinity;
    let best = null;
    const planes = this.state.wallPlanes;
    for (let i = 0; i < planes.length; i++) {
      const w = planes[i];
      const denom = dir.dot(w.normal);
      if (Math.abs(denom) < 1e-4) continue;
      const t = w.center.clone().sub(origin).dot(w.normal) / denom;
      if (t < 0.05 || t >= bestT) continue;
      const point = origin.clone().addScaledVector(dir, t);
      const rel = point.clone().sub(w.center);
      const lx = rel.dot(w.right);
      const ly = rel.y;
      if (Math.abs(lx) > w.halfW * 1.15 || Math.abs(ly) > w.halfH * 1.15) continue;
      bestT = t;
      best = point;
    }
    if (best) return best;
    return origin.clone().addScaledVector(dir, 3.0);
  }

  findController() {
    const list = xb.user && xb.user.controllers ? xb.user.controllers : [];
    for (const c of list) {
      if (!c || !c.userData) continue;
      if (c.userData.connected && c.userData.id !== 2) return c;
    }
    return list[3] || list[0] || null;
  }

  dispose() {
    this.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) {
          if (m.map) m.map.dispose();
          m.dispose();
        }
      }
    });
    if (this.glowTexture) this.glowTexture.dispose();
  }
}

/* ------------------------------- cave walls ----------------------------- */

class CaveWalls extends xb.Script {
  constructor(state) {
    super();
    this.name = "Prehistoric cave walls";
    this.state = state;
    this.shared = {
      uTorchPos: { value: new THREE.Vector3(0, 1.2, -1.0) },
      uTorchDir: { value: new THREE.Vector3(0, 0, -1) },
      uReveal: { value: 0 },
      uTime: { value: 0 },
      uRange: { value: 8.0 },
      uInnerCos: { value: Math.cos(0.16) },
      uOuterCos: { value: Math.cos(0.33) },
    };
    this.materials = [];
    this.textures = [];
    this.planes = state.wallPlanes;
  }

  init() {
    const wallDefs = [
      {
        name: "North wall",
        position: new THREE.Vector3(0, 1.45, -2.7),
        rotY: 0,
        w: 3.8,
        h: 2.5,
        seed: 101,
        tag: "artwork-reveal-region",
      },
      {
        name: "West wall",
        position: new THREE.Vector3(-2.7, 1.45, -0.1),
        rotY: Math.PI / 2,
        w: 3.4,
        h: 2.5,
        seed: 202,
      },
      {
        name: "East wall",
        position: new THREE.Vector3(2.7, 1.45, -0.1),
        rotY: -Math.PI / 2,
        w: 3.4,
        h: 2.5,
        seed: 303,
      },
    ];

    for (const def of wallDefs) {
      this.buildWall(def);
    }

    // Floor and ceiling close the cave and catch the physical torch light.
    const caveMat = new THREE.MeshStandardMaterial({
      color: 0x2a231b,
      roughness: 1.0,
      metalness: 0.0,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), caveMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.0;
    floor.name = "Cave floor";
    this.add(floor);

    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), caveMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 3.3;
    ceiling.name = "Cave ceiling";
    this.add(ceiling);
    this.caveMaterial = caveMat;
  }

  buildWall(def) {
    const group = new THREE.Group();
    group.name = def.name;
    group.position.copy(def.position);
    group.rotation.y = def.rotY;
    this.add(group);

    const textures = makeArtworkTextures(1024, Math.round((1024 * def.h) / def.w), def.seed);
    this.textures.push(
      textures.outline,
      textures.pigment,
      textures.engraving,
      textures.stencil
    );

    const uniforms = {
      uTorchPos: this.shared.uTorchPos,
      uTorchDir: this.shared.uTorchDir,
      uReveal: this.shared.uReveal,
      uTime: this.shared.uTime,
      uRange: this.shared.uRange,
      uInnerCos: this.shared.uInnerCos,
      uOuterCos: this.shared.uOuterCos,
      uSeed: { value: (def.seed % 97) * 0.37 },
      uOutlineMap: { value: textures.outline },
      uPigmentMap: { value: textures.pigment },
      uEngravingMap: { value: textures.engraving },
      uStencilMap: { value: textures.stencil },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: WALL_VERTEX,
      fragmentShader: WALL_FRAGMENT,
      side: THREE.FrontSide,
    });
    this.materials.push(material);

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(def.w, def.h), material);
    mesh.name = def.name + " artwork region";
    group.add(mesh);

    if (def.tag) {
      mesh.userData.xrblocksDevtools = { tag: def.tag };
    }

    // Register the wall plane so the torch can aim exactly at it.
    const normal = new THREE.Vector3(0, 0, 1).applyEuler(group.rotation);
    const right = new THREE.Vector3(1, 0, 0).applyEuler(group.rotation);
    this.planes.push({
      center: def.position.clone(),
      normal: normal.normalize(),
      right: right.normalize(),
      halfW: def.w / 2,
      halfH: def.h / 2,
    });
  }

  update(time) {
    const t = typeof time === "number" ? time * 0.001 : performance.now() * 0.001;
    this.shared.uTime.value = t;
    this.shared.uTorchPos.value.copy(this.state.lightOrigin);
    this.shared.uTorchDir.value.copy(this.state.lightDir);
    this.shared.uReveal.value = this.state.reveal;
  }

  dispose() {
    for (const m of this.materials) m.dispose();
    for (const t of this.textures) t.dispose();
    if (this.caveMaterial) this.caveMaterial.dispose();
  }
}

/* --------------------------------- app ---------------------------------- */

class LascauxTorchApp extends xb.Script {
  constructor() {
    super();
    this.name = "Lascaux Torch";
    this.state = {
      origin: new THREE.Vector3(0.44, 1.16, -1.0),
      dir: new THREE.Vector3(0, 0, -1),
      // Smoothed copy used by the revealed surfaces. The pool trails the
      // torch very briefly so an area it leaves fades instead of snapping,
      // but nothing is ever stored: the mask is recomputed every frame.
      lightOrigin: new THREE.Vector3(0.44, 1.16, -1.0),
      lightDir: new THREE.Vector3(0, 0, -1),
      reveal: 0,
      wallPlanes: [],
    };
  }

  init() {
    this.add(new THREE.HemisphereLight(0x8899bb, 0x201108, 0.5));
    this.add(new THREE.AmbientLight(0x334155, 0.25));

    this.torch = new Torch(this.state);
    this.walls = new CaveWalls(this.state);
    this.add(this.torch);
    this.add(this.walls);

    try {
      this.add(this.buildInstructions());
    } catch (error) {
      console.warn("Lascaux Torch: instructions UI unavailable.", error);
    }
  }

  buildInstructions() {
    this.instructionText = new xb.UIText({
      text:
        "Point the ray at the floating torch and select / click / pinch to pick it up.",
      pointerEvents: "none",
      style: {
        fontSize: 22,
        lineHeight: 1.35,
        textAlign: "center",
      },
    });
    const overlay = new xb.UIOverlay({
      pointerEvents: "none",
      style: {
        width: 780,
        position: "absolute",
        left: "-50%",
        bottom: 28,
        transform: { translateX: "-50%" },
      },
      children: [
        new xb.UIText({
          text: "LASCAUX TORCH",
          pointerEvents: "none",
          style: { fontSize: 20, fontWeight: "bold", textAlign: "center" },
        }),
        this.instructionText,
      ],
    });
    overlay.name = "Lascaux instructions";
    return overlay;
  }

  update() {
    if (!this.instructionText || !this.torch) return;
    const next = this.torch.carried
      ? "Aim the beam across the cave walls. Move the light away and the art fades back into the rock."
      : "Point the ray at the floating torch and select / click / pinch to pick it up.";
    if (this.instructionText.text !== next) this.instructionText.text = next;
  }
}

/* -------------------------------- bootstrap ----------------------------- */

async function start() {
  const options = new xb.Options();
  options.setAppTitle("Lascaux Torch");
  options.setAppDescription(
    "Carry a virtual torch through the cave to reveal prehistoric paintings."
  );
  options.enableReticles();
  options.controllers.visualizeRays = true;
  // Surface the desktop simulator in a plain development preview.
  options.xrButton.showEnterSimulatorButton = true;
  // Mouse-driven selection is the most reliable desktop default.
  options.simulator.defaultMode = xb.SimulatorMode.POSE;

  xb.add(new LascauxTorchApp());
  await xb.init(options);
}

document.addEventListener("DOMContentLoaded", start);
