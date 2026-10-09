import * as THREE from "three";
import * as xb from "xrblocks";

const REST_POSITION = new THREE.Vector3(0.58, 1.12, -0.82);
const REST_QUATERNION = new THREE.Quaternion().setFromEuler(
  new THREE.Euler(-0.075, 0, -0.08)
);
const FORWARD = new THREE.Vector3(0, 0, -1);

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const damp = (current, target, speed, delta) =>
  THREE.MathUtils.lerp(current, target, 1 - Math.exp(-speed * delta));

function seededRandom(seed = 1234567) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function configureCanvasTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function createStoneTexture(seed = 71) {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const pixels = ctx.createImageData(size, size);
  const random = seededRandom(seed);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const broad =
        Math.sin(x * 0.018) * 5 +
        Math.sin((x + y) * 0.008) * 7 +
        Math.cos(y * 0.024) * 4;
      const grain = (random() - 0.5) * 22;
      const mineral = 73 + broad + grain;
      const i = (y * size + x) * 4;
      pixels.data[i] = mineral * 1.08;
      pixels.data[i + 1] = mineral * 0.91;
      pixels.data[i + 2] = mineral * 0.7;
      pixels.data[i + 3] = 255;
    }
  }
  ctx.putImageData(pixels, 0, 0);

  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < 115; i++) {
    const x = random() * size;
    const y = random() * size;
    const radius = 8 + random() * 56;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(196, 157, 105, ${0.018 + random() * 0.035})`);
    gradient.addColorStop(1, "rgba(196,157,105,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = "multiply";
  ctx.lineCap = "round";
  for (let i = 0; i < 25; i++) {
    let x = random() * size;
    let y = random() * size;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let j = 0; j < 3 + random() * 5; j++) {
      x += (random() - 0.52) * 90;
      y += 20 + random() * 70;
      ctx.quadraticCurveTo(
        x + (random() - 0.5) * 26,
        y - random() * 20,
        x,
        y
      );
    }
    ctx.strokeStyle = `rgba(26, 19, 13, ${0.07 + random() * 0.09})`;
    ctx.lineWidth = 1 + random() * 2.2;
    ctx.stroke();
  }

  const texture = configureCanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.35, 1);
  return texture;
}

function makeArtworkCanvases() {
  return ["pigment", "engraving", "stencil"].reduce((result, key) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1400;
    canvas.height = 760;
    result[key] = canvas;
    return result;
  }, {});
}

function traceHorse(ctx, x, y, scale, color, filled = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.beginPath();
  ctx.moveTo(-190, 12);
  ctx.bezierCurveTo(-160, -72, -70, -105, 32, -78);
  ctx.bezierCurveTo(84, -65, 135, -38, 162, -14);
  ctx.lineTo(209, -43);
  ctx.lineTo(237, -35);
  ctx.lineTo(205, -18);
  ctx.bezierCurveTo(201, 10, 181, 31, 151, 39);
  ctx.lineTo(125, 128);
  ctx.lineTo(105, 128);
  ctx.lineTo(111, 43);
  ctx.bezierCurveTo(60, 66, -34, 69, -94, 48);
  ctx.lineTo(-117, 129);
  ctx.lineTo(-138, 129);
  ctx.lineTo(-136, 38);
  ctx.bezierCurveTo(-168, 29, -184, 21, -190, 12);
  ctx.closePath();
  if (filled) {
    ctx.fillStyle = color;
    ctx.fill();
  } else {
    ctx.strokeStyle = color;
    ctx.lineWidth = 8;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.moveTo(-188, 10);
  ctx.bezierCurveTo(-220, -6, -234, -40, -236, -71);
  ctx.bezierCurveTo(-225, -48, -209, -30, -185, -25);
  ctx.moveTo(153, -13);
  ctx.quadraticCurveTo(184, 0, 202, -17);
  ctx.moveTo(201, -42);
  ctx.lineTo(213, -65);
  ctx.moveTo(181, -32);
  ctx.lineTo(185, -62);
  ctx.strokeStyle = color;
  ctx.lineWidth = filled ? 5 : 7;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(207, -29, 4.8, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function traceBison(ctx, x, y, scale, color, filled = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.beginPath();
  ctx.moveTo(-210, 15);
  ctx.bezierCurveTo(-185, -74, -94, -123, 5, -105);
  ctx.bezierCurveTo(77, -97, 128, -66, 150, -24);
  ctx.bezierCurveTo(172, -24, 202, -13, 218, 6);
  ctx.lineTo(196, 31);
  ctx.lineTo(148, 36);
  ctx.lineTo(127, 117);
  ctx.lineTo(106, 117);
  ctx.lineTo(108, 41);
  ctx.bezierCurveTo(47, 69, -47, 68, -121, 43);
  ctx.lineTo(-146, 120);
  ctx.lineTo(-170, 120);
  ctx.lineTo(-166, 32);
  ctx.bezierCurveTo(-188, 31, -205, 25, -210, 15);
  ctx.closePath();
  if (filled) {
    ctx.fillStyle = color;
    ctx.fill();
  } else {
    ctx.strokeStyle = color;
    ctx.lineWidth = 8;
    ctx.lineJoin = "round";
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.moveTo(169, -19);
  ctx.quadraticCurveTo(191, -55, 217, -43);
  ctx.quadraticCurveTo(192, -36, 188, -10);
  ctx.moveTo(161, -19);
  ctx.quadraticCurveTo(159, -57, 134, -59);
  ctx.quadraticCurveTo(151, -45, 145, -19);
  ctx.moveTo(-207, 12);
  ctx.quadraticCurveTo(-239, 4, -247, -28);
  ctx.strokeStyle = color;
  ctx.lineWidth = filled ? 5 : 7;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(192, 2, 4.7, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function traceIbex(ctx, x, y, scale, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(-170, 28);
  ctx.bezierCurveTo(-120, -44, -5, -57, 89, -12);
  ctx.lineTo(138, -45);
  ctx.lineTo(175, -32);
  ctx.lineTo(139, -10);
  ctx.quadraticCurveTo(100, 60, 10, 62);
  ctx.quadraticCurveTo(-103, 65, -170, 28);
  ctx.moveTo(139, -43);
  ctx.bezierCurveTo(122, -115, 166, -158, 201, -168);
  ctx.bezierCurveTo(171, -139, 153, -94, 159, -54);
  ctx.moveTo(127, -40);
  ctx.bezierCurveTo(101, -104, 130, -147, 157, -166);
  ctx.moveTo(85, 45);
  ctx.lineTo(78, 126);
  ctx.lineTo(98, 126);
  ctx.moveTo(-87, 55);
  ctx.lineTo(-111, 127);
  ctx.lineTo(-91, 127);
  ctx.moveTo(-168, 26);
  ctx.quadraticCurveTo(-203, 1, -207, -27);
  ctx.stroke();
  ctx.restore();
}

function drawHandShape(ctx) {
  ctx.beginPath();
  ctx.moveTo(-33, 91);
  ctx.lineTo(-47, 13);
  ctx.lineTo(-63, -61);
  ctx.quadraticCurveTo(-67, -80, -55, -83);
  ctx.quadraticCurveTo(-43, -84, -37, -66);
  ctx.lineTo(-22, -20);
  ctx.lineTo(-23, -105);
  ctx.quadraticCurveTo(-22, -126, -8, -126);
  ctx.quadraticCurveTo(7, -124, 6, -103);
  ctx.lineTo(8, -25);
  ctx.lineTo(19, -116);
  ctx.quadraticCurveTo(22, -137, 36, -134);
  ctx.quadraticCurveTo(50, -130, 46, -109);
  ctx.lineTo(35, -17);
  ctx.lineTo(52, -92);
  ctx.quadraticCurveTo(58, -110, 71, -105);
  ctx.quadraticCurveTo(84, -99, 76, -80);
  ctx.lineTo(55, -2);
  ctx.lineTo(76, -53);
  ctx.quadraticCurveTo(83, -69, 95, -62);
  ctx.quadraticCurveTo(106, -54, 97, -38);
  ctx.lineTo(67, 31);
  ctx.lineTo(56, 91);
  ctx.closePath();
}

function drawHandStencil(ctx, x, y, scale, rotation, color, seed) {
  const random = seededRandom(seed);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(scale, scale);

  for (let i = 0; i < 430; i++) {
    const angle = random() * Math.PI * 2;
    const radius = 42 + Math.pow(random(), 0.62) * 128;
    const px = Math.cos(angle) * radius * (0.72 + random() * 0.42);
    const py = Math.sin(angle) * radius * (0.82 + random() * 0.4) - 12;
    ctx.beginPath();
    ctx.arc(px, py, 1.2 + random() * 4.8, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.08 + random() * 0.26;
    ctx.fill();
  }

  ctx.globalAlpha = 0.82;
  ctx.lineWidth = 38;
  ctx.lineJoin = "round";
  ctx.strokeStyle = color;
  drawHandShape(ctx);
  ctx.stroke();
  ctx.globalCompositeOperation = "destination-out";
  ctx.globalAlpha = 1;
  drawHandShape(ctx);
  ctx.fill();
  ctx.restore();
}

function addPigmentDust(ctx, seed, color, count = 260) {
  const random = seededRandom(seed);
  for (let i = 0; i < count; i++) {
    const x = random() * ctx.canvas.width;
    const y = 80 + random() * (ctx.canvas.height - 160);
    ctx.beginPath();
    ctx.arc(x, y, 0.7 + random() * 4.5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = random() * 0.24;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawFrontArtwork(canvases) {
  const pigment = canvases.pigment.getContext("2d");
  const engraving = canvases.engraving.getContext("2d");
  const stencil = canvases.stencil.getContext("2d");

  pigment.globalAlpha = 0.58;
  traceBison(pigment, 410, 390, 1.03, "#5f160f", true);
  pigment.globalAlpha = 0.46;
  traceHorse(pigment, 960, 380, 0.91, "#b96420", true);
  pigment.globalAlpha = 0.34;
  traceHorse(pigment, 685, 208, 0.52, "#d59a4e", false);
  addPigmentDust(pigment, 9401, "#a2391f", 340);

  engraving.globalAlpha = 0.84;
  traceBison(engraving, 410, 390, 1.03, "#d7a765", false);
  traceHorse(engraving, 960, 380, 0.91, "#e6b875", false);
  engraving.globalAlpha = 0.46;
  traceIbex(engraving, 720, 600, 0.45, "#e1bd7f");
  engraving.strokeStyle = "rgba(240,203,143,.38)";
  engraving.lineWidth = 2;
  for (let i = 0; i < 20; i++) {
    engraving.beginPath();
    engraving.moveTo(90 + i * 58, 635 + Math.sin(i) * 10);
    engraving.lineTo(138 + i * 58, 648 + Math.cos(i * 2) * 12);
    engraving.stroke();
  }

  drawHandStencil(stencil, 122, 245, 0.55, -0.18, "#a83222", 71);
  drawHandStencil(stencil, 1265, 235, 0.48, 0.16, "#c56231", 72);
}

function drawSideArtwork(canvases, variant) {
  const pigment = canvases.pigment.getContext("2d");
  const engraving = canvases.engraving.getContext("2d");
  const stencil = canvases.stencil.getContext("2d");

  if (variant === "left") {
    pigment.globalAlpha = 0.48;
    traceHorse(pigment, 430, 390, 0.88, "#9a351a", true);
    pigment.globalAlpha = 0.4;
    traceIbex(pigment, 950, 410, 0.72, "#bd6d2d");
    engraving.globalAlpha = 0.8;
    traceHorse(engraving, 430, 390, 0.88, "#e2b36f", false);
    traceIbex(engraving, 950, 410, 0.72, "#d9aa68");
    drawHandStencil(stencil, 1170, 190, 0.48, 0.14, "#a62e20", 151);
  } else {
    pigment.globalAlpha = 0.52;
    traceBison(pigment, 785, 390, 1.08, "#6f1e13", true);
    pigment.globalAlpha = 0.32;
    traceHorse(pigment, 300, 280, 0.56, "#d18739", false);
    engraving.globalAlpha = 0.78;
    traceBison(engraving, 785, 390, 1.08, "#d8a45f", false);
    drawHandStencil(stencil, 180, 520, 0.46, -0.2, "#b53b24", 251);
    drawHandStencil(stencil, 1240, 205, 0.52, 0.18, "#c56b34", 252);
  }
  addPigmentDust(pigment, variant === "left" ? 218 : 318, "#a84b27", 260);
}

function createArtworkTextures(variant) {
  const canvases = makeArtworkCanvases();
  if (variant === "front") drawFrontArtwork(canvases);
  else drawSideArtwork(canvases, variant);
  return {
    pigment: configureCanvasTexture(canvases.pigment),
    engraving: configureCanvasTexture(canvases.engraving),
    stencil: configureCanvasTexture(canvases.stencil),
  };
}

const revealVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const revealFragmentShader = /* glsl */ `
  uniform sampler2D uPigmentMap;
  uniform sampler2D uEngravingMap;
  uniform sampler2D uStencilMap;
  uniform vec2 uBeam;
  uniform vec2 uSize;
  uniform float uRadius;
  uniform float uVisibility;
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    vec2 physicalDelta = (vUv - uBeam) * uSize;
    float distanceFromBeam = length(physicalDelta);
    float flicker = 0.975 + 0.025 * sin(uTime * 15.0) * sin(uTime * 7.3);
    float softPool = 1.0 - smoothstep(uRadius * 0.28, uRadius * 1.18, distanceFromBeam);
    float reveal = 1.0 - smoothstep(uRadius * 0.62, uRadius, distanceFromBeam);
    reveal *= uVisibility * flicker;
    softPool *= uVisibility;

    vec4 pigment = texture2D(uPigmentMap, vUv);
    vec4 engraving = texture2D(uEngravingMap, vUv);
    vec4 stencil = texture2D(uStencilMap, vUv);

    float pigmentAlpha = pigment.a * 0.92;
    vec3 artColor = pigment.rgb;
    float artAlpha = pigmentAlpha;
    artColor = mix(artColor, engraving.rgb, engraving.a);
    artAlpha = max(artAlpha, engraving.a * 0.94);
    artColor = mix(artColor, stencil.rgb, stencil.a);
    artAlpha = max(artAlpha, stencil.a * 0.96);

    float poolAlpha = softPool * 0.115;
    float finalAlpha = poolAlpha + artAlpha * reveal;
    if (finalAlpha < 0.002) discard;

    vec3 amberStone = vec3(0.96, 0.55, 0.23);
    vec3 finalColor =
      (amberStone * poolAlpha + artColor * artAlpha * reveal) /
      max(finalAlpha, 0.001);
    gl_FragColor = vec4(finalColor, finalAlpha);
  }
`;

class PreparedWall extends THREE.Group {
  constructor({name, width, height, position, rotationY, stoneTexture, variant, first = false}) {
    super();
    this.name = name;
    this.width = width;
    this.height = height;
    this.position.copy(position);
    this.rotation.y = rotationY;
    this.revealAmount = first ? 0.2 : 0;
    this.currentBeam = new THREE.Vector2(0.64, 0.36);
    this.worldPoint = new THREE.Vector3();
    this.worldNormal = new THREE.Vector3();
    this.localHit = new THREE.Vector3();
    this.hitPoint = new THREE.Vector3();
    this.plane = new THREE.Plane();

    const wallMaterial = new THREE.MeshStandardMaterial({
      map: stoneTexture,
      bumpMap: stoneTexture,
      bumpScale: 0.055,
      color: variant === "front" ? 0x8d7257 : 0x765f49,
      roughness: 0.98,
      metalness: 0,
    });
    this.wallMesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height, 32, 20), wallMaterial);
    this.wallMesh.name = `${name} stone surface`;
    this.wallMesh.receiveShadow = true;
    this.add(this.wallMesh);

    const maps = createArtworkTextures(variant);
    this.maps = maps;
    this.uniforms = {
      uPigmentMap: {value: maps.pigment},
      uEngravingMap: {value: maps.engraving},
      uStencilMap: {value: maps.stencil},
      uBeam: {value: this.currentBeam},
      uSize: {value: new THREE.Vector2(width, height)},
      uRadius: {value: variant === "front" ? 0.72 : 0.67},
      uVisibility: {value: this.revealAmount},
      uTime: {value: 0},
    };
    const revealMaterial = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: revealVertexShader,
      fragmentShader: revealFragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide,
      blending: THREE.NormalBlending,
    });
    this.artMesh = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.94, height * 0.86), revealMaterial);
    this.artMesh.name = `${name} pigment, engraving, and hand-stencil reveal`;
    this.artMesh.position.z = 0.012;
    this.artMesh.renderOrder = 2;
    if (first) {
      this.artMesh.userData.xrblocksDevtools = {tag: "artwork-reveal-region"};
    }
    this.add(this.artMesh);

    this.markerGroup = this.createPreparedMarkers(width * 0.94, height * 0.86);
    this.add(this.markerGroup);
  }

  createPreparedMarkers(width, height) {
    const group = new THREE.Group();
    group.name = "Subtle prepared-area corner marks";
    const material = new THREE.LineBasicMaterial({
      color: 0xb28a58,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    });
    const sx = width / 2;
    const sy = height / 2;
    const length = 0.11;
    for (const [x, y, dx, dy] of [
      [-sx, -sy, 1, 1],
      [sx, -sy, -1, 1],
      [-sx, sy, 1, -1],
      [sx, sy, -1, -1],
    ]) {
      const points = [
        new THREE.Vector3(x + dx * length, y, 0.016),
        new THREE.Vector3(x, y, 0.016),
        new THREE.Vector3(x, y + dy * length, 0.016),
      ];
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material);
      line.raycast = () => {};
      group.add(line);
    }
    group.userData.sharedResources = {material};
    return group;
  }

  getRayHit(ray) {
    this.updateWorldMatrix(true, false);
    this.getWorldPosition(this.worldPoint);
    this.worldNormal.set(0, 0, 1).transformDirection(this.matrixWorld);
    this.plane.setFromNormalAndCoplanarPoint(this.worldNormal, this.worldPoint);
    const point = ray.intersectPlane(this.plane, this.hitPoint);
    if (!point) return null;
    this.localHit.copy(point);
    this.worldToLocal(this.localHit);
    const artWidth = this.width * 0.94;
    const artHeight = this.height * 0.86;
    if (
      Math.abs(this.localHit.x) > artWidth * 0.5 ||
      Math.abs(this.localHit.y) > artHeight * 0.5
    ) {
      return null;
    }
    return {
      distance: point.distanceTo(ray.origin),
      uv: new THREE.Vector2(
        this.localHit.x / artWidth + 0.5,
        this.localHit.y / artHeight + 0.5
      ),
    };
  }

  updateReveal(targetUv, strength, delta, time) {
    const target = targetUv ? strength : 0;
    this.revealAmount = damp(
      this.revealAmount,
      target,
      target > this.revealAmount ? 12 : 3.2,
      delta
    );
    if (targetUv) {
      const follow = 1 - Math.exp(-19 * delta);
      this.currentBeam.lerp(targetUv, follow);
    }
    this.uniforms.uVisibility.value = this.revealAmount;
    this.uniforms.uTime.value = time;
  }

  dispose() {
    this.wallMesh.geometry.dispose();
    this.wallMesh.material.dispose();
    this.artMesh.geometry.dispose();
    this.artMesh.material.dispose();
    this.markerGroup.children.forEach((line) => line.geometry.dispose());
    this.markerGroup.userData.sharedResources.material.dispose();
    Object.values(this.maps).forEach((map) => map.dispose());
  }
}

function createGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,244,185,1)");
  gradient.addColorStop(0.12, "rgba(255,175,67,.9)");
  gradient.addColorStop(0.4, "rgba(255,102,25,.25)");
  gradient.addColorStop(1, "rgba(255,77,12,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  return configureCanvasTexture(canvas);
}

class VirtualTorch extends xb.Script {
  constructor() {
    super();
    this.name = "Selectable carried virtual torch";
    this.userData.xrblocksDevtools = {tag: "virtual-torch"};
    this.position.copy(REST_POSITION);
    this.quaternion.copy(REST_QUATERNION);
    this.activeControllerId = null;
    this.hovered = false;
    this.lightStrength = 0.22;
    this.aimRay = new THREE.Ray();
    this.targetPosition = new THREE.Vector3();
    this.targetQuaternion = new THREE.Quaternion();
    this.tempDirection = new THREE.Vector3();
    this.lastUpdate = performance.now();
    this.elapsed = 0;
    this.resources = [];
    this.buildTorch();
  }

  buildTorch() {
    const bronze = new THREE.MeshStandardMaterial({
      color: 0x8d5729,
      roughness: 0.35,
      metalness: 0.72,
      emissive: 0x251005,
      emissiveIntensity: 0.5,
    });
    const leather = new THREE.MeshStandardMaterial({
      color: 0x2d1710,
      roughness: 0.94,
      metalness: 0.02,
    });
    const ember = new THREE.MeshStandardMaterial({
      color: 0xffbd5a,
      emissive: 0xff5a0b,
      emissiveIntensity: 2.8,
      roughness: 0.28,
    });
    this.resources.push(bronze, leather, ember);

    const gripGeometry = new THREE.CylinderGeometry(0.043, 0.05, 0.34, 18);
    gripGeometry.rotateX(Math.PI / 2);
    const grip = new THREE.Mesh(gripGeometry, leather);
    grip.name = "Torch leather grip selectable surface";
    grip.position.z = 0.085;
    grip.castShadow = true;
    this.add(grip);
    this.resources.push(gripGeometry);

    const capGeometry = new THREE.CylinderGeometry(0.064, 0.045, 0.13, 20);
    capGeometry.rotateX(Math.PI / 2);
    const cap = new THREE.Mesh(capGeometry, bronze);
    cap.name = "Torch bronze head selectable surface";
    cap.position.z = -0.145;
    cap.castShadow = true;
    this.add(cap);
    this.resources.push(capGeometry);

    for (let i = 0; i < 5; i++) {
      const wrapGeometry = new THREE.TorusGeometry(0.048, 0.006, 7, 20);
      const wrap = new THREE.Mesh(wrapGeometry, bronze);
      wrap.name = "Torch grip binding";
      wrap.position.z = -0.015 + i * 0.052;
      this.add(wrap);
      this.resources.push(wrapGeometry);
    }

    const rimGeometry = new THREE.TorusGeometry(0.072, 0.011, 8, 28);
    const rim = new THREE.Mesh(rimGeometry, bronze);
    rim.name = "Torch head rim";
    rim.position.z = -0.218;
    this.add(rim);
    this.resources.push(rimGeometry);

    const coalGeometry = new THREE.IcosahedronGeometry(0.048, 1);
    this.coal = new THREE.Mesh(coalGeometry, ember);
    this.coal.name = "Torch luminous ember";
    this.coal.scale.set(0.85, 0.85, 1.3);
    this.coal.position.z = -0.23;
    this.add(this.coal);
    this.resources.push(coalGeometry);

    this.glowTexture = createGlowTexture();
    const glowMaterial = new THREE.SpriteMaterial({
      map: this.glowTexture,
      color: 0xffa03b,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.glow = new THREE.Sprite(glowMaterial);
    this.glow.name = "Torch flame aura";
    this.glow.position.z = -0.25;
    this.glow.scale.setScalar(0.22);
    this.glow.raycast = () => {};
    this.add(this.glow);
    this.resources.push(glowMaterial);

    const beamGeometry = new THREE.ConeGeometry(0.58, 2.2, 48, 1, true);
    beamGeometry.rotateX(Math.PI / 2);
    beamGeometry.translate(0, 0, -1.1);
    const beamMaterial = new THREE.MeshBasicMaterial({
      color: 0xff9a39,
      transparent: true,
      opacity: 0.018,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    this.beam = new THREE.Mesh(beamGeometry, beamMaterial);
    this.beam.name = "Soft volumetric torch beam";
    this.beam.position.z = -0.22;
    this.beam.renderOrder = 3;
    this.beam.raycast = () => {};
    this.add(this.beam);
    this.resources.push(beamGeometry, beamMaterial);

    const haloMaterial = new THREE.MeshBasicMaterial({
      color: 0xffc46f,
      transparent: true,
      opacity: 0.46,
      depthWrite: false,
    });
    const haloGeometry = new THREE.TorusGeometry(0.105, 0.0035, 6, 48);
    this.halo = new THREE.Mesh(haloGeometry, haloMaterial);
    this.halo.name = "Torch hover affordance";
    this.halo.position.z = -0.02;
    this.halo.raycast = () => {};
    this.add(this.halo);
    this.resources.push(haloGeometry, haloMaterial);

    this.spot = new THREE.SpotLight(0xff9d46, 0.8, 4.2, 0.34, 0.88, 1.4);
    this.spot.position.set(0, 0, -0.19);
    this.spot.target.position.set(0, 0, -2.2);
    this.spot.castShadow = false;
    this.add(this.spot, this.spot.target);

    this.point = new THREE.PointLight(0xff7b2e, 0.42, 0.68, 2);
    this.point.position.z = -0.24;
    this.add(this.point);
  }

  onObjectSelectStart(event) {
    // Direct touch has no aim ray; this tool is intentionally ray-carried.
    if (event.source.type !== "direct-touch") {
      const controllerId = event.source.controller.userData.id;
      if (this.activeControllerId === null || this.activeControllerId === controllerId) {
        this.activeControllerId = controllerId;
        this.hovered = true;
      }
    }
    event.stopPropagation();
  }

  onObjectSelectEnd(event) {
    if (event.source.controller.userData.id === this.activeControllerId) {
      this.activeControllerId = null;
    }
    event.stopPropagation();
  }

  onHoverEnter(event) {
    this.hovered = true;
    event.stopPropagation();
  }

  onHoverExit(event) {
    if (this.activeControllerId === null) this.hovered = false;
    event.stopPropagation();
  }

  get isCarried() {
    return this.activeControllerId !== null;
  }

  getBeamRay(target = new THREE.Ray()) {
    if (this.isCarried) return xb.user.getRay(this.activeControllerId, target);
    this.updateWorldMatrix(true, false);
    this.getWorldPosition(target.origin);
    target.origin.add(
      this.tempDirection.copy(FORWARD).transformDirection(this.matrixWorld).multiplyScalar(0.23)
    );
    target.direction.copy(FORWARD).transformDirection(this.matrixWorld).normalize();
    return target;
  }

  update() {
    const now = performance.now();
    const delta = Math.min(0.05, Math.max(0.001, (now - this.lastUpdate) / 1000));
    this.lastUpdate = now;
    this.elapsed += delta;

    if (this.isCarried) {
      xb.user.getRay(this.activeControllerId, this.aimRay);
      this.targetPosition
        .copy(this.aimRay.origin)
        .addScaledVector(this.aimRay.direction, 0.3);
      this.targetQuaternion.setFromUnitVectors(FORWARD, this.aimRay.direction);
      this.position.lerp(this.targetPosition, 1 - Math.exp(-22 * delta));
      this.quaternion.slerp(this.targetQuaternion, 1 - Math.exp(-22 * delta));
    } else {
      this.position.lerp(REST_POSITION, 1 - Math.exp(-3.6 * delta));
      this.quaternion.slerp(REST_QUATERNION, 1 - Math.exp(-3.6 * delta));
    }

    this.lightStrength = damp(
      this.lightStrength,
      this.isCarried ? 1 : 0.22,
      this.isCarried ? 13 : 3.5,
      delta
    );
    const flicker = 0.93 + Math.sin(this.elapsed * 17) * 0.045 + Math.sin(this.elapsed * 31) * 0.025;
    const hoverBoost = this.hovered ? 1.18 : 1;
    this.glow.material.opacity = (0.56 + this.lightStrength * 0.3) * flicker;
    this.glow.scale.setScalar((0.18 + this.lightStrength * 0.08) * hoverBoost * flicker);
    this.coal.scale.set(0.82, 0.82, 1.2 + flicker * 0.18);
    this.beam.material.opacity = 0.008 + this.lightStrength * 0.026;
    this.halo.material.opacity = this.hovered ? 0.86 : 0.24;
    this.halo.scale.setScalar((this.hovered ? 1.13 : 1) + Math.sin(this.elapsed * 3.2) * 0.03);
    this.spot.intensity = 0.35 + this.lightStrength * 2.8 * flicker;
    this.point.intensity = 0.2 + this.lightStrength * 0.82 * flicker;
  }

  dispose() {
    this.resources.forEach((resource) => resource.dispose?.());
    this.glowTexture.dispose();
  }
}

function createFloor(stoneTexture) {
  const geometry = new THREE.PlaneGeometry(5.2, 5.2, 24, 24);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    positions.setY(i, -0.015 + Math.sin(x * 4.1) * Math.cos(z * 3.3) * 0.014);
  }
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({
    map: stoneTexture,
    bumpMap: stoneTexture,
    bumpScale: 0.05,
    color: 0x594737,
    roughness: 1,
  });
  const floor = new THREE.Mesh(geometry, material);
  floor.name = "Cave floor";
  floor.receiveShadow = true;
  return floor;
}

function createRockBorder(seed = 8) {
  const group = new THREE.Group();
  group.name = "Irregular cave stone edges";
  const random = seededRandom(seed);
  const geometry = new THREE.DodecahedronGeometry(0.18, 1);
  const material = new THREE.MeshStandardMaterial({
    color: 0x544333,
    roughness: 1,
  });
  for (let i = 0; i < 25; i++) {
    const mesh = new THREE.Mesh(geometry, material);
    const side = i % 2 === 0 ? -1 : 1;
    mesh.position.set(
      side * (2.28 + random() * 0.13),
      0.1 + random() * 2.55,
      -2.48 + random() * 0.18
    );
    mesh.scale.set(0.65 + random(), 0.65 + random() * 1.4, 0.45 + random());
    mesh.rotation.set(random() * 3, random() * 3, random() * 3);
    mesh.raycast = () => {};
    group.add(mesh);
  }
  group.userData.sharedResources = {geometry, material};
  return group;
}

function createDust() {
  const count = 175;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const random = seededRandom(421);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (random() - 0.5) * 4.3;
    positions[i * 3 + 1] = 0.18 + random() * 2.55;
    positions[i * 3 + 2] = -2.45 + random() * 3.7;
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xdcb475,
    size: 0.008,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const dust = new THREE.Points(geometry, material);
  dust.name = "Airborne cave dust";
  dust.raycast = () => {};
  return dust;
}

class LascauxTorchApp extends xb.Script {
  init() {
    this.name = "Lascaux Torch wall exploration";
    this.lastUpdate = performance.now();
    this.elapsed = 0;
    this.ray = new THREE.Ray();

    if (xb.core.renderer) {
      xb.core.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      xb.core.renderer.toneMappingExposure = 1.06;
      xb.core.renderer.shadowMap.enabled = true;
      xb.core.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    this.add(new THREE.HemisphereLight(0xa78b6b, 0x160e09, 0.72));
    const ambientGlow = new THREE.PointLight(0xa85226, 0.72, 4.4, 2);
    ambientGlow.position.set(-0.7, 2.25, -1.65);
    this.add(ambientGlow);

    this.stoneTexture = createStoneTexture();
    const front = new PreparedWall({
      name: "First prepared wall — horse and bison panel",
      width: 4.55,
      height: 2.72,
      position: new THREE.Vector3(0, 1.42, -2.58),
      rotationY: 0,
      stoneTexture: this.stoneTexture,
      variant: "front",
      first: true,
    });
    const left = new PreparedWall({
      name: "Left prepared wall — horse and ibex panel",
      width: 4.05,
      height: 2.72,
      position: new THREE.Vector3(-2.28, 1.42, -0.56),
      rotationY: Math.PI / 2,
      stoneTexture: this.stoneTexture,
      variant: "left",
    });
    const right = new PreparedWall({
      name: "Right side wall — bison and hand-stencil panel",
      width: 4.05,
      height: 2.72,
      position: new THREE.Vector3(2.28, 1.42, -0.56),
      rotationY: -Math.PI / 2,
      stoneTexture: this.stoneTexture,
      variant: "right",
    });
    this.preparedWalls = [front, left, right];
    this.preparedWalls.forEach((wall) => this.add(wall));

    this.floor = createFloor(this.stoneTexture);
    this.add(this.floor);
    this.rockBorder = createRockBorder();
    this.add(this.rockBorder);
    this.dust = createDust();
    this.add(this.dust);

    this.torch = new VirtualTorch();
    this.add(this.torch);
  }

  update() {
    const now = performance.now();
    const delta = Math.min(0.05, Math.max(0.001, (now - this.lastUpdate) / 1000));
    this.lastUpdate = now;
    this.elapsed += delta;
    this.dust.rotation.y = Math.sin(this.elapsed * 0.075) * 0.14;

    this.torch.getBeamRay(this.ray);
    let nearestWall = null;
    let nearestHit = null;
    for (const wall of this.preparedWalls) {
      const hit = wall.getRayHit(this.ray);
      if (hit && (!nearestHit || hit.distance < nearestHit.distance)) {
        nearestWall = wall;
        nearestHit = hit;
      }
    }

    const strength = this.torch.isCarried ? 1 : 0.2;
    for (const wall of this.preparedWalls) {
      wall.updateReveal(
        wall === nearestWall ? nearestHit.uv : null,
        strength,
        delta,
        this.elapsed
      );
    }
  }

  dispose() {
    this.preparedWalls.forEach((wall) => wall.dispose());
    this.floor.geometry.dispose();
    this.floor.material.dispose();
    const shared = this.rockBorder.userData.sharedResources;
    shared.geometry.dispose();
    shared.material.dispose();
    this.dust.geometry.dispose();
    this.dust.material.dispose();
    this.stoneTexture.dispose();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const options = new xb.Options();
  options.setAppTitle("Lascaux Torch");
  options.setAppDescription(
    "Hold the ray-selectable torch and sweep its moving light across prepared prehistoric walls."
  );
  options.controllers.visualizeRays = true;
  options.controllers.visualization = true;
  options.reticle.defaultRenderDistance = 1.35;
  options.simulator.defaultMode = xb.SimulatorMode.POSE;
  xb.add(new LascauxTorchApp());
  xb.init(options);
});
