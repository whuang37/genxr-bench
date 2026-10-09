import * as THREE from "three";
import * as xb from "xrblocks";

// ---------------------------------------------------------------------------
// Walking Clearance Visualization
//
// A room-planning aid that highlights floor areas with enough open space for
// walking. Clearance is measured as the horizontal distance from reconstructed
// wall and obstacle footprints. Qualifying cells are green; excluded cells
// (too close to a footprint, or inside an obstacle interior) are rendered with
// a contrasting red boundary. The green/excluded overlays sit at most 0.02 m
// above the reconstructed floor.
// ---------------------------------------------------------------------------

const DEFAULT_CLEARANCE = 0.3;
const MIN_CLEARANCE = 0.3;
const MAX_CLEARANCE = 0.8;
const CLEARANCE_STEP = 0.1;

// Grid cells must be no larger than 0.1 m.
const CELL_SIZE = 0.1;

// Overlay heights above the reconstructed floor (<= 0.02 m).
const EXCLUDED_HEIGHT = 0.010;
const GREEN_HEIGHT = 0.016;
const BOUNDARY_HEIGHT = 0.018;

const OBSTACLE_MIN_HEIGHT = 0.12; // above the floor before something is an obstacle
const SURFACE_BAND_TOP = 2.4; // ignore geometry above this (ceiling / skybox)
const SURFACE_BAND_BOTTOM = 0.4; // ignore geometry below this (background)
const MAX_BACKGROUND_DIAGONAL = 3.5; // horizontal size that implies background

// ---------------------------------------------------------------------------
// Small 2D geometry helpers (world floor plane is XZ).
// ---------------------------------------------------------------------------

function quantize(value) {
  const stepped =
    MIN_CLEARANCE +
    Math.round((value - MIN_CLEARANCE) / CLEARANCE_STEP) * CLEARANCE_STEP;
  return Number(
    Math.min(MAX_CLEARANCE, Math.max(MIN_CLEARANCE, stepped)).toPrecision(12)
  );
}

function pointInPolygon(x, z, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const zi = polygon[i][1];
    const xj = polygon[j][0];
    const zj = polygon[j][1];
    const intersects =
      zi > z !== zj > z &&
      x < ((xj - xi) * (z - zi)) / (zj - zi + Number.EPSILON) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInTriangle2D(px, pz, ax, az, bx, bz, cx, cz) {
  const d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
  if (Math.abs(d) < 1e-12) return false;
  const l1 = ((bz - cz) * (px - cx) + (cx - bx) * (pz - cz)) / d;
  const l2 = ((cz - az) * (px - cx) + (ax - cx) * (pz - cz)) / d;
  const l3 = 1 - l1 - l2;
  const eps = 1e-6;
  return l1 >= -eps && l2 >= -eps && l3 >= -eps;
}

function distanceToSegment2D(px, pz, ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  const lengthSq = dx * dx + dz * dz;
  let t = 0;
  if (lengthSq > 1e-12) {
    t = ((px - ax) * dx + (pz - az) * dz) / lengthSq;
    t = Math.max(0, Math.min(1, t));
  }
  const cx = ax + t * dx;
  const cz = az + t * dz;
  const ex = px - cx;
  const ez = pz - cz;
  return Math.sqrt(ex * ex + ez * ez);
}

// 2D convex hull (monotone chain). Returns CCW polygon points [x, z].
function convexHull2D(points) {
  if (points.length <= 3) return points.slice();
  const pts = points
    .map((p) => [p[0], p[1]])
    .sort((a, b) => (a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]));
  const cross = (o, a, b) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const p of pts) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    ) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    ) {
      upper.pop();
    }
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

function polygonEdges(polygon, out) {
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    out.push([a[0], a[1], b[0], b[1]]);
  }
}

function triangulateConvexPolygon(polygon, out) {
  for (let i = 1; i < polygon.length - 1; i++) {
    out.push([
      polygon[0][0],
      polygon[0][1],
      polygon[i][0],
      polygon[i][1],
      polygon[i + 1][0],
      polygon[i + 1][1],
    ]);
  }
}

function worldPolygonFromObject(object) {
  object.updateWorldMatrix(true, false);
  const geometry = object.geometry;
  if (!geometry || !geometry.attributes || !geometry.attributes.position) {
    return [];
  }
  const position = geometry.attributes.position;
  const vertex = new THREE.Vector3();
  const points = [];
  for (let i = 0; i < position.count; i++) {
    vertex.fromBufferAttribute(position, i).applyMatrix4(object.matrixWorld);
    points.push([vertex.x, vertex.z]);
  }
  return convexHull2D(points);
}

function worldAverageY(object) {
  const range = worldYRangeFromObject(object);
  return range === null ? null : (range.min + range.max) / 2;
}

function worldYRangeFromObject(object) {
  object.updateWorldMatrix(true, false);
  const geometry = object.geometry;
  if (!geometry || !geometry.attributes || !geometry.attributes.position) {
    return null;
  }
  const position = geometry.attributes.position;
  const vertex = new THREE.Vector3();
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < position.count; i++) {
    vertex.fromBufferAttribute(position, i).applyMatrix4(object.matrixWorld);
    if (vertex.y < min) min = vertex.y;
    if (vertex.y > max) max = vertex.y;
  }
  return {min, max};
}

function polygonArea2D(polygon) {
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const [x1, z1] = polygon[i];
    const [x2, z2] = polygon[(i + 1) % polygon.length];
    area += x1 * z2 - x2 * z1;
  }
  return Math.abs(area) / 2;
}

// ---------------------------------------------------------------------------
// The experience.
// ---------------------------------------------------------------------------

class WalkingClearanceApp extends xb.Script {
  init() {
    this.clearance = DEFAULT_CLEARANCE;
    this.cells = [];
    this.floorY = null;
    this.floorPolygons = [];
    this.barrierSegments = [];
    this.obstaclePolygons = [];
    this.bounds = null;

    this.surfaceSignature = "";
    this.lastBuildTime = -Infinity;
    this.lastSignatureCheck = -Infinity;
    this.buildGeneration = 0;

    this.greenMesh = null;
    this.excludedMesh = null;
    this.boundaryLines = null;

    this.add(new THREE.HemisphereLight(0xffffff, 0x555566, 2.4));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(1.5, 3, 1.5);
    this.add(keyLight);

    this.buildPanel();
    this.updateOverlays();
  }

  // -------------------------------------------------------------------------
  // Spatial UI panel
  // -------------------------------------------------------------------------

  buildPanel() {
    this.valueText = new xb.UIText({
      text: this.formatClearance(),
      style: {
        fontSize: 34,
        fontWeight: "bold",
        textAlign: "center",
        color: "#7CFFB2",
      },
    });

    this.statusText = new xb.UIText({
      text: "Looking for nearby floor surfaces…",
      style: {
        fontSize: 14,
        lineHeight: 1.3,
        textAlign: "center",
        color: "#c8c8c8",
      },
    });

    this.slider = new xb.UISlider({
      ariaLabel: "Walking clearance",
      min: MIN_CLEARANCE,
      max: MAX_CLEARANCE,
      step: CLEARANCE_STEP,
      value: DEFAULT_CLEARANCE,
      style: { width: "100%", height: 42 },
      onInput: (value) => this.setClearance(value),
    });
    // The slider is the semantic owner of the clearance control.
    this.slider.userData.xrblocksDevtools = {
      tag: "clearance-distance-slider",
    };

    // Visible high stop at the 0.8 m end of the slider.
    this.highStop = new xb.UIPanel({
      style: {
        width: 62,
        height: 26,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#ffb300",
        borderRadius: 7,
      },
      children: [
        new xb.UIText({
          text: "0.8 m",
          style: { fontSize: 14, fontWeight: "bold", color: "#20160a" },
        }),
      ],
    });
    this.highStop.userData.xrblocksDevtools = { tag: "clearance-high-stop" };

    this.resetButton = new xb.UIButton({
      label: "Reset",
      icon: "restart_alt",
      style: { width: "100%" },
      onClick: () => this.resetClearance(),
    });
    this.resetButton.userData.xrblocksDevtools = { tag: "reset-clearance" };

    const card = new xb.UICard({
      size: { width: 0.66, height: "auto" },
      edge: true,
      manipulation: true,
      style: {
        flexDirection: "column",
        gap: 12,
        padding: 20,
        backgroundColor: "#14181d",
        borderRadius: 22,
      },
      children: [
        new xb.UIText({
          text: "Walking Clearance",
          style: { fontSize: 28, fontWeight: "bold", textAlign: "center" },
        }),
        new xb.UIText({
          text: "Open floor for walking at the chosen distance from walls and obstacles.",
          style: {
            fontSize: 14,
            lineHeight: 1.3,
            textAlign: "center",
            opacity: 0.8,
          },
        }),
        this.valueText,
        this.slider,
        new xb.UIPanel({
          style: {
            width: "100%",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          },
          children: [
            new xb.UIText({
              text: "0.3 m",
              style: { fontSize: 13, opacity: 0.7 },
            }),
            this.highStop,
          ],
        }),
        new xb.UIPanel({
          style: {
            width: "100%",
            flexDirection: "row",
            gap: 12,
            alignItems: "center",
          },
          children: [
            new xb.UIPanel({
              style: {
                flexGrow: 1,
                flexDirection: "row",
                gap: 8,
                alignItems: "center",
              },
              children: [
                new xb.UIPanel({
                  style: {
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    backgroundColor: "#2fd06f",
                  },
                }),
                new xb.UIText({
                  text: "Walkable",
                  style: { fontSize: 14 },
                }),
              ],
            }),
            new xb.UIPanel({
              style: {
                flexGrow: 1,
                flexDirection: "row",
                gap: 8,
                alignItems: "center",
              },
              children: [
                new xb.UIPanel({
                  style: {
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    backgroundColor: "#ff5a52",
                  },
                }),
                new xb.UIText({
                  text: "Excluded",
                  style: { fontSize: 14 },
                }),
              ],
            }),
          ],
        }),
        this.resetButton,
        this.statusText,
        new xb.UIText({
          text: "Planning aid only — geometric clearance, not a safety, accessibility, or compliance certification.",
          style: {
            fontSize: 11,
            lineHeight: 1.25,
            textAlign: "center",
            opacity: 0.55,
          },
        }),
      ],
    });

    card.position.set(0, 1.42, -1.15);
    this.add(card);
  }

  formatClearance() {
    return `${this.clearance.toFixed(1)} m`;
  }

  setClearance(value) {
    const next = quantize(value);
    // Keep the slider's captured interaction in sync with the value we accept.
    // This preserves the current allowed value if a ray selection ends
    // unexpectedly instead of snapping back to where the drag started.
    if (this.slider) this.slider.value = next;
    if (next === this.clearance) return;
    this.clearance = next;
    if (this.valueText) this.valueText.text = this.formatClearance();
    this.updateOverlays();
    this.updateStatus();
  }

  resetClearance() {
    if (this.slider) this.slider.value = DEFAULT_CLEARANCE;
    this.clearance = DEFAULT_CLEARANCE;
    if (this.valueText) this.valueText.text = this.formatClearance();
    this.updateOverlays();
    this.updateStatus();
  }

  updateStatus() {
    if (!this.statusText) return;
    if (!this.bounds || this.floorY === null) {
      this.statusText.text = "Looking for nearby floor surfaces…";
      return;
    }
    const total = this.cells.filter((cell) => cell.onFloor).length;
    const walkable = this.cells.filter(
      (cell) =>
        cell.onFloor &&
        !cell.inObstacle &&
        cell.distance + 1e-6 >= this.clearance
    ).length;
    const ratio = total > 0 ? Math.round((walkable / total) * 100) : 0;
    this.statusText.text = `Clearance ${this.formatClearance()} · ${ratio}% of sampled floor walkable`;
  }

  // -------------------------------------------------------------------------
  // Surface reconstruction
  // -------------------------------------------------------------------------

  worldMeshes() {
    const detector = xb.world && xb.world.meshes;
    if (!detector || !detector.xrMeshToThreeMesh) return [];
    return Array.from(detector.xrMeshToThreeMesh.values());
  }

  worldPlanes() {
    if (!xb.world || !xb.world.planes || typeof xb.world.planes.get !== "function") {
      return [];
    }
    try {
      return xb.world.planes.get() || [];
    } catch (error) {
      return [];
    }
  }

  computeSurfaceSignature() {
    let signature = 0;
    const meshes = this.worldMeshes();
    signature += meshes.length * 100003;
    for (const mesh of meshes) {
      const geometry = mesh.geometry;
      if (!geometry || !geometry.attributes || !geometry.attributes.position) {
        continue;
      }
      signature += geometry.attributes.position.count;
      signature += (geometry.attributes.position.version || 0) * 7919;
    }
    const planes = this.worldPlanes();
    signature += planes.length * 104729;
    for (const plane of planes) {
      const geometry = plane.geometry;
      if (!geometry || !geometry.attributes || !geometry.attributes.position) {
        continue;
      }
      signature += geometry.attributes.position.count;
      signature += (geometry.attributes.position.version || 0) * 15485863;
    }
    return String(signature);
  }

  ensureSurfaces(time) {
    if (!isFinite(this.lastSignatureCheck) || time - this.lastSignatureCheck > 250) {
      this.lastSignatureCheck = time;
      const signature = this.computeSurfaceSignature();
      if (signature !== this.surfaceSignature) {
        if (time - this.lastBuildTime > 250) {
          this.surfaceSignature = signature;
          this.lastBuildTime = time;
          this.rebuildSurfaces();
        }
      }
    }
  }

  rebuildSurfaces() {
    const generation = ++this.buildGeneration;
    const result = this.extractSurfaces();
    if (generation !== this.buildGeneration) return;

    this.floorY = result.floorY;
    this.floorPolygons = result.floorPolygons;
    this.barrierSegments = result.barrierSegments;
    this.obstaclePolygons = result.obstaclePolygons;
    this.bounds = result.bounds;
    this.cells = this.buildCells();

    this.updateOverlays();
    this.updateStatus();
  }

  extractSurfaces() {
    const floorPolygons = [];
    const barrierSegments = [];
    const obstaclePolygons = [];
    let floorY = null;
    let floorArea = 0;

    // --- Planes give clean semantic floor / wall / table footprints. -------
    const planes = this.worldPlanes();
    const planeEntries = [];
    for (const plane of planes) {
      const polygon = worldPolygonFromObject(plane);
      if (polygon.length === 0) continue;
      const label = ((plane.label || "") + "").toLowerCase();
      const yRange = worldYRangeFromObject(plane);
      const y = yRange === null ? null : (yRange.min + yRange.max) / 2;
      planeEntries.push({ polygon, label, y, yRange });
      if (label.includes("floor") && typeof y === "number") {
        floorPolygons.push(polygon);
        floorArea += polygonArea2D(polygon);
        floorY = floorY === null ? y : Math.min(floorY, y);
      }
    }

    // --- Triangles from reconstructed scene meshes. ------------------------
    const meshTriangles = this.collectMeshTriangles();

    // Fall back to mesh geometry for the floor when no floor plane exists.
    if (floorY === null && meshTriangles.length > 0) {
      const detected = this.detectFloorFromTriangles(meshTriangles);
      if (detected) {
        floorY = detected.floorY;
        floorPolygons.push(detected.polygon);
        floorArea += polygonArea2D(detected.polygon);
      }
    }

    // If we still lack a floor, there is nothing to sample yet.
    if (floorY === null || floorPolygons.length === 0) {
      return {
        floorY: null,
        floorPolygons: [],
        barrierSegments: [],
        obstaclePolygons: [],
        bounds: null,
      };
    }

    const bounds = this.computeBounds(floorPolygons, 1.2);
    const hasWallPlanes = planeEntries.some((entry) =>
      entry.label.includes("wall")
    );

    // Planes: walls become barriers; elevated horizontal planes become
    // obstacle footprints; overhead horizontal planes are ceilings.
    for (const entry of planeEntries) {
      const { polygon, label, y, yRange } = entry;
      if (label.includes("floor") || label.includes("ceiling")) continue;
      if (label.includes("wall")) {
        polygonEdges(polygon, barrierSegments);
        continue;
      }
      const horizontal =
        yRange !== null && yRange.max - yRange.min < 0.2;
      if (horizontal && y !== null && y > floorY + 2.0) continue; // ceiling
      if (
        horizontal &&
        y !== null &&
        y > floorY + OBSTACLE_MIN_HEIGHT
      ) {
        obstaclePolygons.push(polygon);
        polygonEdges(polygon, barrierSegments);
      } else {
        polygonEdges(polygon, barrierSegments);
      }
    }

    // Meshes: structure meshes (that contain the floor) contribute wall
    // barriers when no wall planes exist; furniture meshes contribute a
    // convex-hull obstacle footprint.
    for (const group of meshTriangles) {
      const triangles = group.triangles.filter((tri) =>
        this.triangleIsRelevant(tri, floorY, bounds)
      );
      if (triangles.length === 0) continue;

      const structure = this.meshContainsFloor(
        group,
        floorY,
        bounds,
        floorArea
      );
      if (structure) {
        if (!hasWallPlanes) {
          for (const tri of triangles) {
            this.addTriangleEdges(tri, barrierSegments);
          }
        }
        continue;
      }

      const points = [];
      for (const tri of triangles) {
        const projected = this.projectTriangle(tri);
        points.push(
          [projected[0], projected[1]],
          [projected[2], projected[3]],
          [projected[4], projected[5]]
        );
      }
      if (points.length >= 3) {
        const hull = convexHull2D(points);
        if (hull.length >= 3) {
          obstaclePolygons.push(hull);
          polygonEdges(hull, barrierSegments);
        }
      }
    }

    return {
      floorY,
      floorPolygons,
      barrierSegments,
      obstaclePolygons,
      bounds,
    };
  }

  collectMeshTriangles() {
    const groups = [];
    const meshes = this.worldMeshes();
    const vertexA = new THREE.Vector3();
    const vertexB = new THREE.Vector3();
    const vertexC = new THREE.Vector3();

    for (const mesh of meshes) {
      const geometry = mesh.geometry;
      if (!geometry || !geometry.attributes || !geometry.attributes.position) {
        continue;
      }
      mesh.updateWorldMatrix(true, false);
      const position = geometry.attributes.position;
      const index = geometry.index;
      const elementCount = index ? index.count : position.count;
      const triangles = [];

      for (let i = 0; i + 2 < elementCount; i += 3) {
        const i0 = index ? index.getX(i) : i;
        const i1 = index ? index.getX(i + 1) : i + 1;
        const i2 = index ? index.getX(i + 2) : i + 2;
        vertexA.fromBufferAttribute(position, i0).applyMatrix4(mesh.matrixWorld);
        vertexB.fromBufferAttribute(position, i1).applyMatrix4(mesh.matrixWorld);
        vertexC.fromBufferAttribute(position, i2).applyMatrix4(mesh.matrixWorld);
        triangles.push({
          ax: vertexA.x,
          ay: vertexA.y,
          az: vertexA.z,
          bx: vertexB.x,
          by: vertexB.y,
          bz: vertexB.z,
          cx: vertexC.x,
          cy: vertexC.y,
          cz: vertexC.z,
        });
      }

      groups.push({ mesh, triangles });
    }
    return groups;
  }

  triangleInfo(tri) {
    const abx = tri.bx - tri.ax;
    const aby = tri.by - tri.ay;
    const abz = tri.bz - tri.az;
    const acx = tri.cx - tri.ax;
    const acy = tri.cy - tri.ay;
    const acz = tri.cz - tri.az;
    const nx = aby * acz - abz * acy;
    const ny = abz * acx - abx * acz;
    const nz = abx * acy - aby * acx;
    const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
    const area = length / 2;
    const upness = length > 1e-12 ? Math.abs(ny) / length : 0;
    const centroidY = (tri.ay + tri.by + tri.cy) / 3;
    const minY = Math.min(tri.ay, tri.by, tri.cy);
    const maxY = Math.max(tri.ay, tri.by, tri.cy);
    const minX = Math.min(tri.ax, tri.bx, tri.cx);
    const maxX = Math.max(tri.ax, tri.bx, tri.cx);
    const minZ = Math.min(tri.az, tri.bz, tri.cz);
    const maxZ = Math.max(tri.az, tri.bz, tri.cz);
    return {
      area,
      upness,
      centroidY,
      minY,
      maxY,
      minX,
      maxX,
      minZ,
      maxZ,
      diagonal: Math.sqrt(
        (maxX - minX) * (maxX - minX) + (maxZ - minZ) * (maxZ - minZ)
      ),
    };
  }

  triangleIsRelevant(tri, floorY, bounds) {
    const info = this.triangleInfo(tri);
    if (info.maxY < floorY - SURFACE_BAND_BOTTOM) return false;
    if (info.minY > floorY + SURFACE_BAND_TOP) return false;
    if (info.maxY - info.minY > 3.2) return false; // skybox / background shell
    if (info.upness > 0.8 && Math.abs(info.centroidY - floorY) < 0.12) {
      return false; // floor surface
    }
    if (info.centroidY > floorY + SURFACE_BAND_TOP) return false;
    if (info.minY > floorY + 1.6) return false; // floating overhead
    if (info.diagonal > MAX_BACKGROUND_DIAGONAL && info.upness > 0.3) {
      return false; // large horizontal background surface
    }
    if (bounds) {
      const margin = 1.0;
      if (
        info.maxX < bounds.minX - margin ||
        info.minX > bounds.maxX + margin ||
        info.maxZ < bounds.minZ - margin ||
        info.minZ > bounds.maxZ + margin
      ) {
        return false;
      }
    }
    return true;
  }

  meshContainsFloor(group, floorY, bounds, floorArea) {
    const threshold = Math.max(1.0, floorArea * 0.5);
    let area = 0;
    for (const tri of group.triangles) {
      const info = this.triangleInfo(tri);
      if (
        info.upness > 0.8 &&
        Math.abs(info.centroidY - floorY) < 0.12 &&
        info.area > 0.05
      ) {
        if (bounds) {
          if (
            info.maxX < bounds.minX - 0.5 ||
            info.minX > bounds.maxX + 0.5 ||
            info.maxZ < bounds.minZ - 0.5 ||
            info.minZ > bounds.maxZ + 0.5
          ) {
            continue;
          }
        }
        area += info.area;
      }
      if (area > threshold) return true;
    }
    return false;
  }

  projectTriangle(tri) {
    return [
      tri.ax,
      tri.az,
      tri.bx,
      tri.bz,
      tri.cx,
      tri.cz,
    ];
  }

  triangleArea2D(projected) {
    const [ax, az, bx, bz, cx, cz] = projected;
    return ((bx - ax) * (cz - az) - (cx - ax) * (bz - az)) / 2;
  }

  addTriangleEdges(tri, out) {
    const info = this.triangleInfo(tri);
    if (info.area < 1e-5) return;
    out.push([tri.ax, tri.az, tri.bx, tri.bz]);
    out.push([tri.bx, tri.bz, tri.cx, tri.cz]);
    out.push([tri.cx, tri.cz, tri.ax, tri.az]);
  }

  detectFloorFromTriangles(groups) {
    // Weight up-facing horizontal triangles by horizontal area, choose the
    // lowest dominant band as the floor.
    const bins = new Map();
    const allTriangles = [];
    for (const group of groups) {
      for (const tri of group.triangles) {
        const info = this.triangleInfo(tri);
        if (info.upness < 0.85 || info.area < 0.02) continue;
        if (info.area > 30 || info.diagonal > 6) continue; // background
        allTriangles.push({ tri, info });
        const projected = this.projectTriangle(tri);
        const area2D = Math.abs(this.triangleArea2D(projected));
        const key = Math.round(info.centroidY / 0.1);
        bins.set(key, (bins.get(key) || 0) + area2D);
      }
    }
    if (bins.size === 0) return null;

    let bestKey = null;
    let bestArea = 0;
    for (const [key, area] of bins.entries()) {
      if (area > bestArea) {
        bestArea = area;
        bestKey = key;
      }
    }
    const floorY = bestKey * 0.1;

    const points = [];
    for (const { tri, info } of allTriangles) {
      if (Math.abs(info.centroidY - floorY) > 0.12) continue;
      points.push([tri.ax, tri.az], [tri.bx, tri.bz], [tri.cx, tri.cz]);
    }
    if (points.length < 3) return null;
    const polygon = convexHull2D(points);
    if (polygon.length < 3) return null;
    return { floorY, polygon };
  }

  computeBounds(floorPolygons, margin) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const polygon of floorPolygons) {
      for (const [x, z] of polygon) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;
      }
    }
    return {
      minX: minX - margin,
      maxX: maxX + margin,
      minZ: minZ - margin,
      maxZ: maxZ + margin,
    };
  }

  // -------------------------------------------------------------------------
  // Grid sampling
  // -------------------------------------------------------------------------

  buildCells() {
    if (!this.bounds || this.floorPolygons.length === 0) return [];
    const cells = [];
    const { minX, maxX, minZ, maxZ } = this.bounds;
    const columns = Math.max(1, Math.ceil((maxX - minX) / CELL_SIZE));
    const rows = Math.max(1, Math.ceil((maxZ - minZ) / CELL_SIZE));

    for (let row = 0; row < rows; row++) {
      const z = minZ + (row + 0.5) * CELL_SIZE;
      if (z < minZ || z > maxZ) continue;
      for (let column = 0; column < columns; column++) {
        const x = minX + (column + 0.5) * CELL_SIZE;
        if (x < minX || x > maxX) continue;

        let onFloor = false;
        for (const polygon of this.floorPolygons) {
          if (pointInPolygon(x, z, polygon)) {
            onFloor = true;
            break;
          }
        }
        if (!onFloor) continue;

        let inObstacle = false;
        for (const polygon of this.obstaclePolygons) {
          if (pointInPolygon(x, z, polygon)) {
            inObstacle = true;
            break;
          }
        }

        let distance = Infinity;
        for (const segment of this.barrierSegments) {
          const d = distanceToSegment2D(
            x,
            z,
            segment[0],
            segment[1],
            segment[2],
            segment[3]
          );
          if (d < distance) distance = d;
        }

        cells.push({ x, z, onFloor, inObstacle, distance });
      }
    }
    return cells;
  }

  isWalkable(cell, clearance) {
    return (
      cell.onFloor &&
      !cell.inObstacle &&
      cell.distance + 1e-6 >= clearance
    );
  }

  // -------------------------------------------------------------------------
  // Overlays
  // -------------------------------------------------------------------------

  updateOverlays() {
    if (!this.floorY && this.floorY !== 0) {
      this.disposeOverlays();
      return;
    }
    if (!this.cells || this.cells.length === 0) {
      this.disposeOverlays();
      return;
    }

    const greenCells = [];
    const excludedCells = [];
    for (const cell of this.cells) {
      if (this.isWalkable(cell, this.clearance)) {
        greenCells.push(cell);
      } else {
        excludedCells.push(cell);
      }
    }

    this.setOverlayMesh(
      "green",
      greenCells,
      this.floorY + GREEN_HEIGHT,
      0x2fd06f,
      0.62
    );
    this.setOverlayMesh(
      "excluded",
      excludedCells,
      this.floorY + EXCLUDED_HEIGHT,
      0xff5a52,
      0.38
    );
    this.buildBoundaryLines(greenCells);
  }

  setOverlayMesh(kind, cells, y, color, opacity) {
    const property = kind === "green" ? "greenMesh" : "excludedMesh";
    let mesh = this[property];
    if (cells.length === 0) {
      if (mesh) mesh.visible = false;
      return;
    }

    const positions = new Float32Array(cells.length * 18);
    const half = CELL_SIZE / 2;
    let offset = 0;
    const push = (x, z) => {
      positions[offset++] = x;
      positions[offset++] = y;
      positions[offset++] = z;
    };
    for (const cell of cells) {
      const x0 = cell.x - half;
      const x1 = cell.x + half;
      const z0 = cell.z - half;
      const z1 = cell.z + half;
      // two triangles, counter-clockwise as seen from above
      push(x0, z0);
      push(x0, z1);
      push(x1, z1);
      push(x0, z0);
      push(x1, z1);
      push(x1, z0);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.computeBoundingSphere();

    if (!mesh) {
      mesh = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity,
          side: THREE.DoubleSide,
          depthWrite: false,
          depthTest: true,
        })
      );
      mesh.name =
        kind === "green"
          ? "clearance-green-overlay"
          : "clearance-excluded-overlay";
      mesh.renderOrder = kind === "green" ? 2 : 1;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      this[property] = mesh;
      this.add(mesh);
    } else {
      mesh.geometry.dispose();
      mesh.geometry = geometry;
      mesh.material.color.setHex(color);
      mesh.material.opacity = opacity;
      mesh.visible = true;
    }
  }

  buildBoundaryLines(greenCells) {
    const half = CELL_SIZE / 2;
    const green = new Set(
      greenCells.map(
        (cell) =>
          `${Math.round((cell.x - this.bounds.minX) / CELL_SIZE)}:${Math.round(
            (cell.z - this.bounds.minZ) / CELL_SIZE
          )}`
      )
    );
    const positions = [];
    const push = (x, z) => {
      positions.push(x, this.floorY + BOUNDARY_HEIGHT, z);
    };
    const isGreen = (x, z) =>
      green.has(
        `${Math.round((x - this.bounds.minX) / CELL_SIZE)}:${Math.round(
          (z - this.bounds.minZ) / CELL_SIZE
        )}`
      );

    for (const cell of greenCells) {
      const x0 = cell.x - half;
      const x1 = cell.x + half;
      const z0 = cell.z - half;
      const z1 = cell.z + half;
      if (!isGreen(cell.x, cell.z - CELL_SIZE)) {
        push(x0, z0);
        push(x1, z0);
      }
      if (!isGreen(cell.x, cell.z + CELL_SIZE)) {
        push(x0, z1);
        push(x1, z1);
      }
      if (!isGreen(cell.x - CELL_SIZE, cell.z)) {
        push(x0, z0);
        push(x0, z1);
      }
      if (!isGreen(cell.x + CELL_SIZE, cell.z)) {
        push(x1, z0);
        push(x1, z1);
      }
    }

    if (positions.length === 0) {
      if (this.boundaryLines) this.boundaryLines.visible = false;
      return;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    geometry.computeBoundingSphere();

    if (!this.boundaryLines) {
      this.boundaryLines = new THREE.LineSegments(
        geometry,
        new THREE.LineBasicMaterial({
          color: 0xffe08a,
          transparent: true,
          opacity: 0.9,
          depthWrite: false,
        })
      );
      this.boundaryLines.name = "clearance-excluded-boundary";
      this.boundaryLines.renderOrder = 3;
      this.boundaryLines.matrixAutoUpdate = false;
      this.boundaryLines.updateMatrix();
      this.add(this.boundaryLines);
    } else {
      this.boundaryLines.geometry.dispose();
      this.boundaryLines.geometry = geometry;
      this.boundaryLines.visible = true;
    }
  }

  disposeOverlays() {
    for (const property of ["greenMesh", "excludedMesh", "boundaryLines"]) {
      const object = this[property];
      if (!object) continue;
      object.visible = false;
    }
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  update(time) {
    this.ensureSurfaces(time);
    if (this.slider && this.slider.value !== this.clearance) {
      this.setClearance(this.slider.value);
    }
  }

  onSimulatorStarted() {
    this.surfaceSignature = "";
    this.lastSignatureCheck = -Infinity;
  }

  onXRSessionStarted() {
    this.surfaceSignature = "";
    this.lastSignatureCheck = -Infinity;
  }

  dispose() {
    for (const property of ["greenMesh", "excludedMesh", "boundaryLines"]) {
      const object = this[property];
      if (!object) continue;
      if (object.geometry) object.geometry.dispose();
      if (object.material) object.material.dispose();
    }
  }
}

const options = new xb.Options();
options.enablePlaneDetection();
options.world.enableMeshDetection();
options.controllers.visualization = true;
options.controllers.visualizeRays = true;

xb.add(new WalkingClearanceApp());
await xb.init(options);
