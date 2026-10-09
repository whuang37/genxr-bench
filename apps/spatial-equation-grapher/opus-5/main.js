import * as THREE from "three";
import * as xb from "xrblocks";

// ---------------------------------------------------------------------------
// Equation presets. Each preset owns its own `a` and `b` values.
// ---------------------------------------------------------------------------
const DOMAIN_MIN = -5;
const DOMAIN_MAX = 5;
const PARAM_MIN = -3.0;
const PARAM_MAX = 3.0;
const PARAM_STEP = 0.5;
const PARAM_DEFAULT = 1.0;
const SAMPLES = 48; // segments per axis
const UNITS_PER_METER = 10 / 0.6; // graph volume spans 10 units over 0.6 m
const GRAPH_SIZE = 0.6;
const Z_CLAMP = 5;

const PRESETS = [
  {
    id: "wave",
    tag: "equation-preset-wave",
    name: "Wave",
    equation: "z = a sin(x) + b cos(y)",
    evaluate: (x, y, a, b) => a * Math.sin(x) + b * Math.cos(y),
    a: PARAM_DEFAULT,
    b: PARAM_DEFAULT,
  },
  {
    id: "saddle",
    tag: "equation-preset-saddle",
    name: "Saddle",
    equation: "z = a x\u00b2 - b y\u00b2",
    evaluate: (x, y, a, b) => a * x * x - b * y * y,
    a: PARAM_DEFAULT,
    b: PARAM_DEFAULT,
  },
  {
    id: "ripple",
    tag: "equation-preset-ripple",
    name: "Ripple",
    equation: "z = a sin(b \u221a(x\u00b2 + y\u00b2))",
    evaluate: (x, y, a, b) => a * Math.sin(b * Math.sqrt(x * x + y * y)),
    a: PARAM_DEFAULT,
    b: PARAM_DEFAULT,
  },
];

function clampParam(value) {
  return Math.min(
    PARAM_MAX,
    Math.max(PARAM_MIN, Math.round(value / PARAM_STEP) * PARAM_STEP),
  );
}

function formatParam(value) {
  return value.toFixed(1);
}

/** Small world-space text label used for axis and scale annotations. */
function makeLabel(text, size = 0.05) {
  const card = new xb.UICard({
    size: { width: size, height: "auto" },
    appearance: "none",
    pointerEvents: "none",
    style: { flexDirection: "column", padding: 0 },
    children: [
      new xb.UIText({
        text,
        style: {
          fontSize: 22,
          fontWeight: "bold",
          textAlign: "center",
          color: "#e8eaed",
        },
      }),
    ],
  });
  return card;
}

class SpatialEquationGrapher extends xb.Script {
  constructor() {
    super();
    this.presets = PRESETS;
    this.activePreset = PRESETS[0];
    this.presetButtons = new Map();
  }

  init() {
    this.add(new THREE.HemisphereLight(0xffffff, 0x666666, 3));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(0.5, 1.5, 0.8);
    this.add(keyLight);

    this.buildGraphVolume();
    this.buildControls();
    this.refreshSurface();
    this.refreshReadouts();
  }

  // -------------------------------------------------------------------------
  // Graph volume: grid, axes, labels, zero plane and the surface itself.
  // -------------------------------------------------------------------------
  buildGraphVolume() {
    const volume = new THREE.Group();
    volume.name = "GraphVolume";
    volume.position.set(0, 1.4, -0.95);
    this.add(volume);
    this.volume = volume;

    // Zero plane (z = 0) drawn as a translucent quad in the x/y graph plane.
    const zeroPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(GRAPH_SIZE, GRAPH_SIZE),
      new THREE.MeshBasicMaterial({
        color: 0x8ab4f8,
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    zeroPlane.rotation.x = -Math.PI / 2;
    zeroPlane.position.y = -0.001;
    zeroPlane.name = "ZeroPlane";
    volume.add(zeroPlane);

    // Grid on the zero plane.
    const grid = new THREE.GridHelper(GRAPH_SIZE, 10, 0xffffff, 0x9aa0a6);
    grid.material.transparent = true;
    grid.material.opacity = 0.45;
    grid.name = "Grid";
    volume.add(grid);

    // Bounding wireframe of the reachable graph volume.
    const box = new THREE.LineSegments(
      new THREE.EdgesGeometry(
        new THREE.BoxGeometry(GRAPH_SIZE, GRAPH_SIZE, GRAPH_SIZE),
      ),
      new THREE.LineBasicMaterial({
        color: 0x5f6368,
        transparent: true,
        opacity: 0.5,
      }),
    );
    volume.add(box);

    // Three axes.
    const half = GRAPH_SIZE / 2;
    const axisData = [
      { color: 0xea4335, from: [-half, 0, 0], to: [half, 0, 0] }, // graph x
      { color: 0x34a853, from: [0, 0, -half], to: [0, 0, half] }, // graph y
      { color: 0x4285f4, from: [0, -half, 0], to: [0, half, 0] }, // graph z
    ];
    for (const axis of axisData) {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(...axis.from),
        new THREE.Vector3(...axis.to),
      ]);
      volume.add(
        new THREE.Line(
          geometry,
          new THREE.LineBasicMaterial({ color: axis.color }),
        ),
      );
    }

    // Axis and scale labels.
    const labels = [
      { text: "X", pos: [half + 0.05, 0, 0] },
      { text: "Y", pos: [0, 0, half + 0.05] },
      { text: "Z", pos: [0, half + 0.05, 0] },
      { text: "-5", pos: [-half, -0.045, half + 0.02] },
      { text: "+5", pos: [half, -0.045, half + 0.02] },
      { text: "0", pos: [0, -0.045, half + 0.02] },
    ];
    for (const label of labels) {
      const card = makeLabel(label.text);
      card.position.set(...label.pos);
      volume.add(card);
    }

    // The surface mesh.
    const geometry = new THREE.PlaneGeometry(
      GRAPH_SIZE,
      GRAPH_SIZE,
      SAMPLES,
      SAMPLES,
    );
    geometry.rotateX(-Math.PI / 2);
    this.surfaceGeometry = geometry;
    this.surfaceMesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: 0x8ab4f8,
        side: THREE.DoubleSide,
        roughness: 0.45,
        metalness: 0.05,
        flatShading: false,
      }),
    );
    this.surfaceMesh.name = "EquationSurface";
    volume.add(this.surfaceMesh);

    this.surfaceWireframe = new THREE.LineSegments(
      new THREE.WireframeGeometry(geometry),
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.18,
      }),
    );
    volume.add(this.surfaceWireframe);
  }

  /** Resamples the active equation over x and y in [-5, 5]. */
  refreshSurface() {
    const preset = this.activePreset;
    const positions = this.surfaceGeometry.attributes.position;
    const span = DOMAIN_MAX - DOMAIN_MIN;
    for (let i = 0; i < positions.count; i++) {
      // Plane vertices live in the world x/z plane; map them to graph x/y.
      const worldX = positions.getX(i);
      const worldZ = positions.getZ(i);
      const gx = DOMAIN_MIN + ((worldX + GRAPH_SIZE / 2) / GRAPH_SIZE) * span;
      const gy = DOMAIN_MIN + ((worldZ + GRAPH_SIZE / 2) / GRAPH_SIZE) * span;
      let z = preset.evaluate(gx, gy, preset.a, preset.b);
      if (!Number.isFinite(z)) z = 0;
      // Soft compression keeps tall surfaces inside the graph volume while
      // remaining sensitive to every parameter change.
      z = Z_CLAMP * Math.tanh(z / Z_CLAMP);
      positions.setY(i, z / UNITS_PER_METER);
    }
    positions.needsUpdate = true;
    this.surfaceGeometry.computeVertexNormals();
    this.surfaceGeometry.computeBoundingSphere();

    if (this.surfaceWireframe) {
      this.surfaceWireframe.geometry.dispose();
      this.surfaceWireframe.geometry = new THREE.WireframeGeometry(
        this.surfaceGeometry,
      );
    }
  }

  // -------------------------------------------------------------------------
  // Controls
  // -------------------------------------------------------------------------
  buildControls() {
    this.titleText = new xb.UIText({
      text: this.activePreset.name,
      style: { fontSize: 30, fontWeight: "bold", textAlign: "center" },
    });
    this.equationText = new xb.UIText({
      text: this.activePreset.equation,
      style: { fontSize: 22, textAlign: "center", color: "#8ab4f8" },
    });

    const presetRow = new xb.UIPanel({
      style: { width: "100%", flexDirection: "row", gap: 10 },
      children: this.presets.map((preset) => {
        const button = new xb.UIButton({
          label: preset.name,
          ariaLabel: `Select ${preset.name} equation`,
          style: { flexGrow: 1, fontSize: 20 },
          onClick: () => this.selectPreset(preset),
        });
        button.userData.xrblocksDevtools = { tag: preset.tag };
        this.presetButtons.set(preset.id, button);
        return button;
      }),
    });

    this.paramRows = {};
    const paramPanels = ["a", "b"].map((key) => this.buildParamRow(key));

    const card = new xb.UICard({
      size: { width: 0.6, height: "auto" },
      manipulation: true,
      edge: true,
      style: { flexDirection: "column", gap: 14, padding: 22 },
      children: [
        new xb.UIText({
          text: "Spatial Equation Grapher",
          style: { fontSize: 22, textAlign: "center", opacity: 0.75 },
        }),
        this.titleText,
        this.equationText,
        presetRow,
        ...paramPanels,
        new xb.UIText({
          text: `x and y sampled from ${DOMAIN_MIN} to ${DOMAIN_MAX}`,
          style: { fontSize: 16, textAlign: "center", opacity: 0.6 },
        }),
      ],
    });
    card.position.set(0, 0.98, -0.5);
    card.rotation.x = -0.45;
    this.add(card);
    this.card = card;
  }

  buildParamRow(key) {
    const valueText = new xb.UIText({
      text: formatParam(this.activePreset[key]),
      style: {
        fontSize: 24,
        fontWeight: "bold",
        textAlign: "center",
        width: 80,
      },
    });
    const minusButton = new xb.UIButton({
      label: "\u2212",
      ariaLabel: `Decrease ${key}`,
      style: { width: 70, fontSize: 24 },
      onClick: () => this.changeParam(key, -PARAM_STEP),
    });
    const plusButton = new xb.UIButton({
      label: "+",
      ariaLabel: `Increase ${key}`,
      style: { width: 70, fontSize: 24 },
      onClick: () => this.changeParam(key, PARAM_STEP),
    });

    this.paramRows[key] = { valueText, minusButton, plusButton };

    return new xb.UIPanel({
      style: {
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
      },
      children: [
        new xb.UIText({
          text: `${key}`,
          style: { fontSize: 24, fontWeight: "bold", width: 40 },
        }),
        minusButton,
        valueText,
        plusButton,
      ],
    });
  }

  selectPreset(preset) {
    this.activePreset = preset;
    this.refreshSurface();
    this.refreshReadouts();
  }

  changeParam(key, delta) {
    const preset = this.activePreset;
    const next = clampParam(preset[key] + delta);
    if (next === preset[key]) {
      this.refreshReadouts();
      return;
    }
    preset[key] = next;
    this.refreshSurface();
    this.refreshReadouts();
  }

  refreshReadouts() {
    const preset = this.activePreset;
    this.titleText.text = preset.name;
    this.equationText.text = preset.equation;
    for (const key of ["a", "b"]) {
      const row = this.paramRows[key];
      row.valueText.text = formatParam(preset[key]);
    }
    for (const [id, button] of this.presetButtons) {
      const selected = id === preset.id;
      button.style.backgroundColor = selected
        ? "#8ab4f8"
        : "rgba(255, 255, 255, 0.12)";
      button.style.color = selected ? "#202124" : "#e8eaed";
    }
  }

  dispose() {
    this.surfaceGeometry?.dispose();
    this.surfaceMesh?.material.dispose();
    this.surfaceWireframe?.geometry.dispose();
    this.surfaceWireframe?.material.dispose();
  }
}

function start() {
  xb.add(new SpatialEquationGrapher());
  xb.init(new xb.Options());
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
