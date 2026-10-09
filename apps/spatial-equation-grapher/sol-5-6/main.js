import * as THREE from "three";
import * as xb from "xrblocks";

const DOMAIN_MIN = -5;
const DOMAIN_MAX = 5;
const PARAM_MIN = -3.0;
const PARAM_MAX = 3.0;
const PARAM_STEP = 0.5;
const SURFACE_SEGMENTS = 50;

const GRAPH_WIDTH = 0.88;
const GRAPH_DEPTH = 0.68;
const GRAPH_HEIGHT = 0.62;

const PRESETS = {
  wave: {
    name: "Wave",
    equation: "z = a sin(x) + b cos(y)",
    color: 0x45d7ff,
    devtoolsTag: "equation-preset-wave",
    a: 1.0,
    b: 1.0,
    evaluate: (x, y, a, b) => a * Math.sin(x) + b * Math.cos(y),
  },
  saddle: {
    name: "Saddle",
    equation: "z = a x² - b y²",
    color: 0xff8a65,
    devtoolsTag: "equation-preset-saddle",
    a: 1.0,
    b: 1.0,
    evaluate: (x, y, a, b) => a * x * x - b * y * y,
  },
  ripple: {
    name: "Ripple",
    equation: "z = a sin(b √(x² + y²))",
    color: 0xa7ef75,
    devtoolsTag: "equation-preset-ripple",
    a: 1.0,
    b: 1.0,
    evaluate: (x, y, a, b) =>
      a * Math.sin(b * Math.sqrt(x * x + y * y)),
  },
};

const PRESET_KEYS = ["wave", "saddle", "ripple"];
const PRIVATE = {xrblocksPrivate: true};

function formatParameter(value) {
  // Avoid displaying the confusing string “-0.0”.
  return (Math.abs(value) < 0.0001 ? 0 : value).toFixed(1);
}

function niceSymmetricLimit(maxAbs) {
  if (!Number.isFinite(maxAbs) || maxAbs <= 0) return 1;
  const exponent = Math.floor(Math.log10(maxAbs));
  const magnitude = 10 ** exponent;
  const normalized = maxAbs / magnitude;
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}

function makeLineSegments(points, color, opacity = 1) {
  const geometry = new THREE.BufferGeometry().setFromPoints(
    points.map(([x, y, z]) => new THREE.Vector3(x, y, z))
  );
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    depthWrite: false,
  });
  const lines = new THREE.LineSegments(geometry, material);
  lines.userData = {...PRIVATE};
  return lines;
}

function makeCanvasLabel(text, options = {}) {
  const {
    color = "#dff7ff",
    background = "rgba(5, 15, 28, 0.78)",
    fontSize = 54,
    width = 256,
    height = 104,
    scale = [0.15, 0.061],
  } = options;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, width, height);
  context.fillStyle = background;
  context.beginPath();
  context.roundRect(3, 3, width - 6, height - 6, 18);
  context.fill();
  context.font = `600 ${fontSize}px system-ui, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = color;
  context.fillText(text, width / 2, height / 2 + 1);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(scale[0], scale[1], 1);
  sprite.renderOrder = 20;
  sprite.userData = {...PRIVATE};
  sprite.name = `Graph label: ${text}`;
  sprite.setLabel = (nextText) => {
    context.clearRect(0, 0, width, height);
    context.fillStyle = background;
    context.beginPath();
    context.roundRect(3, 3, width - 6, height - 6, 18);
    context.fill();
    context.font = `600 ${fontSize}px system-ui, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = color;
    context.fillText(nextText, width / 2, height / 2 + 1);
    texture.needsUpdate = true;
    sprite.name = `Graph label: ${nextText}`;
  };
  return sprite;
}

function disposeObject(root) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  root.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    const objectMaterials = Array.isArray(object.material)
      ? object.material
      : object.material
        ? [object.material]
        : [];
    for (const material of objectMaterials) {
      materials.add(material);
      for (const value of Object.values(material)) {
        if (value?.isTexture) textures.add(value);
      }
    }
  });
  for (const texture of textures) texture.dispose();
  for (const material of materials) material.dispose();
  for (const geometry of geometries) geometry.dispose();
}

class SpatialEquationGrapher extends xb.Script {
  constructor() {
    super();
    this.activePreset = "wave";
    this.graphRoot = null;
    this.controlsCard = null;
    this.surfaceGeometry = null;
    this.surfaceMaterial = null;
    this.surfaceWireMaterial = null;
    this.surfaceValues = new Float32Array((SURFACE_SEGMENTS + 1) ** 2);
    this.presetButtons = new Map();
    this.parameterTexts = {};
    this.zScaleLabels = [];
  }

  init() {
    xb.ui.theme = "glimmerOpaque";

    const hemisphere = new THREE.HemisphereLight(0xcceeff, 0x182335, 2.5);
    hemisphere.userData = {...PRIVATE};
    this.add(hemisphere);
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
    keyLight.position.set(-1.2, 2.8, 1.5);
    keyLight.userData = {...PRIVATE};
    this.add(keyLight);

    this.createGraphVolume();
    this.createControlCard();
    this.resampleSurface();
  }

  createGraphVolume() {
    this.graphRoot = new THREE.Group();
    this.graphRoot.name = "Labeled three-axis graph volume";
    this.graphRoot.position.set(-0.33, 1.34, -1.23);
    this.graphRoot.rotation.y = 0.05;
    this.graphRoot.userData.graphDomain = {
      x: [DOMAIN_MIN, DOMAIN_MAX],
      y: [DOMAIN_MIN, DOMAIN_MAX],
      zScale: "adaptive symmetric",
    };
    this.add(this.graphRoot);

    const halfW = GRAPH_WIDTH / 2;
    const halfD = GRAPH_DEPTH / 2;
    const halfH = GRAPH_HEIGHT / 2;

    // A translucent mathematical z = 0 plane remains visible behind the surface.
    const zeroPlaneMaterial = new THREE.MeshBasicMaterial({
      color: 0x4d7892,
      transparent: true,
      opacity: 0.13,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const zeroPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(GRAPH_WIDTH, GRAPH_DEPTH),
      zeroPlaneMaterial
    );
    zeroPlane.name = "Visible zero plane (z = 0)";
    zeroPlane.rotation.x = -Math.PI / 2;
    zeroPlane.renderOrder = 0;
    zeroPlane.userData = {...PRIVATE};
    this.graphRoot.add(zeroPlane);

    const grid = new THREE.GridHelper(GRAPH_WIDTH, 10, 0x7db8cf, 0x35566b);
    grid.name = "Grid from -5 to 5";
    grid.scale.z = GRAPH_DEPTH / GRAPH_WIDTH;
    grid.position.y = 0.001;
    grid.material.transparent = true;
    grid.material.opacity = 0.58;
    grid.material.depthWrite = false;
    grid.userData = {...PRIVATE};
    this.graphRoot.add(grid);

    // Box outline gives the learner a durable, fixed graph volume.
    const x0 = -halfW;
    const x1 = halfW;
    const y0 = -halfH;
    const y1 = halfH;
    const z0 = -halfD;
    const z1 = halfD;
    const corners = [
      [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1],
      [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1],
    ];
    const edgeIndices = [
      0, 1, 1, 2, 2, 3, 3, 0,
      4, 5, 5, 6, 6, 7, 7, 4,
      0, 4, 1, 5, 2, 6, 3, 7,
    ];
    const edgePoints = [];
    for (const index of edgeIndices) edgePoints.push(corners[index]);
    const volumeEdges = makeLineSegments(edgePoints, 0x6892a8, 0.42);
    volumeEdges.name = "Graph volume bounds";
    this.graphRoot.add(volumeEdges);

    // Mathematical x/y live on the zero plane; mathematical z is vertical.
    const axes = new THREE.Group();
    axes.name = "x y z axes";
    axes.userData = {...PRIVATE};
    axes.add(
      makeLineSegments([[-halfW - 0.03, 0.004, 0], [halfW + 0.04, 0.004, 0]], 0xff6b6b),
      makeLineSegments([[0, 0.004, halfD + 0.03], [0, 0.004, -halfD - 0.04]], 0x75ef9a),
      makeLineSegments([[0, -halfH - 0.025, 0], [0, halfH + 0.045, 0]], 0x58b6ff)
    );
    this.graphRoot.add(axes);

    this.addGraphLabels(halfW, halfD, halfH);
    this.createSurfaceGeometry();
  }

  addGraphLabels(halfW, halfD, halfH) {
    const xLabel = makeCanvasLabel("x", {color: "#ff9b9b", scale: [0.09, 0.045]});
    xLabel.position.set(halfW + 0.065, 0.015, 0);
    const yLabel = makeCanvasLabel("y", {color: "#a5f6ba", scale: [0.09, 0.045]});
    yLabel.position.set(0, 0.015, -halfD - 0.065);
    const zLabel = makeCanvasLabel("z", {color: "#9bd5ff", scale: [0.09, 0.045]});
    zLabel.position.set(0.035, halfH + 0.07, 0);

    const minusFiveX = makeCanvasLabel("−5", {fontSize: 43, scale: [0.1, 0.043]});
    minusFiveX.position.set(-halfW, -0.035, halfD + 0.045);
    const zeroX = makeCanvasLabel("0", {fontSize: 43, scale: [0.08, 0.043]});
    zeroX.position.set(0, -0.035, halfD + 0.045);
    const plusFiveX = makeCanvasLabel("5", {fontSize: 43, scale: [0.08, 0.043]});
    plusFiveX.position.set(halfW, -0.035, halfD + 0.045);

    const minusFiveY = makeCanvasLabel("−5", {fontSize: 43, scale: [0.1, 0.043]});
    minusFiveY.position.set(-halfW - 0.055, -0.025, halfD);
    const plusFiveY = makeCanvasLabel("5", {fontSize: 43, scale: [0.08, 0.043]});
    plusFiveY.position.set(-halfW - 0.045, -0.025, -halfD);

    const zPositive = makeCanvasLabel("+1", {fontSize: 39, scale: [0.11, 0.043]});
    zPositive.position.set(-0.065, halfH, 0);
    const zZero = makeCanvasLabel("0", {fontSize: 39, scale: [0.08, 0.043]});
    zZero.position.set(-0.055, 0.025, 0);
    const zNegative = makeCanvasLabel("−1", {fontSize: 39, scale: [0.11, 0.043]});
    zNegative.position.set(-0.065, -halfH, 0);
    this.zScaleLabels = [zPositive, zNegative];

    this.graphRoot.add(
      xLabel,
      yLabel,
      zLabel,
      minusFiveX,
      zeroX,
      plusFiveX,
      minusFiveY,
      plusFiveY,
      zPositive,
      zZero,
      zNegative
    );
  }

  createSurfaceGeometry() {
    const side = SURFACE_SEGMENTS + 1;
    const vertexCount = side * side;
    const positions = new Float32Array(vertexCount * 3);
    const colors = new Float32Array(vertexCount * 3);
    const indices = [];

    for (let row = 0; row < side; row += 1) {
      const fy = row / SURFACE_SEGMENTS;
      for (let column = 0; column < side; column += 1) {
        const fx = column / SURFACE_SEGMENTS;
        const index = row * side + column;
        positions[index * 3] = (fx - 0.5) * GRAPH_WIDTH;
        positions[index * 3 + 1] = 0;
        // Positive mathematical y follows the green axis away from the viewer.
        positions[index * 3 + 2] = (0.5 - fy) * GRAPH_DEPTH;
      }
    }
    for (let row = 0; row < SURFACE_SEGMENTS; row += 1) {
      for (let column = 0; column < SURFACE_SEGMENTS; column += 1) {
        const a = row * side + column;
        const b = a + 1;
        const c = a + side;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }

    this.surfaceGeometry = new THREE.BufferGeometry();
    this.surfaceGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.surfaceGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    this.surfaceGeometry.setIndex(indices);

    this.surfaceMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity: 0.82,
      roughness: 0.56,
      metalness: 0.08,
      side: THREE.DoubleSide,
      depthWrite: true,
    });
    this.surfaceWireMaterial = new THREE.MeshBasicMaterial({
      color: PRESETS.wave.color,
      transparent: true,
      opacity: 0.26,
      wireframe: true,
      depthWrite: false,
    });

    const surface = new THREE.Mesh(this.surfaceGeometry, this.surfaceMaterial);
    surface.name = "Active equation surface";
    surface.userData = {
      equationPreset: this.activePreset,
      sampleDomain: [DOMAIN_MIN, DOMAIN_MAX],
      samplesPerAxis: SURFACE_SEGMENTS + 1,
    };
    surface.renderOrder = 2;
    this.surfaceMesh = surface;

    const wire = new THREE.Mesh(this.surfaceGeometry, this.surfaceWireMaterial);
    wire.name = "Active surface wire grid";
    wire.userData = {...PRIVATE};
    wire.renderOrder = 3;
    wire.scale.y = 1.002;
    this.graphRoot.add(surface, wire);
  }

  createControlCard() {
    const title = new xb.UIText({
      text: "SPATIAL EQUATION GRAPHER",
      style: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#8be3ff",
        textAlign: "center",
      },
    });
    this.activeNameText = new xb.UIText({
      text: PRESETS.wave.name,
      style: {
        fontSize: 38,
        fontWeight: "bold",
        color: "#ffffff",
        textAlign: "center",
      },
    });
    this.equationText = new xb.UIText({
      text: PRESETS.wave.equation,
      style: {
        width: "100%",
        fontSize: 22,
        color: "#cdefff",
        textAlign: "center",
      },
    });

    const presetRow = new xb.UIPanel({
      style: {
        width: "100%",
        flexDirection: "row",
        gap: 9,
      },
    });
    for (const key of PRESET_KEYS) {
      const preset = PRESETS[key];
      const button = new xb.UIButton({
        label: preset.name,
        ariaLabel: `Select ${preset.name} equation`,
        onClick: () => this.selectPreset(key),
        style: {
          flexGrow: 1,
          height: 58,
          padding: 8,
          fontSize: 19,
          borderWidth: 2,
        },
      });
      button.name = `${preset.name} equation preset control`;
      button.userData.xrblocksDevtools = {tag: preset.devtoolsTag};
      this.presetButtons.set(key, button);
      presetRow.add(button);
    }

    const divider = new xb.UIPanel({
      pointerEvents: "none",
      style: {
        width: "100%",
        height: 2,
        backgroundColor: "#4f7188",
        opacity: 0.65,
      },
    });

    const parameterSection = new xb.UIPanel({
      style: {
        width: "100%",
        flexDirection: "column",
        gap: 10,
        padding: 12,
        borderRadius: 15,
        backgroundColor: "#071522b8",
      },
    });
    parameterSection.add(
      new xb.UIText({
        text: "PARAMETERS  ·  −3.0 TO 3.0  ·  STEP 0.5",
        style: {
          width: "100%",
          fontSize: 15,
          color: "#9cb6c6",
          textAlign: "center",
        },
      }),
      this.createParameterRow("a"),
      this.createParameterRow("b")
    );

    this.scaleText = new xb.UIText({
      text: "Surface: 51 × 51 samples  •  x, y: −5 to 5  •  z: ±2",
      style: {
        width: "100%",
        fontSize: 14,
        color: "#91a9b8",
        textAlign: "center",
      },
    });
    this.statusText = new xb.UIText({
      text: "Wave selected · adjust a or b",
      style: {
        width: "100%",
        fontSize: 16,
        color: "#8be3ff",
        textAlign: "center",
      },
    });

    this.controlsCard = new xb.UICard({
      size: {width: 0.53, height: 0.7},
      manipulation: true,
      edge: true,
      style: {
        flexDirection: "column",
        justifyContent: "center",
        gap: 13,
        padding: 20,
        borderRadius: 25,
        backgroundColor: "#0b1724ee",
        borderColor: "#456579",
        borderWidth: 2,
      },
      children: [
        title,
        this.activeNameText,
        this.equationText,
        presetRow,
        divider,
        parameterSection,
        this.scaleText,
        this.statusText,
      ],
    });
    this.controlsCard.name = "Equation and parameter controls";
    this.controlsCard.position.set(0.51, 1.36, -1.03);
    this.controlsCard.rotation.y = -0.16;
    this.add(this.controlsCard);
    this.updateControlDisplay();
  }

  createParameterRow(parameter) {
    const valueText = new xb.UIText({
      text: `${parameter} = 1.0`,
      style: {
        flexGrow: 1,
        fontSize: 27,
        fontWeight: "bold",
        color: "#ffffff",
        textAlign: "center",
      },
    });
    this.parameterTexts[parameter] = valueText;

    const minus = new xb.UIButton({
      label: "−",
      ariaLabel: `Decrease parameter ${parameter} by 0.5`,
      onClick: () => this.adjustParameter(parameter, -PARAM_STEP),
      style: {
        width: 68,
        height: 58,
        fontSize: 30,
        padding: 6,
      },
    });
    minus.name = `Decrease parameter ${parameter}`;
    const plus = new xb.UIButton({
      label: "+",
      ariaLabel: `Increase parameter ${parameter} by 0.5`,
      onClick: () => this.adjustParameter(parameter, PARAM_STEP),
      style: {
        width: 68,
        height: 58,
        fontSize: 28,
        padding: 6,
      },
    });
    plus.name = `Increase parameter ${parameter}`;
    this[`${parameter}MinusButton`] = minus;
    this[`${parameter}PlusButton`] = plus;

    return new xb.UIPanel({
      style: {
        width: "100%",
        height: 64,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      },
      children: [minus, valueText, plus],
    });
  }

  selectPreset(key) {
    if (!PRESETS[key]) return;
    this.activePreset = key;
    this.updateControlDisplay();
    this.resampleSurface();
  }

  adjustParameter(parameter, delta) {
    if (parameter !== "a" && parameter !== "b") return;
    const preset = PRESETS[this.activePreset];
    const next = THREE.MathUtils.clamp(
      Math.round((preset[parameter] + delta) / PARAM_STEP) * PARAM_STEP,
      PARAM_MIN,
      PARAM_MAX
    );
    if (next === preset[parameter]) return;
    preset[parameter] = next;
    this.updateControlDisplay();
    this.resampleSurface();
  }

  updateControlDisplay() {
    const preset = PRESETS[this.activePreset];
    this.activeNameText.text = preset.name;
    this.equationText.text = preset.equation;
    this.parameterTexts.a.text = `a = ${formatParameter(preset.a)}`;
    this.parameterTexts.b.text = `b = ${formatParameter(preset.b)}`;
    this.statusText.text = `${preset.name} selected · surface updated`;

    for (const [key, button] of this.presetButtons) {
      const selected = key === this.activePreset;
      const color = new THREE.Color(PRESETS[key].color);
      button.style.backgroundColor = selected
        ? `#${color.getHexString()}cc`
        : "#173044b8";
      button.style.borderColor = selected
        ? `#${color.getHexString()}`
        : "#456579";
      button.style.color = selected ? "#07131d" : "#e8f6ff";
    }

    this.aMinusButton.disabled = preset.a <= PARAM_MIN;
    this.aPlusButton.disabled = preset.a >= PARAM_MAX;
    this.bMinusButton.disabled = preset.b <= PARAM_MIN;
    this.bPlusButton.disabled = preset.b >= PARAM_MAX;
  }

  resampleSurface() {
    const preset = PRESETS[this.activePreset];
    const side = SURFACE_SEGMENTS + 1;
    let maxAbs = 0;

    // First pass evaluates the exact equation on x/y from -5 through 5.
    for (let row = 0; row < side; row += 1) {
      const y = THREE.MathUtils.lerp(DOMAIN_MIN, DOMAIN_MAX, row / SURFACE_SEGMENTS);
      for (let column = 0; column < side; column += 1) {
        const x = THREE.MathUtils.lerp(
          DOMAIN_MIN,
          DOMAIN_MAX,
          column / SURFACE_SEGMENTS
        );
        const index = row * side + column;
        const value = preset.evaluate(x, y, preset.a, preset.b);
        this.surfaceValues[index] = Number.isFinite(value) ? value : 0;
        maxAbs = Math.max(maxAbs, Math.abs(this.surfaceValues[index]));
      }
    }

    // Keep the volume reachable and disclose the adaptive vertical scale.
    const zLimit = niceSymmetricLimit(maxAbs);
    const positions = this.surfaceGeometry.getAttribute("position");
    const colors = this.surfaceGeometry.getAttribute("color");
    const baseColor = new THREE.Color(preset.color);
    const lowColor = baseColor.clone().multiplyScalar(0.42);
    const highColor = baseColor.clone().lerp(new THREE.Color(0xffffff), 0.38);
    const displayColor = new THREE.Color();

    for (let index = 0; index < this.surfaceValues.length; index += 1) {
      const normalized = THREE.MathUtils.clamp(
        this.surfaceValues[index] / zLimit,
        -1,
        1
      );
      positions.setY(index, normalized * (GRAPH_HEIGHT / 2) * 0.92);
      displayColor.lerpColors(lowColor, highColor, (normalized + 1) / 2);
      colors.setXYZ(index, displayColor.r, displayColor.g, displayColor.b);
    }
    positions.needsUpdate = true;
    colors.needsUpdate = true;
    this.surfaceGeometry.computeVertexNormals();
    this.surfaceGeometry.computeBoundingBox();
    this.surfaceGeometry.computeBoundingSphere();

    this.surfaceWireMaterial.color.setHex(preset.color);
    this.surfaceMesh.userData.equationPreset = this.activePreset;
    this.surfaceMesh.userData.equation = preset.equation;
    this.surfaceMesh.userData.parameters = {a: preset.a, b: preset.b};
    this.surfaceMesh.userData.zDisplayRange = [-zLimit, zLimit];

    const scaleLabel = Number.isInteger(zLimit)
      ? String(zLimit)
      : zLimit.toFixed(1);
    this.zScaleLabels[0].setLabel(`+${scaleLabel}`);
    this.zScaleLabels[1].setLabel(`−${scaleLabel}`);
    this.scaleText.text = `Surface: ${side} × ${side} samples  •  x, y: −5 to 5  •  z: ±${scaleLabel}`;
  }

  dispose() {
    if (this.graphRoot) disposeObject(this.graphRoot);
    this.presetButtons.clear();
    this.zScaleLabels.length = 0;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const options = new xb.Options();
  options.xrButton.appTitle = "Spatial Equation Grapher";
  options.xrButton.appDescription =
    "Compare Wave, Saddle, and Ripple surfaces by changing a and b.";
  options.xrButton.showEnterSimulatorButton = true;
  xb.add(new SpatialEquationGrapher());
  xb.init(options);
});
