import * as THREE from "three";
import * as xb from "xrblocks";

// ---------------------------------------------------------------------------
// Spatial Equation Grapher
//
// A reachable three-axis graph volume with grid, labels and a zero plane.
// Three presets (Wave, Saddle, Ripple) each own independent a/b parameters.
// Changing the active preset or a parameter resamples the equation over
// x, y in [-5, 5] and rebuilds the surface immediately.
// ---------------------------------------------------------------------------

const DOMAIN_MIN = -5;
const DOMAIN_MAX = 5;

// Half extent (meters) of the cubic graph volume. Math x -> world X,
// math y -> world Z (depth), math z -> world Y (up).
const HALF = 0.6;

// Surface tessellation. High enough to read curvature, cheap enough for XR.
const SEGMENTS = 56;

const PARAM_MIN = -3;
const PARAM_MAX = 3;
const PARAM_STEP = 0.5;

const PRESETS = {
  wave: {
    name: "Wave",
    equation: "z = a sin(x) + b cos(y)",
    fn: (x, y, a, b) => a * Math.sin(x) + b * Math.cos(y),
    maxAbs: 6,
  },
  saddle: {
    name: "Saddle",
    equation: "z = a x\u00B2 - b y\u00B2",
    fn: (x, y, a, b) => a * x * x - b * y * y,
    maxAbs: 75,
  },
  ripple: {
    name: "Ripple",
    equation: "z = a sin(b \u221A(x\u00B2 + y\u00B2))",
    fn: (x, y, a, b) => a * Math.sin(b * Math.sqrt(x * x + y * y)),
    maxAbs: 3,
  },
};

const PRESET_ORDER = ["wave", "saddle", "ripple"];

function clampParam(value) {
  const stepped = Math.round(value / PARAM_STEP) * PARAM_STEP;
  return Math.min(PARAM_MAX, Math.max(PARAM_MIN, stepped));
}

function formatParam(value) {
  const v = Object.is(value, -0) ? 0 : value;
  return v.toFixed(1);
}

function makeTextSprite(text, color, worldSize = 0.09) {
  const canvas = document.createElement("canvas");
  const size = 128;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = color;
  ctx.font = "bold 68px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, size / 2, size / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(worldSize, worldSize, 1);
  sprite.renderOrder = 10;
  return sprite;
}

function buildSurfaceGeometry(fn, zScale) {
  const count = SEGMENTS + 1;
  const vertexCount = count * count;
  const positions = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 3);
  const indices = new Uint16Array(SEGMENTS * SEGMENTS * 6);
  const color = new THREE.Color();
  let minY = Infinity;
  let maxY = -Infinity;

  let v = 0;
  for (let i = 0; i < count; i++) {
    const fx = i / SEGMENTS;
    const x = DOMAIN_MIN + (DOMAIN_MAX - DOMAIN_MIN) * fx;
    const worldX = (x / Math.abs(DOMAIN_MIN)) * HALF;
    for (let j = 0; j < count; j++) {
      const fy = j / SEGMENTS;
      const y = DOMAIN_MIN + (DOMAIN_MAX - DOMAIN_MIN) * fy;
      const worldZ = (y / Math.abs(DOMAIN_MIN)) * HALF;
      const z = fn(x, y);
      const worldY = THREE.MathUtils.clamp(z * zScale, -HALF, HALF);
      if (worldY < minY) minY = worldY;
      if (worldY > maxY) maxY = worldY;
      const offset = v * 3;
      positions[offset] = worldX;
      positions[offset + 1] = worldY;
      positions[offset + 2] = worldZ;

      // Blue (low) -> cyan -> green -> yellow -> red (high).
      const t = (worldY / HALF + 1) * 0.5;
      color.setHSL(0.62 * (1 - t), 0.8, 0.5);
      colors[offset] = color.r;
      colors[offset + 1] = color.g;
      colors[offset + 2] = color.b;
      v++;
    }
  }

  let k = 0;
  for (let i = 0; i < SEGMENTS; i++) {
    for (let j = 0; j < SEGMENTS; j++) {
      const a = i * count + j;
      const b = a + 1;
      const c = a + count;
      const d = c + 1;
      indices[k++] = a;
      indices[k++] = c;
      indices[k++] = b;
      indices[k++] = b;
      indices[k++] = c;
      indices[k++] = d;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return {geometry, minY, maxY, vertexCount};
}

class SpatialEquationGrapher extends xb.Script {
  init() {
    this.add(new THREE.HemisphereLight(0xffffff, 0x555555, 2.6));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(1.4, 2.4, 1.6);
    this.add(key);
    const fill = new THREE.DirectionalLight(0x88bbff, 0.7);
    fill.position.set(-1.6, 0.8, -1.2);
    this.add(fill);

    // Per-preset parameters. Every preset starts at a = b = 1.0 and keeps
    // its own values for the lifetime of the app.
    this.params = {
      wave: {a: 1.0, b: 1.0},
      saddle: {a: 1.0, b: 1.0},
      ripple: {a: 1.0, b: 1.0},
    };
    this.activePreset = "wave";
    this.presetSurfaceVersion = {wave: 0, saddle: 0, ripple: 0};
    this.presetSurfaceStats = {wave: null, saddle: null, ripple: null};

    this.graph = new THREE.Group();
    this.graph.name = "Graph volume";
    this.graph.position.set(0, 1.95, -1.9);
    this.add(this.graph);

    this.buildGraphVolume();

    // Surface mesh (vertex-colored) plus a subtle wireframe helper.
    this.surfaceMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      roughness: 0.52,
      metalness: 0.12,
      transparent: true,
      opacity: 0.97,
    });
    this.surface = new THREE.Mesh(
      new THREE.BufferGeometry(),
      this.surfaceMaterial
    );
    this.surface.name = "Active surface";
    this.surface.position.y = 0.002;
    this.graph.add(this.surface);

    this.wireMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
    });
    this.wire = new THREE.Mesh(new THREE.BufferGeometry(), this.wireMaterial);
    this.wire.name = "Surface wireframe";
    this.wire.position.y = 0.002;
    this.graph.add(this.wire);

    this.buildControls();
    this.refreshActivePreset();
  }

  // -- Graph volume --------------------------------------------------------

  buildGraphVolume() {
    const extent = HALF * 2;

    // Zero plane: translucent disc under the grid so z = 0 reads clearly.
    const zeroPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(extent, extent),
      new THREE.MeshBasicMaterial({
        color: 0x2b6cb0,
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    zeroPlane.name = "Zero plane";
    zeroPlane.rotation.x = -Math.PI / 2;
    zeroPlane.position.y = -0.004;
    this.graph.add(zeroPlane);

    // Grid on the zero plane.
    const grid = new THREE.GridHelper(extent, 12, 0x7fb2ff, 0x3d6a99);
    grid.name = "Zero plane grid";
    grid.material.transparent = true;
    grid.material.opacity = 0.55;
    this.graph.add(grid);

    // Wireframe box that bounds the graph volume.
    const box = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(extent, extent, extent)),
      new THREE.LineBasicMaterial({
        color: 0x88aacc,
        transparent: true,
        opacity: 0.35,
      })
    );
    box.name = "Graph volume frame";
    this.graph.add(box);

    // Three axes through the origin, drawn slightly past the volume.
    const axisLength = HALF + 0.12;
    const axis = (from, to, hex) => {
      const geometry = new THREE.BufferGeometry().setFromPoints([from, to]);
      return new THREE.Line(
        geometry,
        new THREE.LineBasicMaterial({color: hex})
      );
    };
    const ax = axis(
      new THREE.Vector3(-axisLength, 0, 0),
      new THREE.Vector3(axisLength, 0, 0),
      0xff6b6b
    );
    ax.name = "x axis";
    const ay = axis(
      new THREE.Vector3(0, 0, -axisLength),
      new THREE.Vector3(0, 0, axisLength),
      0x6bff9b
    );
    ay.name = "y axis";
    const az = axis(
      new THREE.Vector3(0, -axisLength, 0),
      new THREE.Vector3(0, axisLength, 0),
      0x6bb8ff
    );
    az.name = "z axis";
    this.graph.add(ax, ay, az);

    // Axis labels.
    const xLabel = makeTextSprite("x", "#ff8a8a", 0.11);
    xLabel.position.set(axisLength + 0.04, 0.03, 0);
    const yLabel = makeTextSprite("y", "#8affb0", 0.11);
    yLabel.position.set(0, 0.03, axisLength + 0.04);
    const zLabel = makeTextSprite("z", "#8ac8ff", 0.11);
    zLabel.position.set(0, axisLength + 0.04, 0);
    this.graph.add(xLabel, yLabel, zLabel);

    // Tick marks and numeric domain labels along x and y.
    const tickMaterial = new THREE.LineBasicMaterial({
      color: 0xbfd4ee,
      transparent: true,
      opacity: 0.8,
    });
    const xTick = (offset) =>
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(offset, 0, -0.015),
          new THREE.Vector3(offset, 0, 0.015),
        ]),
        tickMaterial
      );
    const yTick = (offset) =>
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-0.015, 0, offset),
          new THREE.Vector3(0.015, 0, offset),
        ]),
        tickMaterial
      );
    for (const value of [-5, -2.5, 0, 2.5, 5]) {
      const offset = (value / 5) * HALF;
      this.graph.add(xTick(offset), yTick(offset));
      if (value === -5 || value === 0 || value === 5) {
        const labelX = makeTextSprite(String(value), "#dbe8ff", 0.075);
        labelX.position.set(offset, -0.045, HALF + 0.07);
        const labelY = makeTextSprite(String(value), "#dbe8ff", 0.075);
        labelY.position.set(HALF + 0.07, -0.045, offset);
        this.graph.add(labelX, labelY);
      }
    }

    // Tick marks on the vertical (z) axis, labelled in volume fraction.
    for (const fraction of [-1, -0.5, 0.5, 1]) {
      const y = fraction * HALF;
      const tick = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-0.015, y, 0),
          new THREE.Vector3(0.015, y, 0),
        ]),
        tickMaterial
      );
      this.graph.add(tick);
      const label = makeTextSprite(
        String(fraction).replace("-", "\u2212"),
        "#dbe8ff",
        0.07
      );
      label.position.set(-HALF - 0.08, y, 0);
      this.graph.add(label);
    }
  }

  // -- Controls ------------------------------------------------------------

  buildControls() {
    this.presetButtons = {};
    this.presetStates = {};
    this.paramValueTexts = {};

    for (const key of PRESET_ORDER) {
      const preset = PRESETS[key];
      // Declared state lets DevTools verify the active preset and its values.
      const state = {
        active: key === this.activePreset,
        preset: key,
        equation: preset.equation,
        a: 1.0,
        b: 1.0,
        domain: "x, y \u2208 [\u22125, 5]",
        sampleCount: SEGMENTS + 1,
        surfaceVersion: 0,
        surfaceMinY: 0,
        surfaceMaxY: 0,
        surfaceVertexCount: 0,
      };
      const button = new xb.UIButton({
        label: preset.name,
        ariaLabel: `Select the ${preset.name} equation`,
        style: {flexGrow: 1, flexBasis: 0, height: 110},
        onClick: () => this.selectPreset(key),
      });
      button.name = `Select ${preset.name} equation`;
      // Tag the semantic control itself (the actual interactive button).
      button.userData.xrblocksDevtools = {
        tag: `equation-preset-${key}`,
        state,
      };
      this.presetButtons[key] = button;
      this.presetStates[key] = state;
    }

    this.presetNameText = new xb.UIText({
      text: "",
      style: {fontSize: 22, fontWeight: "bold", textAlign: "center"},
    });
    this.presetNameText.name = "Active preset name";
    this.equationText = new xb.UIText({
      text: "",
      style: {
        fontSize: 17,
        textAlign: "center",
        lineHeight: 1.3,
        color: "#9fd0ff",
      },
    });
    this.equationText.name = "Active equation";
    this.scaleText = new xb.UIText({
      text: "",
      style: {fontSize: 13, textAlign: "center", opacity: 0.65},
    });
    this.scaleText.name = "Graph scale";

    const paramRow = (which) => {
      const valueText = new xb.UIText({
        text: "1.0",
        style: {
          fontSize: 20,
          fontWeight: "bold",
          width: 80,
          textAlign: "center",
        },
      });
      valueText.name = `Value of ${which}`;
      this.paramValueTexts[which] = valueText;

      const decrease = new xb.UIButton({
        label: "\u2212",
        ariaLabel: `Decrease parameter ${which}`,
        style: {width: 110, height: 110},
        onClick: () => this.stepParam(which, -1),
      });
      decrease.name = `Decrease parameter ${which}`;
      const increase = new xb.UIButton({
        label: "+",
        ariaLabel: `Increase parameter ${which}`,
        style: {width: 110, height: 110},
        onClick: () => this.stepParam(which, +1),
      });
      increase.name = `Increase parameter ${which}`;

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
            text: `Parameter ${which}`,
            style: {fontSize: 17, flexGrow: 1},
          }),
          decrease,
          valueText,
          increase,
        ],
      });
    };

    const card = new xb.UICard({
      size: {width: 0.68, height: "auto"},
      manipulation: true,
      edge: true,
      style: {flexDirection: "column", gap: 12, padding: 22},
      children: [
        new xb.UIText({
          text: "Spatial Equation Grapher",
          style: {fontSize: 24, fontWeight: "bold", textAlign: "center"},
        }),
        new xb.UIPanel({
          style: {width: "100%", flexDirection: "row", gap: 8},
          children: PRESET_ORDER.map((key) => this.presetButtons[key]),
        }),
        this.presetNameText,
        this.equationText,
        new xb.UIPanel({
          style: {width: "100%", flexDirection: "column", gap: 8},
          children: [paramRow("a"), paramRow("b")],
        }),
        this.scaleText,
        new xb.UIText({
          text: "Pick a preset, then change a and b with \u2212 / +.",
          style: {fontSize: 14, textAlign: "center", opacity: 0.72},
        }),
      ],
    });
    card.name = "Equation controls";
    card.position.set(0.2, 1.3, -0.9);
    this.controlCard = card;
    this.add(card);
  }

  // -- State ---------------------------------------------------------------

  selectPreset(key) {
    if (!PRESETS[key]) return;
    this.activePreset = key;
    this.refreshActivePreset();
  }

  stepParam(which, direction) {
    const current = this.params[this.activePreset];
    current[which] = clampParam(current[which] + direction * PARAM_STEP);
    this.updateParamTexts();
    this.rebuildSurface();
  }

  refreshActivePreset() {
    const key = this.activePreset;
    const preset = PRESETS[key];
    this.presetNameText.text = preset.name;
    this.equationText.text = preset.equation;
    this.updateParamTexts();
    this.updatePresetButtonStyles();
    this.rebuildSurface();
  }

  updateParamTexts() {
    const current = this.params[this.activePreset];
    this.paramValueTexts.a.text = formatParam(current.a);
    this.paramValueTexts.b.text = formatParam(current.b);
  }

  updatePresetButtonStyles() {
    for (const key of PRESET_ORDER) {
      const active = key === this.activePreset;
      const button = this.presetButtons[key];
      button.style.backgroundColor = active
        ? "#4285f4"
        : "rgba(255,255,255,0.12)";
      button.style.opacity = active ? 1 : 0.82;
    }
  }

  refreshDeclaredState() {
    for (const key of PRESET_ORDER) {
      const state = this.presetStates[key];
      const params = this.params[key];
      state.active = key === this.activePreset;
      state.a = params.a;
      state.b = params.b;
      state.surfaceVersion = this.presetSurfaceVersion[key];
      const stats = this.presetSurfaceStats[key];
      if (stats) {
        state.surfaceMinY = Number(stats.minY.toFixed(4));
        state.surfaceMaxY = Number(stats.maxY.toFixed(4));
        state.surfaceVertexCount = stats.vertexCount;
      }
    }
  }

  rebuildSurface() {
    const key = this.activePreset;
    const preset = PRESETS[key];
    const params = this.params[key];
    const zScale = HALF / preset.maxAbs;

    const built = buildSurfaceGeometry(
      (x, y) => preset.fn(x, y, params.a, params.b),
      zScale
    );
    const previous = this.surface.geometry;
    this.surface.geometry = built.geometry;
    this.wire.geometry = built.geometry;
    if (previous) previous.dispose();

    this.presetSurfaceVersion[key] += 1;
    this.presetSurfaceStats[key] = {
      minY: built.minY,
      maxY: built.maxY,
      vertexCount: built.vertexCount,
    };
    this.scaleText.text = `x, y \u2208 [\u22125, 5]  \u00B7  vertical scale ${zScale.toFixed(3)} per unit`;
    this.refreshDeclaredState();
  }

  dispose() {
    if (this.surface) this.surface.geometry.dispose();
    if (this.surfaceMaterial) this.surfaceMaterial.dispose();
    if (this.wireMaterial) this.wireMaterial.dispose();
    const seen = new Set();
    this.graph?.traverse((child) => {
      if (child.isMesh || child.isLine || child.isLineSegments) {
        if (child.geometry && !seen.has(child.geometry)) {
          seen.add(child.geometry);
          child.geometry.dispose?.();
        }
        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];
        for (const material of materials) {
          if (
            !material ||
            material === this.surfaceMaterial ||
            material === this.wireMaterial ||
            seen.has(material)
          ) {
            continue;
          }
          seen.add(material);
          material.map?.dispose?.();
          material.dispose?.();
        }
      }
      if (child.isSprite && child.material && !seen.has(child.material)) {
        seen.add(child.material);
        child.material.map?.dispose?.();
        child.material.dispose?.();
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const options = new xb.Options();
  options.setAppTitle?.("Spatial Equation Grapher");
  xb.add(new SpatialEquationGrapher());
  xb.init(options);
});
