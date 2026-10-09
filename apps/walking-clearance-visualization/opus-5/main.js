/**
 * Walking Clearance Visualization.
 *
 * A room-planning aid that samples the reconstructed floor on a 0.1 m grid and
 * paints every cell whose horizontal distance to each reconstructed wall and
 * obstacle footprint is at least the selected clearance. Excluded cells stay
 * visible with a contrasting boundary so the relationship to walls and
 * obstacles remains clear.
 *
 * The result reports geometric clearance only. It is not a safety,
 * accessibility, or compliance certification.
 */

import * as THREE from 'three';
import * as xb from 'xrblocks';

const MIN_CLEARANCE = 0.3;
const MAX_CLEARANCE = 0.8;
const CLEARANCE_STEP = 0.1;
const DEFAULT_CLEARANCE = 0.3;

/** Grid sampling pitch in meters. Must stay <= 0.1 m. */
const CELL_SIZE = 0.1;
/** Overlay height above the reconstructed floor. Must stay <= 0.02 m. */
const OVERLAY_HEIGHT = 0.015;

const GREEN = 0x34a853;
const EXCLUDED_FILL = 0x9aa0a6;
const EXCLUDED_BOUNDARY = 0xea4335;

/** Upper bound on sampled obstacle footprints per update. */
const MAX_OBSTACLES = 64;

/** Fallback floor half-size used when no floor surface is reconstructed yet. */
const FALLBACK_HALF_SIZE = 3.0;

function tag(object, name) {
  object.userData.xrblocksDevtools = {tag: name};
  return object;
}

function pointSegmentDistance(px, pz, ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  const lengthSquared = dx * dx + dz * dz;
  if (lengthSquared <= 1e-12) {
    return Math.hypot(px - ax, pz - az);
  }
  let t = ((px - ax) * dx + (pz - az) * dz) / lengthSquared;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}

/** Minimum distance from a point to a polygon boundary (array of [x, z]). */
function distanceToPolygonBoundary(px, pz, points) {
  let best = Infinity;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const distance = pointSegmentDistance(px, pz, a[0], a[1], b[0], b[1]);
    if (distance < best) best = distance;
  }
  return best;
}

/** Minimum distance from a point to an open polyline (array of [x, z]). */
function distanceToPolyline(px, pz, points) {
  let best = Infinity;
  for (let i = 0; i + 1 < points.length; i++) {
    const a = points[i];
    const b = points[i + 1];
    const distance = pointSegmentDistance(px, pz, a[0], a[1], b[0], b[1]);
    if (distance < best) best = distance;
  }
  return best;
}

function pointInPolygon(px, pz, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, zi] = points[i];
    const [xj, zj] = points[j];
    const intersects =
      zi > pz !== zj > pz &&
      px < ((xj - xi) * (pz - zi)) / (zj - zi || 1e-12) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function polygonBounds(points) {
  const bounds = {
    minX: Infinity,
    maxX: -Infinity,
    minZ: Infinity,
    maxZ: -Infinity,
  };
  for (const [x, z] of points) {
    bounds.minX = Math.min(bounds.minX, x);
    bounds.maxX = Math.max(bounds.maxX, x);
    bounds.minZ = Math.min(bounds.minZ, z);
    bounds.maxZ = Math.max(bounds.maxZ, z);
  }
  return bounds;
}

/** True when a point cannot be within `margin` of the bounded footprint. */
function outsideBounds(px, pz, bounds, margin) {
  return (
    px < bounds.minX - margin ||
    px > bounds.maxX + margin ||
    pz < bounds.minZ - margin ||
    pz > bounds.maxZ + margin
  );
}

function polygonArea(points) {
  let sum = 0;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    sum += (points[j][0] + points[i][0]) * (points[j][1] - points[i][1]);
  }
  return Math.abs(sum) / 2;
}

/**
 * Reads a detected plane's ordered boundary as world-space [x, z] pairs.
 *
 * The WebXR and simulator plane sources both publish an ordered local-space
 * polygon. Those are preferred because the triangulated mesh vertices do not
 * describe a boundary loop. The mesh is used only as a fallback.
 */
function planeFootprint(plane) {
  plane.updateWorldMatrix(true, false);
  const vertex = new THREE.Vector3();
  const points = [];
  const push = () => {
    const last = points[points.length - 1];
    if (
      last &&
      Math.abs(last[0] - vertex.x) < 1e-4 &&
      Math.abs(last[1] - vertex.z) < 1e-4
    ) {
      return;
    }
    points.push([vertex.x, vertex.z]);
  };

  const xrPolygon = plane.xrPlane?.polygon;
  if (xrPolygon?.length >= 3) {
    for (const point of xrPolygon) {
      vertex
        .set(point.x, point.y ?? 0, point.z)
        .applyMatrix4(plane.matrixWorld);
      push();
    }
    return points;
  }

  const simulatorPolygon = plane.simulatorPlane?.polygon;
  if (simulatorPolygon?.length >= 3) {
    for (const point of simulatorPolygon) {
      vertex.set(point.x, 0, point.y).applyMatrix4(plane.matrixWorld);
      push();
    }
    return points;
  }

  const positions = plane.geometry?.attributes?.position;
  if (!positions) return [];
  // Fallback: a convex outline of the triangulated surface. This over-covers a
  // concave surface instead of producing a self-intersecting boundary.
  const flat = [];
  for (let i = 0; i < positions.count; i++) {
    vertex.fromBufferAttribute(positions, i).applyMatrix4(plane.matrixWorld);
    flat.push([vertex.x, vertex.z]);
  }
  return convexHull(flat);
}

/** Andrew's monotone chain hull over [x, z] points. */
function convexHull(points) {
  if (points.length < 3) return points.slice();
  const sorted = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const build = (input) => {
    const stack = [];
    for (const point of input) {
      while (
        stack.length >= 2 &&
        cross(stack[stack.length - 2], stack[stack.length - 1], point) <= 0
      ) {
        stack.pop();
      }
      stack.push(point);
    }
    return stack;
  };
  const lower = build(sorted);
  const upper = build(sorted.slice().reverse());
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

function planeWorldY(plane) {
  plane.updateWorldMatrix(true, false);
  return new THREE.Vector3().setFromMatrixPosition(plane.matrixWorld).y;
}

function isVertical(plane) {
  const orientation = (plane.orientation || '').toLowerCase();
  if (orientation.startsWith('vertical')) return true;
  if (orientation.startsWith('horizontal')) return false;
  plane.updateWorldMatrix(true, false);
  const normal = new THREE.Vector3(0, 1, 0).applyQuaternion(
    new THREE.Quaternion().setFromRotationMatrix(plane.matrixWorld)
  );
  return Math.abs(normal.y) < 0.5;
}

class WalkingClearanceApp extends xb.Script {
  static dependencies = {world: xb.World, camera: THREE.Camera};

  clearance = DEFAULT_CLEARANCE;

  /** Reconstructed floor description used for sampling. */
  floor = null;
  /** Wall polylines projected to the horizontal plane. */
  walls = [];
  /** Obstacle footprints (closed polygons) projected to the floor. */
  obstacles = [];

  grid = null;
  geometrySignature = '';
  framesUntilSurfaceCheck = 0;

  init({world, camera} = {}) {
    this.world = world ?? xb.world;
    this.camera = camera ?? xb.core?.camera;
    this.add(new THREE.HemisphereLight(0xffffff, 0x666666, 3));

    this.overlayRoot = new THREE.Group();
    this.overlayRoot.name = 'Walking clearance overlay';
    this.overlayRoot.xb = {pointerEvents: 'none'};
    this.add(this.overlayRoot);

    this.qualifyingMaterial = new THREE.MeshBasicMaterial({
      color: GREEN,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.excludedMaterial = new THREE.MeshBasicMaterial({
      color: EXCLUDED_FILL,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.boundaryMaterial = new THREE.MeshBasicMaterial({
      color: EXCLUDED_BOUNDARY,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.qualifyingMesh = new THREE.Mesh(
      new THREE.BufferGeometry(),
      this.qualifyingMaterial
    );
    this.qualifyingMesh.name = 'Qualifying floor overlay';
    this.qualifyingMesh.frustumCulled = false;
    this.qualifyingMesh.xb = {pointerEvents: 'none'};

    this.excludedMesh = new THREE.Mesh(
      new THREE.BufferGeometry(),
      this.excludedMaterial
    );
    this.excludedMesh.name = 'Excluded floor overlay';
    this.excludedMesh.frustumCulled = false;
    this.excludedMesh.xb = {pointerEvents: 'none'};

    this.boundaryMesh = new THREE.Mesh(
      new THREE.BufferGeometry(),
      this.boundaryMaterial
    );
    this.boundaryMesh.name = 'Excluded boundary overlay';
    this.boundaryMesh.frustumCulled = false;
    this.boundaryMesh.xb = {pointerEvents: 'none'};

    this.overlayRoot.add(
      this.excludedMesh,
      this.boundaryMesh,
      this.qualifyingMesh
    );

    this.createPanel();
    this.refreshSurfaces(true);
  }

  createPanel() {
    this.valueLabel = new xb.UIText({
      text: this.clearanceText(),
      style: {fontSize: 26, fontWeight: 'bold'},
    });

    this.statusText = new xb.UIText({
      text: 'Reading nearby floor, walls, and obstacles.',
      style: {fontSize: 16, opacity: 0.85, lineHeight: 1.3},
    });

    this.slider = new xb.UISlider({
      ariaLabel: 'Walking clearance distance in meters',
      min: MIN_CLEARANCE,
      max: MAX_CLEARANCE,
      step: CLEARANCE_STEP,
      value: DEFAULT_CLEARANCE,
      style: {width: '100%', height: 40},
      onInput: (value) => this.setClearance(value),
      onChange: (value) => this.setClearance(value),
    });
    tag(this.slider, 'clearance-distance-slider');

    this.highStop = new xb.UIText({
      text: '0.8 m',
      style: {fontSize: 16, opacity: 0.9},
    });
    tag(this.highStop, 'clearance-high-stop');

    this.resetButton = new xb.UIButton({
      label: 'Reset',
      icon: 'restart_alt',
      style: {flexGrow: 1},
      onClick: () => this.resetClearance(),
    });
    tag(this.resetButton, 'reset-clearance');

    const card = new xb.UICard({
      size: {width: 0.62, height: 'auto'},
      style: {flexDirection: 'column', gap: 12, padding: 20},
      children: [
        new xb.UIText({
          text: 'Walking clearance',
          style: {fontSize: 30, fontWeight: 'bold'},
        }),
        new xb.UIPanel({
          style: {
            width: '100%',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          },
          children: [
            new xb.UIText({text: 'Clearance', style: {fontSize: 18}}),
            this.valueLabel,
          ],
        }),
        this.slider,
        new xb.UIPanel({
          style: {
            width: '100%',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          },
          children: [
            new xb.UIText({
              text: '0.3 m',
              style: {fontSize: 16, opacity: 0.9},
            }),
            this.highStop,
          ],
        }),
        new xb.UIPanel({
          style: {width: '100%', flexDirection: 'row', gap: 12},
          children: [this.resetButton],
        }),
        this.statusText,
        new xb.UIText({
          text:
            'Geometric clearance only. Not a safety, accessibility, or ' +
            'compliance certification.',
          style: {fontSize: 14, opacity: 0.7, lineHeight: 1.3},
        }),
      ],
    });
    card.position.set(0, 1.3, -0.85);
    card.add(
      new xb.FollowHead({
        offset: new THREE.Vector3(0, -0.18, -0.85),
        smoothing: 0.06,
      }),
      new xb.FaceCamera({mode: 'spherical', smoothing: 0.1})
    );
    this.panel = card;
    this.add(card);
  }

  clearanceText() {
    return `${this.clearance.toFixed(1)} m`;
  }

  /** Applies an allowed clearance value and repaints the floor overlay. */
  setClearance(value) {
    if (!Number.isFinite(value)) return;
    const stepped =
      MIN_CLEARANCE +
      Math.round((value - MIN_CLEARANCE) / CLEARANCE_STEP) * CLEARANCE_STEP;
    const clamped = Math.min(
      MAX_CLEARANCE,
      Math.max(MIN_CLEARANCE, Number(stepped.toFixed(3)))
    );
    if (clamped === this.clearance) return;
    this.clearance = clamped;
    this.valueLabel.text = this.clearanceText();
    this.updateOverlay();
  }

  resetClearance() {
    this.slider.value = DEFAULT_CLEARANCE;
    this.setClearance(DEFAULT_CLEARANCE);
    this.valueLabel.text = this.clearanceText();
  }

  update() {
    // A canceled or interrupted ray keeps the current allowed value; the
    // slider restores its own starting value, so only surface changes are
    // polled here.
    if (this.framesUntilSurfaceCheck-- > 0) return;
    this.framesUntilSurfaceCheck = 30;
    this.refreshSurfaces();
  }

  collectSurfaces() {
    const planes = this.world?.planes?.get?.() ?? [];
    const floorPlanes = [];
    const walls = [];
    const horizontals = [];
    for (const plane of planes) {
      if (!plane.geometry?.attributes?.position) continue;
      const label = (plane.label || '').toLowerCase();
      if (isVertical(plane)) {
        walls.push(plane);
      } else if (label === 'floor') {
        floorPlanes.push(plane);
      } else {
        horizontals.push(plane);
      }
    }

    let floor = null;
    let best = -Infinity;
    for (const plane of floorPlanes) {
      const points = planeFootprint(plane);
      if (points.length < 3) continue;
      const area = polygonArea(points);
      if (area > best) {
        best = area;
        floor = {y: planeWorldY(plane), polygon: points, estimated: false};
      }
    }

    if (!floor) {
      // No reconstructed floor yet: sample a bounded area under the viewer.
      const origin = new THREE.Vector3();
      this.camera?.getWorldPosition(origin);
      const cx = origin.x;
      const cz = origin.z;
      floor = {
        y: 0,
        polygon: [
          [cx - FALLBACK_HALF_SIZE, cz - FALLBACK_HALF_SIZE],
          [cx + FALLBACK_HALF_SIZE, cz - FALLBACK_HALF_SIZE],
          [cx + FALLBACK_HALF_SIZE, cz + FALLBACK_HALF_SIZE],
          [cx - FALLBACK_HALF_SIZE, cz + FALLBACK_HALF_SIZE],
        ],
        estimated: true,
      };
    }

    const wallLines = [];
    for (const plane of walls) {
      // Ignore vertical surfaces that belong to another level of the
      // reconstruction and cannot bound this floor.
      if (Math.abs(planeWorldY(plane) - floor.y) > 3) continue;
      const points = planeFootprint(plane);
      if (points.length < 2) continue;
      wallLines.push({points, bounds: polygonBounds(points)});
    }

    const obstacles = [];
    for (const plane of horizontals) {
      const height = planeWorldY(plane) - floor.y;
      if (height < 0.05 || height > 1.8) continue;
      const points = planeFootprint(plane);
      if (points.length < 3) continue;
      obstacles.push({points, bounds: polygonBounds(points)});
    }

    const floorArea = polygonArea(floor.polygon);
    const meshes = this.world?.meshes?.xrMeshToThreeMesh;
    if (meshes) {
      const box = new THREE.Box3();
      for (const mesh of meshes.values()) {
        if (!mesh?.geometry?.attributes?.position) continue;
        mesh.updateWorldMatrix(true, false);
        box.setFromObject(mesh);
        if (box.isEmpty()) continue;
        const low = box.min.y - floor.y;
        const high = box.max.y - floor.y;
        // Floor-standing obstacles only: skip the floor, ceiling, and the
        // full-height room shell, which the wall footprints already cover.
        if (high < 0.12 || high > 1.6 || low > 0.6) continue;
        const dx = box.max.x - box.min.x;
        const dz = box.max.z - box.min.z;
        if (dx < 0.05 || dz < 0.05) continue;
        if (dx * dz > 0.35 * floorArea) continue;
        const points = [
          [box.min.x, box.min.z],
          [box.max.x, box.min.z],
          [box.max.x, box.max.z],
          [box.min.x, box.max.z],
        ];
        obstacles.push({points, bounds: polygonBounds(points)});
        if (obstacles.length >= MAX_OBSTACLES) break;
      }
    }

    return {floor, walls: wallLines, obstacles};
  }

  surfaceSignature(surfaces) {
    const round = (value) => Math.round(value * 100) / 100;
    const parts = [
      surfaces.floor.estimated ? 'estimated' : 'floor',
      round(surfaces.floor.y),
      surfaces.floor.polygon
        .map((p) => `${round(p[0])},${round(p[1])}`)
        .join(';'),
      `w${surfaces.walls.length}`,
      surfaces.walls
        .map((wall) =>
          wall.points.map((p) => `${round(p[0])},${round(p[1])}`).join(';')
        )
        .join('|'),
      `o${surfaces.obstacles.length}`,
      surfaces.obstacles
        .map((obstacle) =>
          obstacle.points.map((p) => `${round(p[0])},${round(p[1])}`).join(';')
        )
        .join('|'),
    ];
    return parts.join('#');
  }

  refreshSurfaces(force = false) {
    const surfaces = this.collectSurfaces();
    const signature = this.surfaceSignature(surfaces);
    if (!force && signature === this.geometrySignature) return;
    this.geometrySignature = signature;
    this.floor = surfaces.floor;
    this.walls = surfaces.walls;
    this.obstacles = surfaces.obstacles;
    this.sampleFloor();
    this.updateOverlay();
  }

  /**
   * Samples the reconstructed floor on a grid of `CELL_SIZE` cells and stores
   * each cell's horizontal distance to the nearest reconstructed wall or
   * obstacle footprint. The field does not depend on the selected clearance,
   * so a slider change only reclassifies it.
   */
  sampleFloor() {
    const floor = this.floor;
    if (!floor) return;
    const bounds = polygonBounds(floor.polygon);
    const columns = Math.max(
      1,
      Math.ceil((bounds.maxX - bounds.minX) / CELL_SIZE)
    );
    const rows = Math.max(
      1,
      Math.ceil((bounds.maxZ - bounds.minZ) / CELL_SIZE)
    );
    const distances = new Float32Array(columns * rows).fill(-1);

    for (let row = 0; row < rows; row++) {
      const z = bounds.minZ + (row + 0.5) * CELL_SIZE;
      for (let column = 0; column < columns; column++) {
        const x = bounds.minX + (column + 0.5) * CELL_SIZE;
        // Cells outside the reconstructed floor stay out of bounds and are
        // never part of either overlay.
        if (!pointInPolygon(x, z, floor.polygon)) continue;

        // Horizontal distance to every reconstructed boundary: the floor
        // outline, each wall footprint, and each obstacle footprint.
        let distance = distanceToPolygonBoundary(x, z, floor.polygon);
        for (const wall of this.walls) {
          if (distance <= 0) break;
          if (outsideBounds(x, z, wall.bounds, distance)) continue;
          const wallDistance = distanceToPolyline(x, z, wall.points);
          if (wallDistance < distance) distance = wallDistance;
        }
        for (const obstacle of this.obstacles) {
          if (distance <= 0) break;
          if (outsideBounds(x, z, obstacle.bounds, distance)) continue;
          if (pointInPolygon(x, z, obstacle.points)) {
            // Obstacle interiors are always excluded.
            distance = 0;
            break;
          }
          const obstacleDistance = distanceToPolygonBoundary(
            x,
            z,
            obstacle.points
          );
          if (obstacleDistance < distance) distance = obstacleDistance;
        }
        distances[row * columns + column] = distance;
      }
    }

    this.grid = {bounds, columns, rows, distances};
  }

  /** Reclassifies the sampled floor for the currently selected clearance. */
  updateOverlay() {
    const floor = this.floor;
    const grid = this.grid;
    if (!floor || !grid) return;
    const {bounds, columns, rows, distances} = grid;
    const clearance = this.clearance;

    const qualifying = new Uint8Array(columns * rows);
    const excluded = new Uint8Array(columns * rows);
    let qualifyingCells = 0;
    let excludedCells = 0;
    for (let index = 0; index < distances.length; index++) {
      const distance = distances[index];
      if (distance < 0) continue;
      if (distance >= clearance) {
        qualifying[index] = 1;
        qualifyingCells++;
      } else {
        excluded[index] = 1;
        excludedCells++;
      }
    }

    const qualifyingQuads = [];
    const excludedQuads = [];
    const boundaryQuads = [];
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const index = row * columns + column;
        const x = bounds.minX + column * CELL_SIZE;
        const z = bounds.minZ + row * CELL_SIZE;
        if (qualifying[index]) {
          qualifyingQuads.push([x, z]);
        } else if (excluded[index]) {
          // An excluded cell touching qualifying floor is drawn as the
          // contrasting boundary of the excluded region.
          const touchesQualifying =
            (column > 0 && qualifying[index - 1]) ||
            (column + 1 < columns && qualifying[index + 1]) ||
            (row > 0 && qualifying[index - columns]) ||
            (row + 1 < rows && qualifying[index + columns]);
          if (touchesQualifying) {
            boundaryQuads.push([x, z]);
          } else {
            excludedQuads.push([x, z]);
          }
        }
      }
    }

    const y = floor.y + OVERLAY_HEIGHT;
    this.writeQuads(this.qualifyingMesh, qualifyingQuads, y, 0.0);
    this.writeQuads(this.excludedMesh, excludedQuads, y, 0.002);
    this.writeQuads(this.boundaryMesh, boundaryQuads, y, 0.004);

    const cellArea = CELL_SIZE * CELL_SIZE;
    const source = floor.estimated
      ? 'Estimated floor (no reconstructed floor surface yet)'
      : 'Reconstructed floor';
    this.statusText.text =
      `${source}: ${(qualifyingCells * cellArea).toFixed(1)} m² qualifying, ` +
      `${(excludedCells * cellArea).toFixed(1)} m² excluded. ` +
      `${this.walls.length} wall surfaces, ${this.obstacles.length} obstacles.`;
  }

  writeQuads(mesh, cells, y, yOffset) {
    const positions = new Float32Array(cells.length * 18);
    const inset = CELL_SIZE * 0.04;
    let offset = 0;
    for (const [x, z] of cells) {
      const x0 = x + inset;
      const x1 = x + CELL_SIZE - inset;
      const z0 = z + inset;
      const z1 = z + CELL_SIZE - inset;
      const height = y + yOffset;
      const quad = [
        x0,
        height,
        z0,
        x1,
        height,
        z0,
        x1,
        height,
        z1,
        x0,
        height,
        z0,
        x1,
        height,
        z1,
        x0,
        height,
        z1,
      ];
      positions.set(quad, offset);
      offset += quad.length;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.computeBoundingSphere();
    mesh.geometry.dispose();
    mesh.geometry = geometry;
    mesh.visible = cells.length > 0;
  }

  dispose() {
    this.qualifyingMesh.geometry.dispose();
    this.excludedMesh.geometry.dispose();
    this.boundaryMesh.geometry.dispose();
    this.qualifyingMaterial.dispose();
    this.excludedMaterial.dispose();
    this.boundaryMaterial.dispose();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const options = new xb.Options();
  options.enablePlaneDetection();
  options.world.enableMeshDetection();
  options.xrButton.showEnterSimulatorButton = true;

  xb.add(new WalkingClearanceApp());
  xb.init(options);
});
