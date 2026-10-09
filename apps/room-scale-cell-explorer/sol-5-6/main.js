import * as THREE from "three";
import * as xb from "xrblocks";

const TAU = Math.PI * 2;
const CELL_CENTER = new THREE.Vector3(0, 1.48, -1.05);
const IDLE_EMISSIVE = 0x061b21;
const LABEL_BG = "#0a2630ee";

const ORGANELLES = [
  {
    id: "nucleus",
    tag: "nucleus",
    name: "Nucleus",
    kicker: "CONTROL CENTER",
    color: 0xb76ce8,
    size: 0.49,
    position: [-1.34, 1.55, -2.32],
    summary: "Stores the cell’s DNA and coordinates growth, metabolism, and division.",
    detail: "A double-layered nuclear envelope protects the genome. Nuclear pores regulate traffic, while the nucleolus assembles ribosomal subunits.",
  },
  {
    id: "rer",
    tag: "rough-endoplasmic-reticulum",
    name: "Rough Endoplasmic Reticulum",
    shortName: "Rough ER",
    kicker: "PROTEIN FOLDING",
    color: 0x4f9df4,
    size: 0.56,
    position: [-1.58, 1.02, -0.78],
    summary: "Folds and begins modifying proteins destined for membranes or secretion.",
    detail: "Its folded membrane sheets are studded with ribosomes. New peptide chains enter the ER lumen, where they fold and receive quality checks.",
  },
  {
    id: "golgi",
    tag: "golgi-apparatus",
    name: "Golgi Apparatus",
    shortName: "Golgi",
    kicker: "SORTING STATION",
    color: 0xf3a64a,
    size: 0.49,
    position: [1.42, 1.32, -1.62],
    summary: "Refines, sorts, and packages proteins and lipids for delivery.",
    detail: "Cargo moves through stacked cisternae, gaining molecular address labels before budding into transport or secretory vesicles.",
  },
  {
    id: "mitochondria",
    tag: "mitochondria",
    name: "Mitochondria",
    kicker: "CELLULAR ENERGY",
    color: 0xff6f61,
    size: 0.43,
    position: [1.55, 0.67, -0.28],
    summary: "Convert energy from nutrients into ATP, the cell’s usable energy currency.",
    detail: "A highly folded inner membrane forms cristae. These folds host the reactions that drive oxidative phosphorylation and ATP production.",
  },
  {
    id: "lysosome",
    tag: "lysosome",
    name: "Lysosome",
    kicker: "RECYCLING CENTER",
    color: 0x72d88d,
    size: 0.34,
    position: [0.42, 1.94, -2.55],
    summary: "Breaks down worn-out cell parts, large molecules, and captured material.",
    detail: "Its acidic interior activates digestive enzymes. Useful building blocks are returned to the cytoplasm for the cell to reuse.",
  },
  {
    id: "ribosomes",
    tag: "ribosomes",
    name: "Ribosomes",
    kicker: "PROTEIN BUILDERS",
    color: 0x64dfd0,
    size: 0.37,
    position: [-0.82, 0.59, -1.62],
    summary: "Read messenger RNA and join amino acids into a specific protein chain.",
    detail: "Each ribosome has a small and large subunit. Free ribosomes make cytosolic proteins; ER-bound ribosomes make secreted and membrane proteins.",
  },
];

const byId = (id) => ORGANELLES.find((item) => item.id === id);
const vec = (value) => new THREE.Vector3(...value);

function material(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.4,
    metalness: options.metalness ?? 0.05,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    side: options.side ?? THREE.FrontSide,
    depthWrite: options.depthWrite ?? true,
    emissive: options.emissive ?? IDLE_EMISSIVE,
    emissiveIntensity: options.emissiveIntensity ?? 0.35,
  });
}

function mesh(geometry, color, options) {
  return new THREE.Mesh(geometry, material(color, options));
}

function addGlowSphere(parent, radius, color, opacity = 0.12) {
  const glow = mesh(new THREE.SphereGeometry(radius, 24, 18), color, {
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.BackSide,
    emissive: color,
    emissiveIntensity: 0.8,
  });
  glow.scale.set(1.08, 1.08, 1.08);
  parent.add(glow);
  return glow;
}

function makeTube(points, radius, color, opacity = 1) {
  const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.35);
  const tube = mesh(new THREE.TubeGeometry(curve, 48, radius, 8, false), color, {
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity > 0.55,
    roughness: 0.3,
    emissive: color,
    emissiveIntensity: 0.45,
  });
  return {curve, tube};
}

function buildNucleus(root, color) {
  const outer = mesh(new THREE.SphereGeometry(0.37, 38, 28), color, {
    transparent: true,
    opacity: 0.78,
    roughness: 0.24,
    emissive: 0x3b124f,
    emissiveIntensity: 0.55,
  });
  outer.scale.set(1, 0.92, 1);
  root.add(outer);

  const inner = mesh(new THREE.SphereGeometry(0.23, 28, 20), 0x7c3faf, {
    transparent: true,
    opacity: 0.72,
    emissive: 0x35104d,
    emissiveIntensity: 0.8,
  });
  inner.position.set(0.03, -0.01, 0.01);
  root.add(inner);

  const nucleolus = mesh(new THREE.SphereGeometry(0.105, 22, 16), 0xf0a3ff, {
    emissive: 0x8b2e9c,
    emissiveIntensity: 1.1,
    roughness: 0.25,
  });
  nucleolus.position.set(0.11, -0.04, 0.16);
  root.add(nucleolus);

  for (let i = 0; i < 10; i++) {
    const pore = mesh(new THREE.TorusGeometry(0.024, 0.006, 6, 14), 0xf3c5ff, {
      emissive: 0x6f2f91,
      emissiveIntensity: 0.9,
    });
    const phi = Math.acos(1 - 2 * (i + 0.5) / 10);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    pore.position.set(
      0.37 * Math.sin(phi) * Math.cos(theta),
      0.34 * Math.cos(phi),
      0.37 * Math.sin(phi) * Math.sin(theta)
    );
    pore.lookAt(new THREE.Vector3(0, 0, 0));
    root.add(pore);
  }
  addGlowSphere(root, 0.4, color, 0.1);
}

function buildRoughER(root, color) {
  for (let layer = -2; layer <= 2; layer++) {
    const y = layer * 0.105;
    const points = [];
    for (let i = 0; i <= 12; i++) {
      const x = -0.42 + i * 0.07;
      points.push(new THREE.Vector3(x, y + Math.sin(i * 0.9 + layer) * 0.028, Math.sin(i * 0.55) * 0.11));
    }
    const {tube} = makeTube(points, 0.045, layer % 2 ? 0x75b7ff : color, 0.9);
    tube.scale.z = 1.25;
    root.add(tube);
    for (let i = 1; i < points.length; i += 2) {
      const ribosome = mesh(new THREE.SphereGeometry(0.023, 10, 8), 0x9ff6e8, {
        emissive: 0x1e8278,
        emissiveIntensity: 0.8,
      });
      ribosome.position.copy(points[i]).add(new THREE.Vector3(0, 0.052, 0));
      root.add(ribosome);
    }
  }
  addGlowSphere(root, 0.48, color, 0.07).scale.set(1.18, 0.78, 0.88);
}

function buildGolgi(root, color) {
  for (let i = 0; i < 6; i++) {
    const sac = mesh(
      new THREE.TorusGeometry(0.25 + i * 0.018, 0.035, 8, 36, Math.PI * 1.46),
      new THREE.Color(color).offsetHSL(i * 0.008, 0, i * -0.025),
      {emissive: 0x754010, emissiveIntensity: 0.65, roughness: 0.34}
    );
    sac.rotation.set(Math.PI / 2, 0.22, -0.74);
    sac.position.set((i - 2.5) * 0.012, (i - 2.5) * 0.085, 0);
    sac.scale.set(1, 1, 0.62);
    root.add(sac);
  }
  for (let i = 0; i < 5; i++) {
    const vesicle = mesh(new THREE.SphereGeometry(0.035 + (i % 2) * 0.014, 14, 10), 0xffd284, {
      emissive: 0xa96016,
      emissiveIntensity: 0.8,
    });
    const angle = i * 1.31;
    vesicle.position.set(Math.cos(angle) * 0.38, -0.18 + i * 0.09, Math.sin(angle) * 0.17);
    root.add(vesicle);
  }
  addGlowSphere(root, 0.43, color, 0.08).scale.set(1.16, 1.06, 0.72);
}

function buildMitochondria(root, color) {
  const shell = mesh(new THREE.SphereGeometry(0.36, 34, 22), color, {
    transparent: true,
    opacity: 0.87,
    emissive: 0x72271f,
    emissiveIntensity: 0.65,
    roughness: 0.3,
  });
  shell.scale.set(1.28, 0.68, 0.7);
  shell.rotation.z = -0.18;
  root.add(shell);

  for (let row = -1; row <= 1; row++) {
    const points = [];
    for (let i = 0; i <= 18; i++) {
      const x = -0.35 + i * 0.039;
      points.push(new THREE.Vector3(x, row * 0.1 + Math.sin(i * 0.95 + row) * 0.065, 0.19));
    }
    const {tube} = makeTube(points, 0.015, 0xffd0a2, 0.95);
    tube.rotation.z = -0.18;
    root.add(tube);
  }
  addGlowSphere(root, 0.37, color, 0.08).scale.set(1.35, 0.77, 0.78);
}

function buildLysosome(root, color) {
  const shell = mesh(new THREE.SphereGeometry(0.26, 30, 22), color, {
    transparent: true,
    opacity: 0.72,
    emissive: 0x1b6332,
    emissiveIntensity: 0.7,
    roughness: 0.18,
  });
  root.add(shell);
  const inner = mesh(new THREE.IcosahedronGeometry(0.19, 2), 0x2d8753, {
    transparent: true,
    opacity: 0.46,
    roughness: 0.48,
  });
  root.add(inner);
  for (let i = 0; i < 12; i++) {
    const enzyme = mesh(new THREE.OctahedronGeometry(0.023 + (i % 3) * 0.006), 0xd2ff9e, {
      emissive: 0x65a836,
      emissiveIntensity: 0.8,
    });
    const r = 0.11 + (i % 4) * 0.018;
    enzyme.position.set(
      Math.cos(i * 2.1) * r,
      Math.sin(i * 1.7) * r,
      Math.cos(i * 0.83) * r
    );
    root.add(enzyme);
  }
  addGlowSphere(root, 0.28, color, 0.12);
}

function buildRibosomes(root, color) {
  const positions = [
    [-0.2, 0.09, 0.03], [0.01, 0.18, -0.04], [0.2, 0.06, 0.04],
    [-0.11, -0.14, 0.09], [0.14, -0.16, -0.03], [0, 0, 0.17],
  ];
  positions.forEach((position, index) => {
    const pair = new THREE.Group();
    pair.position.set(...position);
    pair.rotation.set(index * 0.31, index * 0.62, index * 0.17);
    const large = mesh(new THREE.SphereGeometry(0.088, 18, 12), color, {
      emissive: 0x176d66,
      emissiveIntensity: 0.85,
      roughness: 0.36,
    });
    large.scale.set(1.15, 0.82, 1);
    const small = mesh(new THREE.SphereGeometry(0.061, 16, 10), 0xf19ac7, {
      emissive: 0x7a3158,
      emissiveIntensity: 0.7,
    });
    small.position.set(0.02, 0.082, 0);
    pair.add(large, small);
    root.add(pair);
  });
  addGlowSphere(root, 0.31, color, 0.08);
}

const FORM_BUILDERS = {
  nucleus: buildNucleus,
  rer: buildRoughER,
  golgi: buildGolgi,
  mitochondria: buildMitochondria,
  lysosome: buildLysosome,
  ribosomes: buildRibosomes,
};

function makeMarker(definition) {
  const card = new xb.UICard({
    size: {width: definition.id === "rer" ? 0.44 : 0.34, height: "auto"},
    appearance: "none",
    pointerEvents: "none",
    style: {
      flexDirection: "column",
      alignItems: "center",
      gap: 3,
      padding: 9,
      backgroundColor: LABEL_BG,
      borderColor: `#${definition.color.toString(16).padStart(6, "0")}`,
      borderWidth: 1.5,
      borderRadius: 12,
    },
    children: [
      new xb.UIText({
        text: definition.shortName ?? definition.name,
        style: {fontSize: 17, fontWeight: "bold", color: "#f1fffc", textAlign: "center"},
      }),
      new xb.UIText({
        text: definition.kicker,
        style: {fontSize: 9, fontWeight: "bold", color: "#8fbdb9", textAlign: "center"},
      }),
    ],
  });
  card.position.set(0, definition.size + 0.18, 0);
  card.add(new xb.FaceCamera({mode: "full", smoothing: 0.18}));
  return card;
}

class Organelle extends xb.MeshScript {
  constructor(definition, owner) {
    super(
      new THREE.SphereGeometry(definition.size, 28, 20),
      material(definition.color, {
        transparent: true,
        opacity: 0.055,
        depthWrite: false,
        side: THREE.DoubleSide,
        emissive: definition.color,
        emissiveIntensity: 0.55,
      })
    );
    this.definition = definition;
    this.owner = owner;
    this.name = `${definition.name} selection target`;
    this.userData.xrblocksDevtools = {tag: definition.tag};
    this.position.fromArray(definition.position);
    this.homePosition = this.position.clone();
    this.homeQuaternion = this.quaternion.clone();
    this.homeScale = this.scale.clone();
    this.hovered = false;
    this.pressed = false;
    this.selected = false;
    this.journeyActive = false;
    this.visualRoot = new THREE.Group();
    this.visualRoot.name = `${definition.name} model`;
    FORM_BUILDERS[definition.id](this.visualRoot, definition.color);
    this.add(this.visualRoot, makeMarker(definition));
  }

  onHoverEnter(event) {
    this.hovered = true;
    this.updateAppearance();
    this.owner.setHint(`Select to inspect ${this.definition.name}`);
    event.stopPropagation();
  }

  onHoverExit(event) {
    this.hovered = false;
    this.pressed = false;
    this.updateAppearance();
    this.owner.restoreHint();
    event.stopPropagation();
  }

  onObjectSelectStart(event) {
    this.pressed = true;
    this.updateAppearance();
    event.stopPropagation();
  }

  onObjectSelectEnd(event) {
    this.pressed = false;
    if (event.completed) this.owner.selectOrganelle(this);
    this.updateAppearance();
    event.stopPropagation();
  }

  onObjectTouchStart(event) {
    this.hovered = true;
    this.updateAppearance();
    event.stopPropagation();
  }

  onObjectTouchEnd(event) {
    this.hovered = false;
    this.updateAppearance();
    event.stopPropagation();
  }

  setSelected(value) {
    this.selected = value;
    this.updateAppearance();
  }

  setJourneyActive(value) {
    this.journeyActive = value;
    this.updateAppearance();
  }

  updateAppearance() {
    const active = this.selected || this.journeyActive;
    const emphasized = active || this.hovered || this.pressed;
    const scale = this.pressed ? 0.97 : active ? 1.08 : this.hovered ? 1.045 : 1;
    this.visualRoot.scale.setScalar(scale);
    this.material.opacity = emphasized ? (active ? 0.24 : 0.14) : 0.055;
    this.material.emissiveIntensity = emphasized ? (active ? 1.55 : 1.05) : 0.55;
  }

  restore() {
    this.position.copy(this.homePosition);
    this.quaternion.copy(this.homeQuaternion);
    this.scale.copy(this.homeScale);
    this.hovered = false;
    this.pressed = false;
    this.selected = false;
    this.journeyActive = false;
    this.updateAppearance();
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    disposeObject(this.visualRoot);
  }
}

class WristPanelPlacement extends xb.TransformScript {
  static dependencies = {camera: THREE.Camera};

  init({camera}) {
    this.camera = camera;
    this.target = new THREE.Vector3();
    this.cameraPosition = new THREE.Vector3();
    this.cameraQuaternion = new THREE.Quaternion();
    this.wristPosition = new THREE.Vector3();
    this.wasOnWrist = false;
  }

  update() {
    if (!this.canUpdate || !this.camera) return;
    const wrist = xb.user.hands?.getWrist(xb.Handedness.LEFT);
    const wristReady = wrist?.visible !== false && wrist?.parent;
    if (wristReady) {
      wrist.getWorldPosition(this.wristPosition);
      this.target.copy(this.wristPosition).add(new THREE.Vector3(-0.04, 0.21, 0.02));
      this.wasOnWrist = true;
    } else {
      this.camera.getWorldPosition(this.cameraPosition);
      this.camera.getWorldQuaternion(this.cameraQuaternion);
      this.target
        .set(-0.53, -0.31, -0.86)
        .applyQuaternion(this.cameraQuaternion)
        .add(this.cameraPosition);
      this.wasOnWrist = false;
    }
    this.parent.parent?.worldToLocal(this.target);
    this.parent.position.lerp(this.target, wristReady ? 0.16 : 0.1);
  }
}

function buttonStyle(accent = "#1f5961") {
  return {
    minHeight: 46,
    padding: 11,
    borderRadius: 12,
    backgroundColor: accent,
    borderColor: "#65cfc3",
    borderWidth: 1,
    fontSize: 15,
    fontWeight: "bold",
    color: "#effffc",
    ":hover": {backgroundColor: "#2b7479", borderColor: "#a0fff4"},
    ":active": {backgroundColor: "#123b42", color: "#aaf7ee"},
  };
}

function createProgressChip(definition) {
  const text = new xb.UIText({
    text: `○ ${definition.shortName ?? definition.name}`,
    style: {
      width: "100%",
      fontSize: 10,
      fontWeight: "bold",
      color: "#799d9b",
      textAlign: "center",
    },
  });
  const panel = new xb.UIPanel({
    style: {
      width: "100%",
      padding: 7,
      borderRadius: 9,
      backgroundColor: "#0a2329",
      borderColor: "#183c42",
      borderWidth: 1,
    },
    children: [text],
  });
  return {definition, text, panel};
}

function createWristPanel(owner) {
  const progressText = new xb.UIText({
    text: "0 / 6 EXPLORED",
    style: {fontSize: 12, fontWeight: "bold", color: "#77d8cd", textAlign: "right"},
  });
  const statusText = new xb.UIText({
    text: "Select a labeled structure to begin.",
    style: {fontSize: 12, lineHeight: 1.3, color: "#a5c8c5", textAlign: "center"},
  });
  const chips = ORGANELLES.map(createProgressChip);
  const chipRows = [0, 3].map((start) => new xb.UIPanel({
    style: {width: "100%", flexDirection: "row", gap: 6},
    children: chips.slice(start, start + 3).map(({panel}) => panel),
  }));

  const card = new xb.UICard({
    size: {width: 0.59, height: "auto"},
    style: {
      flexDirection: "column",
      gap: 10,
      padding: 15,
      backgroundColor: "#071d24f2",
      borderColor: "#398a87",
      borderWidth: 1.5,
      borderRadius: 20,
      dropShadowColor: "#000000aa",
      dropShadowBlur: 18,
      dropShadowPosition: [0, 8],
    },
    children: [
      new xb.UIPanel({
        style: {width: "100%", flexDirection: "row", justifyContent: "space-between", alignItems: "center"},
        children: [
          new xb.UIPanel({
            style: {flexDirection: "column", gap: 1},
            children: [
              new xb.UIText({
                text: "CELL EXPLORER",
                style: {fontSize: 22, fontWeight: "bold", color: "#effffc"},
              }),
              new xb.UIText({
                text: "ROOM MAP • BOUNDARY LOCKED",
                style: {fontSize: 8, fontWeight: "bold", color: "#5fa8a3"},
              }),
            ],
          }),
          progressText,
        ],
      }),
      ...chipRows,
      new xb.UIButton({
        label: "Protein Journey",
        icon: "route",
        style: {...buttonStyle("#513967"), width: "100%"},
        onClick: () => owner.startProteinJourney(),
      }),
      new xb.UIPanel({
        style: {width: "100%", flexDirection: "row", gap: 8},
        children: [
          new xb.UIButton({
            label: "Overview",
            icon: "view_in_ar",
            style: {...buttonStyle(), flexGrow: 1},
            onClick: () => owner.showOverview(),
          }),
          new xb.UIButton({
            label: "Reset",
            icon: "restart_alt",
            style: {...buttonStyle("#383e49"), flexGrow: 1},
            onClick: () => owner.resetExperience(),
          }),
        ],
      }),
      statusText,
    ],
  });
  card.name = "Wrist lesson controls";
  card.position.set(-0.5, 1.18, -0.88);
  card.add(new WristPanelPlacement(), new xb.FaceCamera({mode: "full", smoothing: 0.22}));
  return {card, progressText, statusText, chips};
}

function createInfoCard({title, kicker, summary, detail, color = 0x65d8ca, footer}) {
  const colorString = `#${color.toString(16).padStart(6, "0")}`;
  const summaryText = new xb.UIText({
    text: summary,
    style: {fontSize: 16, lineHeight: 1.35, fontWeight: "medium", color: "#d7efec"},
  });
  const detailText = new xb.UIText({
    text: detail,
    style: {fontSize: 13, lineHeight: 1.42, color: "#9fc1bf"},
  });
  const card = new xb.UICard({
    size: {width: 0.55, height: "auto"},
    style: {
      flexDirection: "column",
      gap: 11,
      padding: 20,
      backgroundColor: "#081d25f4",
      borderColor: colorString,
      borderWidth: 2,
      borderRadius: 20,
      dropShadowColor: "#000000aa",
      dropShadowBlur: 22,
      dropShadowPosition: [0, 9],
    },
    children: [
      new xb.UIText({
        text: kicker,
        style: {fontSize: 10, fontWeight: "bold", color: colorString},
      }),
      new xb.UIText({
        text: title,
        style: {fontSize: 27, lineHeight: 1.08, fontWeight: "bold", color: "#f3fffd"},
      }),
      new xb.UIPanel({
        style: {width: "100%", height: 2, backgroundColor: colorString, opacity: 0.5},
      }),
      summaryText,
      detailText,
      new xb.UIText({
        text: footer,
        style: {fontSize: 9, fontWeight: "bold", color: "#568f8c"},
      }),
    ],
  });
  card.name = `${title} information display`;
  card.position.set(0.53, 1.64, -0.92);
  card.add(
    new xb.FollowHead({offset: new THREE.Vector3(0.52, 0.12, -0.91), smoothing: 0.11}),
    new xb.FaceCamera({mode: "full", smoothing: 0.2})
  );
  card.infoText = {summaryText, detailText};
  return card;
}

function createMembraneRoom() {
  const room = new THREE.Group();
  room.name = "Mapped room cell envelope";

  const membraneMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x5bd7cf,
    transparent: true,
    opacity: 0.105,
    roughness: 0.28,
    metalness: 0.02,
    transmission: 0.15,
    side: THREE.BackSide,
    depthWrite: false,
  });
  const membrane = new THREE.Mesh(new THREE.SphereGeometry(3.15, 52, 30), membraneMaterial);
  membrane.name = "Translucent plasma membrane";
  membrane.position.copy(CELL_CENTER);
  membrane.scale.set(1.07, 0.69, 1.04);
  room.add(membrane);

  const boundary = new THREE.Mesh(
    new THREE.TorusGeometry(3.15, 0.026, 8, 96),
    material(0x67e6d9, {transparent: true, opacity: 0.5, depthWrite: false, emissive: 0x2caaa0, emissiveIntensity: 1})
  );
  boundary.position.set(CELL_CENTER.x, 0.08, CELL_CENTER.z);
  boundary.rotation.x = Math.PI / 2;
  boundary.scale.set(1.07, 1.04, 1);
  room.add(boundary);

  const cytoplasm = new THREE.Mesh(
    new THREE.RingGeometry(1.02, 3.08, 72),
    new THREE.MeshStandardMaterial({
      color: 0x1a777b,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      depthWrite: false,
      roughness: 0.8,
    })
  );
  cytoplasm.name = "Open cytoplasm walking field";
  cytoplasm.position.set(CELL_CENTER.x, 0.012, CELL_CENTER.z);
  cytoplasm.rotation.x = -Math.PI / 2;
  room.add(cytoplasm);

  const innerClear = new THREE.Mesh(
    new THREE.RingGeometry(0.92, 1.02, 64),
    material(0x8df3e6, {transparent: true, opacity: 0.22, depthWrite: false, emissive: 0x38aa9e, emissiveIntensity: 0.8})
  );
  innerClear.name = "Clear walking area marker";
  innerClear.position.set(0, 0.018, -0.82);
  innerClear.rotation.x = -Math.PI / 2;
  room.add(innerClear);

  const particleCount = 150;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const cyan = new THREE.Color(0x63d8ca);
  const violet = new THREE.Color(0xb98be5);
  for (let i = 0; i < particleCount; i++) {
    const radius = 1.12 + ((i * 37) % 100) / 100 * 1.72;
    const angle = i * 2.39996;
    positions[i * 3] = CELL_CENTER.x + Math.cos(angle) * radius;
    positions[i * 3 + 1] = 0.12 + ((i * 47) % 100) / 100 * 2.52;
    positions[i * 3 + 2] = CELL_CENTER.z + Math.sin(angle) * radius * 0.94;
    const mixed = cyan.clone().lerp(violet, (i % 9) / 12);
    colors.set([mixed.r, mixed.g, mixed.b], i * 3);
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  particleGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const particles = new THREE.Points(
    particleGeometry,
    new THREE.PointsMaterial({size: 0.018, vertexColors: true, transparent: true, opacity: 0.38, depthWrite: false})
  );
  particles.name = "Cytoplasm particles outside clear walking area";
  room.add(particles);

  return room;
}

function makeRouteLabel(text, position, color) {
  const label = new xb.UICard({
    size: {width: 0.35, height: "auto"},
    appearance: "none",
    pointerEvents: "none",
    style: {
      padding: 8,
      borderRadius: 10,
      backgroundColor: "#09252ddd",
      borderColor: color,
      borderWidth: 1,
    },
    children: [
      new xb.UIText({
        text,
        style: {fontSize: 11, fontWeight: "bold", color: "#e8fffb", textAlign: "center"},
      }),
    ],
  });
  label.position.copy(position);
  label.add(new xb.FaceCamera({mode: "full", smoothing: 0.18}));
  return label;
}

function createMRNAVisual() {
  const group = new THREE.Group();
  for (let i = 0; i < 12; i++) {
    const bead = mesh(new THREE.SphereGeometry(0.028, 10, 8), i % 2 ? 0x69e8dc : 0xb9fff7, {
      emissive: 0x2da79b,
      emissiveIntensity: 1.2,
    });
    bead.position.set((i - 5.5) * 0.035, Math.sin(i * 1.3) * 0.032, 0);
    group.add(bead);
  }
  group.rotation.z = 0.3;
  return group;
}

function createPeptideVisual() {
  const group = new THREE.Group();
  const palette = [0xff8ca0, 0xffd26e, 0xb68cff, 0x68e3d3];
  for (let i = 0; i < 9; i++) {
    const bead = mesh(new THREE.IcosahedronGeometry(0.038, 1), palette[i % palette.length], {
      emissive: palette[i % palette.length],
      emissiveIntensity: 0.65,
    });
    bead.position.set((i - 4) * 0.06, Math.sin(i * 1.2) * 0.04, Math.cos(i * 0.8) * 0.025);
    group.add(bead);
  }
  group.rotation.z = -0.25;
  return group;
}

function createVesicleVisual() {
  const group = new THREE.Group();
  const shell = mesh(new THREE.SphereGeometry(0.13, 24, 18), 0xffc46c, {
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    emissive: 0xb96b18,
    emissiveIntensity: 0.8,
  });
  const cargo = createPeptideVisual();
  cargo.scale.setScalar(0.48);
  cargo.rotation.z = 0.5;
  group.add(shell, cargo);
  return group;
}

function createCargoVisual() {
  const group = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const particle = mesh(new THREE.OctahedronGeometry(0.035, 0), i % 2 ? 0xffd071 : 0x74e7da, {
      emissive: i % 2 ? 0xd58522 : 0x248e85,
      emissiveIntensity: 1.3,
    });
    const angle = i / 8 * TAU;
    particle.position.set(Math.cos(angle) * 0.12, Math.sin(angle * 1.5) * 0.08, Math.sin(angle) * 0.12);
    group.add(particle);
  }
  return group;
}

function disposeObject(root) {
  root.traverse((object) => {
    object.geometry?.dispose?.();
    if (Array.isArray(object.material)) object.material.forEach((entry) => entry.dispose?.());
    else object.material?.dispose?.();
  });
}

export class RoomScaleCellExplorer extends xb.Script {
  static dependencies = {camera: THREE.Camera};

  init({camera}) {
    this.camera = camera;
    this.name = "Room Scale Cell Explorer";
    this.visited = new Set();
    this.organelles = new Map();
    this.selectedOrganelle = undefined;
    this.activeDetailCard = undefined;
    this.processGroup = undefined;
    this.journey = undefined;
    this.completedRoute = undefined;
    this.lastJourneyStage = -1;

    this.add(
      new THREE.HemisphereLight(0xdffffb, 0x17333d, 2.25),
      new THREE.AmbientLight(0x8bc7c3, 0.65)
    );
    const keyLight = new THREE.DirectionalLight(0xffe8d3, 2.2);
    keyLight.position.set(-2.5, 4, 1.5);
    this.add(keyLight);
    const accentLight = new THREE.PointLight(0x8c69e8, 2.4, 6);
    accentLight.position.set(0, 2.5, -2.5);
    this.add(accentLight);

    this.mappedRoom = createMembraneRoom();
    this.add(this.mappedRoom);

    for (const definition of ORGANELLES) {
      const organelle = new Organelle(definition, this);
      this.organelles.set(definition.id, organelle);
      this.add(organelle);
    }

    this.wrist = createWristPanel(this);
    this.add(this.wrist.card);
    this.showOverview();

    // Stable automation bridge for desktop smoke tests; all user behavior still
    // runs through the same domain methods as XR selection and spatial buttons.
    window.roomScaleCellExplorer = {
      select: (id) => this.organelles.get(id) && this.selectOrganelle(this.organelles.get(id)),
      overview: () => this.showOverview(),
      journey: () => this.startProteinJourney(),
      reset: () => this.resetExperience(),
      state: () => ({
        visited: [...this.visited],
        selected: this.selectedOrganelle?.definition.id ?? null,
        journeyStage: this.journey?.stage ?? null,
        journeyComplete: this.journey?.complete ?? false,
        hasCompletedRoute: Boolean(this.completedRoute),
        detailDisplays: this.children.filter((child) => child === this.activeDetailCard).length,
      }),
    };
  }

  setHint(text) {
    this.wrist.statusText.text = text;
  }

  restoreHint() {
    if (this.journey && !this.journey.complete) return;
    this.wrist.statusText.text = this.selectedOrganelle
      ? `Inspecting ${this.selectedOrganelle.definition.name}`
      : this.journey?.complete
        ? "Journey complete • labeled route preserved"
        : "Select a labeled structure to inspect it.";
  }

  updateProgress() {
    this.wrist.progressText.text = `${this.visited.size} / 6 EXPLORED`;
    for (const chip of this.wrist.chips) {
      const complete = this.visited.has(chip.definition.id);
      chip.text.text = `${complete ? "●" : "○"} ${chip.definition.shortName ?? chip.definition.name}`;
      chip.text.style = {
        width: "100%",
        fontSize: 10,
        fontWeight: "bold",
        color: complete ? "#b9fff4" : "#799d9b",
        textAlign: "center",
      };
      chip.panel.style = {
        width: "100%",
        padding: 7,
        borderRadius: 9,
        backgroundColor: complete ? "#13524f" : "#0a2329",
        borderColor: complete ? "#62d8ca" : "#183c42",
        borderWidth: 1,
      };
    }
  }

  removeActiveDetail() {
    if (!this.activeDetailCard) return;
    this.remove(this.activeDetailCard);
    this.activeDetailCard = undefined;
  }

  clearSelection() {
    if (this.selectedOrganelle) this.selectedOrganelle.setSelected(false);
    this.selectedOrganelle = undefined;
  }

  selectOrganelle(organelle) {
    this.clearSelection();
    this.removeActiveDetail();
    this.selectedOrganelle = organelle;
    organelle.setSelected(true);
    this.visited.add(organelle.definition.id);
    this.updateProgress();
    const definition = organelle.definition;
    this.activeDetailCard = createInfoCard({
      title: definition.name,
      kicker: `${definition.kicker}  •  ${this.visited.size} OF 6 EXPLORED`,
      summary: definition.summary,
      detail: definition.detail,
      color: definition.color,
      footer: "POINT + SELECT ANOTHER ORGANELLE TO CONTINUE",
    });
    this.add(this.activeDetailCard);
    this.setHint(`Inspecting ${definition.name}`);
  }

  showOverview() {
    this.clearSelection();
    this.removeActiveDetail();
    this.activeDetailCard = createInfoCard({
      title: "Your room is now a cell",
      kicker: "ROOM-SCALE OVERVIEW",
      summary: "Walk inside the clear center and inspect the six labeled structures around you.",
      detail: "The aqua boundary is the plasma membrane. The softly tinted interior is cytoplasm. Point and select an organelle to open its lesson, or launch Protein Journey to follow a secreted protein.",
      color: 0x65d8ca,
      footer: "CLEAR WALKING ZONE • 6 ORGANELLES • 1 PROTEIN ROUTE",
    });
    this.add(this.activeDetailCard);
    this.setHint("Overview • choose a labeled organelle");
  }

  createJourney() {
    this.removeProcessObjects();
    const group = new THREE.Group();
    group.name = "Protein production journey";

    const pNucleus = vec(byId("nucleus").position);
    const pRibosome = vec(byId("ribosomes").position);
    const pRER = vec(byId("rer").position);
    const pGolgi = vec(byId("golgi").position);
    const pRelease = new THREE.Vector3(3.22, 1.28, -1.0);

    const stages = [
      {
        id: "mrna",
        label: "1  mRNA • NUCLEUS → RIBOSOME",
        color: 0x63e1d4,
        duration: 4.4,
        points: [
          pNucleus.clone(),
          pNucleus.clone().lerp(pRibosome, 0.4).add(new THREE.Vector3(0.08, 0.16, 0.08)),
          pRibosome.clone().add(new THREE.Vector3(0, 0.14, 0)),
        ],
      },
      {
        id: "peptide",
        label: "2  PEPTIDE • THROUGH ROUGH ER",
        color: 0x74aef5,
        duration: 4.6,
        points: [
          pRibosome.clone().add(new THREE.Vector3(0, 0.14, 0)),
          pRER.clone().add(new THREE.Vector3(0.25, 0.18, -0.12)),
          pRER.clone().add(new THREE.Vector3(-0.2, 0.08, 0.02)),
          pRER.clone().add(new THREE.Vector3(0.2, -0.12, 0.08)),
        ],
      },
      {
        id: "vesicle",
        label: "3  VESICLE • ROUGH ER → GOLGI",
        color: 0xffba65,
        duration: 5.2,
        points: [
          pRER.clone().add(new THREE.Vector3(0.2, -0.12, 0.08)),
          new THREE.Vector3(-0.35, 1.48, -0.55),
          new THREE.Vector3(0.55, 1.62, -0.9),
          pGolgi.clone().add(new THREE.Vector3(-0.15, 0.08, 0.02)),
        ],
      },
      {
        id: "release",
        label: "4  RELEASE • GOLGI → MEMBRANE",
        color: 0xffd476,
        duration: 5.6,
        points: [
          pGolgi.clone().add(new THREE.Vector3(-0.15, 0.08, 0.02)),
          pGolgi.clone().add(new THREE.Vector3(0.3, -0.1, 0.12)),
          new THREE.Vector3(2.2, 1.28, -1.25),
          pRelease,
        ],
      },
    ];

    stages.forEach((stage, index) => {
      const {curve, tube} = makeTube(stage.points, 0.018, stage.color, 0.16);
      tube.name = `${stage.id} route segment`;
      group.add(tube);
      stage.curve = curve;
      stage.tube = tube;
      const midpoint = curve.getPoint(0.5).add(new THREE.Vector3(0, index % 2 ? -0.2 : 0.22, 0));
      stage.routeLabel = makeRouteLabel(stage.label, midpoint, `#${stage.color.toString(16).padStart(6, "0")}`);
      group.add(stage.routeLabel);
    });

    const carrier = new THREE.Group();
    carrier.name = "Moving protein-production cargo";
    const carrierGlow = mesh(new THREE.SphereGeometry(0.19, 20, 14), 0x8ff8ee, {
      transparent: true,
      opacity: 0.1,
      depthWrite: false,
      emissive: 0x60e5d8,
      emissiveIntensity: 1.4,
      side: THREE.BackSide,
    });
    const visuals = {
      mrna: createMRNAVisual(),
      peptide: createPeptideVisual(),
      vesicle: createVesicleVisual(),
      release: createVesicleVisual(),
      cargo: createCargoVisual(),
    };
    Object.values(visuals).forEach((visual) => {
      visual.visible = false;
      carrier.add(visual);
    });
    visuals.mrna.visible = true;
    carrier.add(carrierGlow);
    carrier.position.copy(stages[0].points[0]);
    group.add(carrier);

    this.processGroup = group;
    this.completedRoute = group;
    this.journey = {
      stage: 0,
      stageStartedAt: performance.now(),
      complete: false,
      stages,
      carrier,
      visuals,
    };
    this.lastJourneyStage = -1;
    this.add(group);
  }

  startProteinJourney() {
    this.clearSelection();
    this.removeActiveDetail();
    this.createJourney();
    this.activeDetailCard = createInfoCard({
      title: "Protein Production Journey",
      kicker: "LIVE BIOLOGICAL PROCESS",
      summary: "Follow the glowing cargo as genetic instructions become a protein for release.",
      detail: "Stage 1 of 4 • Messenger RNA carries a copied instruction from the nucleus to a ribosome.",
      color: 0x8a79e8,
      footer: "mRNA → PEPTIDE → VESICLE → RELEASE",
    });
    this.journey.infoSummary = this.activeDetailCard.infoText.detailText;
    this.add(this.activeDetailCard);
    this.setHint("Journey 1 / 4 • mRNA to ribosome");
  }

  updateJourneyVisual(stageIndex) {
    const {stages, visuals} = this.journey;
    Object.values(visuals).forEach((visual) => (visual.visible = false));
    visuals[stages[stageIndex].id].visible = true;
    stages.forEach((stage, index) => {
      stage.tube.material.opacity = index <= stageIndex ? 0.82 : 0.16;
      stage.tube.material.emissiveIntensity = index <= stageIndex ? 1.1 : 0.35;
    });
    for (const organelle of this.organelles.values()) organelle.setJourneyActive(false);
    const activeIds = [
      ["nucleus", "ribosomes"],
      ["ribosomes", "rer"],
      ["rer", "golgi"],
      ["golgi"],
    ][stageIndex];
    activeIds.forEach((id) => this.organelles.get(id)?.setJourneyActive(true));

    const copy = [
      ["Journey 1 / 4 • mRNA to ribosome", "Stage 1 of 4 • Messenger RNA carries a copied instruction from the nucleus to a ribosome."],
      ["Journey 2 / 4 • peptide through rough ER", "Stage 2 of 4 • The ribosome builds a peptide, which enters the rough ER to fold and pass quality checks."],
      ["Journey 3 / 4 • vesicle to Golgi", "Stage 3 of 4 • A transport vesicle carries the folded protein from rough ER to the Golgi apparatus."],
      ["Journey 4 / 4 • cargo to membrane", "Stage 4 of 4 • The Golgi sorts the protein into a vesicle that fuses with the membrane and releases its cargo."],
    ][stageIndex];
    this.setHint(copy[0]);
    if (this.journey.infoSummary) this.journey.infoSummary.text = copy[1];
  }

  completeJourney() {
    const {stages, carrier, visuals} = this.journey;
    this.journey.complete = true;
    Object.values(visuals).forEach((visual) => (visual.visible = false));
    visuals.cargo.visible = true;
    carrier.position.copy(stages.at(-1).curve.getPoint(1));
    stages.forEach((stage) => {
      stage.tube.material.opacity = 0.92;
      stage.tube.material.emissiveIntensity = 1.25;
    });
    for (const organelle of this.organelles.values()) organelle.setJourneyActive(false);
    if (this.journey.infoSummary) {
      this.journey.infoSummary.text = "Complete • The protein cargo has crossed the plasma membrane. The full labeled route remains visible for review.";
    }
    this.setHint("Journey complete • labeled route preserved");
  }

  removeProcessObjects() {
    if (this.processGroup) {
      this.remove(this.processGroup);
      disposeObject(this.processGroup);
    }
    this.processGroup = undefined;
    this.completedRoute = undefined;
    this.journey = undefined;
    this.lastJourneyStage = -1;
    for (const organelle of this.organelles?.values?.() ?? []) organelle.setJourneyActive(false);
  }

  resetExperience() {
    this.clearSelection();
    this.removeActiveDetail();
    this.removeProcessObjects();
    this.visited.clear();
    for (const organelle of this.organelles.values()) organelle.restore();
    this.updateProgress();
    // The mappedRoom, membrane, cytoplasm, and detected planes are deliberately
    // untouched. Reset restores only lesson organelles and process objects.
    this.showOverview();
    this.setHint("Reset complete • room map preserved");
  }

  update(time) {
    for (const organelle of this.organelles.values()) {
      organelle.visualRoot.rotation.y += 0.0015;
    }
    if (!this.journey || this.journey.complete) {
      if (this.journey?.visuals.cargo.visible) {
        const pulse = 1 + Math.sin(time * 0.006) * 0.12;
        this.journey.visuals.cargo.scale.setScalar(pulse);
      }
      return;
    }

    const {stage, stages, stageStartedAt, carrier} = this.journey;
    if (stage !== this.lastJourneyStage) {
      this.updateJourneyVisual(stage);
      this.lastJourneyStage = stage;
    }
    const current = stages[stage];
    const elapsed = (performance.now() - stageStartedAt) / 1000;
    const progress = Math.min(1, elapsed / current.duration);
    const eased = progress * progress * (3 - 2 * progress);
    carrier.position.copy(current.curve.getPoint(eased));
    carrier.rotation.y = time * 0.002;
    carrier.scale.setScalar(1 + Math.sin(time * 0.009) * 0.06);

    if (progress >= 1) {
      if (stage === stages.length - 1) this.completeJourney();
      else {
        this.journey.stage += 1;
        this.journey.stageStartedAt = performance.now();
      }
    }
  }

  dispose() {
    this.removeProcessObjects();
    this.removeActiveDetail();
    disposeObject(this.mappedRoom);
    delete window.roomScaleCellExplorer;
  }
}

const loading = document.getElementById("loading");
const loadingMessage = document.getElementById("loading-message");

if (!globalThis.__ROOM_SCALE_TEST__) {
  const options = new xb.Options();
  options.canvas = document.getElementById("xr-canvas");
  options.formFactor = "auto";
  options.enableHands();
  options.enableReticles();
  options.enablePlaneDetection();
  options.hands.visualization = true;
  options.controllers.visualization = true;
  options.controllers.visualizeRays = true;
  options.simulator.defaultMode = xb.SimulatorMode.POSE;
  options.simulator.modeToggle.enabled = true;
  options.reticles.defaultRenderDistance = 1.2;

  xb.add(new RoomScaleCellExplorer());

  try {
    await xb.init(options);
    loading?.classList.add("ready");
  } catch (error) {
    console.error("Room Scale Cell Explorer failed to start.", error);
    loading?.classList.add("error");
    if (loadingMessage) loadingMessage.textContent = "The cell could not be mapped. Reload to try again.";
  }
}
