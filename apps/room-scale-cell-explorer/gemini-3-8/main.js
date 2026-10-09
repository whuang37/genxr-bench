import * as THREE from 'three';
import * as xb from 'xrblocks';

// ============================================================================
// 1. ORGANELLES METADATA & EDUCATIONAL CONTENT
// ============================================================================

export const ORGANELLES_DATA = {
  nucleus: {
    name: 'Nucleus',
    shortName: 'Nucleus',
    tag: 'nucleus',
    role: 'Command & Genetic Center',
    position: new THREE.Vector3(0, 1.4, -2.1),
    color: 0x6d28d9,
    description:
      'The nucleus is the eukaryotic cell\'s central command center. Enclosed within a double-membrane nuclear envelope with selective nuclear pores, it safeguards genomic DNA packaged into chromatin. Inside lies the dense nucleolus, the hub of rRNA synthesis and ribosome assembly. During gene expression, the nucleus orchestrates transcription—copying DNA instructions into messenger RNA (mRNA) for export into the cytoplasm.',
    structure:
      'Double-membrane nuclear envelope, nuclear pore complexes, inner nucleolus, and chromatin network.',
    function:
      'Stores genetic instructions, regulates gene expression, directs cell division, and orchestrates mRNA synthesis.',
    journeyRole:
      'Origin of the protein pathway: DNA is transcribed into mRNA, which exits via nuclear pores to initiate protein synthesis.',
  },
  'rough-endoplasmic-reticulum': {
    name: 'Rough Endoplasmic Reticulum',
    shortName: 'Rough ER',
    tag: 'rough-endoplasmic-reticulum',
    role: 'Protein Synthesis & Folding',
    position: new THREE.Vector3(1.2, 1.35, -1.8),
    color: 0xec4899,
    description:
      'The rough endoplasmic reticulum (ER) is an intricate labyrinth of folded, interconnected membrane sheets (cisternae) continuous with the outer nuclear membrane. Its cytosolic surface is densely studded with ribosomes, giving it a rough appearance. As ribosomes translate proteins, nascent polypeptides enter the ER lumen where chaperones fold them and attach initial carbohydrates before packaging into transport vesicles.',
    structure:
      'Convoluted cisternal sacs studded with membrane-bound ribosomes, continuous with the nuclear envelope.',
    function:
      'Synthesizes secretory and membrane proteins, facilitates chaperone-assisted protein folding, and performs initial glycosylation.',
    journeyRole:
      'Receives translating polypeptide chains from bound ribosomes, folds the protein inside its lumen, and buds off transport vesicles.',
  },
  'golgi-apparatus': {
    name: 'Golgi Apparatus',
    shortName: 'Golgi Apparatus',
    tag: 'golgi-apparatus',
    role: 'Sorting, Modification & Packaging',
    position: new THREE.Vector3(2.1, 1.35, -0.6),
    color: 0xf97316,
    description:
      'The Golgi apparatus operates as the cellular distribution and packaging center. It consists of a stack of flattened, disc-like cisternae organized into distinct polarity: the receiving cis-Golgi network, medial cisternae, and shipping trans-Golgi network. Proteins arriving from the rough ER undergo complex enzymatic modifications before being sorted into specific secretory vesicles destined for exocytosis or lysosomes.',
    structure:
      'Stacked, flattened saucer-shaped cisternae with polarized cis and trans faces, flanked by budding transport vesicles.',
    function:
      'Chemically modifies proteins (glycosylation, phosphorylation), sorts cargo by destination tags, and buds targeted vesicles.',
    journeyRole:
      'Receives ER transport vesicles at the cis-face, processes protein cargo through its cisternae, and dispatches mature secretory vesicles from the trans-face.',
  },
  mitochondria: {
    name: 'Mitochondria',
    shortName: 'Mitochondria',
    tag: 'mitochondria',
    role: 'Powerhouse - ATP Generation',
    position: new THREE.Vector3(-1.9, 1.35, -0.8),
    color: 0xef4444,
    description:
      'Mitochondria are the energetic powerhouses of eukaryotic cells. Bound by a double membrane, their inner membrane is folded into deep cristae that dramatically expand surface area for ATP synthase and electron transport complexes. Through the citric acid cycle and oxidative phosphorylation, mitochondria convert nutrients into adenosine triphosphate (ATP), supplying vital energy for cellular activity.',
    structure:
      'Capsule/rod shape with smooth outer membrane, intermembrane space, deeply folded inner cristae, and internal matrix.',
    function:
      'Generates cellular ATP via aerobic respiration, regulates calcium homeostasis, and orchestrates apoptotic signaling.',
    journeyRole:
      'Powers the entire secretory journey: ATP synthesized by mitochondria drives ribosomal peptide bond formation and vesicle transport.',
  },
  lysosome: {
    name: 'Lysosome',
    shortName: 'Lysosome',
    tag: 'lysosome',
    role: 'Digestive & Recycling Organelle',
    position: new THREE.Vector3(-1.5, 1.4, -1.65),
    color: 0x10b981,
    description:
      'Lysosomes are specialized digestive organelles enclosed by a protective single lipid membrane with active proton pumps maintaining an acidic lumen (pH ~4.5–5.0). Packed with over 50 different acid hydrolases, lysosomes break down biomacromolecules, cellular debris, foreign pathogens, and damaged organelles (autophagy) into constituent monomers for recycling.',
    structure:
      'Acidic spherical vesicle enclosed by a glycosylated membrane with transmembrane V-ATPase proton pumps and hydrolytic enzymes.',
    function:
      'Degrades biological polymers, clears misfolded proteins, digests foreign matter, and recycles cellular building blocks.',
    journeyRole:
      'Acts as quality control and degradation hub; non-secretory vesicle pathways target misfolded or excess proteins to lysosomes for recycling.',
  },
  ribosomes: {
    name: 'Ribosomes',
    shortName: 'Ribosomes',
    tag: 'ribosomes',
    role: 'Protein Translation Machinery',
    position: new THREE.Vector3(0.65, 1.55, -1.65),
    color: 0x3b82f6,
    description:
      'Ribosomes are universal ribonucleoprotein nanomachines that execute translation—the decoding of genetic information into functional proteins. Eukaryotic 80S ribosomes comprise a large 60S subunit and a small 40S subunit made of ribosomal RNA (rRNA) and catalytic proteins. As mRNA feeds through the binding groove between subunits, transfer RNA (tRNA) molecules match amino acids to codons, forming peptide bonds.',
    structure:
      'Dual-subunit macromolecular complex composed of large (60S) and small (40S) ribonucleoprotein units separated by an mRNA binding groove.',
    function:
      'Translates mRNA nucleotide sequences into linear polypeptide chains of amino acids via tRNA codon matching.',
    journeyRole:
      'The critical translation bridge: binds exported mRNA from the nucleus and synthesizes the growing peptide chain directly into the rough ER.',
  },
};

// ============================================================================
// 2. PROCEDURAL 3D PRESET BUILDERS
// ============================================================================

function buildNucleusVisuals(root) {
  const capGeom1 = new THREE.CircleGeometry(0.42, 24, 0, Math.PI);
  const capMat = new THREE.MeshStandardMaterial({
    color: 0x4c1d95,
    roughness: 0.5,
    side: THREE.DoubleSide,
  });
  const capMesh1 = new THREE.Mesh(capGeom1, capMat);
  capMesh1.rotation.y = Math.PI / 2;
  root.add(capMesh1);

  const nucleolusGeom = new THREE.SphereGeometry(0.15, 24, 24);
  const nucleolusMat = new THREE.MeshStandardMaterial({
    color: 0xdb2777,
    emissive: 0x831843,
    emissiveIntensity: 0.6,
    roughness: 0.3,
  });
  const nucleolus = new THREE.Mesh(nucleolusGeom, nucleolusMat);
  root.add(nucleolus);

  const chromatinGeom = new THREE.TorusKnotGeometry(0.22, 0.014, 48, 8, 2, 3);
  const chromatinMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.5,
  });
  const chromatin = new THREE.Mesh(chromatinGeom, chromatinMat);
  root.add(chromatin);

  const poreGeom = new THREE.TorusGeometry(0.022, 0.006, 8, 16);
  const poreMat = new THREE.MeshStandardMaterial({
    color: 0x312e81,
    roughness: 0.4,
  });
  for (let i = 0; i < 16; i++) {
    const phi = 0.3 + (i % 4) * 0.7;
    const theta = Math.floor(i / 4) * Math.PI * 0.35 + 0.2;
    const pore = new THREE.Mesh(poreGeom, poreMat);
    pore.position.setFromSphericalCoords(0.422, phi, theta);
    pore.lookAt(
      root.position.clone().add(pore.position.clone().multiplyScalar(2))
    );
    root.add(pore);
  }
}

function buildRoughErVisuals(root) {
  const radii = [0.26, 0.44, 0.54];
  const sheetMat = new THREE.MeshStandardMaterial({
    color: 0xdb2777,
    roughness: 0.35,
    side: THREE.DoubleSide,
  });

  radii.forEach((r, idx) => {
    const sheetGeom = new THREE.CylinderGeometry(
      r,
      r,
      0.38 - idx * 0.06,
      24,
      4,
      true,
      -Math.PI * 0.4,
      Math.PI * 0.85
    );
    const sheet = new THREE.Mesh(sheetGeom, sheetMat);
    sheet.rotation.z = (idx % 2 === 0 ? 1 : -1) * 0.1;
    root.add(sheet);
  });

  const ribosomeBeadGeom = new THREE.SphereGeometry(0.012, 6, 6);
  const ribosomeBeadMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.4,
  });
  const beadCount = 90;
  for (let i = 0; i < beadCount; i++) {
    const bead = new THREE.Mesh(ribosomeBeadGeom, ribosomeBeadMat);
    const r = radii[i % radii.length] + (Math.random() - 0.5) * 0.02;
    const theta = -Math.PI * 0.38 + Math.random() * Math.PI * 0.8;
    const y = (Math.random() - 0.5) * 0.32;
    bead.position.set(r * Math.sin(theta), y, r * Math.cos(theta));
    root.add(bead);
  }
}

function buildGolgiVisuals(root) {
  const cisternaMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    roughness: 0.3,
    metalness: 0.1,
  });
  const offsets = [-0.13, -0.065, 0.065, 0.13];

  offsets.forEach((zOffset, idx) => {
    const r = 0.22 + (idx % 2) * 0.03;
    const geom = new THREE.TorusGeometry(r, 0.035, 12, 28, Math.PI * 0.95);
    const cisterna = new THREE.Mesh(geom, cisternaMat);
    cisterna.position.z = zOffset;
    cisterna.scale.set(1.0, 0.35, 1.15);
    root.add(cisterna);

    const rimGeom = new THREE.SphereGeometry(0.04, 8, 8);
    const rimLeft = new THREE.Mesh(rimGeom, cisternaMat);
    rimLeft.position.set(r, 0, zOffset);
    root.add(rimLeft);
    const rimRight = new THREE.Mesh(rimGeom, cisternaMat);
    rimRight.position.set(-r, 0, zOffset);
    root.add(rimRight);
  });

  const vesicleGeom = new THREE.SphereGeometry(0.032, 10, 10);
  const vesicleMat = new THREE.MeshStandardMaterial({
    color: 0xfb923c,
    roughness: 0.25,
  });
  const vesiclePositions = [
    new THREE.Vector3(0.18, 0.08, -0.22),
    new THREE.Vector3(-0.16, -0.05, -0.24),
    new THREE.Vector3(0.24, -0.06, 0.22),
    new THREE.Vector3(-0.22, 0.08, 0.24),
    new THREE.Vector3(0.0, 0.12, 0.25),
    new THREE.Vector3(0.28, 0.02, 0.0),
  ];
  vesiclePositions.forEach((pos) => {
    const v = new THREE.Mesh(vesicleGeom, vesicleMat);
    v.position.copy(pos);
    root.add(v);
  });
}

function buildMitochondriaVisuals(root) {
  const cristaeMat = new THREE.MeshStandardMaterial({
    color: 0xfca5a5,
    roughness: 0.4,
  });
  const cristaeGeom = new THREE.CylinderGeometry(0.13, 0.13, 0.015, 16);
  const count = 7;
  for (let i = 0; i < count; i++) {
    const crista = new THREE.Mesh(cristaeGeom, cristaeMat);
    crista.position.y = -0.18 + i * 0.06;
    crista.position.x = i % 2 === 0 ? 0.03 : -0.03;
    crista.rotation.x = Math.PI / 2;
    crista.rotation.z = i % 2 === 0 ? 0.15 : -0.15;
    root.add(crista);
  }

  const coreGeom = new THREE.CapsuleGeometry(0.08, 0.35, 12, 16);
  const coreMat = new THREE.MeshBasicMaterial({
    color: 0x991b1b,
    transparent: true,
    opacity: 0.3,
  });
  const core = new THREE.Mesh(coreGeom, coreMat);
  root.add(core);
}

function buildLysosomeVisuals(root) {
  const enzymeColors = [0xfbbf24, 0x06b6d4, 0xf43f5e, 0xa855f7];
  for (let i = 0; i < 14; i++) {
    const color = enzymeColors[i % enzymeColors.length];
    const r = 0.024 + Math.random() * 0.012;
    const enzymeGeom = new THREE.SphereGeometry(r, 8, 8);
    const enzymeMat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.4,
      roughness: 0.3,
    });
    const enzyme = new THREE.Mesh(enzymeGeom, enzymeMat);
    const phi = Math.random() * Math.PI;
    const theta = Math.random() * Math.PI * 2;
    const dist = Math.random() * 0.15;
    enzyme.position.setFromSphericalCoords(dist, phi, theta);
    root.add(enzyme);
  }

  const pumpGeom = new THREE.CylinderGeometry(0.01, 0.01, 0.04, 8);
  const pumpMat = new THREE.MeshStandardMaterial({
    color: 0x065f46,
    roughness: 0.5,
  });
  for (let i = 0; i < 12; i++) {
    const pump = new THREE.Mesh(pumpGeom, pumpMat);
    const phi = (i / 12) * Math.PI;
    const theta = ((i * 3) % 12) * (Math.PI / 6);
    pump.position.setFromSphericalCoords(0.24, phi, theta);
    pump.lookAt(
      root.position.clone().add(pump.position.clone().multiplyScalar(2))
    );
    root.add(pump);
  }
}

function buildRibosomesVisuals(root) {
  const largeMat = root.material;
  const crownGeom = new THREE.SphereGeometry(0.055, 16, 16);
  const crown = new THREE.Mesh(crownGeom, largeMat);
  crown.position.set(0, 0.12, 0.02);
  root.add(crown);

  const stalkGeom = new THREE.SphereGeometry(0.038, 12, 12);
  const stalk = new THREE.Mesh(stalkGeom, largeMat);
  stalk.position.set(0.1, 0.08, -0.04);
  root.add(stalk);

  const smallGeom = new THREE.SphereGeometry(0.1, 24, 24);
  smallGeom.scale(1.2, 0.65, 0.9);
  const smallMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    roughness: 0.4,
    metalness: 0.1,
  });
  const smallSubunit = new THREE.Mesh(smallGeom, smallMat);
  smallSubunit.position.set(0, -0.13, 0);
  root.add(smallSubunit);

  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.16, -0.05, 0.08),
    new THREE.Vector3(0.0, -0.04, 0.04),
    new THREE.Vector3(0.16, -0.05, 0.08),
  ]);
  const mrnaGeom = new THREE.TubeGeometry(curve, 16, 0.008, 6, false);
  const mrnaMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.6,
  });
  const mrnaSegment = new THREE.Mesh(mrnaGeom, mrnaMat);
  root.add(mrnaSegment);

  const poly1 = new THREE.Group();
  poly1.scale.set(0.35, 0.35, 0.35);
  poly1.position.set(-0.25, 0.15, -0.1);
  const p1L = new THREE.Mesh(root.geometry, largeMat);
  const p1S = new THREE.Mesh(smallGeom, smallMat);
  p1S.position.set(0, -0.13, 0);
  poly1.add(p1L, p1S);
  root.add(poly1);

  const poly2 = new THREE.Group();
  poly2.scale.set(0.32, 0.32, 0.32);
  poly2.position.set(0.24, -0.18, 0.12);
  const p2L = new THREE.Mesh(root.geometry, largeMat);
  const p2S = new THREE.Mesh(smallGeom, smallMat);
  p2S.position.set(0, -0.13, 0);
  poly2.add(p2L, p2S);
  root.add(poly2);
}

// ============================================================================
// 3. INTERACTIVE ORGANELLE SELECTION TARGET
// ============================================================================

export class OrganelleTarget extends xb.MeshScript {
  constructor(organelleKey, data, rootGeometry, rootMaterial, app) {
    super(rootGeometry, rootMaterial);
    this.organelleKey = organelleKey;
    this.organelleData = data;
    this.app = app;
    this.position.copy(data.position);
    this.name = organelleKey;
    // STABLE DEVTOOLS TAG - attached exclusively to semantic selection target
    this.userData.xrblocksDevtools = { tag: organelleKey };
    this.xb = { pointerEvents: 'auto' };

    this.isHighlighted = false;
    this.highlightRing = null;
    this.baseMaterial = rootMaterial;

    switch (organelleKey) {
      case 'nucleus':
        buildNucleusVisuals(this);
        break;
      case 'rough-endoplasmic-reticulum':
        buildRoughErVisuals(this);
        break;
      case 'golgi-apparatus':
        buildGolgiVisuals(this);
        break;
      case 'mitochondria':
        this.rotation.z = Math.PI * 0.15;
        this.rotation.x = Math.PI * 0.1;
        buildMitochondriaVisuals(this);
        break;
      case 'lysosome':
        buildLysosomeVisuals(this);
        break;
      case 'ribosomes':
        buildRibosomesVisuals(this);
        break;
    }
  }

  setHighlighted(highlighted) {
    this.isHighlighted = highlighted;
    if (highlighted) {
      if (this.material && this.material.emissive) {
        this.material.emissive.setHex(0x38bdf8);
        this.material.emissiveIntensity = 0.7;
      }
      if (!this.highlightRing) {
        const ringGeom = new THREE.TorusGeometry(0.52, 0.012, 16, 48);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.85,
        });
        this.highlightRing = new THREE.Mesh(ringGeom, ringMat);
        this.highlightRing.rotation.x = Math.PI / 2;
        this.highlightRing.name = 'highlight-ring';
        this.add(this.highlightRing);
      }
    } else {
      if (this.material && this.material.emissive) {
        this.material.emissive.setHex(0x000000);
        this.material.emissiveIntensity = 0;
      }
      if (this.highlightRing) {
        this.remove(this.highlightRing);
        this.highlightRing.geometry.dispose();
        this.highlightRing.material.dispose();
        this.highlightRing = null;
      }
    }
  }

  onHoverEnter(event) {
    if (!this.isHighlighted && this.material && this.material.emissive) {
      this.material.emissive.setHex(0x0284c7);
      this.material.emissiveIntensity = 0.4;
    }
  }

  onHoverExit(event) {
    if (!this.isHighlighted && this.material && this.material.emissive) {
      this.material.emissive.setHex(0x000000);
      this.material.emissiveIntensity = 0;
    }
  }

  onObjectSelectStart(event) {
    event?.stopPropagation?.();
    this.app.selectOrganelle(this);
  }

  onObjectSelectEnd(event) {
    event?.stopPropagation?.();
    if (event?.completed) {
      this.app.selectOrganelle(this);
    }
  }

  onObjectTouchStart(event) {
    event?.stopPropagation?.();
    this.app.selectOrganelle(this);
  }
}

// ============================================================================
// 4. WRIST PANEL COMPONENT
// ============================================================================

export class WristPanel extends xb.Script {
  constructor(app) {
    super();
    this.app = app;
    this.explored = new Set();
    this.card = null;
    this.progressText = null;
    this.statusText = null;
    this.checklistElements = {};
    this.followHead = null;
    this.faceCamera = null;

    this.buildUI();
  }

  init({ camera, timer } = {}) {
    this.camera = camera;
    this.timer = timer;
  }

  buildUI() {
    const headerTitle = new xb.UIText({
      text: 'CELL EXPLORER',
      style: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#38bdf8',
        textAlign: 'center',
      },
    });
    const headerSubtitle = new xb.UIText({
      text: 'Animal Cell Lesson & Controls',
      style: { fontSize: 11, color: '#94a3b8', textAlign: 'center' },
    });

    const overviewBtn = new xb.UIButton({
      label: 'Overview',
      icon: 'info',
      style: { flexGrow: 1 },
      onClick: () => this.app.showOverview(),
    });
    overviewBtn.name = 'overview-button';

    const journeyBtn = new xb.UIButton({
      label: 'Protein Journey',
      icon: 'play_arrow',
      style: { flexGrow: 1 },
      onClick: () => this.app.startProteinJourney(),
    });
    journeyBtn.name = 'protein-journey-button';

    const resetBtn = new xb.UIButton({
      label: 'Reset',
      icon: 'restart_alt',
      style: { flexGrow: 1 },
      onClick: () => this.app.resetAll(),
    });
    resetBtn.name = 'reset-button';

    const buttonRow = new xb.UIPanel({
      style: {
        width: '100%',
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'space-between',
      },
      children: [overviewBtn, journeyBtn, resetBtn],
    });

    this.progressText = new xb.UIText({
      text: 'Organelles Explored: 0 / 6',
      style: { fontSize: 13, fontWeight: 'bold', color: '#f8fafc' },
    });

    const keys = [
      ['nucleus', 'Nucleus'],
      ['rough-endoplasmic-reticulum', 'Rough ER'],
      ['golgi-apparatus', 'Golgi Apparatus'],
      ['mitochondria', 'Mitochondria'],
      ['lysosome', 'Lysosome'],
      ['ribosomes', 'Ribosomes'],
    ];

    const checklistRows = [];
    for (let i = 0; i < keys.length; i += 2) {
      const rowChildren = [];
      for (let j = i; j < Math.min(i + 2, keys.length); j++) {
        const [k, label] = keys[j];
        const itemText = new xb.UIText({
          text: `○ ${label}`,
          style: { fontSize: 12, color: '#94a3b8', flexGrow: 1 },
        });
        this.checklistElements[k] = { element: itemText, label };
        rowChildren.push(itemText);
      }
      checklistRows.push(
        new xb.UIPanel({
          style: { width: '100%', flexDirection: 'row', gap: 10 },
          children: rowChildren,
        })
      );
    }

    const progressBox = new xb.UIPanel({
      style: {
        width: '100%',
        flexDirection: 'column',
        gap: 6,
        padding: 10,
        backgroundColor: 'rgba(30, 41, 59, 0.7)',
        borderRadius: 12,
      },
      children: [this.progressText, ...checklistRows],
    });

    this.statusText = new xb.UIText({
      text: 'Select organelles or start Protein Journey.',
      style: { fontSize: 11, color: '#64748b', textAlign: 'center' },
    });

    this.card = new xb.UICard({
      size: { width: 0.48, height: 'auto' },
      style: {
        flexDirection: 'column',
        gap: 10,
        padding: 14,
        backgroundColor: 'rgba(15, 23, 42, 0.94)',
        borderRadius: 18,
        borderWidth: 1.5,
        borderColor: '#38bdf8',
      },
      children: [
        headerTitle,
        headerSubtitle,
        buttonRow,
        progressBox,
        this.statusText,
      ],
    });

    this.followHead = new xb.FollowHead({
      offset: new THREE.Vector3(-0.32, -0.22, -0.62),
      smoothing: 0.15,
    });
    this.faceCamera = new xb.FaceCamera({ mode: 'capsule' });
    this.card.add(this.followHead);
    this.card.add(this.faceCamera);

    this.add(this.card);
  }

  update() {
    const leftWrist = xb.user?.hands?.getWrist(0);
    if (leftWrist && leftWrist.visible && leftWrist.parent) {
      this.followHead?.suspend?.();
      const wristPos = new THREE.Vector3();
      const wristQuat = new THREE.Quaternion();
      leftWrist.getWorldPosition(wristPos);
      leftWrist.getWorldQuaternion(wristQuat);
      this.card.position.copy(wristPos).add(new THREE.Vector3(0, 0.08, 0));
      this.card.quaternion.copy(wristQuat);
    } else {
      this.followHead?.resume?.();
    }
  }

  markExplored(organelleKey) {
    this.explored.add(organelleKey);
    const count = this.explored.size;
    if (this.progressText) {
      this.progressText.text =
        count === 6
          ? 'Organelles Explored: 6 / 6 (Complete!)'
          : `Organelles Explored: ${count} / 6`;
    }
    const item = this.checklistElements[organelleKey];
    if (item && item.element) {
      item.element.text = `✓ ${item.label}`;
      item.element.style.color = '#34d399';
    }
  }

  resetProgress() {
    this.explored.clear();
    if (this.progressText) {
      this.progressText.text = 'Organelles Explored: 0 / 6';
    }
    for (const [_, item] of Object.entries(this.checklistElements)) {
      if (item && item.element) {
        item.element.text = `○ ${item.label}`;
        item.element.style.color = '#94a3b8';
      }
    }
    if (this.statusText) {
      this.statusText.text = 'App reset. Ready for exploration.';
    }
  }

  setStatus(text) {
    if (this.statusText) {
      this.statusText.text = text;
    }
  }
}

// ============================================================================
// 5. PROTEIN JOURNEY CONTROLLER
// ============================================================================

export class ProteinJourneyManager extends xb.Script {
  constructor(app) {
    super();
    this.app = app;
    this.isRunning = false;
    this.elapsedSeconds = 0;
    this.routeGroup = new THREE.Group();
    this.processObjectsGroup = new THREE.Group();
    this.milestoneCards = [];
    this.totalDuration = 13.0;

    this.WAYPOINTS = [
      new THREE.Vector3(0, 1.4, -2.1), // 0: Nucleus start
      new THREE.Vector3(0.28, 1.45, -1.88), // 1: Nuclear pore exit
      new THREE.Vector3(0.65, 1.55, -1.65), // 2: Ribosome
      new THREE.Vector3(0.95, 1.42, -1.75), // 3: Rough ER entry
      new THREE.Vector3(1.25, 1.35, -1.85), // 4: Rough ER cisterna
      new THREE.Vector3(1.48, 1.35, -1.5), // 5: Rough ER lumen exit
      new THREE.Vector3(1.65, 1.35, -1.25), // 6: ER bud
      new THREE.Vector3(1.88, 1.35, -0.9), // 7: Golgi cis-face
      new THREE.Vector3(2.05, 1.35, -0.6), // 8: Golgi cisternae
      new THREE.Vector3(2.25, 1.35, -0.3), // 9: Golgi trans-face
      new THREE.Vector3(2.65, 1.4, 0.12), // 10: Secretory vesicle path
      new THREE.Vector3(2.95, 1.4, 0.45), // 11: Plasma membrane
      new THREE.Vector3(3.38, 1.45, 0.72), // 12: Extracellular secretion
    ];

    this.fullCurve = new THREE.CatmullRomCurve3(this.WAYPOINTS.slice(0, 12));
    this.stage1Curve = new THREE.CatmullRomCurve3(this.WAYPOINTS.slice(0, 3));
    this.stage2Curve = new THREE.CatmullRomCurve3(this.WAYPOINTS.slice(2, 7));
    this.stage3Curve = new THREE.CatmullRomCurve3(this.WAYPOINTS.slice(6, 10));
    this.stage4Curve = new THREE.CatmullRomCurve3(this.WAYPOINTS.slice(9, 13));

    this.add(this.routeGroup);
    this.add(this.processObjectsGroup);
    this.buildRouteAndLabels();
  }

  init() {}

  buildRouteAndLabels() {
    const tubeGeom = new THREE.TubeGeometry(
      this.fullCurve,
      120,
      0.016,
      8,
      false
    );
    const tubeMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.8,
      roughness: 0.3,
      transparent: true,
      opacity: 0.85,
    });
    this.routeTube = new THREE.Mesh(tubeGeom, tubeMat);
    this.routeGroup.add(this.routeTube);

    const milestones = [
      {
        pos: this.WAYPOINTS[1].clone().add(new THREE.Vector3(0, 0.26, 0)),
        text: '1. mRNA Transcription & Export',
      },
      {
        pos: this.WAYPOINTS[4].clone().add(new THREE.Vector3(0, 0.28, 0)),
        text: '2. Translation & Rough ER Processing',
      },
      {
        pos: this.WAYPOINTS[8].clone().add(new THREE.Vector3(0, 0.28, 0)),
        text: '3. Golgi Modification & Sorting',
      },
      {
        pos: this.WAYPOINTS[11].clone().add(new THREE.Vector3(0, 0.28, 0)),
        text: '4. Exocytosis: Secretion Through Membrane',
      },
    ];

    milestones.forEach((m) => {
      const card = new xb.UICard({
        size: { width: 0.38, height: 'auto' },
        style: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          borderRadius: 10,
          borderWidth: 1.5,
          borderColor: '#38bdf8',
          padding: 8,
          alignItems: 'center',
          justifyContent: 'center',
        },
        children: [
          new xb.UIText({
            text: m.text,
            style: {
              fontSize: 12,
              fontWeight: 'bold',
              color: '#ffffff',
              textAlign: 'center',
            },
          }),
        ],
      });
      card.position.copy(m.pos);
      card.add(new xb.FaceCamera({ mode: 'cylindrical' }));
      this.routeGroup.add(card);
      this.milestoneCards.push(card);
    });

    this.routeGroup.visible = false;
  }

  start() {
    this.reset();
    this.isRunning = true;
    this.elapsedSeconds = 0;
    this.routeGroup.visible = true;
    this.app.wristPanel?.setStatus(
      'Stage 1/4: mRNA transcribing & exporting...'
    );
    this.createProcessVisuals();
  }

  createProcessVisuals() {
    this.mrnaGroup = new THREE.Group();
    const backboneCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.06, 0, 0),
      new THREE.Vector3(-0.02, 0.03, 0),
      new THREE.Vector3(0.02, -0.03, 0),
      new THREE.Vector3(0.06, 0, 0),
    ]);
    const mrnaTube = new THREE.Mesh(
      new THREE.TubeGeometry(backboneCurve, 16, 0.008, 6, false),
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xd97706,
        emissiveIntensity: 0.6,
      })
    );
    this.mrnaGroup.add(mrnaTube);

    const baseColors = [0xef4444, 0xfacc15, 0x10b981, 0x3b82f6];
    baseColors.forEach((col, idx) => {
      const bead = new THREE.Mesh(
        new THREE.SphereGeometry(0.009, 8, 8),
        new THREE.MeshStandardMaterial({
          color: col,
          emissive: col,
          emissiveIntensity: 0.5,
        })
      );
      bead.position.set(
        -0.045 + idx * 0.03,
        idx % 2 === 0 ? 0.02 : -0.02,
        0
      );
      this.mrnaGroup.add(bead);
    });
    this.mrnaGroup.position.copy(this.WAYPOINTS[0]);
    this.processObjectsGroup.add(this.mrnaGroup);

    this.peptideGroup = new THREE.Group();
    const peptideColors = [
      0xf43f5e, 0x38bdf8, 0xa855f7, 0x22c55e, 0xf59e0b, 0xec4899,
    ];
    for (let i = 0; i < 7; i++) {
      const bead = new THREE.Mesh(
        new THREE.SphereGeometry(0.016, 8, 8),
        new THREE.MeshStandardMaterial({
          color: peptideColors[i % peptideColors.length],
          emissive: peptideColors[i % peptideColors.length],
          emissiveIntensity: 0.4,
          roughness: 0.3,
        })
      );
      bead.position.set((i - 3) * 0.024, Math.sin(i * 1.2) * 0.015, 0);
      this.peptideGroup.add(bead);
    }
    this.peptideGroup.visible = false;
    this.processObjectsGroup.add(this.peptideGroup);

    this.foldedProtein = new THREE.Mesh(
      new THREE.SphereGeometry(0.032, 14, 14),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.6,
        roughness: 0.2,
      })
    );
    this.foldedProtein.visible = false;
    this.processObjectsGroup.add(this.foldedProtein);

    this.vesicleGroup = new THREE.Group();
    this.vesicleShell = new THREE.Mesh(
      new THREE.SphereGeometry(0.065, 16, 16),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.6,
        roughness: 0.2,
        depthWrite: false,
      })
    );
    this.vesicleCargo = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 12, 12),
      new THREE.MeshStandardMaterial({
        color: 0x34d399,
        emissive: 0x059669,
        emissiveIntensity: 0.7,
      })
    );
    this.vesicleGroup.add(this.vesicleShell, this.vesicleCargo);
    this.vesicleGroup.visible = false;
    this.processObjectsGroup.add(this.vesicleGroup);

    this.secretedGroup = new THREE.Group();
    const burstRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.12, 0.01, 12, 32),
      new THREE.MeshBasicMaterial({
        color: 0x34d399,
        transparent: true,
        opacity: 0.9,
      })
    );
    burstRing.rotation.y = Math.PI / 2;
    this.secretedCargoBeads = [];
    for (let i = 0; i < 6; i++) {
      const b = new THREE.Mesh(
        new THREE.SphereGeometry(0.02, 8, 8),
        new THREE.MeshStandardMaterial({
          color: 0x34d399,
          emissive: 0x10b981,
          emissiveIntensity: 0.8,
        })
      );
      this.secretedGroup.add(b);
      this.secretedCargoBeads.push(b);
    }
    this.secretedGroup.add(burstRing);
    this.secretedGroup.position.copy(this.WAYPOINTS[11]);
    this.secretedGroup.visible = false;
    this.processObjectsGroup.add(this.secretedGroup);
  }

  update(time, frame) {
    if (!this.isRunning) return;

    const dt = 1 / 60;
    this.elapsedSeconds += dt;

    if (this.elapsedSeconds < 3.2) {
      const alpha = Math.min(1, this.elapsedSeconds / 3.2);
      const pos = this.stage1Curve.getPoint(alpha);
      if (this.mrnaGroup) {
        this.mrnaGroup.position.copy(pos);
        this.mrnaGroup.rotation.y += 0.04;
      }
      return;
    }

    if (this.elapsedSeconds < 6.5) {
      if (this.mrnaGroup) this.mrnaGroup.visible = false;
      if (this.peptideGroup) this.peptideGroup.visible = true;

      const alpha = Math.min(1, (this.elapsedSeconds - 3.2) / 3.3);
      const pos = this.stage2Curve.getPoint(alpha);
      if (this.peptideGroup) {
        this.peptideGroup.position.copy(pos);
        this.peptideGroup.rotation.z += 0.05;
        const s = Math.max(0.3, 1.0 - alpha * 0.6);
        this.peptideGroup.scale.set(s, s, s);
      }
      this.app.wristPanel?.setStatus(
        'Stage 2/4: Peptide translating & folding in Rough ER...'
      );
      return;
    }

    if (this.elapsedSeconds < 9.8) {
      if (this.peptideGroup) this.peptideGroup.visible = false;
      if (this.vesicleGroup) this.vesicleGroup.visible = true;

      const alpha = Math.min(1, (this.elapsedSeconds - 6.5) / 3.3);
      const pos = this.stage3Curve.getPoint(alpha);
      if (this.vesicleGroup) {
        this.vesicleGroup.position.copy(pos);
        this.vesicleGroup.rotation.y += 0.03;
        if (this.vesicleCargo) {
          this.vesicleCargo.material.emissiveIntensity = 0.5 + alpha * 0.5;
        }
      }
      this.app.wristPanel?.setStatus(
        'Stage 3/4: Vesicle sorting & glycosylation in Golgi...'
      );
      return;
    }

    if (this.elapsedSeconds < 13.0) {
      const alpha = Math.min(1, (this.elapsedSeconds - 9.8) / 3.2);
      const pos = this.stage4Curve.getPoint(alpha);
      if (this.vesicleGroup) {
        this.vesicleGroup.position.copy(pos);
        this.vesicleGroup.rotation.y += 0.03;
      }

      if (alpha > 0.5 && this.secretedGroup) {
        this.secretedGroup.visible = true;
        const burstAlpha = (alpha - 0.5) / 0.5;
        this.secretedCargoBeads.forEach((bead, i) => {
          const angle = (i / 6) * Math.PI * 2;
          const spread = burstAlpha * 0.35;
          bead.position.set(
            0.1 + burstAlpha * 0.3,
            Math.sin(angle) * spread,
            Math.cos(angle) * spread
          );
        });
      }

      this.app.wristPanel?.setStatus(
        'Stage 4/4: Secretory vesicle fusing with membrane (Exocytosis)...'
      );
      return;
    }

    this.isRunning = false;
    this.routeGroup.visible = true;
    this.milestoneCards.forEach((c) => (c.visible = true));
    if (this.vesicleGroup) this.vesicleGroup.visible = false;
    if (this.secretedGroup) this.secretedGroup.visible = true;
    this.app.wristPanel?.setStatus(
      'Protein Journey Complete! Labeled route preserved for inspection.'
    );
  }

  reset() {
    this.isRunning = false;
    this.elapsedSeconds = 0;
    this.routeGroup.visible = false;
    this.milestoneCards.forEach((c) => (c.visible = false));
    while (this.processObjectsGroup.children.length > 0) {
      const child = this.processObjectsGroup.children[0];
      this.processObjectsGroup.remove(child);
    }
    this.mrnaGroup = null;
    this.peptideGroup = null;
    this.vesicleGroup = null;
    this.secretedGroup = null;
  }
}

// ============================================================================
// 6. MAIN APPLICATION SCRIPT
// ============================================================================

export class CellExplorerApp extends xb.Script {
  constructor() {
    super();
    this.organelles = {};
    this.nameMarkers = [];
    this.activeInfoCard = null;
    this.activeOverviewCard = null;
    this.selectedOrganelle = null;
  }

  init() {
    this.setupCytoplasmAndRoom();
    this.setupTranslucentMembrane();
    this.setupOrganelles();

    this.journeyManager = new ProteinJourneyManager(this);
    this.add(this.journeyManager);

    this.wristPanel = new WristPanel(this);
    this.add(this.wristPanel);
  }

  setupCytoplasmAndRoom() {
    this.scene = this.parent || this;
    if (this.scene) {
      this.scene.background = new THREE.Color(0x081d26);
      this.scene.fog = new THREE.FogExp2(0x09222e, 0.035);
    }

    const hemiLight = new THREE.HemisphereLight(0x7dd3fc, 0x0c2735, 2.2);
    this.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(2, 4, 2);
    this.add(dirLight);

    const floorGeom = new THREE.CircleGeometry(3.6, 48);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x08202c,
      roughness: 0.8,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    this.add(floor);

    const filamentMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.18,
    });
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const r = 2.4 + Math.sin(i * 1.5) * 0.4;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(r * Math.cos(angle), 0.1, r * Math.sin(angle)),
        new THREE.Vector3(
          (r + 0.3) * Math.cos(angle + 0.3),
          1.5,
          (r + 0.3) * Math.sin(angle + 0.3)
        ),
        new THREE.Vector3(
          r * Math.cos(angle + 0.6),
          2.6,
          r * Math.sin(angle + 0.6)
        ),
      ]);
      const filTube = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 20, 0.008, 6, false),
        filamentMat
      );
      this.add(filTube);
    }
  }

  setupTranslucentMembrane() {
    const membraneGeom = new THREE.SphereGeometry(
      3.6,
      48,
      32,
      0,
      Math.PI * 2,
      0,
      Math.PI * 0.75
    );
    const membraneMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.26,
      roughness: 0.2,
      metalness: 0.1,
      side: THREE.BackSide,
      depthWrite: false,
    });
    this.cellMembrane = new THREE.Mesh(membraneGeom, membraneMat);
    this.cellMembrane.position.set(0, 0, 0);
    this.add(this.cellMembrane);

    const bilayerGeom = new THREE.SphereGeometry(
      3.56,
      48,
      32,
      0,
      Math.PI * 2,
      0,
      Math.PI * 0.75
    );
    const bilayerMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.14,
      roughness: 0.3,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const bilayerMesh = new THREE.Mesh(bilayerGeom, bilayerMat);
    this.add(bilayerMesh);

    const proteinGeom = new THREE.CylinderGeometry(0.06, 0.06, 0.12, 12);
    const proteinMat = new THREE.MeshStandardMaterial({
      color: 0x6366f1,
      roughness: 0.4,
    });
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2;
      const protein = new THREE.Mesh(proteinGeom, proteinMat);
      protein.position.set(
        3.55 * Math.cos(angle),
        1.4,
        3.55 * Math.sin(angle)
      );
      protein.lookAt(0, 1.4, 0);
      this.add(protein);
    }
  }

  setupOrganelles() {
    const nucleusData = ORGANELLES_DATA.nucleus;
    const nucleusGeom = new THREE.SphereGeometry(
      0.42,
      32,
      24,
      0,
      Math.PI * 1.55,
      0,
      Math.PI
    );
    const nucleusMat = new THREE.MeshStandardMaterial({
      color: 0x6d28d9,
      roughness: 0.35,
      metalness: 0.15,
      side: THREE.DoubleSide,
    });
    const nucleus = new OrganelleTarget(
      'nucleus',
      nucleusData,
      nucleusGeom,
      nucleusMat,
      this
    );
    this.organelles.nucleus = nucleus;
    this.add(nucleus);

    const roughErData = ORGANELLES_DATA['rough-endoplasmic-reticulum'];
    const roughErGeom = new THREE.CylinderGeometry(
      0.35,
      0.35,
      0.45,
      32,
      8,
      true,
      -Math.PI * 0.45,
      Math.PI * 0.9
    );
    const roughErMat = new THREE.MeshStandardMaterial({
      color: 0xec4899,
      roughness: 0.35,
      side: THREE.DoubleSide,
    });
    const roughEr = new OrganelleTarget(
      'rough-endoplasmic-reticulum',
      roughErData,
      roughErGeom,
      roughErMat,
      this
    );
    this.organelles['rough-endoplasmic-reticulum'] = roughEr;
    this.add(roughEr);

    const golgiData = ORGANELLES_DATA['golgi-apparatus'];
    const golgiGeom = new THREE.TorusGeometry(
      0.24,
      0.038,
      16,
      32,
      Math.PI * 0.95
    );
    const golgiMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      roughness: 0.3,
      metalness: 0.1,
    });
    const golgi = new OrganelleTarget(
      'golgi-apparatus',
      golgiData,
      golgiGeom,
      golgiMat,
      this
    );
    golgi.scale.set(1.0, 0.35, 1.2);
    this.organelles['golgi-apparatus'] = golgi;
    this.add(golgi);

    const mitoData = ORGANELLES_DATA.mitochondria;
    const mitoGeom = new THREE.CapsuleGeometry(0.18, 0.42, 16, 32);
    const mitoMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.65,
      roughness: 0.25,
      depthWrite: false,
    });
    const mitochondria = new OrganelleTarget(
      'mitochondria',
      mitoData,
      mitoGeom,
      mitoMat,
      this
    );
    this.organelles.mitochondria = mitochondria;
    this.add(mitochondria);

    const lysosomeData = ORGANELLES_DATA.lysosome;
    const lysosomeGeom = new THREE.SphereGeometry(0.24, 32, 24);
    const lysosomeMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.72,
      roughness: 0.2,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const lysosome = new OrganelleTarget(
      'lysosome',
      lysosomeData,
      lysosomeGeom,
      lysosomeMat,
      this
    );
    this.organelles.lysosome = lysosome;
    this.add(lysosome);

    const ribosomesData = ORGANELLES_DATA.ribosomes;
    const ribosomesGeom = new THREE.SphereGeometry(0.14, 24, 24);
    ribosomesGeom.scale(1.1, 0.9, 1.0);
    const ribosomesMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      roughness: 0.4,
      metalness: 0.1,
    });
    const ribosomes = new OrganelleTarget(
      'ribosomes',
      ribosomesData,
      ribosomesGeom,
      ribosomesMat,
      this
    );
    this.organelles.ribosomes = ribosomes;
    this.add(ribosomes);

    Object.values(ORGANELLES_DATA).forEach((data) => {
      const marker = this.createNameMarker(data);
      this.nameMarkers.push(marker);
      this.add(marker);
    });
  }

  createNameMarker(data) {
    const marker = new xb.UICard({
      size: { width: 0.38, height: 'auto' },
      style: {
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#38bdf8',
        padding: 8,
        alignItems: 'center',
        justifyContent: 'center',
      },
      children: [
        new xb.UIText({
          text: data.name,
          style: {
            fontSize: 14,
            fontWeight: 'bold',
            color: '#ffffff',
            textAlign: 'center',
          },
        }),
      ],
    });
    marker.position.copy(data.position).add(new THREE.Vector3(0, 0.48, 0));
    marker.add(new xb.FaceCamera({ mode: 'cylindrical' }));
    return marker;
  }

  selectOrganelle(organelle) {
    if (this.selectedOrganelle === organelle && this.activeInfoCard) {
      return;
    }

    this.closeActiveInfoCard();
    this.closeOverviewCard();

    if (this.selectedOrganelle && this.selectedOrganelle !== organelle) {
      this.selectedOrganelle.setHighlighted(false);
    }

    this.selectedOrganelle = organelle;
    organelle.setHighlighted(true);

    const infoCard = this.createInfoCard(organelle.organelleData);
    const toCenter = new THREE.Vector3(0, 1.45, 0)
      .sub(organelle.position)
      .normalize();
    const cardPos = organelle.position.clone().addScaledVector(toCenter, 0.65);
    cardPos.y = 1.45;
    infoCard.position.copy(cardPos);
    infoCard.add(new xb.FaceCamera({ mode: 'cylindrical' }));

    this.add(infoCard);
    this.activeInfoCard = infoCard;

    if (this.wristPanel) {
      this.wristPanel.markExplored(organelle.organelleKey);
    }
  }

  createInfoCard(data) {
    const title = new xb.UIText({
      text: data.name,
      style: { fontSize: 22, fontWeight: 'bold', color: '#38bdf8' },
    });
    const subtitle = new xb.UIText({
      text: data.role,
      style: { fontSize: 13, color: '#94a3b8' },
    });

    const structureHeader = new xb.UIText({
      text: 'Structure:',
      style: { fontSize: 13, fontWeight: 'bold', color: '#f8fafc' },
    });
    const structureText = new xb.UIText({
      text: data.structure,
      style: { fontSize: 12, lineHeight: 1.35, color: '#cbd5e1' },
    });

    const functionHeader = new xb.UIText({
      text: 'Function in Cell:',
      style: { fontSize: 13, fontWeight: 'bold', color: '#f8fafc' },
    });
    const functionText = new xb.UIText({
      text: data.function,
      style: { fontSize: 12, lineHeight: 1.35, color: '#cbd5e1' },
    });

    const roleHeader = new xb.UIText({
      text: 'Secretory Pathway Role:',
      style: { fontSize: 13, fontWeight: 'bold', color: '#38bdf8' },
    });
    const roleText = new xb.UIText({
      text: data.journeyRole,
      style: { fontSize: 12, lineHeight: 1.35, color: '#e2e8f0' },
    });

    const closeBtn = new xb.UIButton({
      label: 'Close',
      icon: 'close',
      style: { alignSelf: 'flex-end', height: 38 },
      onClick: () => this.closeActiveInfoCard(),
    });

    const card = new xb.UICard({
      size: { width: 0.58, height: 'auto' },
      style: {
        flexDirection: 'column',
        gap: 10,
        padding: 18,
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderRadius: 18,
        borderWidth: 2,
        borderColor: '#38bdf8',
      },
      children: [
        title,
        subtitle,
        structureHeader,
        structureText,
        functionHeader,
        functionText,
        roleHeader,
        roleText,
        closeBtn,
      ],
    });
    return card;
  }

  closeActiveInfoCard() {
    if (this.activeInfoCard) {
      this.remove(this.activeInfoCard);
      this.activeInfoCard = null;
    }
    if (this.selectedOrganelle) {
      this.selectedOrganelle.setHighlighted(false);
      this.selectedOrganelle = null;
    }
  }

  showOverview() {
    this.closeActiveInfoCard();

    if (this.activeOverviewCard) {
      this.closeOverviewCard();
      return;
    }

    const title = new xb.UIText({
      text: 'Animal Cell Overview',
      style: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#38bdf8',
        textAlign: 'center',
      },
    });
    const subtitle = new xb.UIText({
      text: 'Eukaryotic Organization & Organelle Cooperation',
      style: { fontSize: 13, color: '#94a3b8', textAlign: 'center' },
    });

    const bodyText = new xb.UIText({
      text:
        'Welcome to Room-Scale Cell Explorer! The animal cell is enclosed by a flexible plasma membrane and filled with aqueous cytoplasm (cytosol). Within this walkable volume, six specialized organelles collaborate: the Nucleus stores genetic instructions, Ribosomes translate mRNA into peptides, Rough ER folds nascent proteins, the Golgi Apparatus modifies and sorts them, Mitochondria supply ATP energy, and Lysosomes recycle cellular components. Point and select any organelle to examine its details, or launch the Protein Journey to follow secretory synthesis from nucleus to membrane!',
      style: { fontSize: 12, lineHeight: 1.4, color: '#cbd5e1' },
    });

    const closeBtn = new xb.UIButton({
      label: 'Close Overview',
      icon: 'close',
      style: { alignSelf: 'center', height: 38 },
      onClick: () => this.closeOverviewCard(),
    });

    const overviewCard = new xb.UICard({
      size: { width: 0.62, height: 'auto' },
      style: {
        flexDirection: 'column',
        gap: 12,
        padding: 20,
        backgroundColor: 'rgba(15, 23, 42, 0.96)',
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#38bdf8',
      },
      children: [title, subtitle, bodyText, closeBtn],
    });
    overviewCard.position.set(0, 1.45, -1.2);
    overviewCard.add(new xb.FaceCamera({ mode: 'cylindrical' }));

    this.add(overviewCard);
    this.activeOverviewCard = overviewCard;
  }

  closeOverviewCard() {
    if (this.activeOverviewCard) {
      this.remove(this.activeOverviewCard);
      this.activeOverviewCard = null;
    }
  }

  startProteinJourney() {
    this.journeyManager?.start();
  }

  resetAll() {
    this.closeActiveInfoCard();
    this.closeOverviewCard();

    Object.values(this.organelles).forEach((organelle) => {
      organelle.setHighlighted(false);
    });

    this.journeyManager?.reset();
    this.wristPanel?.resetProgress();
  }
}

// ============================================================================
// 7. BOOTSTRAP EXPERIENCE
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  xb.ui.theme = 'glimmer';

  const app = new CellExplorerApp();
  xb.add(app);

  const options = new xb.Options();
  options.enableHands();
  options.hands.visualization = true;
  options.simulator.defaultMode = xb.SimulatorMode.POSE;

  xb.init(options);
});
