import * as THREE from 'three';
import * as xb from 'xrblocks';

/* -------------------------------------------------------------------------- */
/* Content                                                                     */
/* -------------------------------------------------------------------------- */

const ORGANELLES = [
  {
    id: 'nucleus',
    name: 'Nucleus',
    color: 0x7b6cff,
    summary:
      'Control center of the cell. It stores the DNA and copies genes into\n' +
      'messenger RNA, which leaves through the nuclear pores.',
    facts: [
      'Holds the chromosomes inside a double membrane.',
      'Transcription makes messenger RNA here.',
      'The nucleolus builds ribosome parts.',
    ],
  },
  {
    id: 'rough-endoplasmic-reticulum',
    name: 'Rough Endoplasmic Reticulum',
    color: 0x4fc3f7,
    summary:
      'Folded membrane sheets studded with ribosomes. New peptides enter the\n' +
      'sheets, fold, and are packed into transport vesicles.',
    facts: [
      'Continuous with the nuclear envelope.',
      'Folds and checks new proteins.',
      'Buds vesicles aimed at the Golgi apparatus.',
    ],
  },
  {
    id: 'golgi-apparatus',
    name: 'Golgi Apparatus',
    color: 0xffb74d,
    summary:
      'A stack of flattened sacs that finishes, labels, and ships proteins to\n' +
      'their destinations inside or outside the cell.',
    facts: [
      'Adds sugars and other finishing tags.',
      'Sorts cargo into shipping vesicles.',
      'Vesicles fuse with the cell membrane to release cargo.',
    ],
  },
  {
    id: 'mitochondria',
    name: 'Mitochondria',
    color: 0xef5350,
    summary:
      'Powerhouse of the cell. Inner folds called cristae run cellular\n' +
      'respiration and produce most of the cell ATP.',
    facts: [
      'Has its own small circular DNA.',
      'Cristae increase the working surface area.',
      'Converts sugar and oxygen into ATP.',
    ],
  },
  {
    id: 'lysosome',
    name: 'Lysosome',
    color: 0x66bb6a,
    summary:
      'Acidic recycling vesicle. Digestive enzymes inside break down worn\n' +
      'parts, food particles, and invaders.',
    facts: [
      'Interior pH is about 4.5.',
      'Carries more than 50 digestive enzymes.',
      'Recycles building blocks back to the cytoplasm.',
    ],
  },
  {
    id: 'ribosomes',
    name: 'Ribosomes',
    color: 0xf06292,
    summary:
      'Tiny protein factories. They read messenger RNA and link amino acids\n' +
      'into a peptide chain.',
    facts: [
      'Made of RNA and protein in two subunits.',
      'Free in the cytoplasm or bound to the rough ER.',
      'Translation happens here.',
    ],
  },
];

const OVERVIEW_TEXT =
  'Walk the room. The translucent membrane marks the cell boundary and the\n' +
  'tinted open space is the cytoplasm.\n\n' +
  'Point at any labeled organelle and select it to read about it.\n' +
  'Use Protein Journey on the wrist panel to watch a protein travel from\n' +
  'the nucleus out through the membrane.';

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function tag(object, name, state) {
  object.userData.xrblocksDevtools = state ? {tag: name, state} : {tag: name};
  return object;
}

function makeLabel(text, width = 0.34, fontSize = 20) {
  const card = new xb.UICard({
    size: {width, height: 'auto'},
    pointerEvents: 'none',
    style: {padding: 10, backgroundColor: 'rgba(16, 18, 27, 0.72)'},
    children: [
      new xb.UIText({
        text,
        style: {fontSize, textAlign: 'center', color: '#ffffff'},
      }),
    ],
  });
  card.add(new xb.FaceCamera({mode: 'spherical', smoothing: 0.2}));
  return card;
}

function disposeTree(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    const material = child.material;
    if (Array.isArray(material)) {
      material.forEach((item) => item.dispose());
    } else if (material) {
      material.dispose();
    }
  });
}

/* -------------------------------------------------------------------------- */
/* Organelle                                                                   */
/* -------------------------------------------------------------------------- */

/** One selectable, labeled organelle structure. */
class Organelle extends xb.Script {
  constructor(definition) {
    super();
    this.definition = definition;
    this.name = definition.name;
    this.hovered = false;
    this.selected = false;
    this.onSelected = () => {};
    const self = this;

    this.body = new THREE.Group();
    this.add(this.body);
    this.materials = [];
    this.buildForm(definition);

    this.label = makeLabel(definition.name);
    this.label.position.set(0, 0.28, 0);
    this.add(this.label);

    tag(this, definition.id, {
      name: definition.name,
      get hovered() {
        return self.hovered;
      },
      get selected() {
        return self.selected;
      },
    });
  }

  material(color, extra = {}) {
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.45,
      metalness: 0.05,
      emissive: new THREE.Color(color).multiplyScalar(0.12),
      ...extra,
    });
    this.materials.push(material);
    return material;
  }

  buildForm({id, color}) {
    const body = this.body;
    if (id === 'nucleus') {
      body.add(
        new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 24), this.material(color))
      );
      const envelope = new THREE.Mesh(
        new THREE.SphereGeometry(0.23, 32, 24),
        this.material(0xd7d2ff, {
          transparent: true,
          opacity: 0.25,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      body.add(envelope);
      const nucleolus = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 20, 16),
        this.material(0x4a3fb0)
      );
      nucleolus.position.set(0.05, 0.03, 0.03);
      body.add(nucleolus);
    } else if (id === 'rough-endoplasmic-reticulum') {
      for (let i = 0; i < 5; i++) {
        const sheet = new THREE.Mesh(
          new THREE.TorusGeometry(0.15 - i * 0.012, 0.016, 12, 40, Math.PI * 1.25),
          this.material(color)
        );
        sheet.rotation.set(Math.PI / 2, 0, i * 0.5);
        sheet.position.y = -0.08 + i * 0.04;
        body.add(sheet);
      }
      for (let i = 0; i < 14; i++) {
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.014, 10, 8),
          this.material(0xf06292)
        );
        const angle = (i / 14) * Math.PI * 2;
        dot.position.set(
          Math.cos(angle) * 0.14,
          -0.06 + (i % 5) * 0.04,
          Math.sin(angle) * 0.14
        );
        body.add(dot);
      }
    } else if (id === 'golgi-apparatus') {
      for (let i = 0; i < 5; i++) {
        const sac = new THREE.Mesh(
          new THREE.TorusGeometry(0.13 - i * 0.017, 0.022, 14, 32, Math.PI * 1.5),
          this.material(color)
        );
        sac.rotation.set(Math.PI / 2, 0, -0.5);
        sac.position.y = -0.08 + i * 0.045;
        body.add(sac);
      }
    } else if (id === 'mitochondria') {
      const outer = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.1, 0.24, 16, 24),
        this.material(color)
      );
      outer.rotation.z = Math.PI / 2;
      body.add(outer);
      for (let i = 0; i < 6; i++) {
        const crista = new THREE.Mesh(
          new THREE.TorusGeometry(0.075, 0.012, 10, 24, Math.PI),
          this.material(0x8e1f1f)
        );
        crista.rotation.set(0, Math.PI / 2, i % 2 === 0 ? 0 : Math.PI);
        crista.position.x = -0.14 + i * 0.055;
        body.add(crista);
      }
    } else if (id === 'lysosome') {
      body.add(
        new THREE.Mesh(new THREE.SphereGeometry(0.12, 28, 20), this.material(color))
      );
      for (let i = 0; i < 10; i++) {
        const enzyme = new THREE.Mesh(
          new THREE.TetrahedronGeometry(0.018),
          this.material(0x1b5e20)
        );
        const angle = (i / 10) * Math.PI * 2;
        enzyme.position.set(
          Math.cos(angle) * 0.06,
          Math.sin(angle * 1.7) * 0.05,
          Math.sin(angle) * 0.06
        );
        body.add(enzyme);
      }
    } else if (id === 'ribosomes') {
      for (let i = 0; i < 12; i++) {
        const large = new THREE.Mesh(
          new THREE.SphereGeometry(0.032, 16, 12),
          this.material(color)
        );
        const small = new THREE.Mesh(
          new THREE.SphereGeometry(0.02, 14, 10),
          this.material(0xad1457)
        );
        const angle = (i / 12) * Math.PI * 2;
        const radius = 0.06 + (i % 3) * 0.035;
        large.position.set(
          Math.cos(angle) * radius,
          ((i % 4) - 1.5) * 0.05,
          Math.sin(angle) * radius
        );
        small.position.copy(large.position).add(new THREE.Vector3(0, 0.04, 0));
        body.add(large, small);
      }
    }
    body.traverse((child) => {
      if (child.isMesh) child.castShadow = false;
    });
  }

  /** World position used by the protein journey. */
  getHub(target = new THREE.Vector3()) {
    return this.getWorldPosition(target);
  }

  setHighlight(level) {
    const scale = level === 'selected' ? 0.45 : level === 'hover' ? 0.3 : 0.12;
    for (const material of this.materials) {
      material.emissive.copy(material.color).multiplyScalar(scale);
    }
    this.body.scale.setScalar(level === 'none' ? 1 : 1.08);
  }

  refreshHighlight() {
    this.setHighlight(
      this.selected ? 'selected' : this.hovered ? 'hover' : 'none'
    );
  }

  onHoverEnter() {
    this.hovered = true;
    this.refreshHighlight();
  }

  onHoverExit() {
    this.hovered = false;
    this.refreshHighlight();
  }

  onObjectSelectStart(event) {
    this.onSelected(this);
    event.stopPropagation();
  }

  reset() {
    this.hovered = false;
    this.selected = false;
    this.visible = true;
    this.body.rotation.set(0, 0, 0);
    this.refreshHighlight();
  }

  update() {
    this.body.rotation.y += 0.0035;
  }

  dispose() {
    disposeTree(this.body);
  }
}

/* -------------------------------------------------------------------------- */
/* Application                                                                 */
/* -------------------------------------------------------------------------- */

const WRIST_PANEL_OFFSET = new THREE.Vector3(-0.14, -0.26, 0);

const JOURNEY_LEGS = [
  {
    from: 'nucleus',
    to: 'ribosomes',
    label: 'mRNA: nucleus to ribosome',
    cargoLabel: 'mRNA',
    color: 0xffe082,
    radius: 0.035,
    seconds: 2.5,
  },
  {
    from: 'ribosomes',
    to: 'rough-endoplasmic-reticulum',
    label: 'Peptide: ribosome into rough ER',
    cargoLabel: 'Peptide',
    color: 0xf48fb1,
    radius: 0.04,
    seconds: 2.5,
  },
  {
    from: 'rough-endoplasmic-reticulum',
    to: 'golgi-apparatus',
    label: 'Vesicle: rough ER to Golgi',
    cargoLabel: 'Vesicle',
    color: 0x80deea,
    radius: 0.05,
    seconds: 2.5,
  },
  {
    from: 'golgi-apparatus',
    to: 'membrane',
    label: 'Vesicle: Golgi to membrane, cargo released',
    cargoLabel: 'Cargo vesicle',
    color: 0xa5d6a7,
    radius: 0.055,
    seconds: 3,
  },
];

class CellExplorer extends xb.Script {
  constructor() {
    super();
    this.room = {width: 3.2, depth: 3.2, height: 2.5};
    this.organelles = new Map();
    this.visited = new Set();
    this.infoCard = null;
    this.selectedOrganelle = null;
    this.journey = null;
    this.mapped = false;
    this.tmp = new THREE.Vector3();
  }

  init() {
    this.add(new THREE.HemisphereLight(0xffffff, 0x404060, 2.5));
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(1.5, 3, 1.5);
    this.add(key);

    this.cellRoot = new THREE.Group();
    this.add(this.cellRoot);

    // Journey objects are authored in world space, so this root stays at the
    // scene origin instead of under the room-aligned cell root.
    this.journeyRoot = new THREE.Group();
    this.journeyRoot.name = 'ProteinJourney';
    this.add(this.journeyRoot);

    this.buildMembrane();
    this.buildOrganelles();
    this.buildWristPanel();
    this.mapRoom();
    this.showInfo('Cell Overview', OVERVIEW_TEXT);
  }

  /* ----------------------------- room mapping ---------------------------- */

  onXRSessionStarted() {
    this.mapRoom();
  }

  onSimulatorStarted() {
    this.mapRoom();
  }

  /** Sizes the membrane from detected room geometry when it is available. */
  mapRoom() {
    const planes = xb.world?.planes?.get?.() ?? [];
    const box = new THREE.Box3();
    let found = false;
    for (const plane of planes) {
      plane.updateWorldMatrix(true, false);
      const planeBox = new THREE.Box3().setFromObject(plane);
      if (planeBox.isEmpty()) continue;
      box.union(planeBox);
      found = true;
    }
    if (found) {
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      this.room = {
        width: THREE.MathUtils.clamp(size.x, 2.2, 8),
        depth: THREE.MathUtils.clamp(size.z, 2.2, 8),
        height: THREE.MathUtils.clamp(size.y, 2, 4),
      };
      this.cellRoot.position.set(center.x, 0, center.z);
    }
    this.mapped = true;
    this.layoutMembrane();
    this.layoutOrganelles();
  }

  /* ------------------------------- membrane ------------------------------ */

  buildMembrane() {
    this.membraneMaterial = new THREE.MeshStandardMaterial({
      color: 0x66e0ff,
      transparent: true,
      opacity: 0.18,
      side: THREE.BackSide,
      depthWrite: false,
      roughness: 0.6,
    });
    this.membrane = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      this.membraneMaterial
    );
    this.membrane.name = 'CellMembrane';
    this.membrane.xb = {pointerEvents: 'none'};
    this.cellRoot.add(this.membrane);

    this.membraneEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
      new THREE.LineBasicMaterial({
        color: 0x7fffd4,
        transparent: true,
        opacity: 0.5,
      })
    );
    this.membraneEdges.xb = {pointerEvents: 'none'};
    this.cellRoot.add(this.membraneEdges);

    this.cytoplasmMaterial = new THREE.MeshBasicMaterial({
      color: 0x2f7f8f,
      transparent: true,
      opacity: 0.07,
      side: THREE.BackSide,
      depthWrite: false,
    });
    this.cytoplasm = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 24),
      this.cytoplasmMaterial
    );
    this.cytoplasm.name = 'Cytoplasm';
    this.cytoplasm.xb = {pointerEvents: 'none'};
    this.cellRoot.add(this.cytoplasm);

    this.membraneLabel = makeLabel('Cell membrane', 0.4, 22);
    this.membraneLabel.xb = {pointerEvents: 'none'};
    this.cellRoot.add(this.membraneLabel);
  }

  layoutMembrane() {
    const {width, depth, height} = this.room;
    this.membrane.scale.set(width, height, depth);
    this.membrane.position.set(0, height / 2, 0);
    this.membraneEdges.scale.copy(this.membrane.scale);
    this.membraneEdges.position.copy(this.membrane.position);
    this.cytoplasm.scale.set(width * 0.48, height * 0.46, depth * 0.48);
    this.cytoplasm.position.set(0, height * 0.46, 0);
    this.membraneLabel.position.set(0, height - 0.35, -depth / 2 + 0.05);
  }

  /* ------------------------------ organelles ----------------------------- */

  buildOrganelles() {
    ORGANELLES.forEach((definition) => {
      const organelle = new Organelle(definition);
      organelle.onSelected = (item) => this.selectOrganelle(item);
      this.organelles.set(definition.id, organelle);
      this.cellRoot.add(organelle);
    });
  }

  /** Places organelles around the walls so the middle stays walkable. */
  layoutOrganelles() {
    const {width, depth} = this.room;
    // Stay inside the mapped room and within comfortable viewing distance so
    // the walkable middle remains clear.
    const rx = THREE.MathUtils.clamp(width / 2 - 0.5, 0.8, 1.8);
    const rz = THREE.MathUtils.clamp(depth / 2 - 0.5, 0.8, 1.8);
    const slots = [
      {id: 'nucleus', angle: 0, y: 1.5},
      {id: 'ribosomes', angle: Math.PI / 3, y: 1.4},
      {id: 'rough-endoplasmic-reticulum', angle: (2 * Math.PI) / 3, y: 1.45},
      {id: 'golgi-apparatus', angle: Math.PI, y: 1.45},
      {id: 'mitochondria', angle: (4 * Math.PI) / 3, y: 1.5},
      {id: 'lysosome', angle: (5 * Math.PI) / 3, y: 1.4},
    ];
    for (const slot of slots) {
      const organelle = this.organelles.get(slot.id);
      if (!organelle) continue;
      organelle.position.set(
        Math.sin(slot.angle) * rx,
        slot.y,
        -Math.cos(slot.angle) * rz
      );
    }
  }

  selectOrganelle(organelle) {
    if (this.selectedOrganelle && this.selectedOrganelle !== organelle) {
      this.selectedOrganelle.selected = false;
      this.selectedOrganelle.refreshHighlight();
    }
    this.selectedOrganelle = organelle;
    organelle.selected = true;
    organelle.refreshHighlight();

    this.visited.add(organelle.definition.id);
    this.updateProgress();

    const {name, summary, facts} = organelle.definition;
    this.showInfo(
      name,
      `${summary}\n\n${facts.map((fact) => `• ${fact}`).join('\n')}`,
      organelle
    );
  }

  /* -------------------------------- info UI ------------------------------ */

  /** Keeps exactly one organelle information display in the scene. */
  showInfo(title, body, organelle) {
    this.removeInfoCard();

    const card = new xb.UICard({
      size: {width: 0.62, height: 'auto'},
      manipulation: true,
      edge: true,
      style: {flexDirection: 'column', gap: 12, padding: 22},
      children: [
        new xb.UIText({
          text: title,
          style: {fontSize: 32, fontWeight: 'bold', textAlign: 'center'},
        }),
        new xb.UIText({
          text: body,
          style: {fontSize: 20, lineHeight: 1.4, whiteSpace: 'pre-line'},
        }),
        new xb.UIButton({
          label: 'Close',
          onClick: () => this.closeInfo(),
        }),
      ],
    });
    card.name = 'OrganelleInfoCard';

    // Cards sit beside and below the organelle band so they never block a
    // selection ray from head height to another organelle.
    const base = organelle ? organelle.position : new THREE.Vector3(0, 0, -1.6);
    const angle = Math.atan2(base.x, -base.z) + Math.PI / 7;
    const radius = Math.max(
      Math.min(Math.hypot(base.x, base.z) * 0.62, 1.1),
      0.7
    );
    card.position.set(
      this.cellRoot.position.x + Math.sin(angle) * radius,
      0.95,
      this.cellRoot.position.z - Math.cos(angle) * radius
    );
    card.add(new xb.FaceCamera({mode: 'spherical', smoothing: 0.2}));

    this.infoCard = card;
    this.add(card);
    return card;
  }

  /** Removes the single information display without changing selection. */
  removeInfoCard() {
    if (!this.infoCard) return;
    this.remove(this.infoCard);
    this.infoCard = null;
  }

  closeInfo() {
    this.removeInfoCard();
    if (this.selectedOrganelle) {
      this.selectedOrganelle.selected = false;
      this.selectedOrganelle.refreshHighlight();
      this.selectedOrganelle = null;
    }
  }

  /* ------------------------------ wrist panel ---------------------------- */

  buildWristPanel() {
    this.progressText = new xb.UIText({
      text: 'Organelles explored: 0 / 6',
      style: {fontSize: 20, textAlign: 'center'},
    });
    this.journeyStatus = new xb.UIText({
      text: 'Protein Journey: ready',
      style: {fontSize: 17, opacity: 0.8, textAlign: 'center'},
    });

    this.wristPanel = new xb.UICard({
      size: {width: 0.3, height: 'auto'},
      style: {flexDirection: 'column', gap: 10, padding: 14},
      children: [
        new xb.UIText({
          text: 'Cell Explorer',
          style: {fontSize: 24, fontWeight: 'bold', textAlign: 'center'},
        }),
        this.progressText,
        new xb.UIButton({
          label: 'Overview',
          onClick: () => this.showInfo('Cell Overview', OVERVIEW_TEXT),
        }),
        new xb.UIButton({
          label: 'Protein Journey',
          onClick: () => this.startJourney(),
        }),
        new xb.UIButton({
          label: 'Reset',
          onClick: () => this.resetExperience(),
        }),
        this.journeyStatus,
      ],
    });
    this.wristPanel.name = 'WristPanel';
    this.wristPanel.position.set(-0.4, 1.1, -0.45);
    this.wristPanel.add(new xb.FaceCamera({mode: 'spherical', smoothing: 0.25}));
    this.add(this.wristPanel);
  }

  updateProgress() {
    if (!this.progressText) return;
    this.progressText.text = `Organelles explored: ${this.visited.size} / 6`;
  }

  /** Anchors the panel to the wrist when hands are tracked. */
  updateWristPanel() {
    const panel = this.wristPanel;
    if (!panel) return;
    const camera = xb.core?.camera;
    const wrist = xb.user?.hands?.getWrist?.(xb.Handedness.LEFT);
    const target = this.tmp;
    if (wrist && wrist.visible !== false) {
      wrist.getWorldPosition(target);
      // Sit beside and below the wrist so the panel never blocks a ray that
      // the user aims past their own hand at an organelle.
      if (camera) {
        target.add(
          WRIST_PANEL_OFFSET.clone().applyQuaternion(camera.quaternion)
        );
      } else {
        target.y -= 0.26;
      }
    } else if (camera) {
      target.set(-0.45, -0.45, -0.45).applyQuaternion(camera.quaternion);
      target.add(camera.position);
    } else {
      return;
    }
    panel.position.copy(target);
  }

  /* ---------------------------- protein journey -------------------------- */

  startJourney() {
    this.clearJourney();
    const legs = JOURNEY_LEGS.map((leg) => {
      const from = this.organelles.get(leg.from);
      const to =
        leg.to === 'membrane' ? null : this.organelles.get(leg.to);
      const start = from.getHub(new THREE.Vector3());
      const end = to
        ? to.getHub(new THREE.Vector3())
        : this.membraneExitPoint(start);
      return {...leg, start, end};
    });

    const cargo = new THREE.Mesh(
      new THREE.SphereGeometry(legs[0].radius, 20, 16),
      new THREE.MeshStandardMaterial({
        color: legs[0].color,
        emissive: new THREE.Color(legs[0].color).multiplyScalar(0.5),
      })
    );
    cargo.name = 'ProteinCargo';
    cargo.xb = {pointerEvents: 'none'};
    cargo.position.copy(legs[0].start);
    this.journeyRoot.add(cargo);

    this.cargoLabel = makeLabel(legs[0].cargoLabel, 0.24, 17);
    this.cargoLabel.position.set(0, 0.14, 0);
    cargo.add(this.cargoLabel);

    this.journey = {legs, index: 0, elapsed: 0, cargo, done: false};
    this.journeyStatus.text = `Protein Journey: ${legs[0].label}`;
  }

  membraneExitPoint(reference) {
    const {width, depth, height} = this.room;
    const center = this.cellRoot.position;
    const direction = reference
      .clone()
      .sub(center)
      .setY(0);
    if (direction.lengthSq() < 1e-4) direction.set(0, 0, -1);
    direction.normalize();
    // Scale the direction so the cargo leaves through the membrane wall.
    const scale = Math.min(
      Math.abs(direction.x) > 1e-3
        ? (width / 2 + 0.25) / Math.abs(direction.x)
        : Infinity,
      Math.abs(direction.z) > 1e-3
        ? (depth / 2 + 0.25) / Math.abs(direction.z)
        : Infinity
    );
    return new THREE.Vector3(
      center.x + direction.x * scale,
      Math.min(height - 0.4, 1.5),
      center.z + direction.z * scale
    );
  }

  /** Keeps the completed, labeled route visible in the room. */
  addRouteSegment(leg) {
    const curve = this.legCurve(leg);
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 48, 0.012, 10, false),
      new THREE.MeshStandardMaterial({
        color: leg.color,
        emissive: new THREE.Color(leg.color).multiplyScalar(0.4),
        transparent: true,
        opacity: 0.9,
      })
    );
    tube.name = `Route:${leg.label}`;
    tube.xb = {pointerEvents: 'none'};
    this.journeyRoot.add(tube);

    const label = makeLabel(leg.label, 0.38, 17);
    label.position.copy(curve.getPoint(0.5)).add(new THREE.Vector3(0, 0.12, 0));
    this.journeyRoot.add(label);
  }

  legCurve(leg) {
    const mid = leg.start.clone().lerp(leg.end, 0.5);
    mid.y += 0.28;
    return new THREE.QuadraticBezierCurve3(
      leg.start.clone(),
      mid,
      leg.end.clone()
    );
  }

  advanceJourney(delta) {
    const journey = this.journey;
    if (!journey || journey.done) return;
    const leg = journey.legs[journey.index];
    journey.elapsed += delta;
    const t = Math.min(journey.elapsed / leg.seconds, 1);
    const curve = leg.curve ?? (leg.curve = this.legCurve(leg));
    journey.cargo.position.copy(curve.getPoint(t));
    journey.cargo.rotation.y += delta * 2;

    if (t < 1) return;

    this.addRouteSegment(leg);
    journey.index += 1;
    journey.elapsed = 0;

    if (journey.index >= journey.legs.length) {
      journey.done = true;
      this.releaseCargo(leg);
      this.journeyStatus.text =
        'Protein Journey: complete. Cargo released through the membrane.';
      return;
    }
    const next = journey.legs[journey.index];
    journey.cargo.material.color.set(next.color);
    journey.cargo.material.emissive
      .set(next.color)
      .multiplyScalar(0.5);
    journey.cargo.geometry.dispose();
    journey.cargo.geometry = new THREE.SphereGeometry(next.radius, 20, 16);
    journey.cargo.position.copy(next.start);
    if (this.cargoLabel) this.cargoLabel.children[0].text = next.cargoLabel;
    this.journeyStatus.text = `Protein Journey: ${next.label}`;
  }

  releaseCargo(leg) {
    const cargo = this.journey.cargo;
    if (this.cargoLabel) {
      cargo.remove(this.cargoLabel);
      this.cargoLabel = null;
    }
    cargo.position.copy(leg.end);
    const label = makeLabel('Cargo released outside the cell', 0.4, 17);
    label.position.copy(leg.end).add(new THREE.Vector3(0, 0.16, 0));
    this.journeyRoot.add(label);
  }

  clearJourney() {
    this.journey = null;
    this.cargoLabel = null;
    for (const child of [...this.journeyRoot.children]) {
      this.journeyRoot.remove(child);
      disposeTree(child);
    }
    if (this.journeyStatus) {
      this.journeyStatus.text = 'Protein Journey: ready';
    }
  }

  /* --------------------------------- reset ------------------------------- */

  /** Restores organelles and process objects; the mapped room is untouched. */
  resetExperience() {
    this.clearJourney();
    this.closeInfo();
    for (const organelle of this.organelles.values()) organelle.reset();
    this.layoutOrganelles();
    this.visited.clear();
    this.updateProgress();
    this.showInfo('Cell Overview', OVERVIEW_TEXT);
  }

  /* --------------------------------- frame ------------------------------- */

  update() {
    const delta = Math.min(xb.getDeltaTime?.() ?? 0.016, 0.05);
    this.updateWristPanel();
    this.advanceJourney(delta);
  }

  dispose() {
    this.clearJourney();
    disposeTree(this.cellRoot);
  }
}

const options = new xb.Options();
options.enableReticles();
options.enableHands();
options.enablePlaneDetection();
options.hands.visualization = true;

function start() {
  xb.add(new CellExplorer());
  xb.init(options);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, {once: true});
} else {
  start();
}
