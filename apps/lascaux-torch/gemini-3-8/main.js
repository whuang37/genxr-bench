import * as THREE from 'three';
import * as xb from 'xrblocks';

// ============================================================================
// Lascaux Torch - Procedural Prehistoric Cave Artwork Generator
// ============================================================================

/**
 * Creates a visually quiet, textured limestone cave rock canvas.
 */
function createBaseRockCanvas(width, height, seed = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Multi-stop gradient for realistic cave limestone variation
  const grad = ctx.createRadialGradient(
    width * 0.45, height * 0.45, width * 0.1,
    width * 0.5, height * 0.5, width * 0.75
  );
  grad.addColorStop(0, '#383028');
  grad.addColorStop(0.35, '#2e2722');
  grad.addColorStop(0.7, '#241f1a');
  grad.addColorStop(1, '#1a1613');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Geological rock strata & subtle texture patches
  for (let i = 0; i < 45; i++) {
    const rx = ((Math.sin(seed + i * 3.7) + 1) * 0.5) * width;
    const ry = ((Math.cos(seed + i * 5.1) + 1) * 0.5) * height;
    const rad = 60 + ((Math.sin(seed + i * 2.3) + 1) * 0.5) * 140;
    const patchGrad = ctx.createRadialGradient(rx, ry, 5, rx, ry, rad);
    const alpha = 0.08 + ((Math.sin(i * 1.7) + 1) * 0.5) * 0.12;
    const isLight = i % 2 === 0;
    patchGrad.addColorStop(0, isLight ? `rgba(90, 78, 65, ${alpha})` : `rgba(18, 15, 12, ${alpha})`);
    patchGrad.addColorStop(1, 'rgba(30, 25, 20, 0)');
    ctx.fillStyle = patchGrad;
    ctx.beginPath();
    ctx.arc(rx, ry, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  // Rocky fissures and natural calcite mineral veins
  ctx.lineWidth = 1.2;
  for (let v = 0; v < 14; v++) {
    let vx = ((Math.sin(seed * 2 + v * 7.1) + 1) * 0.5) * width;
    let vy = ((Math.cos(seed * 3 + v * 4.3) + 1) * 0.5) * height;
    ctx.strokeStyle = v % 3 === 0 ? 'rgba(75, 65, 55, 0.25)' : 'rgba(12, 10, 8, 0.35)';
    ctx.beginPath();
    ctx.moveTo(vx, vy);
    for (let s = 0; s < 18; s++) {
      vx += (Math.sin(seed + v * 10 + s) * 22) + (s % 2 === 0 ? 15 : -10);
      vy += (Math.cos(seed * 1.5 + v * 8 + s) * 18) + 12;
      ctx.lineTo(vx, vy);
    }
    ctx.stroke();
  }

  // Fine rock grain / porosity noise
  ctx.fillStyle = 'rgba(15, 12, 10, 0.18)';
  for (let p = 0; p < 1800; p++) {
    const px = Math.random() * width;
    const py = Math.random() * height;
    ctx.fillRect(px, py, 1.5, 1.5);
  }
  ctx.fillStyle = 'rgba(120, 105, 90, 0.12)';
  for (let p = 0; p < 1200; p++) {
    const px = Math.random() * width;
    const py = Math.random() * height;
    ctx.fillRect(px, py, 1.2, 1.2);
  }

  return canvas;
}

/**
 * Creates the authentic prehistoric hand-stencil layer.
 * Negative silhouettes created by blown powdered red ochre / manganese pigment.
 */
function createHandStencilsCanvas(width, height, stencilConfigs) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  for (const cfg of stencilConfigs) {
    const { x, y, scale = 1.0, angle = 0, color = 'red' } = cfg;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);

    // Blown pigment cloud (halo)
    const haloRadius = 150;
    const grad = ctx.createRadialGradient(0, 0, 15, 0, 0, haloRadius);
    if (color === 'red') {
      grad.addColorStop(0, 'rgba(175, 42, 22, 0.95)');
      grad.addColorStop(0.3, 'rgba(155, 36, 18, 0.8)');
      grad.addColorStop(0.65, 'rgba(125, 28, 14, 0.4)');
      grad.addColorStop(1, 'rgba(95, 20, 10, 0)');
    } else {
      // Charcoal / manganese black stencil
      grad.addColorStop(0, 'rgba(32, 26, 22, 0.95)');
      grad.addColorStop(0.3, 'rgba(28, 22, 18, 0.75)');
      grad.addColorStop(0.65, 'rgba(24, 18, 14, 0.35)');
      grad.addColorStop(1, 'rgba(15, 12, 10, 0)');
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, haloRadius, 0, Math.PI * 2);
    ctx.fill();

    // Natural pigment splatter particles blown around the hand
    ctx.fillStyle = color === 'red' ? 'rgba(185, 48, 25, 0.85)' : 'rgba(38, 30, 24, 0.85)';
    for (let i = 0; i < 280; i++) {
      const r = Math.pow(Math.random(), 0.65) * haloRadius;
      const theta = Math.random() * Math.PI * 2;
      const dotRadius = 0.6 + Math.random() * 2.4;
      ctx.beginPath();
      ctx.arc(Math.cos(theta) * r, Math.sin(theta) * r, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Cut out the hand shape so bare rock appears underneath (true negative stencil)
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0, 0, 0, 1)';

    // Palm
    ctx.beginPath();
    ctx.ellipse(0, 8, 33, 39, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wrist
    ctx.beginPath();
    ctx.rect(-25, 28, 50, 48);
    ctx.fill();

    // 5 splayed prehistoric fingers
    const fingers = [
      { x: -32, y: 3, rot: -0.85, len: 46, w: 11.5 },  // Thumb
      { x: -18, y: -26, rot: -0.22, len: 66, w: 10.5 }, // Index
      { x: -2, y: -31, rot: 0.02, len: 73, w: 11.0 },  // Middle
      { x: 16, y: -26, rot: 0.22, len: 65, w: 10.5 },  // Ring
      { x: 29, y: -16, rot: 0.50, len: 52, w: 9.5 }    // Pinky
    ];

    for (const f of fingers) {
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rot);
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(-f.w / 2, -f.len, f.w, f.len, f.w / 2);
      } else {
        ctx.rect(-f.w / 2, -f.len, f.w, f.len);
      }
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  return canvas;
}

/**
 * Creates the earthy mineral pigment washes & body shading layer.
 * Iron oxide reds, yellow limonite ochres, and carbon black smudges.
 */
function createPigmentCanvas(width, height, motif) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  function drawPigmentWash(cx, cy, rx, ry, angle, color1, color2, alpha = 0.85) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.globalAlpha = alpha;
    const g = ctx.createRadialGradient(0, 0, 10, 0, 0, Math.max(rx, ry));
    g.addColorStop(0, color1);
    g.addColorStop(0.65, color2);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (motif === 'great-bull') {
    // Lascaux Great Bull / Aurochs body fills
    // Rich red ochre along flank and belly
    drawPigmentWash(width * 0.52, height * 0.52, 230, 130, -0.05, '#b83822', '#8c2816', 0.9);
    drawPigmentWash(width * 0.44, height * 0.50, 160, 110, 0.1, '#cf482a', '#942a17', 0.85);

    // Warm golden-yellow ochre along underbelly and groin
    drawPigmentWash(width * 0.54, height * 0.60, 170, 60, -0.02, '#c99232', '#996c1e', 0.8);
    drawPigmentWash(width * 0.38, height * 0.58, 120, 50, 0.05, '#d49e3c', '#8a6018', 0.75);

    // Heavy charcoal black across shoulder hump, brisket, and head
    drawPigmentWash(width * 0.35, height * 0.42, 140, 95, 0.25, '#221d19', '#151210', 0.95);
    drawPigmentWash(width * 0.28, height * 0.40, 110, 75, 0.15, '#1e1a17', '#120f0e', 0.9);
    drawPigmentWash(width * 0.22, height * 0.42, 85, 55, -0.1, '#1b1715', '#0f0d0c', 0.88);

    // Swimming Stags (secondary Lascaux motif on the right)
    drawPigmentWash(width * 0.78, height * 0.50, 95, 60, 0.1, '#c28930', '#855919', 0.85);
    drawPigmentWash(width * 0.84, height * 0.44, 75, 45, -0.2, '#aa3820', '#6e2012', 0.8);

    // Pigment speckle & hand-rubbed daubing texture
    ctx.fillStyle = '#b83b24';
    for (let i = 0; i < 450; i++) {
      const px = width * 0.3 + Math.random() * width * 0.55;
      const py = height * 0.35 + Math.random() * height * 0.35;
      ctx.globalAlpha = 0.3 + Math.random() * 0.4;
      ctx.beginPath();
      ctx.arc(px, py, 1.0 + Math.random() * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (motif === 'horses') {
    // Lascaux Chinese Horse & ibex
    // Stout horse body with yellow ochre and reddish wash
    drawPigmentWash(width * 0.50, height * 0.50, 190, 120, 0.02, '#cf973a', '#9c6e22', 0.9);
    drawPigmentWash(width * 0.46, height * 0.54, 150, 80, -0.05, '#b84228', '#782514', 0.85);
    // Dark mane, muzzle, and lower limbs
    drawPigmentWash(width * 0.34, height * 0.40, 100, 60, 0.3, '#241f1a', '#14110e', 0.92);
    drawPigmentWash(width * 0.28, height * 0.44, 70, 45, 0.1, '#1f1a16', '#100d0b', 0.88);
  } else {
    // Steppe Bison & red deer
    // Deep red ochre and dark charcoal body fill
    drawPigmentWash(width * 0.50, height * 0.48, 200, 135, 0.08, '#a6331e', '#6e1e10', 0.9);
    drawPigmentWash(width * 0.40, height * 0.42, 160, 110, 0.25, '#26201b', '#13100d', 0.95);
    drawPigmentWash(width * 0.58, height * 0.56, 140, 75, -0.05, '#c78f34', '#885c1b', 0.8);
  }

  return canvas;
}

/**
 * Creates the animal outlines layer.
 * Bold charcoal/manganese contour lines typical of Lascaux and Chauvet.
 */
function createOutlinesCanvas(width, height, motif) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  function drawCharcoalStroke(pts, widthVal = 7, alpha = 0.92) {
    if (pts.length < 2) return;
    ctx.strokeStyle = `rgba(24, 20, 17, ${alpha})`;
    ctx.lineWidth = widthVal;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      if (i < pts.length - 1) {
        const mx = (pts[i][0] + pts[i + 1][0]) / 2;
        const my = (pts[i][1] + pts[i + 1][1]) / 2;
        ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
      } else {
        ctx.lineTo(pts[i][0], pts[i][1]);
      }
    }
    ctx.stroke();
  }

  if (motif === 'great-bull') {
    // ==========================================
    // 1. The Great Bull (Aurochs) of Lascaux
    // ==========================================

    // Dorsal line (back) & rump
    drawCharcoalStroke([
      [width * 0.32, height * 0.36],
      [width * 0.40, height * 0.34],
      [width * 0.50, height * 0.40],
      [width * 0.62, height * 0.43],
      [width * 0.72, height * 0.45],
      [width * 0.76, height * 0.55]
    ], 9);

    // Horns (characteristic Lascaux twisted perspective, long and curving forward)
    // Primary front horn
    drawCharcoalStroke([
      [width * 0.29, height * 0.35],
      [width * 0.28, height * 0.26],
      [width * 0.30, height * 0.17],
      [width * 0.35, height * 0.12],
      [width * 0.42, height * 0.11]
    ], 8);
    // Secondary back horn
    drawCharcoalStroke([
      [width * 0.31, height * 0.33],
      [width * 0.33, height * 0.24],
      [width * 0.38, height * 0.16],
      [width * 0.46, height * 0.14]
    ], 7);

    // Head profile, muzzle, nostrils, and eye
    drawCharcoalStroke([
      [width * 0.29, height * 0.35],
      [width * 0.25, height * 0.38],
      [width * 0.20, height * 0.41],
      [width * 0.18, height * 0.45],
      [width * 0.21, height * 0.48],
      [width * 0.25, height * 0.47]
    ], 8);
    // Eye
    ctx.fillStyle = 'rgba(20, 16, 14, 0.95)';
    ctx.beginPath();
    ctx.arc(width * 0.24, height * 0.39, 5.5, 0, Math.PI * 2);
    ctx.fill();

    // Throat, massive dewlap & brisket
    drawCharcoalStroke([
      [width * 0.25, height * 0.47],
      [width * 0.28, height * 0.53],
      [width * 0.32, height * 0.58],
      [width * 0.36, height * 0.62]
    ], 9);

    // Forelegs
    drawCharcoalStroke([
      [width * 0.34, height * 0.60],
      [width * 0.33, height * 0.70],
      [width * 0.32, height * 0.78],
      [width * 0.34, height * 0.81] // hoof
    ], 7);
    drawCharcoalStroke([
      [width * 0.38, height * 0.61],
      [width * 0.39, height * 0.69],
      [width * 0.38, height * 0.77],
      [width * 0.40, height * 0.80] // hoof
    ], 6.5);

    // Underbelly line
    drawCharcoalStroke([
      [width * 0.37, height * 0.62],
      [width * 0.48, height * 0.64],
      [width * 0.58, height * 0.63],
      [width * 0.68, height * 0.60]
    ], 8);

    // Hind leg & hock
    drawCharcoalStroke([
      [width * 0.68, height * 0.59],
      [width * 0.70, height * 0.68],
      [width * 0.68, height * 0.76],
      [width * 0.70, height * 0.80]
    ], 7);

    // Tail arching back with tuft
    drawCharcoalStroke([
      [width * 0.75, height * 0.53],
      [width * 0.80, height * 0.58],
      [width * 0.81, height * 0.68]
    ], 5);
    // Tail tuft
    drawCharcoalStroke([
      [width * 0.80, height * 0.67],
      [width * 0.83, height * 0.72]
    ], 6);

    // ==========================================
    // 2. Swimming Stag (Lascaux)
    // ==========================================
    // Head & slender neck
    drawCharcoalStroke([
      [width * 0.76, height * 0.44],
      [width * 0.79, height * 0.41],
      [width * 0.84, height * 0.38],
      [width * 0.87, height * 0.40],
      [width * 0.84, height * 0.44],
      [width * 0.79, height * 0.47]
    ], 5.5);

    // Antlers with branching tines
    drawCharcoalStroke([
      [width * 0.82, height * 0.39],
      [width * 0.84, height * 0.30],
      [width * 0.88, height * 0.22],
      [width * 0.94, height * 0.17]
    ], 5);
    // Tines
    drawCharcoalStroke([[width * 0.84, height * 0.32], [width * 0.80, height * 0.27]], 4);
    drawCharcoalStroke([[width * 0.86, height * 0.27], [width * 0.83, height * 0.21]], 4);
    drawCharcoalStroke([[width * 0.89, height * 0.22], [width * 0.88, height * 0.16]], 3.5);

  } else if (motif === 'horses') {
    // Chinese Horse of Lascaux
    // Arched dorsal line & stout belly
    drawCharcoalStroke([
      [width * 0.28, height * 0.43],
      [width * 0.35, height * 0.38],
      [width * 0.48, height * 0.39],
      [width * 0.62, height * 0.42],
      [width * 0.70, height * 0.52]
    ], 8);
    // Belly
    drawCharcoalStroke([
      [width * 0.33, height * 0.55],
      [width * 0.46, height * 0.62],
      [width * 0.58, height * 0.61],
      [width * 0.66, height * 0.55]
    ], 7.5);
    // Head & ears
    drawCharcoalStroke([
      [width * 0.28, height * 0.43],
      [width * 0.22, height * 0.44],
      [width * 0.17, height * 0.47],
      [width * 0.20, height * 0.51],
      [width * 0.27, height * 0.52]
    ], 6.5);
    // Upright bristling mane
    for (let m = 0; m < 16; m++) {
      const mx = width * 0.27 + m * (width * 0.012);
      const my = height * 0.43 - (m * 2.5);
      drawCharcoalStroke([[mx, my], [mx - 3, my - 16]], 3.5);
    }
    // Galloping legs
    drawCharcoalStroke([[width * 0.32, height * 0.54], [width * 0.27, height * 0.68], [width * 0.24, height * 0.75]], 6);
    drawCharcoalStroke([[width * 0.65, height * 0.54], [width * 0.72, height * 0.66], [width * 0.78, height * 0.72]], 6);
  } else {
    // Steppe Bison
    // Massive hump & beard
    drawCharcoalStroke([
      [width * 0.28, height * 0.48],
      [width * 0.32, height * 0.35],
      [width * 0.42, height * 0.30],
      [width * 0.55, height * 0.36],
      [width * 0.68, height * 0.42],
      [width * 0.74, height * 0.52]
    ], 9);
    // Shaggy beard & chest
    drawCharcoalStroke([
      [width * 0.22, height * 0.50],
      [width * 0.26, height * 0.60],
      [width * 0.34, height * 0.64],
      [width * 0.46, height * 0.65]
    ], 8);
    // Horn
    drawCharcoalStroke([
      [width * 0.27, height * 0.38],
      [width * 0.24, height * 0.28],
      [width * 0.28, height * 0.20],
      [width * 0.35, height * 0.18]
    ], 7.5);
  }

  return canvas;
}

/**
 * Creates the fine engraved / scratched rock lines layer.
 * Delicate incised strokes carved into the stone calcite that catch raking light.
 */
function createEngravingsCanvas(width, height, motif) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(235, 225, 210, 0.95)'; // Bright carved limestone incision

  function drawEngravedLine(x1, y1, x2, y2, lw = 1.6) {
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  if (motif === 'great-bull') {
    // Hatching along the bull's brisket and dewlap (fur texture)
    for (let h = 0; h < 24; h++) {
      const hx = width * 0.28 + h * (width * 0.005);
      const hy = height * 0.52 + h * 3.5;
      drawEngravedLine(hx, hy, hx + 14, hy + 12, 1.4);
    }
    // Horn annular ridges
    for (let r = 0; r < 14; r++) {
      const rx = width * 0.29 + r * 6.5;
      const ry = height * 0.32 - r * 11;
      drawEngravedLine(rx - 5, ry + 3, rx + 6, ry - 4, 1.6);
    }
    // Incised deer head superimposed on the flank (characteristic of Lascaux palimpsest)
    ctx.beginPath();
    ctx.moveTo(width * 0.54, height * 0.46);
    ctx.lineTo(width * 0.59, height * 0.42);
    ctx.lineTo(width * 0.63, height * 0.44);
    ctx.lineTo(width * 0.60, height * 0.49);
    ctx.stroke();
    // Fine engraved antlers
    drawEngravedLine(width * 0.58, height * 0.42, width * 0.60, height * 0.35, 1.3);
    drawEngravedLine(width * 0.60, height * 0.35, width * 0.64, height * 0.32, 1.2);
    drawEngravedLine(width * 0.59, height * 0.38, width * 0.63, height * 0.38, 1.2);

    // Prehistoric geometric marks / signs (penniform / barbed lines)
    for (let b = 0; b < 9; b++) {
      const bx = width * 0.14 + b * 12;
      const by = height * 0.28;
      drawEngravedLine(bx, by - 16, bx, by + 16, 1.5);
      drawEngravedLine(bx, by - 8, bx + 7, by - 2, 1.2);
      drawEngravedLine(bx, by + 2, bx + 7, by + 8, 1.2);
    }
  } else {
    // Engraved fur and geometric incisions for other walls
    for (let i = 0; i < 30; i++) {
      const ex = width * 0.3 + Math.random() * width * 0.4;
      const ey = height * 0.35 + Math.random() * height * 0.3;
      drawEngravedLine(ex, ey, ex + 12 + Math.random() * 8, ey + 6 + Math.random() * 6, 1.3);
    }
  }

  return canvas;
}

// ============================================================================
// Custom Shader Material: Local Torch Reveal with Soft Edge
// ============================================================================

const WALL_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;

  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const WALL_FRAGMENT_SHADER = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;

  // Torch Spotlight Uniforms
  uniform vec3 uTorchPos;
  uniform vec3 uTorchDir;
  uniform float uTorchIntensity;
  uniform float uInnerCos;
  uniform float uOuterCos;
  uniform float uMaxRange;
  uniform float uTime;

  // Textures
  uniform sampler2D uBaseRock;
  uniform sampler2D uHandStencils;
  uniform sampler2D uPigment;
  uniform sampler2D uOutlines;
  uniform sampler2D uEngravings;

  void main() {
    // Vector from torch to wall fragment
    vec3 toFrag = vWorldPosition - uTorchPos;
    float dist = length(toFrag);
    vec3 lightDir = toFrag / max(dist, 0.0001);

    // Spot cone angular falloff with soft edge
    float cosTheta = dot(lightDir, normalize(uTorchDir));
    float spot = smoothstep(uOuterCos, uInnerCos, cosTheta);

    // Distance attenuation
    float distAtten = smoothstep(uMaxRange, 0.2, dist) / (1.0 + 0.12 * dist * dist);

    // Surface normal incidence (Lambertian with slight wrap for rough cave limestone)
    float NdotL = max(0.0, dot(vWorldNormal, -lightDir));
    float wrapFactor = max(0.0, (dot(vWorldNormal, -lightDir) + 0.25) / 1.25);

    // Total torch illumination at this fragment
    float illumination = spot * distAtten * uTorchIntensity * wrapFactor;

    // Reveal factor: strictly soft-edge following the illuminated pool of light
    // When illumination is 0 (outside beam), reveal is 0 (quiet stone).
    float reveal = smoothstep(0.015, 0.22, illumination);

    // Color definitions
    vec4 baseRock = texture2D(uBaseRock, vUv);
    vec3 ambientLight = vec3(0.022, 0.018, 0.015); // Quiet cave ambient
    vec3 torchWarmth = vec3(1.0, 0.74, 0.42) * illumination * 2.8;

    // Lit rock base
    vec3 litColor = baseRock.rgb * (ambientLight + torchWarmth);

    // 1. Hand Stencils: negative silhouettes in blown pigment
    vec4 stencils = texture2D(uHandStencils, vUv);
    if (stencils.a > 0.001) {
      vec3 litStencil = stencils.rgb * (ambientLight + torchWarmth * 1.05);
      litColor = mix(litColor, litStencil, stencils.a * reveal);
    }

    // 2. Pigment: earthy ochre washes & body fills
    vec4 pigment = texture2D(uPigment, vUv);
    if (pigment.a > 0.001) {
      vec3 litPigment = pigment.rgb * (ambientLight + torchWarmth * 1.15);
      litColor = mix(litColor, litPigment, pigment.a * reveal);
    }

    // 3. Animal Outlines: bold charcoal contour lines
    vec4 outlines = texture2D(uOutlines, vUv);
    if (outlines.a > 0.001) {
      vec3 litOutline = outlines.rgb * (ambientLight + torchWarmth * 0.45);
      litColor = mix(litColor, litOutline, outlines.a * reveal);
    }

    // 4. Engravings: incised carved lines catching raking light
    vec4 engravings = texture2D(uEngravings, vUv);
    if (engravings.a > 0.001) {
      vec3 rakingHighlight = vec3(0.25, 0.20, 0.16) * illumination;
      vec3 litEngraving = engravings.rgb * (ambientLight + torchWarmth * 1.4) + rakingHighlight;
      litColor = mix(litColor, litEngraving, engravings.a * reveal * 0.95);
    }

    gl_FragColor = vec4(litColor, 1.0);
  }
`;

function createCaveShaderMaterial(textures) {
  return new THREE.ShaderMaterial({
    vertexShader: WALL_VERTEX_SHADER,
    fragmentShader: WALL_FRAGMENT_SHADER,
    uniforms: {
      uTorchPos: { value: new THREE.Vector3(0, 1.25, -0.6) },
      uTorchDir: { value: new THREE.Vector3(0, -0.4, -1).normalize() },
      uTorchIntensity: { value: 0.8 },
      uInnerCos: { value: Math.cos(THREE.MathUtils.degToRad(20)) },
      uOuterCos: { value: Math.cos(THREE.MathUtils.degToRad(36)) },
      uMaxRange: { value: 6.0 },
      uTime: { value: 0.0 },

      uBaseRock: { value: textures.baseRock },
      uHandStencils: { value: textures.handStencils },
      uPigment: { value: textures.pigment },
      uOutlines: { value: textures.outlines },
      uEngravings: { value: textures.engravings },
    },
    side: THREE.DoubleSide,
  });
}

// ============================================================================
// Virtual Torch Component
// ============================================================================

/**
 * Interactive virtual torch with hit geometry, flame visuals, and real lights.
 * Ray-selectable by the user controller ray.
 */
class VirtualTorch extends xb.MeshScript {
  constructor(mountPosition = new THREE.Vector3(0.18, 1.25, -0.6)) {
    // Hit mesh geometry for ray selection
    const hitGeometry = new THREE.CylinderGeometry(0.09, 0.09, 0.55, 16);
    const hitMaterial = new THREE.MeshStandardMaterial({
      color: 0x5a3e28,
      roughness: 0.85,
    });
    super(hitGeometry, hitMaterial);

    this.name = 'Virtual Torch';
    this.mountPosition = mountPosition.clone();
    this.position.copy(this.mountPosition);
    // Initially tilted down slightly on the sconce
    this.rotation.set(-0.35, 0, 0);

    this.isCarried = false;
    this.carryingController = null;
    this.isLit = true;
    this.baseIntensity = 1.0;
    this.currentIntensity = 0.8;
    this.beamAngle = 36; // degrees

    // DevTools Tagging: Exactly one semantic owner tagged virtual-torch
    this.userData.xrblocksDevtools = {
      tag: 'virtual-torch',
      state: {
        get carried() { return torchInstance?.isCarried ?? false; },
        get lit() { return torchInstance?.isLit ?? true; },
        get intensity() { return torchInstance?.currentIntensity ?? 0.8; },
        get beamAngle() { return torchInstance?.beamAngle ?? 36; },
      },
    };

    this.initVisuals();
  }

  initVisuals() {
    // Torch handle - rough wooden branch
    const branchGeo = new THREE.CylinderGeometry(0.024, 0.02, 0.44, 12);
    const branchMat = new THREE.MeshStandardMaterial({
      color: 0x3d2817,
      roughness: 0.9,
    });
    const handleMesh = new THREE.Mesh(branchGeo, branchMat);
    handleMesh.position.y = -0.05;
    handleMesh.xb = { pointerEvents: 'none' };
    this.add(handleMesh);

    // Fiber / twine binding wraps around upper neck
    const wrapGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.08, 12);
    const wrapMat = new THREE.MeshStandardMaterial({
      color: 0x8a7258,
      roughness: 0.8,
    });
    const wrapMesh = new THREE.Mesh(wrapGeo, wrapMat);
    wrapMesh.position.y = 0.11;
    wrapMesh.xb = { pointerEvents: 'none' };
    this.add(wrapMesh);

    // Torch head - pitch and blackened cloth bundle
    const headGeo = new THREE.CylinderGeometry(0.042, 0.032, 0.12, 12);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0x1a1512,
      roughness: 0.95,
    });
    const headMesh = new THREE.Mesh(headGeo, headMat);
    headMesh.position.y = 0.19;
    headMesh.xb = { pointerEvents: 'none' };
    this.add(headMesh);

    // Flame Core - Inner bright yellow flame
    const flameCoreGeo = new THREE.ConeGeometry(0.032, 0.12, 12);
    const flameCoreMat = new THREE.MeshBasicMaterial({
      color: 0xfff4c2,
    });
    this.flameCore = new THREE.Mesh(flameCoreGeo, flameCoreMat);
    this.flameCore.position.y = 0.28;
    this.flameCore.xb = { pointerEvents: 'none' };
    this.add(this.flameCore);

    // Flame Outer - Amber flickering cone
    const flameOuterGeo = new THREE.ConeGeometry(0.052, 0.18, 12);
    const flameOuterMat = new THREE.MeshBasicMaterial({
      color: 0xff7b1a,
      transparent: true,
      opacity: 0.85,
    });
    this.flameOuter = new THREE.Mesh(flameOuterGeo, flameOuterMat);
    this.flameOuter.position.y = 0.30;
    this.flameOuter.xb = { pointerEvents: 'none' };
    this.add(this.flameOuter);

    // Real Three.js SpotLight originating at flame tip
    this.spotLight = new THREE.SpotLight(
      0xffa347,
      2.5,
      7.0,
      THREE.MathUtils.degToRad(this.beamAngle),
      0.65,
      1.2
    );
    this.spotLight.position.set(0, 0.30, 0);
    this.spotLightTarget = new THREE.Object3D();
    this.spotLightTarget.position.set(0, 0.30, -2.0);
    this.add(this.spotLight);
    this.add(this.spotLightTarget);
    this.spotLight.target = this.spotLightTarget;

    // PointLight for ambient warm proximity glow around user and torch
    this.pointLight = new THREE.PointLight(0xff8c2b, 1.2, 3.5, 1.0);
    this.pointLight.position.set(0, 0.30, 0);
    this.add(this.pointLight);
  }

  equip(controller) {
    this.isCarried = true;
    this.carryingController = controller;
    this.baseIntensity = 1.35; // Flares up brightly when picked up!
  }

  onObjectSelectStart(event) {
    this.equip(event.source?.controller);
    event.stopPropagation?.();
  }

  onObjectTouchStart(event) {
    this.equip(event.source?.controller);
    event.stopPropagation?.();
  }

  onSelectStart(event) {
    if (!this.isCarried && event.source?.controller) {
      this.equip(event.source.controller);
    }
  }

  getFlameWorldPosition(target = new THREE.Vector3()) {
    this.updateWorldMatrix(true, false);
    return target.setFromMatrixPosition(this.matrixWorld).add(
      new THREE.Vector3(0, 0.30, 0).applyQuaternion(this.quaternion)
    );
  }

  getTorchDirection(target = new THREE.Vector3()) {
    this.updateWorldMatrix(true, false);
    // Forward along -Z
    return target.set(0, 0, -1).applyQuaternion(this.quaternion).normalize();
  }
}

let torchInstance = null;

// ============================================================================
// Main Application Script
// ============================================================================

class LascauxTorchApp extends xb.Script {
  static dependencies = {
    user: xb.User,
  };

  init({ user }) {
    this.user = user;

    // Soft dim ambient cave lighting
    this.add(new THREE.HemisphereLight(0x2a241e, 0x0a0806, 0.35));

    // 1. Authored Walls with Prepared Prehistoric Cave Artwork
    this.wallMaterials = [];
    this.buildCaveGallery();

    // 2. Virtual Torch & Resting Mount
    this.buildTorchAndMount();
  }

  buildCaveGallery() {
    // -------------------------------------------------------------
    // Center Wall: Contains the first reveal region
    // -------------------------------------------------------------
    const centerWallWidth = 2.4;
    const centerWallHeight = 1.8;
    const centerWallZ = -1.65;

    // Textures for Center Wall (The Great Bull of Lascaux & Hand Stencils)
    const baseRockCenter = new THREE.CanvasTexture(createBaseRockCanvas(1024, 768, 101));
    const handStencilsCenter = new THREE.CanvasTexture(
      createHandStencilsCanvas(1024, 768, [
        { x: 180, y: 380, scale: 1.05, angle: -0.15, color: 'red' },
        { x: 270, y: 260, scale: 0.95, angle: 0.2, color: 'red' },
        { x: 790, y: 440, scale: 1.0, angle: -0.1, color: 'red' },
        { x: 860, y: 320, scale: 0.85, angle: 0.15, color: 'red' },
      ])
    );
    const pigmentCenter = new THREE.CanvasTexture(createPigmentCanvas(1024, 768, 'great-bull'));
    const outlinesCenter = new THREE.CanvasTexture(createOutlinesCanvas(1024, 768, 'great-bull'));
    const engravingsCenter = new THREE.CanvasTexture(createEngravingsCanvas(1024, 768, 'great-bull'));

    const centerMaterial = createCaveShaderMaterial({
      baseRock: baseRockCenter,
      handStencils: handStencilsCenter,
      pigment: pigmentCenter,
      outlines: outlinesCenter,
      engravings: engravingsCenter,
    });
    this.wallMaterials.push(centerMaterial);

    // Mesh for the first reveal region
    const centerGeo = new THREE.PlaneGeometry(centerWallWidth, centerWallHeight);
    this.artworkRevealRegion = new THREE.Mesh(centerGeo, centerMaterial);
    this.artworkRevealRegion.name = 'Artwork Reveal Region';
    this.artworkRevealRegion.position.set(0, 1.5, centerWallZ);

    // Expose reveal states on the region object
    this.artworkRevealRegion.isIlluminated = false;
    this.artworkRevealRegion.revealAmount = 0.0;
    this.artworkRevealRegion.artworkLayers = {
      baseRock: baseRockCenter,
      handStencils: handStencilsCenter,
      pigment: pigmentCenter,
      outlines: outlinesCenter,
      engravings: engravingsCenter,
    };

    // DevTools Tagging: Exactly one semantic owner tagged artwork-reveal-region
    this.artworkRevealRegion.userData.xrblocksDevtools = {
      tag: 'artwork-reveal-region',
      state: {
        get illuminated() { return revealRegionInstance?.isIlluminated ?? false; },
        get revealAmount() { return revealRegionInstance?.revealAmount ?? 0.0; },
        get quiet() { return !(revealRegionInstance?.isIlluminated ?? false); },
        hasAnimalOutlines: true,
        hasPigment: true,
        hasEngravings: true,
        hasHandStencils: true,
      },
    };

    this.add(this.artworkRevealRegion);

    // -------------------------------------------------------------
    // Left Wall: The Galloping Horses of Lascaux
    // -------------------------------------------------------------
    const sideWallWidth = 2.0;
    const sideWallHeight = 1.8;

    const baseRockLeft = new THREE.CanvasTexture(createBaseRockCanvas(1024, 768, 202));
    const handStencilsLeft = new THREE.CanvasTexture(
      createHandStencilsCanvas(1024, 768, [
        { x: 220, y: 320, scale: 0.95, angle: 0.1, color: 'black' },
        { x: 780, y: 360, scale: 1.0, angle: -0.2, color: 'red' },
      ])
    );
    const pigmentLeft = new THREE.CanvasTexture(createPigmentCanvas(1024, 768, 'horses'));
    const outlinesLeft = new THREE.CanvasTexture(createOutlinesCanvas(1024, 768, 'horses'));
    const engravingsLeft = new THREE.CanvasTexture(createEngravingsCanvas(1024, 768, 'horses'));

    const leftMaterial = createCaveShaderMaterial({
      baseRock: baseRockLeft,
      handStencils: handStencilsLeft,
      pigment: pigmentLeft,
      outlines: outlinesLeft,
      engravings: engravingsLeft,
    });
    this.wallMaterials.push(leftMaterial);

    const leftGeo = new THREE.PlaneGeometry(sideWallWidth, sideWallHeight);
    this.leftWall = new THREE.Mesh(leftGeo, leftMaterial);
    this.leftWall.name = 'Left Cave Wall';
    this.leftWall.position.set(-1.3, 1.5, -0.75);
    this.leftWall.rotation.y = THREE.MathUtils.degToRad(68);
    this.add(this.leftWall);

    // -------------------------------------------------------------
    // Right Wall: The Steppe Bison & Red Deer
    // -------------------------------------------------------------
    const baseRockRight = new THREE.CanvasTexture(createBaseRockCanvas(1024, 768, 303));
    const handStencilsRight = new THREE.CanvasTexture(
      createHandStencilsCanvas(1024, 768, [
        { x: 260, y: 340, scale: 1.0, angle: 0.15, color: 'red' },
        { x: 820, y: 300, scale: 0.9, angle: -0.1, color: 'red' },
      ])
    );
    const pigmentRight = new THREE.CanvasTexture(createPigmentCanvas(1024, 768, 'bison'));
    const outlinesRight = new THREE.CanvasTexture(createOutlinesCanvas(1024, 768, 'bison'));
    const engravingsRight = new THREE.CanvasTexture(createEngravingsCanvas(1024, 768, 'bison'));

    const rightMaterial = createCaveShaderMaterial({
      baseRock: baseRockRight,
      handStencils: handStencilsRight,
      pigment: pigmentRight,
      outlines: outlinesRight,
      engravings: engravingsRight,
    });
    this.wallMaterials.push(rightMaterial);

    const rightGeo = new THREE.PlaneGeometry(sideWallWidth, sideWallHeight);
    this.rightWall = new THREE.Mesh(rightGeo, rightMaterial);
    this.rightWall.name = 'Right Cave Wall';
    this.rightWall.position.set(1.3, 1.5, -0.75);
    this.rightWall.rotation.y = THREE.MathUtils.degToRad(-68);
    this.add(this.rightWall);

    // -------------------------------------------------------------
    // Atmospheric Cave Floor & Vaulted Ceiling
    // -------------------------------------------------------------
    const floorGeo = new THREE.PlaneGeometry(3.5, 3.5);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x181410,
      roughness: 0.95,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(0, 0.0, -1.0);
    floorMesh.xb = { pointerEvents: 'none' };
    this.add(floorMesh);

    const ceilingGeo = new THREE.PlaneGeometry(3.5, 3.5);
    const ceilingMat = new THREE.MeshStandardMaterial({
      color: 0x14100c,
      roughness: 0.95,
    });
    const ceilingMesh = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceilingMesh.rotation.x = Math.PI / 2;
    ceilingMesh.position.set(0, 2.4, -1.0);
    ceilingMesh.xb = { pointerEvents: 'none' };
    this.add(ceilingMesh);
  }

  buildTorchAndMount() {
    // Torch Mount / Sconce in the cave
    const mountGeo = new THREE.BoxGeometry(0.12, 0.08, 0.22);
    const mountMat = new THREE.MeshStandardMaterial({
      color: 0x2e241c,
      roughness: 0.9,
    });
    this.mountMesh = new THREE.Mesh(mountGeo, mountMat);
    this.mountMesh.position.set(0.18, 1.15, -0.6);
    this.mountMesh.name = 'Torch Mount';
    this.add(this.mountMesh);

    // Ray-selectable Virtual Torch
    this.torch = new VirtualTorch(new THREE.Vector3(0.18, 1.25, -0.6));
    torchInstance = this.torch;
    revealRegionInstance = this.artworkRevealRegion;
    this.add(this.torch);
  }

  update(time) {
    const timeSec = (time ?? 0) * 0.001;

    // 1. Natural organic flame flicker
    const flickerNoise =
      Math.sin(timeSec * 14.3) * 0.09 +
      Math.sin(timeSec * 28.7) * 0.05 +
      Math.cos(timeSec * 41.2) * 0.04;
    this.torch.currentIntensity = Math.max(0.2, this.torch.baseIntensity * (1.0 + flickerNoise));

    // Flame mesh animation (pulse & slight twist)
    if (this.torch.flameCore && this.torch.flameOuter) {
      const scaleFactor = 1.0 + flickerNoise * 0.5;
      this.torch.flameCore.scale.set(scaleFactor, 1.0 + flickerNoise * 0.8, scaleFactor);
      this.torch.flameOuter.scale.set(scaleFactor * 1.05, 1.0 + flickerNoise * 1.1, scaleFactor * 1.05);
      this.torch.flameOuter.rotation.y = timeSec * 3.0;
    }

    // 2. Controller Carried / Aiming Tracking
    const flamePos = new THREE.Vector3();
    const beamDir = new THREE.Vector3();

    if (this.torch.isCarried) {
      // Find the active controller carrying the torch
      const controller = this.torch.carryingController || this.getPrimaryActiveController();

      if (controller) {
        const ctrlPos = new THREE.Vector3();
        const ctrlQuat = new THREE.Quaternion();
        controller.getWorldPosition(ctrlPos);
        controller.getWorldQuaternion(ctrlQuat);

        // Position torch at controller with comfortable hand offset
        const handOffset = new THREE.Vector3(0.04, -0.05, 0.12).applyQuaternion(ctrlQuat);
        this.torch.position.copy(ctrlPos).add(handOffset);

        // Torch orientation: tilts slightly upward like a carried torch
        const tiltUp = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.28);
        this.torch.quaternion.copy(ctrlQuat).multiply(tiltUp);

        // Beam direction points along controller's forward ray
        beamDir.set(0, 0, -1).applyQuaternion(ctrlQuat).normalize();
      } else {
        // Fallback for camera/mouse view
        const camera = xb.camera;
        if (camera) {
          const camPos = new THREE.Vector3();
          const camQuat = new THREE.Quaternion();
          camera.getWorldPosition(camPos);
          camera.getWorldQuaternion(camQuat);

          const viewOffset = new THREE.Vector3(0.20, -0.22, -0.50).applyQuaternion(camQuat);
          this.torch.position.copy(camPos).add(viewOffset);
          this.torch.quaternion.copy(camQuat);
          beamDir.set(0, 0, -1).applyQuaternion(camQuat).normalize();
        }
      }
    } else {
      // Not carried yet: stays on mount, beam points downward towards floor
      beamDir.set(0, -0.4, -1).applyQuaternion(this.torch.quaternion).normalize();
    }

    this.torch.getFlameWorldPosition(flamePos);

    // Update spot light & point light properties
    if (this.torch.spotLight) {
      this.torch.spotLight.intensity = this.torch.currentIntensity * 2.8;
      this.torch.pointLight.intensity = this.torch.currentIntensity * 1.3;
    }

    // 3. Update Shaders for all Cave Wall Materials
    for (const mat of this.wallMaterials) {
      mat.uniforms.uTorchPos.value.copy(flamePos);
      mat.uniforms.uTorchDir.value.copy(beamDir);
      mat.uniforms.uTorchIntensity.value = this.torch.currentIntensity;
      mat.uniforms.uTime.value = timeSec;
    }

    // 4. Update Reveal Region Illumination State for Inspection / devtools
    if (this.artworkRevealRegion) {
      const regionPos = new THREE.Vector3();
      this.artworkRevealRegion.getWorldPosition(regionPos);
      const toRegion = regionPos.clone().sub(flamePos);
      const dist = toRegion.length();
      toRegion.normalize();

      const cosTheta = toRegion.dot(beamDir);
      const innerCos = Math.cos(THREE.MathUtils.degToRad(20));
      const outerCos = Math.cos(THREE.MathUtils.degToRad(36));

      const spot = THREE.MathUtils.smoothstep(cosTheta, outerCos, innerCos);
      const isIlluminated = spot > 0.05 && dist < 5.5;

      this.artworkRevealRegion.isIlluminated = isIlluminated;
      this.artworkRevealRegion.revealAmount = isIlluminated ? spot : 0.0;
    }
  }

  getPrimaryActiveController() {
    const controllers = xb.core.input?.controllers || [];
    // Right hand or controller 1 / 0
    if (controllers[1]?.userData?.connected) return controllers[1];
    if (controllers[0]?.userData?.connected) return controllers[0];
    if (controllers[1]) return controllers[1];
    if (controllers[0]) return controllers[0];
    return null;
  }
}

let revealRegionInstance = null;

// ============================================================================
// Application Initialization
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  const options = new xb.Options();
  options.enableHands();
  options.enableReticles();
  options.controllers.visualization = true;
  options.controllers.visualizeRays = true;
  options.hands.visualization = true;
  options.simulator.defaultMode = xb.SimulatorMode.POSE;
  options.setAppTitle('Lascaux Torch');
  options.setAppDescription(
    'Free-form prehistoric cave exploration. Carry the virtual torch to locally reveal animal outlines, pigments, engravings, and hand stencils.'
  );

  xb.add(new LascauxTorchApp());
  xb.init(options);
});
