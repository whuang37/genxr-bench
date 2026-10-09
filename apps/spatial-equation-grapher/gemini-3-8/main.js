import * as THREE from "three";
import * as xb from "xrblocks";

// Preset definitions
const PRESETS = {
  wave: {
    name: "Wave",
    equationText: "z = a sin(x) + b cos(y)",
    tag: "equation-preset-wave",
    zScale: 0.022,
    zRangeLabel: { top: "+5", mid: "0", bot: "-5" },
    fn: (x, y, a, b) => a * Math.sin(x) + b * Math.cos(y),
  },
  saddle: {
    name: "Saddle",
    equationText: "z = a x² - b y²",
    tag: "equation-preset-saddle",
    zScale: 0.0035,
    zRangeLabel: { top: "+25", mid: "0", bot: "-25" },
    fn: (x, y, a, b) => a * x * x - b * y * y,
  },
  ripple: {
    name: "Ripple",
    equationText: "z = a sin(b √(x² + y²))",
    tag: "equation-preset-ripple",
    zScale: 0.035,
    zRangeLabel: { top: "+3", mid: "0", bot: "-3" },
    fn: (x, y, a, b) => a * Math.sin(b * Math.sqrt(x * x + y * y)),
  },
};

function disableRaycast(obj) {
  obj.raycast = () => {};
  obj.xb = { pointerEvents: "none" };
}

// Colors for height-based surface shader/vertex colors
function getHeatmapColor(t) {
  t = Math.max(0, Math.min(1, t));
  let r, g, b;
  if (t < 0.25) {
    const s = t / 0.25;
    r = 0.1;
    g = 0.2 + 0.6 * s;
    b = 0.8 + 0.2 * s;
  } else if (t < 0.5) {
    const s = (t - 0.25) / 0.25;
    r = 0.1 + 0.2 * s;
    g = 0.8 + 0.15 * s;
    b = 1.0 - 0.7 * s;
  } else if (t < 0.75) {
    const s = (t - 0.5) / 0.25;
    r = 0.3 + 0.65 * s;
    g = 0.95;
    b = 0.3 - 0.2 * s;
  } else {
    const s = (t - 0.75) / 0.25;
    r = 0.95;
    g = 0.95 - 0.75 * s;
    b = 0.1;
  }
  return [r, g, b];
}

function createTextSprite(text, { fontSize = 34, color = "#ffffff", scale = [0.08, 0.04] } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 128, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(scale[0], scale[1], 1);
  disableRaycast(sprite);
  return sprite;
}

function updateTextSprite(sprite, text, { fontSize = 34, color = "#ffffff" } = {}) {
  const canvas = sprite.material.map.image;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 128, 64);
  sprite.material.map.needsUpdate = true;
}

class SpatialEquationGrapherApp extends xb.Script {
  constructor() {
    super();
    this.name = "Spatial Equation Grapher";

    this.presetStates = {
      wave: { a: 1.0, b: 1.0 },
      saddle: { a: 1.0, b: 1.0 },
      ripple: { a: 1.0, b: 1.0 },
    };

    this.activePresetKey = "wave";
  }

  init() {
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444455, 2.8);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight.position.set(1.5, 3, 2);
    this.add(hemiLight, dirLight);

    this.buildGraphVolume();
    this.buildSpatialUI();

    this.updateActiveDisplay();
  }

  buildGraphVolume() {
    this.graphGroup = new THREE.Group();
    // Placed directly in front of the viewer at comfortable reachable distance
    this.graphGroup.position.set(0, 1.48, -0.62);
    this.graphGroup.rotation.x = 0.28;
    this.graphGroup.rotation.y = -0.32;
    this.add(this.graphGroup);

    const volumeWidth = 0.40;
    const volumeDepth = 0.40;
    const volumeHeight = 0.26;

    // 1. Zero Plane
    const zeroPlaneGeo = new THREE.PlaneGeometry(volumeWidth, volumeDepth);
    const zeroPlaneMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false,
      roughness: 0.9,
    });
    this.zeroPlaneMesh = new THREE.Mesh(zeroPlaneGeo, zeroPlaneMat);
    this.zeroPlaneMesh.rotation.x = -Math.PI / 2;
    this.zeroPlaneMesh.position.set(0, 0, 0);
    this.graphGroup.add(this.zeroPlaneMesh);

    // 2. Zero Plane Grid
    this.zeroGrid = new THREE.GridHelper(volumeWidth, 10, 0x60a5fa, 0x475569);
    this.zeroGrid.position.set(0, 0, 0);
    this.zeroGrid.material.transparent = true;
    this.zeroGrid.material.opacity = 0.65;
    this.zeroGrid.material.depthWrite = false;
    this.graphGroup.add(this.zeroGrid);

    // 3. Bounding Volume Cage
    const boxGeo = new THREE.BoxGeometry(volumeWidth, volumeHeight, volumeDepth);
    const boxEdges = new THREE.EdgesGeometry(boxGeo);
    const boxLineMat = new THREE.LineBasicMaterial({
      color: 0x64748b,
      transparent: true,
      opacity: 0.45,
    });
    this.boxCage = new THREE.LineSegments(boxEdges, boxLineMat);
    this.boxCage.position.set(0, 0, 0);
    this.graphGroup.add(this.boxCage);

    // 4. Three Axes: X, Y, Z
    const axisRadius = 0.0022;
    const createAxisCylinder = (color, length, rotation, position) => {
      const geo = new THREE.CylinderGeometry(axisRadius, axisRadius, length, 16);
      const mat = new THREE.MeshBasicMaterial({ color });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.copy(rotation);
      mesh.position.copy(position);
      return mesh;
    };

    const createArrowCone = (color, position, rotation) => {
      const geo = new THREE.ConeGeometry(0.007, 0.02, 16);
      const mat = new THREE.MeshBasicMaterial({ color });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);
      mesh.rotation.copy(rotation);
      return mesh;
    };

    // X axis (red)
    const xAxis = createAxisCylinder(
      0xef4444,
      volumeWidth + 0.04,
      new THREE.Euler(0, 0, -Math.PI / 2),
      new THREE.Vector3(0, 0, 0)
    );
    const xArrow = createArrowCone(
      0xef4444,
      new THREE.Vector3(volumeWidth / 2 + 0.02, 0, 0),
      new THREE.Euler(0, 0, -Math.PI / 2)
    );
    this.graphGroup.add(xAxis, xArrow);

    // Y axis (green, depth in graph)
    const yAxis = createAxisCylinder(
      0x22c55e,
      volumeDepth + 0.04,
      new THREE.Euler(Math.PI / 2, 0, 0),
      new THREE.Vector3(0, 0, 0)
    );
    const yArrow = createArrowCone(
      0x22c55e,
      new THREE.Vector3(0, 0, volumeDepth / 2 + 0.02),
      new THREE.Euler(Math.PI / 2, 0, 0)
    );
    this.graphGroup.add(yAxis, yArrow);

    // Z axis (blue, vertical height in graph)
    const zAxis = createAxisCylinder(
      0x38bdf8,
      volumeHeight + 0.04,
      new THREE.Euler(0, 0, 0),
      new THREE.Vector3(0, 0, 0)
    );
    const zArrow = createArrowCone(
      0x38bdf8,
      new THREE.Vector3(0, volumeHeight / 2 + 0.02, 0),
      new THREE.Euler(0, 0, 0)
    );
    this.graphGroup.add(zAxis, zArrow);

    // 5. Axis Labels and Scale Labels
    const xLabel = createTextSprite("X", { fontSize: 44, color: "#f87171", scale: [0.06, 0.03] });
    xLabel.position.set(volumeWidth / 2 + 0.04, 0, 0);
    const yLabel = createTextSprite("Y", { fontSize: 44, color: "#4ade80", scale: [0.06, 0.03] });
    yLabel.position.set(0, 0, volumeDepth / 2 + 0.04);
    const zLabel = createTextSprite("Z", { fontSize: 44, color: "#38bdf8", scale: [0.06, 0.03] });
    zLabel.position.set(0, volumeHeight / 2 + 0.04, 0);
    this.graphGroup.add(xLabel, yLabel, zLabel);

    const xMinLabel = createTextSprite("-5", { fontSize: 32, color: "#94a3b8", scale: [0.05, 0.025] });
    xMinLabel.position.set(-volumeWidth / 2, -0.018, 0);
    const xMaxLabel = createTextSprite("5", { fontSize: 32, color: "#94a3b8", scale: [0.05, 0.025] });
    xMaxLabel.position.set(volumeWidth / 2, -0.018, 0);
    this.graphGroup.add(xMinLabel, xMaxLabel);

    const yMinLabel = createTextSprite("-5", { fontSize: 32, color: "#94a3b8", scale: [0.05, 0.025] });
    yMinLabel.position.set(0, -0.018, -volumeDepth / 2);
    const yMaxLabel = createTextSprite("5", { fontSize: 32, color: "#94a3b8", scale: [0.05, 0.025] });
    yMaxLabel.position.set(0, -0.018, volumeDepth / 2);
    this.graphGroup.add(yMinLabel, yMaxLabel);

    this.zTopLabel = createTextSprite("+5", { fontSize: 32, color: "#38bdf8", scale: [0.06, 0.03] });
    this.zTopLabel.position.set(0.035, volumeHeight / 2 - 0.01, 0);
    this.zMidLabel = createTextSprite("0", { fontSize: 32, color: "#38bdf8", scale: [0.05, 0.025] });
    this.zMidLabel.position.set(0.032, 0, 0);
    this.zBotLabel = createTextSprite("-5", { fontSize: 32, color: "#38bdf8", scale: [0.06, 0.03] });
    this.zBotLabel.position.set(0.035, -volumeHeight / 2 + 0.01, 0);
    this.graphGroup.add(this.zTopLabel, this.zMidLabel, this.zBotLabel);

    const zeroPlaneBadge = createTextSprite("z = 0", {
      fontSize: 30,
      color: "#93c5fd",
      scale: [0.07, 0.035],
    });
    zeroPlaneBadge.position.set(-volumeWidth / 2 + 0.04, 0.01, volumeDepth / 2 - 0.04);
    this.graphGroup.add(zeroPlaneBadge);

    // 6. Surface Mesh
    this.gridSegments = 60;
    const numVerts = (this.gridSegments + 1) * (this.gridSegments + 1);
    const surfaceGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(numVerts * 3);
    const colors = new Float32Array(numVerts * 3);
    const indices = [];

    for (let j = 0; j < this.gridSegments; j++) {
      for (let i = 0; i < this.gridSegments; i++) {
        const a = j * (this.gridSegments + 1) + i;
        const b = j * (this.gridSegments + 1) + (i + 1);
        const c = (j + 1) * (this.gridSegments + 1) + i;
        const d = (j + 1) * (this.gridSegments + 1) + (i + 1);
        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }
    surfaceGeo.setIndex(indices);
    surfaceGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    surfaceGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const surfaceMat = new THREE.MeshStandardMaterial({
      roughness: 0.35,
      metalness: 0.05,
      side: THREE.DoubleSide,
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
      depthWrite: true,
    });

    this.surfaceMesh = new THREE.Mesh(surfaceGeo, surfaceMat);
    this.graphGroup.add(this.surfaceMesh);

    // Ensure all graph volume visualization objects ignore pointer raycasts
    this.graphGroup.traverse(disableRaycast);
  }

  buildSpatialUI() {
    this.nameText = new xb.UIText({
      text: "Wave",
      style: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#ffffff",
        textAlign: "center",
      },
    });

    this.equationText = new xb.UIText({
      text: "z = a sin(x) + b cos(y)",
      style: {
        fontSize: 16,
        color: "#93c5fd",
        textAlign: "center",
      },
    });

    // Preset buttons
    this.presetButtons = {};
    const createPresetBtn = (key) => {
      const def = PRESETS[key];
      const btn = new xb.UIButton({
        label: def.name,
        style: {
          flexGrow: 1,
          height: 40,
        },
        onClick: () => this.selectPreset(key),
      });
      btn.userData.xrblocksDevtools = { tag: def.tag };
      this.presetButtons[key] = btn;
      return btn;
    };

    const waveBtn = createPresetBtn("wave");
    const saddleBtn = createPresetBtn("saddle");
    const rippleBtn = createPresetBtn("ripple");

    const presetRow = new xb.UIPanel({
      style: {
        width: "100%",
        flexDirection: "row",
        gap: 8,
      },
      children: [waveBtn, saddleBtn, rippleBtn],
    });

    // Parameter A row
    this.aValText = new xb.UIText({
      text: "1.0",
      style: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#ffffff",
        minWidth: 42,
        textAlign: "center",
      },
    });

    this.aMinusBtn = new xb.UIButton({
      label: "-",
      ariaLabel: "Decrease a",
      style: { minWidth: 44, height: 38 },
      onClick: () => this.changeParam("a", -0.5),
    });

    this.aPlusBtn = new xb.UIButton({
      label: "+",
      ariaLabel: "Increase a",
      style: { minWidth: 44, height: 38 },
      onClick: () => this.changeParam("a", 0.5),
    });

    const paramARow = new xb.UIPanel({
      style: {
        width: "100%",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 4,
      },
      children: [
        new xb.UIText({
          text: "Parameter a",
          style: { fontSize: 16, fontWeight: "medium", color: "#e2e8f0" },
        }),
        new xb.UIPanel({
          style: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          },
          children: [this.aMinusBtn, this.aValText, this.aPlusBtn],
        }),
      ],
    });

    // Parameter B row
    this.bValText = new xb.UIText({
      text: "1.0",
      style: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#ffffff",
        minWidth: 42,
        textAlign: "center",
      },
    });

    this.bMinusBtn = new xb.UIButton({
      label: "-",
      ariaLabel: "Decrease b",
      style: { minWidth: 44, height: 38 },
      onClick: () => this.changeParam("b", -0.5),
    });

    this.bPlusBtn = new xb.UIButton({
      label: "+",
      ariaLabel: "Increase b",
      style: { minWidth: 44, height: 38 },
      onClick: () => this.changeParam("b", 0.5),
    });

    const paramBRow = new xb.UIPanel({
      style: {
        width: "100%",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 4,
      },
      children: [
        new xb.UIText({
          text: "Parameter b",
          style: { fontSize: 16, fontWeight: "medium", color: "#e2e8f0" },
        }),
        new xb.UIPanel({
          style: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          },
          children: [this.bMinusBtn, this.bValText, this.bPlusBtn],
        }),
      ],
    });

    // Control card container
    this.card = new xb.UICard({
      size: { width: 0.46, height: "auto" },
      style: {
        flexDirection: "column",
        gap: 10,
        padding: 14,
        backgroundColor: "#1e293b",
        borderRadius: 20,
      },
      children: [
        this.nameText,
        this.equationText,
        presetRow,
        paramARow,
        paramBRow,
      ],
    });

    // Positioned below the graph volume within comfortable reachable range
    this.card.position.set(0, 1.18, -0.52);
    this.card.rotation.x = -0.18;
    this.add(this.card);
  }

  selectPreset(key) {
    if (!PRESETS[key]) return;
    this.activePresetKey = key;
    this.updateActiveDisplay();
  }

  changeParam(paramName, delta) {
    const state = this.presetStates[this.activePresetKey];
    let nextVal = Math.round((state[paramName] + delta) * 2) / 2;
    nextVal = Math.max(-3.0, Math.min(3.0, nextVal));
    if (Object.is(nextVal, -0)) nextVal = 0;
    state[paramName] = nextVal;
    this.updateActiveDisplay();
  }

  updateActiveDisplay() {
    const key = this.activePresetKey;
    const def = PRESETS[key];
    const state = this.presetStates[key];

    // 1. Update text displays
    this.nameText.text = def.name;
    this.equationText.text = def.equationText;
    this.aValText.text = state.a.toFixed(1);
    this.bValText.text = state.b.toFixed(1);

    // 2. Update button states
    this.aMinusBtn.disabled = state.a <= -3.0;
    this.aPlusBtn.disabled = state.a >= 3.0;
    this.bMinusBtn.disabled = state.b <= -3.0;
    this.bPlusBtn.disabled = state.b >= 3.0;

    // 3. Highlight active preset button
    for (const [k, btn] of Object.entries(this.presetButtons)) {
      if (k === key) {
        btn.style.backgroundColor = "rgba(59, 130, 246, 0.85)";
      } else {
        btn.style.backgroundColor = "rgba(51, 65, 85, 0.65)";
      }
    }

    // 4. Update Z axis scale labels
    updateTextSprite(this.zTopLabel, def.zRangeLabel.top, { fontSize: 32, color: "#38bdf8" });
    updateTextSprite(this.zMidLabel, def.zRangeLabel.mid, { fontSize: 32, color: "#38bdf8" });
    updateTextSprite(this.zBotLabel, def.zRangeLabel.bot, { fontSize: 32, color: "#38bdf8" });

    // 5. Resample surface over x and y in [-5, 5]
    this.resampleSurface(def.fn, state.a, state.b, def.zScale);
  }

  resampleSurface(fn, a, b, zScale) {
    const segs = this.gridSegments;
    const positions = this.surfaceMesh.geometry.attributes.position.array;
    const colors = this.surfaceMesh.geometry.attributes.color.array;

    const volumeWidth = 0.40;
    const volumeDepth = 0.40;

    const zValues = new Float32Array((segs + 1) * (segs + 1));
    let zMin = Infinity;
    let zMax = -Infinity;

    let index = 0;
    for (let j = 0; j <= segs; j++) {
      const v = j / segs;
      const yMath = -5.0 + 10.0 * v;
      for (let i = 0; i <= segs; i++) {
        const u = i / segs;
        const xMath = -5.0 + 10.0 * u;

        const zMath = fn(xMath, yMath, a, b);
        zValues[index++] = zMath;
        if (zMath < zMin) zMin = zMath;
        if (zMath > zMax) zMax = zMath;
      }
    }

    const zSpan = zMax > zMin ? zMax - zMin : 1.0;

    index = 0;
    let ptr = 0;
    for (let j = 0; j <= segs; j++) {
      const v = j / segs;
      const zLocal = (v - 0.5) * volumeDepth;
      for (let i = 0; i <= segs; i++) {
        const u = i / segs;
        const xLocal = (u - 0.5) * volumeWidth;

        const zMath = zValues[index++];
        let yLocal = zMath * zScale;

        yLocal = Math.max(-0.13, Math.min(0.13, yLocal));

        positions[ptr] = xLocal;
        positions[ptr + 1] = yLocal;
        positions[ptr + 2] = zLocal;

        const normZ = (zMath - zMin) / zSpan;
        const [cr, cg, cb] = getHeatmapColor(normZ);
        colors[ptr] = cr;
        colors[ptr + 1] = cg;
        colors[ptr + 2] = cb;

        ptr += 3;
      }
    }

    this.surfaceMesh.geometry.attributes.position.needsUpdate = true;
    this.surfaceMesh.geometry.attributes.color.needsUpdate = true;
    this.surfaceMesh.geometry.computeVertexNormals();
    this.surfaceMesh.geometry.computeBoundingBox();
    this.surfaceMesh.geometry.computeBoundingSphere();
    disableRaycast(this.surfaceMesh);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  xb.add(new SpatialEquationGrapherApp());
  xb.init(new xb.Options());
});
