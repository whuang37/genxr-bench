import * as THREE from "three";
import * as xb from "xrblocks";

const DEFAULT_CLEARANCE = 0.3;
const MIN_CLEARANCE = 0.3;
const MAX_CLEARANCE = 0.8;
const CLEARANCE_STEP = 0.1;
const GRID_SIZE = 0.05; // 5 cm cells: finer than the required 10 cm maximum.
const FLOOR_Y = 0;
const QUALIFYING_OFFSET = 0.008;
const EXCLUDED_OFFSET = 0.01;

const ROOM = Object.freeze({ minX: -2.25, maxX: 2.25, minZ: -3.6, maxZ: 0.35 });
const OBSTACLES = Object.freeze([
  { name: "Dining table", minX: -1.45, maxX: -0.25, minZ: -2.65, maxZ: -1.85 },
  { name: "Storage", minX: 1.52, maxX: 2.25, minZ: -3.15, maxZ: -2.05 },
  { name: "Sofa", minX: 0.35, maxX: 1.8, minZ: -0.42, maxZ: 0.35 },
]);

/**
 * UISlider normally rolls back on a canceled capture. For this planning tool,
 * loss of a controller ray keeps the last valid snapped value and its overlay.
 */
class RetainedClearanceSlider extends xb.UISlider {
  constructor(options) {
    const onInput = options.onInput;
    super({
      ...options,
      onInput: (value) => {
        // Rebase the interaction start to this snapped value. If the source is
        // lost, XR Blocks therefore has no older value to roll back to.
        this.value = value;
        this.lastAllowedValue = value;
        onInput?.(value);
      },
    });
    this.lastAllowedValue = this.value;
  }

  onObjectSelectEnd(event) {
    super.onObjectSelectEnd(event);
    if (!event.completed && this.value !== this.lastAllowedValue) {
      this.value = this.lastAllowedValue;
      this.onInput?.(this.lastAllowedValue);
    }
  }
}

class WalkingClearanceApp extends xb.Script {
  init() {
    this.name = "Walking Clearance Visualization";
    this.clearance = DEFAULT_CLEARANCE;
    this.nativeEvidenceSignature = "";
    this.lastEvidenceCheck = 0;
    this.overlayRevision = 0;
    this.disposables = [];

    this.addLighting();
    this.addPlanningRoom();
    this.addFloorOverlays();
    this.addControlPanel();
    this.rebuildOverlay("initial");

    // A small public diagnostic surface makes automated and manual checks
    // deterministic without changing interaction behavior.
    window.walkingClearance = {
      get clearance() {
        return appInstance.clearance;
      },
      setClearance: (value) => this.setClearance(value),
      reset: () => this.resetClearance(),
      getSnapshot: () => ({
        clearance: this.clearance,
        gridSize: GRID_SIZE,
        overlayOffsets: [QUALIFYING_OFFSET, EXCLUDED_OFFSET],
        qualifyingCells: this.qualifyingCellCount,
        excludedCells: this.excludedCellCount,
        obstacleInteriorCells: this.obstacleInteriorCellCount,
        revision: this.overlayRevision,
      }),
    };
  }

  addLighting() {
    this.add(new THREE.HemisphereLight(0xdceeff, 0x26343c, 2.25));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(-2, 5, 2);
    this.add(key);
  }

  addPlanningRoom() {
    const roomWidth = ROOM.maxX - ROOM.minX;
    const roomDepth = ROOM.maxZ - ROOM.minZ;
    const centerX = (ROOM.minX + ROOM.maxX) / 2;
    const centerZ = (ROOM.minZ + ROOM.maxZ) / 2;

    this.previewRoom = new THREE.Group();
    this.previewRoom.name = "Fallback reconstructed room preview";
    this.add(this.previewRoom);

    const floor = this.makeMesh(
      new THREE.PlaneGeometry(roomWidth, roomDepth),
      new THREE.MeshStandardMaterial({ color: 0x202a2e, roughness: 0.9 }),
    );
    floor.name = "Reconstructed floor preview";
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(centerX, FLOOR_Y - 0.002, centerZ);
    floor.receiveShadow = true;
    this.previewRoom.add(floor);

    // The back and side walls give the sampled boundary an unambiguous source.
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x829097,
      roughness: 0.82,
      transparent: true,
      opacity: 0.72,
    });
    this.disposables.push(wallMaterial);
    const wallHeight = 1.05;
    const wallThickness = 0.06;
    const walls = [
      {
        size: [roomWidth + wallThickness, wallHeight, wallThickness],
        position: [centerX, wallHeight / 2, ROOM.minZ],
      },
      {
        size: [wallThickness, wallHeight, roomDepth],
        position: [ROOM.minX, wallHeight / 2, centerZ],
      },
      {
        size: [wallThickness, wallHeight, roomDepth],
        position: [ROOM.maxX, wallHeight / 2, centerZ],
      },
    ];
    for (const spec of walls) {
      const wall = this.makeMesh(
        new THREE.BoxGeometry(...spec.size),
        wallMaterial,
        false,
      );
      wall.name = "Reconstructed wall";
      wall.position.set(...spec.position);
      this.previewRoom.add(wall);
    }

    const obstacleColors = [0x6b5544, 0x51616c, 0x536774];
    OBSTACLES.forEach((footprint, index) => {
      const width = footprint.maxX - footprint.minX;
      const depth = footprint.maxZ - footprint.minZ;
      const height = index === 0 ? 0.48 : index === 1 ? 0.76 : 0.42;
      const obstacle = this.makeMesh(
        new THREE.BoxGeometry(width, height, depth),
        new THREE.MeshStandardMaterial({
          color: obstacleColors[index],
          roughness: 0.7,
          transparent: true,
          opacity: 0.92,
        }),
      );
      obstacle.name = `${footprint.name} obstacle`;
      obstacle.position.set(
        (footprint.minX + footprint.maxX) / 2,
        height / 2,
        (footprint.minZ + footprint.maxZ) / 2,
      );
      this.previewRoom.add(obstacle);

      // A thin footprint line remains visible where the excluded overlay meets it.
      const outline = this.makeFootprintOutline(footprint, 0xeeb65a);
      outline.name = `${footprint.name} footprint boundary`;
      this.previewRoom.add(outline);
    });
  }

  addFloorOverlays() {
    this.qualifyingMaterial = new THREE.MeshBasicMaterial({
      color: 0x38d879,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.excludedMaterial = new THREE.MeshBasicMaterial({
      color: 0xffad42,
      transparent: true,
      opacity: 0.58,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.disposables.push(this.qualifyingMaterial, this.excludedMaterial);

    this.qualifyingOverlay = new THREE.Mesh(
      new THREE.BufferGeometry(),
      this.qualifyingMaterial,
    );
    this.qualifyingOverlay.name = "Qualifying walking floor overlay";
    this.qualifyingOverlay.userData.clearanceResult = "qualifying";
    this.qualifyingOverlay.renderOrder = 4;

    this.excludedOverlay = new THREE.Mesh(
      new THREE.BufferGeometry(),
      this.excludedMaterial,
    );
    this.excludedOverlay.name = "Excluded clearance boundary overlay";
    this.excludedOverlay.userData.clearanceResult = "excluded";
    this.excludedOverlay.renderOrder = 5;

    this.add(this.qualifyingOverlay, this.excludedOverlay);
  }

  addControlPanel() {
    this.valueLabel = new xb.UIText({
      text: `${DEFAULT_CLEARANCE.toFixed(1)} m`,
      style: {
        fontSize: 34,
        fontWeight: "bold",
        color: "#69eca0",
        textAlign: "right",
      },
    });

    this.statusText = new xb.UIText({
      text: "Green: enough geometric clearance",
      style: { fontSize: 15, color: "#a8e8c2", lineHeight: 1.25 },
    });

    this.slider = new RetainedClearanceSlider({
      ariaLabel: "Walking clearance distance in meters",
      min: MIN_CLEARANCE,
      max: MAX_CLEARANCE,
      step: CLEARANCE_STEP,
      value: DEFAULT_CLEARANCE,
      style: { width: "100%", height: 44 },
      onInput: (value) => this.setClearance(value, { fromSlider: true }),
    });
    this.slider.userData.xrblocksDevtools = {
      tag: "clearance-distance-slider",
    };

    const lowStop = new xb.UIText({
      text: "0.3 m",
      style: { fontSize: 15, color: "#aebbc2" },
    });
    const highStop = new xb.UIText({
      text: "0.8 m",
      style: { fontSize: 15, color: "#f6c26b", textAlign: "right" },
    });
    highStop.userData.xrblocksDevtools = { tag: "clearance-high-stop" };

    this.resetButton = new xb.UIButton({
      label: "Reset to 0.3 m",
      icon: "restart_alt",
      ariaLabel: "Reset clearance to 0.3 meters",
      style: {
        width: "100%",
        height: 42,
        backgroundColor: "#253a43",
        borderColor: "#64808c",
        borderWidth: 1,
      },
      onClick: () => this.resetClearance(),
    });
    this.resetButton.userData.xrblocksDevtools = { tag: "reset-clearance" };

    const titleRow = new xb.UIPanel({
      style: {
        width: "100%",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
      },
      children: [
        new xb.UIPanel({
          style: { flexDirection: "column", gap: 2, flexGrow: 1 },
          children: [
            new xb.UIText({
              text: "WALKING CLEARANCE",
              style: { fontSize: 22, fontWeight: "bold", color: "#f4f8fa" },
            }),
            new xb.UIText({
              text: "Nearby floor planning view",
              style: { fontSize: 14, color: "#9fb1ba" },
            }),
          ],
        }),
        this.valueLabel,
      ],
    });

    const stopRow = new xb.UIPanel({
      style: {
        width: "100%",
        flexDirection: "row",
        justifyContent: "space-between",
      },
      children: [lowStop, highStop],
    });

    const legend = new xb.UIPanel({
      style: {
        width: "100%",
        flexDirection: "column",
        gap: 4,
        padding: 10,
        backgroundColor: "rgba(9, 20, 25, 0.55)",
        borderRadius: 10,
      },
      children: [
        this.statusText,
        new xb.UIText({
          text: "Amber: wall / obstacle clearance excluded",
          style: { fontSize: 15, color: "#ffc468", lineHeight: 1.25 },
        }),
      ],
    });

    this.card = new xb.UICard({
      size: { width: 0.58, height: "auto" },
      manipulation: true,
      edge: true,
      style: {
        flexDirection: "column",
        gap: 11,
        padding: 18,
        backgroundColor: "rgba(15, 29, 35, 0.96)",
        borderColor: "#4f6b76",
        borderWidth: 1,
        borderRadius: 18,
      },
      children: [
        titleRow,
        this.slider,
        stopRow,
        legend,
        this.resetButton,
        new xb.UIText({
          text: "Geometric planning aid only — not a safety, accessibility, or compliance certification.",
          style: {
            width: "100%",
            fontSize: 13,
            lineHeight: 1.3,
            color: "#91a4ad",
            textAlign: "center",
          },
        }),
      ],
    });
    this.card.name = "Walking clearance control panel";
    this.card.position.set(0, 1.48, -1.12);
    this.add(this.card);
  }

  setClearance(value, { fromSlider = false } = {}) {
    const snapped = this.snapClearance(value);
    if (!fromSlider && this.slider.value !== snapped)
      this.slider.value = snapped;
    if (this.slider.lastAllowedValue !== snapped)
      this.slider.lastAllowedValue = snapped;

    const changed = snapped !== this.clearance;
    this.clearance = snapped;
    this.valueLabel.text = `${snapped.toFixed(1)} m`;
    if (changed || this.overlayRevision === 0) this.rebuildOverlay("clearance");
    return snapped;
  }

  resetClearance() {
    this.setClearance(DEFAULT_CLEARANCE);
  }

  snapClearance(value) {
    const finite = Number.isFinite(Number(value))
      ? Number(value)
      : this.clearance;
    const step = Math.round((finite - MIN_CLEARANCE) / CLEARANCE_STEP);
    return Number(
      THREE.MathUtils.clamp(
        MIN_CLEARANCE + step * CLEARANCE_STEP,
        MIN_CLEARANCE,
        MAX_CLEARANCE,
      ).toFixed(1),
    );
  }

  rebuildOverlay(reason) {
    const qualifying = [];
    const excluded = [];
    let obstacleInteriorCellCount = 0;
    const model = this.collectSurfaceModel();
    this.previewRoom.visible = !model.usesNativeFloor;

    const half = GRID_SIZE / 2;
    const cellRadius = Math.SQRT2 * half;
    const columns = Math.floor(
      (model.bounds.maxX - model.bounds.minX) / GRID_SIZE,
    );
    const rows = Math.floor(
      (model.bounds.maxZ - model.bounds.minZ) / GRID_SIZE,
    );

    for (let row = 0; row < rows; row++) {
      const z = model.bounds.minZ + half + row * GRID_SIZE;
      for (let column = 0; column < columns; column++) {
        const x = model.bounds.minX + half + column * GRID_SIZE;
        const cellCorners = [
          [x - half, z - half],
          [x + half, z - half],
          [x + half, z + half],
          [x - half, z + half],
        ];
        if (
          !cellCorners.every(([cornerX, cornerZ]) =>
            this.pointInPolygon(cornerX, cornerZ, model.floorPolygon),
          )
        ) {
          continue;
        }

        const obstacleDistance = this.distanceToPolygons(
          x,
          z,
          model.obstaclePolygons,
        );
        const inObstacle = obstacleDistance === 0;
        if (inObstacle) obstacleInteriorCellCount++;

        // Subtracting the half-cell diagonal makes the test conservative for
        // the whole cell, rather than only for its center sample.
        const floorEdgeDistance = this.distanceToPolygonEdges(
          x,
          z,
          model.floorPolygon,
        );
        const wallDistance = Math.min(
          floorEdgeDistance,
          this.distanceToPolygons(x, z, model.wallPolygons),
          ...model.wallSegments.map(([a, b]) =>
            this.distanceToSegment(x, z, a, b),
          ),
        );
        const hasClearance =
          !inObstacle &&
          wallDistance - cellRadius + 1e-6 >= this.clearance &&
          obstacleDistance - cellRadius + 1e-6 >= this.clearance;

        const overlayY =
          model.floorY + (hasClearance ? QUALIFYING_OFFSET : EXCLUDED_OFFSET);
        this.pushCell(hasClearance ? qualifying : excluded, x, z, overlayY);
      }
    }

    this.replaceGeometry(this.qualifyingOverlay, qualifying);
    this.replaceGeometry(this.excludedOverlay, excluded);
    this.qualifyingCellCount = qualifying.length / 18;
    this.excludedCellCount = excluded.length / 18;
    this.obstacleInteriorCellCount = obstacleInteriorCellCount;
    this.overlayRevision++;
    const sourceLabel = model.usesNativeFloor
      ? "reconstructed floor"
      : "planning preview";
    this.statusText.text = `Green: ${this.qualifyingCellCount.toLocaleString()} cells at ${this.clearance.toFixed(1)} m · ${sourceLabel}`;

    this.qualifyingOverlay.userData.clearance = this.clearance;
    this.qualifyingOverlay.userData.gridSize = GRID_SIZE;
    this.qualifyingOverlay.userData.floorY = model.floorY;
    this.qualifyingOverlay.userData.reason = reason;
    this.excludedOverlay.userData.clearance = this.clearance;
    this.excludedOverlay.userData.gridSize = GRID_SIZE;
    this.excludedOverlay.userData.floorY = model.floorY;
    this.excludedOverlay.userData.obstacleInteriorCells =
      obstacleInteriorCellCount;
  }

  collectSurfaceModel() {
    const fallbackFloor = this.rectanglePolygon(ROOM);
    const planeFloorCandidates = [];
    const meshFloorCandidates = [];
    const obstaclePolygons = [];
    const wallPolygons = [];
    const wallSegments = [];
    const horizontalCandidates = [];
    const planes = xb.world.planes?.get() ?? [];

    for (const plane of planes) {
      const polygon3 = this.planeWorldPolygon(plane);
      if (polygon3.length < 2) continue;
      const polygon = polygon3.map((point) => ({ x: point.x, z: point.z }));
      const label = (plane.label ?? "").toLowerCase();
      const orientation = (plane.orientation ?? "").toLowerCase();
      const averageY =
        polygon3.reduce((sum, point) => sum + point.y, 0) / polygon3.length;

      const candidate = {
        polygon,
        floorY: averageY,
        area: this.polygonArea(polygon),
      };
      if (label === "floor") {
        planeFloorCandidates.push(candidate);
      } else if (label === "wall" || orientation === "vertical") {
        const segment = this.farthestPair(polygon);
        if (segment) wallSegments.push(segment);
      } else if (
        label !== "ceiling" &&
        orientation === "horizontal" &&
        polygon.length >= 3
      ) {
        horizontalCandidates.push(candidate);
      }
    }

    // If semantic labels are unavailable, infer only a broad horizontal plane
    // below the viewer as floor. Remaining horizontal planes are obstacles.
    if (planeFloorCandidates.length === 0) {
      const inferredFloor = horizontalCandidates
        .filter(
          (candidate) =>
            candidate.floorY < xb.camera.position.y - 0.35 &&
            candidate.area > 1,
        )
        .sort((a, b) => b.area - a.area)[0];
      if (inferredFloor) planeFloorCandidates.push(inferredFloor);
      obstaclePolygons.push(
        ...horizontalCandidates
          .filter((candidate) => candidate !== inferredFloor)
          .map((candidate) => candidate.polygon),
      );
    } else {
      obstaclePolygons.push(
        ...horizontalCandidates.map((candidate) => candidate.polygon),
      );
    }

    // Semantic reconstructed meshes supplement planes. Conservative XZ bounds
    // are used because an obstacle footprint must never include its interior.
    for (const mesh of xb.world.meshes?.xrMeshToThreeMesh?.values() ?? []) {
      const label = (mesh.semanticLabel ?? "").toLowerCase();
      if (!label) continue;
      const box = new THREE.Box3().setFromObject(mesh);
      if (box.isEmpty()) continue;
      const polygon = this.rectanglePolygon({
        minX: box.min.x,
        maxX: box.max.x,
        minZ: box.min.z,
        maxZ: box.max.z,
      });
      if (label === "floor") {
        meshFloorCandidates.push({
          polygon,
          floorY: box.max.y,
          area: this.polygonArea(polygon),
        });
      } else if (label === "wall") {
        wallPolygons.push(polygon);
      } else if (label !== "ceiling") {
        obstaclePolygons.push(polygon);
      }
    }

    const chooseLargestFloor = (candidates) =>
      candidates
        .filter((candidate) => candidate.area > 0.25)
        .sort((a, b) => b.area - a.area)[0];
    // Exact plane polygons take precedence over conservative mesh bounds.
    const nativeFloor =
      chooseLargestFloor(planeFloorCandidates) ??
      chooseLargestFloor(meshFloorCandidates);
    const floorPolygon = nativeFloor?.polygon ?? fallbackFloor;
    const bounds = this.polygonBounds(floorPolygon);

    if (!nativeFloor) {
      obstaclePolygons.push(
        ...OBSTACLES.map((obstacle) => this.rectanglePolygon(obstacle)),
      );
    }

    // Bound very large reconstructions to nearby floor so updates remain
    // immediate while the user adjusts the controller-ray slider.
    const cameraX = xb.camera.position.x;
    const cameraZ = xb.camera.position.z;
    const nearbyBounds = {
      minX: Math.max(bounds.minX, cameraX - 3),
      maxX: Math.min(bounds.maxX, cameraX + 3),
      minZ: Math.max(bounds.minZ, cameraZ - 3),
      maxZ: Math.min(bounds.maxZ, cameraZ + 3),
    };

    return {
      floorPolygon,
      floorY: nativeFloor?.floorY ?? FLOOR_Y,
      bounds: nearbyBounds,
      obstaclePolygons,
      wallPolygons,
      wallSegments,
      usesNativeFloor: Boolean(nativeFloor),
    };
  }

  planeWorldPolygon(plane) {
    plane.updateMatrixWorld(true);
    const source = plane.xrPlane?.polygon ?? plane.simulatorPlane?.polygon;
    if (!source) return [];
    return Array.from(source, (point) =>
      new THREE.Vector3(point.x, 0, point.z ?? point.y).applyMatrix4(
        plane.matrixWorld,
      ),
    );
  }

  rectanglePolygon(bounds) {
    return [
      { x: bounds.minX, z: bounds.minZ },
      { x: bounds.maxX, z: bounds.minZ },
      { x: bounds.maxX, z: bounds.maxZ },
      { x: bounds.minX, z: bounds.maxZ },
    ];
  }

  polygonBounds(polygon) {
    return polygon.reduce(
      (bounds, point) => ({
        minX: Math.min(bounds.minX, point.x),
        maxX: Math.max(bounds.maxX, point.x),
        minZ: Math.min(bounds.minZ, point.z),
        maxZ: Math.max(bounds.maxZ, point.z),
      }),
      { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity },
    );
  }

  polygonArea(polygon) {
    let twiceArea = 0;
    for (let index = 0; index < polygon.length; index++) {
      const a = polygon[index];
      const b = polygon[(index + 1) % polygon.length];
      twiceArea += a.x * b.z - b.x * a.z;
    }
    return Math.abs(twiceArea) / 2;
  }

  pointInPolygon(x, z, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const a = polygon[i];
      const b = polygon[j];
      if (
        a.z > z !== b.z > z &&
        x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x
      ) {
        inside = !inside;
      }
    }
    return inside;
  }

  distanceToPolygons(x, z, polygons) {
    let nearest = Infinity;
    for (const polygon of polygons) {
      if (this.pointInPolygon(x, z, polygon)) return 0;
      nearest = Math.min(nearest, this.distanceToPolygonEdges(x, z, polygon));
    }
    return nearest;
  }

  distanceToPolygonEdges(x, z, polygon) {
    let nearest = Infinity;
    for (let index = 0; index < polygon.length; index++) {
      nearest = Math.min(
        nearest,
        this.distanceToSegment(
          x,
          z,
          polygon[index],
          polygon[(index + 1) % polygon.length],
        ),
      );
    }
    return nearest;
  }

  distanceToSegment(x, z, a, b) {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const lengthSquared = dx * dx + dz * dz;
    if (lengthSquared === 0) return Math.hypot(x - a.x, z - a.z);
    const t = THREE.MathUtils.clamp(
      ((x - a.x) * dx + (z - a.z) * dz) / lengthSquared,
      0,
      1,
    );
    return Math.hypot(x - (a.x + t * dx), z - (a.z + t * dz));
  }

  farthestPair(points) {
    if (points.length < 2) return null;
    let pair = null;
    let maxDistance = 0;
    for (let a = 0; a < points.length; a++) {
      for (let b = a + 1; b < points.length; b++) {
        const distance = Math.hypot(
          points[a].x - points[b].x,
          points[a].z - points[b].z,
        );
        if (distance > maxDistance) {
          maxDistance = distance;
          pair = [points[a], points[b]];
        }
      }
    }
    return maxDistance > 0.05 ? pair : null;
  }

  pushCell(vertices, x, z, y) {
    const half = GRID_SIZE * 0.47; // Hairline gaps make the sampling grid legible.
    const x0 = x - half;
    const x1 = x + half;
    const z0 = z - half;
    const z1 = z + half;
    vertices.push(
      x0,
      y,
      z0,
      x1,
      y,
      z0,
      x1,
      y,
      z1,
      x0,
      y,
      z0,
      x1,
      y,
      z1,
      x0,
      y,
      z1,
    );
  }

  replaceGeometry(mesh, vertices) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    mesh.geometry.dispose();
    mesh.geometry = geometry;
  }

  makeFootprintOutline(footprint, color) {
    const y = FLOOR_Y + 0.016;
    const points = [
      new THREE.Vector3(footprint.minX, y, footprint.minZ),
      new THREE.Vector3(footprint.maxX, y, footprint.minZ),
      new THREE.Vector3(footprint.maxX, y, footprint.maxZ),
      new THREE.Vector3(footprint.minX, y, footprint.maxZ),
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.95,
    });
    this.disposables.push(geometry, material);
    return new THREE.LineLoop(geometry, material);
  }

  makeMesh(geometry, material, ownMaterial = true) {
    this.disposables.push(geometry);
    if (ownMaterial) this.disposables.push(material);
    return new THREE.Mesh(geometry, material);
  }

  update(time) {
    // The SDK updates reconstructed collections independently. A cheap signature
    // check twice per second rebuilds the result whenever nearby evidence changes.
    if (time - this.lastEvidenceCheck < 500) return;
    this.lastEvidenceCheck = time;
    const planes = xb.world.planes?.get() ?? [];
    const meshes = xb.world.meshes?.xrMeshToThreeMesh ?? new Map();
    const geometrySignature = (object) => {
      const attribute = object.geometry.attributes.position;
      if (!attribute) return "0";
      const array = attribute.array;
      let checksum = 0;
      const stride = Math.max(1, Math.floor(array.length / 64));
      for (let index = 0; index < array.length; index += stride) {
        checksum += array[index] * ((index % 7) + 1);
      }
      checksum += (array[array.length - 1] ?? 0) * 11;
      return `${attribute.count}:${checksum.toFixed(4)}`;
    };
    const signature = [
      ...planes.map((plane) =>
        [
          plane.id,
          plane.label,
          plane.xrPlane?.lastChangedTime ?? 0,
          geometrySignature(plane),
          ...plane.position.toArray(),
          ...plane.quaternion.toArray(),
        ].join(":"),
      ),
      ...Array.from(meshes.entries()).map(([source, mesh]) =>
        [
          source.lastChangedTime ?? 0,
          mesh.semanticLabel,
          geometrySignature(mesh),
          ...mesh.position.toArray(),
          ...mesh.quaternion.toArray(),
        ].join(":"),
      ),
    ].join("|");

    if (signature !== this.nativeEvidenceSignature) {
      const hadPreviousEvidence = this.nativeEvidenceSignature.length > 0;
      this.nativeEvidenceSignature = signature;
      if (signature || hadPreviousEvidence)
        this.rebuildOverlay("surface-change");
    }
  }

  dispose() {
    this.qualifyingOverlay?.geometry.dispose();
    this.excludedOverlay?.geometry.dispose();
    for (const resource of new Set(this.disposables)) resource.dispose?.();
    if (window.walkingClearance) delete window.walkingClearance;
  }
}

let appInstance;

document.addEventListener("DOMContentLoaded", async () => {
  appInstance = new WalkingClearanceApp();
  xb.add(appInstance);

  const options = new xb.Options();
  options.setAppTitle("Walking Clearance Visualization");
  options.setAppDescription(
    "Explore geometric walking clearance around room walls and obstacles.",
  );
  options.enablePlaneDetection();
  options.world.enableMeshDetection();
  options.enableReticles();
  options.controllers.visualization = true;
  options.controllers.visualizeRays = true;
  await xb.init(options);
});
