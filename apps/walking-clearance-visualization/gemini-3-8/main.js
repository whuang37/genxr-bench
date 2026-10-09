import * as THREE from 'three';
import * as xb from 'xrblocks';

const CELL_SIZE = 0.08; // Floor grid cell size in meters (no larger than 0.1 m)
const OVERLAY_Y_OFFSET = 0.01; // Height above floor in meters (no more than 0.02 m)
const DEFAULT_CLEARANCE = 0.3;
const MIN_CLEARANCE = 0.3;
const MAX_CLEARANCE = 0.8;
const STEP_CLEARANCE = 0.1;

// 2D distance from point (px, pz) to line segment (x1, z1) -> (x2, z2)
function distToSegment(px, pz, x1, z1, x2, z2) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const lenSq = dx * dx + dz * dz;
  if (lenSq < 1e-8) {
    return Math.hypot(px - x1, pz - z1);
  }
  let t = ((px - x1) * dx + (pz - z1) * dz) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * dx;
  const projZ = z1 + t * dz;
  return Math.hypot(px - projX, pz - projZ);
}

// 2D point-in-polygon test (ray casting method)
function isPointInPoly(px, pz, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x,
      zi = poly[i].z;
    const xj = poly[j].x,
      zj = poly[j].z;
    const intersect =
      zi > pz !== zj > pz && px < ((xj - xi) * (pz - zi)) / (zj - zi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// 2D distance from point (px, pz) to boundary of polygon
function distToPolygon(px, pz, poly) {
  let minDist = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const d = distToSegment(px, pz, poly[j].x, poly[j].z, poly[i].x, poly[i].z);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

// 2D distance from point (px, pz) to axis-aligned bounding box
function distToAABB(px, pz, minX, maxX, minZ, maxZ) {
  const dx = Math.max(0, minX - px, px - maxX);
  const dz = Math.max(0, minZ - pz, pz - maxZ);
  return Math.hypot(dx, dz);
}

function isPointInAABB(px, pz, minX, maxX, minZ, maxZ) {
  return px >= minX && px <= maxX && pz >= minZ && pz <= maxZ;
}

class WalkingClearanceApp extends xb.Script {
  currentClearance = DEFAULT_CLEARANCE;
  floorY = 0;
  gridCells = [];
  lastSurfaceSignature = '';

  init() {
    this.add(new THREE.HemisphereLight(0xffffff, 0x666666, 2.5));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(2, 4, 2);
    this.add(dirLight);

    this.setupOverlays();
    this.setupUI();
  }

  setupOverlays() {
    this.qualifyingGeo = new THREE.BufferGeometry();
    this.excludedGeo = new THREE.BufferGeometry();

    const qualifyingMat = new THREE.MeshBasicMaterial({
      color: 0x22c55e, // Qualifying floor is green
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const excludedMat = new THREE.MeshBasicMaterial({
      color: 0xef4444, // Contrasting excluded boundary
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.qualifyingMesh = new THREE.Mesh(this.qualifyingGeo, qualifyingMat);
    this.excludedMesh = new THREE.Mesh(this.excludedGeo, excludedMat);

    // Disable interaction hits so overlays do not block controller rays
    this.qualifyingMesh.raycast = () => {};
    this.excludedMesh.raycast = () => {};
    this.qualifyingMesh.xb = { pointerEvents: 'none' };
    this.excludedMesh.xb = { pointerEvents: 'none' };

    this.add(this.qualifyingMesh);
    this.add(this.excludedMesh);
  }

  setupUI() {
    this.numericLabel = new xb.UIText({
      text: `${this.currentClearance.toFixed(1)} m`,
      style: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#8ab4f8',
      },
    });

    this.slider = new xb.UISlider({
      ariaLabel: 'Clearance distance',
      min: MIN_CLEARANCE,
      max: MAX_CLEARANCE,
      step: STEP_CLEARANCE,
      value: this.currentClearance,
      style: { width: '100%', height: 42 },
      onInput: (val) => this.setClearance(val),
      onChange: (val) => this.setClearance(val),
    });
    // Required tag for clearance slider control
    this.slider.userData.xrblocksDevtools = { tag: 'clearance-distance-slider' };

    // "If ray selection ends unexpectedly, keep the current allowed value and the matching floor overlay."
    this.slider.cancelInput = function () {
      this.interactionStart = undefined;
      this.interactionChanged = false;
    };

    const lowStop = new xb.UIButton({
      label: '0.3 m',
      ariaLabel: '0.3 m clearance stop',
      style: { minWidth: 64, height: 32, padding: 4 },
      onClick: () => {
        this.slider.value = 0.3;
        this.setClearance(0.3);
      },
    });

    const highStop = new xb.UIButton({
      label: '0.8 m',
      ariaLabel: '0.8 m clearance stop',
      style: { minWidth: 64, height: 32, padding: 4 },
      onClick: () => {
        this.slider.value = 0.8;
        this.setClearance(0.8);
      },
    });
    highStop.text = '0.8 m';
    // Required tag for visible 0.8 m slider stop
    highStop.userData.xrblocksDevtools = { tag: 'clearance-high-stop' };

    const resetButton = new xb.UIButton({
      label: 'Reset',
      icon: 'restart_alt',
      style: { width: '100%', height: 44 },
      onClick: () => {
        this.slider.value = DEFAULT_CLEARANCE;
        this.setClearance(DEFAULT_CLEARANCE);
      },
    });
    // Required tag for default-distance reset
    resetButton.userData.xrblocksDevtools = { tag: 'reset-clearance' };

    this.card = new xb.UICard({
      size: { width: 0.58, height: 'auto' },
      manipulation: true,
      edge: true,
      style: {
        flexDirection: 'column',
        gap: 14,
        padding: 20,
        backgroundColor: 'rgba(28, 30, 33, 0.92)',
        borderRadius: 18,
      },
      children: [
        new xb.UIText({
          text: 'Walking Clearance',
          style: {
            fontSize: 26,
            fontWeight: 'bold',
            textAlign: 'center',
            color: '#ffffff',
          },
        }),
        new xb.UIText({
          text: 'Planning aid: reports geometric clearance only. Does not claim safety, accessibility, or compliance.',
          style: {
            fontSize: 12,
            lineHeight: 1.35,
            textAlign: 'center',
            color: '#9aa0a6',
          },
        }),
        new xb.UIPanel({
          style: {
            width: '100%',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 4,
          },
          children: [
            new xb.UIText({
              text: 'Clearance Distance',
              style: { fontSize: 18, color: '#e8eaed' },
            }),
            this.numericLabel,
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
          children: [lowStop, highStop],
        }),
        resetButton,
      ],
    });

    this.card.position.set(0, 1.45, -1.0);
    this.add(this.card);
  }

  setClearance(value) {
    const quantized = Math.round(value * 10) / 10;
    const clamped = Math.max(MIN_CLEARANCE, Math.min(MAX_CLEARANCE, quantized));
    this.currentClearance = clamped;
    this.numericLabel.text = `${clamped.toFixed(1)} m`;
    this.renderOverlayGeometries();
  }

  update(_time, _frame) {
    const signature = this.computeSurfaceSignature();
    if (signature !== this.lastSurfaceSignature) {
      this.lastSurfaceSignature = signature;
      this.rebuildSurfacesAndGrid();
    }
  }

  computeSurfaceSignature() {
    const planes = xb.world?.planes?.get() || [];
    let sig = `p:${planes.length}`;
    for (const p of planes) {
      const time = p.xrPlane?.lastChangedTime ?? 0;
      sig += `_${p.label}:${p.position.x.toFixed(2)},${p.position.y.toFixed(2)},${p.position.z.toFixed(2)}:${time}`;
    }
    const meshes = xb.world?.meshes?.xrMeshToThreeMesh;
    if (meshes) {
      sig += `_m:${meshes.size}`;
      for (const [xrMesh, threeMesh] of meshes.entries()) {
        const time = 'lastChangedTime' in xrMesh ? xrMesh.lastChangedTime : 0;
        sig += `_${threeMesh.semanticLabel}:${time}`;
      }
    }
    return sig;
  }

  rebuildSurfacesAndGrid() {
    const planes = xb.world?.planes?.get() || [];
    for (const p of planes) p.updateMatrixWorld(true);

    let floorPlane = planes.find((p) => {
      const label = (p.label || '').toLowerCase();
      return label === 'floor';
    });

    // If no explicit floor plane found, check lowest horizontal plane near ground
    if (!floorPlane && planes.length > 0) {
      const horizontals = planes.filter((p) => {
        const orientation = (
          p.orientation ||
          p.simulatorPlane?.type ||
          ''
        ).toLowerCase();
        const normal = new THREE.Vector3(0, 1, 0)
          .applyQuaternion(p.quaternion)
          .normalize();
        return (
          (orientation === 'horizontal' || normal.y > 0.8) &&
          p.position.y < 0.5
        );
      });
      if (horizontals.length > 0) {
        horizontals.sort((a, b) => a.position.y - b.position.y);
        floorPlane = horizontals[0];
      }
    }

    if (!floorPlane) {
      return;
    }

    this.floorY = floorPlane.position.y;

    // 1. Floor polygon in world XZ
    const floorPoly = this.extractWorldPolygon(floorPlane);
    if (!floorPoly || floorPoly.length < 3) return;

    // 2. Wall segments in world XZ
    const wallSegments = [];
    // Floor boundary edges are room boundaries / walls
    for (let i = 0, j = floorPoly.length - 1; i < floorPoly.length; j = i++) {
      wallSegments.push({
        x1: floorPoly[j].x,
        z1: floorPoly[j].z,
        x2: floorPoly[i].x,
        z2: floorPoly[i].z,
      });
    }

    // Reconstructed vertical wall planes
    for (const p of planes) {
      const isWall =
        (p.label || '').toLowerCase() === 'wall' ||
        (p.orientation || p.simulatorPlane?.type || '').toLowerCase() ===
          'vertical';
      if (isWall) {
        const poly = this.extractWorldPolygon(p);
        if (poly && poly.length >= 2) {
          for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            const len = Math.hypot(poly[i].x - poly[j].x, poly[i].z - poly[j].z);
            if (len > 0.05) {
              wallSegments.push({
                x1: poly[j].x,
                z1: poly[j].z,
                x2: poly[i].x,
                z2: poly[i].z,
              });
            }
          }
        }
      }
    }

    // Reconstructed wall meshes
    const meshes = xb.world?.meshes?.xrMeshToThreeMesh;
    if (meshes) {
      for (const [, threeMesh] of meshes.entries()) {
        if (threeMesh.semanticLabel === 'wall') {
          threeMesh.updateMatrixWorld(true);
          const box = new THREE.Box3().setFromObject(threeMesh);
          wallSegments.push(
            { x1: box.min.x, z1: box.min.z, x2: box.max.x, z2: box.min.z },
            { x1: box.max.x, z1: box.min.z, x2: box.max.x, z2: box.max.z },
            { x1: box.max.x, z1: box.max.z, x2: box.min.x, z2: box.max.z },
            { x1: box.min.x, z1: box.max.z, x2: box.min.x, z2: box.min.z }
          );
        }
      }
    }

    // 3. Obstacle footprints in world XZ
    const obstaclePolys = [];
    const obstacleBoxes = [];

    // Obstacle planes on the floor (e.g. table, desk, furniture)
    for (const p of planes) {
      const label = (p.label || '').toLowerCase();
      const isFloorOrWall =
        label === 'floor' ||
        label === 'ceiling' ||
        label === 'wall' ||
        p.orientation === 'vertical' ||
        p.simulatorPlane?.type === 'vertical';
      if (
        !isFloorOrWall &&
        p !== floorPlane &&
        p.position.y > this.floorY + 0.05 &&
        p.position.y < this.floorY + 2.0
      ) {
        const poly = this.extractWorldPolygon(p);
        if (poly && poly.length >= 3) {
          obstaclePolys.push(poly);
        }
      }
    }

    // Obstacle meshes from MeshDetector
    if (meshes) {
      for (const [, threeMesh] of meshes.entries()) {
        const label = (threeMesh.semanticLabel || '').toLowerCase();
        if (label !== 'floor' && label !== 'ceiling' && label !== 'wall') {
          threeMesh.updateMatrixWorld(true);
          const box = new THREE.Box3().setFromObject(threeMesh);
          if (
            Number.isFinite(box.min.x) &&
            box.max.y >= this.floorY + 0.05 &&
            box.min.y <= this.floorY + 1.8 &&
            box.max.y <= this.floorY + 2.5
          ) {
            obstacleBoxes.push({
              minX: box.min.x,
              maxX: box.max.x,
              minZ: box.min.z,
              maxZ: box.max.z,
            });
          }
        }
      }
    }

    // Scene obstacle objects (if any present in scene)
    xb.scene.traverse((child) => {
      if (!child.visible) return;
      if (
        child === this.card ||
        this.isDescendant(child, this.card) ||
        child === this.qualifyingMesh ||
        child === this.excludedMesh ||
        child === floorPlane
      ) {
        return;
      }
      if (child.isMesh && child.geometry) {
        const name = (child.name || '').toLowerCase();
        if (
          name.includes('controller') ||
          name.includes('reticle') ||
          name.includes('helper') ||
          name.includes('camera')
        ) {
          return;
        }
        if (xb.world?.planes && this.isDescendant(child, xb.world.planes)) {
          return;
        }
        if (xb.world?.meshes && this.isDescendant(child, xb.world.meshes)) {
          return;
        }

        const box = new THREE.Box3().setFromObject(child);
        if (
          Number.isFinite(box.min.x) &&
          box.max.y >= this.floorY + 0.05 &&
          box.min.y <= this.floorY + 1.8 &&
          box.max.y <= this.floorY + 2.5
        ) {
          const width = box.max.x - box.min.x;
          const depth = box.max.z - box.min.z;
          if (width < 10 && depth < 10) {
            obstacleBoxes.push({
              minX: box.min.x,
              maxX: box.max.x,
              minZ: box.min.z,
              maxZ: box.max.z,
            });
          }
        }
      }
    });

    // 4. Sample floor grid
    let minX = Infinity,
      maxX = -Infinity,
      minZ = Infinity,
      maxZ = -Infinity;
    for (const pt of floorPoly) {
      minX = Math.min(minX, pt.x);
      maxX = Math.max(maxX, pt.x);
      minZ = Math.min(minZ, pt.z);
      maxZ = Math.max(maxZ, pt.z);
    }

    this.gridCells = [];
    for (let x = minX + CELL_SIZE / 2; x <= maxX; x += CELL_SIZE) {
      for (let z = minZ + CELL_SIZE / 2; z <= maxZ; z += CELL_SIZE) {
        // Must be inside floor bounds
        if (!isPointInPoly(x, z, floorPoly)) continue;

        // Check if inside obstacle interior
        let insideObs = false;
        let minObsDist = Infinity;

        for (const obsPoly of obstaclePolys) {
          if (isPointInPoly(x, z, obsPoly)) {
            insideObs = true;
            break;
          }
          const d = distToPolygon(x, z, obsPoly);
          if (d < minObsDist) minObsDist = d;
        }

        if (!insideObs) {
          for (const box of obstacleBoxes) {
            if (isPointInAABB(x, z, box.minX, box.maxX, box.minZ, box.maxZ)) {
              insideObs = true;
              break;
            }
            const d = distToAABB(x, z, box.minX, box.maxX, box.minZ, box.maxZ);
            if (d < minObsDist) minObsDist = d;
          }
        }

        let minWallDist = Infinity;
        for (const seg of wallSegments) {
          const d = distToSegment(x, z, seg.x1, seg.z1, seg.x2, seg.z2);
          if (d < minWallDist) minWallDist = d;
        }

        const minDist = insideObs ? 0 : Math.min(minObsDist, minWallDist);

        this.gridCells.push({
          x,
          z,
          isObstacleInterior: insideObs,
          minDist,
        });
      }
    }

    this.renderOverlayGeometries();
  }

  renderOverlayGeometries() {
    const qualifyingCells = [];
    const excludedCells = [];

    for (let i = 0; i < this.gridCells.length; i++) {
      const cell = this.gridCells[i];
      if (!cell.isObstacleInterior && cell.minDist >= this.currentClearance) {
        qualifyingCells.push(cell);
      } else {
        excludedCells.push(cell);
      }
    }

    const overlayElevation = this.floorY + OVERLAY_Y_OFFSET;
    this.buildGeometryForCells(
      this.qualifyingGeo,
      qualifyingCells,
      overlayElevation
    );
    this.buildGeometryForCells(
      this.excludedGeo,
      excludedCells,
      overlayElevation
    );
  }

  buildGeometryForCells(geo, cellList, elevation) {
    const count = cellList.length;
    const pos = new Float32Array(count * 4 * 3);
    const idx = new Uint32Array(count * 6);
    const half = CELL_SIZE / 2;

    let v = 0;
    let i = 0;
    for (let k = 0; k < count; k++) {
      const cx = cellList[k].x;
      const cz = cellList[k].z;
      const baseVertex = k * 4;

      pos[v++] = cx - half;
      pos[v++] = elevation;
      pos[v++] = cz - half;

      pos[v++] = cx + half;
      pos[v++] = elevation;
      pos[v++] = cz - half;

      pos[v++] = cx + half;
      pos[v++] = elevation;
      pos[v++] = cz + half;

      pos[v++] = cx - half;
      pos[v++] = elevation;
      pos[v++] = cz + half;

      idx[i++] = baseVertex;
      idx[i++] = baseVertex + 1;
      idx[i++] = baseVertex + 2;
      idx[i++] = baseVertex;
      idx[i++] = baseVertex + 2;
      idx[i++] = baseVertex + 3;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeVertexNormals();
  }

  extractWorldPolygon(plane) {
    if (plane.simulatorPlane?.polygon) {
      return plane.simulatorPlane.polygon.map((pt) => {
        const v = plane.localToWorld(new THREE.Vector3(pt.x, 0, pt.y));
        return { x: v.x, z: v.z };
      });
    }
    if (plane.xrPlane?.polygon) {
      return plane.xrPlane.polygon.map((pt) => {
        const v = plane.localToWorld(new THREE.Vector3(pt.x, 0, pt.z));
        return { x: v.x, z: v.z };
      });
    }
    if (plane.geometry?.attributes?.position) {
      const pos = plane.geometry.attributes.position;
      const pts = [];
      for (let i = 0; i < pos.count; i++) {
        const v = new THREE.Vector3(
          pos.getX(i),
          pos.getY(i),
          pos.getZ(i)
        ).applyMatrix4(plane.matrixWorld);
        pts.push({ x: v.x, z: v.z });
      }
      return computeConvexHull2D(pts);
    }
    return null;
  }

  isDescendant(child, parent) {
    let current = child.parent;
    while (current) {
      if (current === parent) return true;
      current = current.parent;
    }
    return false;
  }
}

// 2D convex hull fallback (Monotone Chain algorithm)
function computeConvexHull2D(points) {
  if (points.length <= 3) return points;
  const sorted = points
    .slice()
    .sort((a, b) => (a.x === b.x ? a.z - b.z : a.x - b.x));
  const cross = (o, a, b) =>
    (a.x - o.x) * (b.z - o.z) - (a.z - o.z) * (b.x - o.x);

  const lower = [];
  for (const p of sorted) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    ) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    ) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

document.addEventListener('DOMContentLoaded', async () => {
  const options = new xb.Options();
  options.enablePlaneDetection();
  options.world.enableMeshDetection();

  xb.add(new WalkingClearanceApp());
  await xb.init(options);
});
