#!/usr/bin/env python3
"""Dependency-free contract checks for the Toilet Paper Rain static app."""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
main = (ROOT / "main.js").read_text(encoding="utf-8")
index = (ROOT / "index.html").read_text(encoding="utf-8")

checks = []

def check(name, condition):
    checks.append((name, bool(condition)))

# Boot and feature wiring.
check("imports the pinned local Rapier module", "@dimforge/rapier3d-simd-compat" in main)
check("supplies Rapier to XR Blocks physics", re.search(r"physics\.RAPIER\s*=\s*RAPIER", main))
check("enables depth-mesh environment physics", "xrDepthMeshPhysicsOptions" in main)
check("keeps the app passive (no interaction handlers)", not re.search(r"on(?:Object)?(?:Select|Squeeze|Grab|Touch|Manipulate)", main))

# Continuous bounded rain lifecycle.
check("defines a steady spawn interval", re.search(r"SPAWN_INTERVAL_MS\s*=\s*\d+", main))
check("defines a maximum active-roll count", re.search(r"MAX_ACTIVE_ROLLS\s*=\s*\d+", main))
check("defines a bounded roll lifetime", re.search(r"MAX_LIFETIME_MS\s*=\s*\d+", main))
check("spawns automatically from update/init", re.search(r"(?:init|update)\s*\([^)]*\)\s*\{[\s\S]*?spawnRoll\s*\(", main))
check("removes owned rigid bodies", "removeRigidBody" in main)

# Physics and floor safety.
check("creates dynamic roll bodies", "RigidBodyDesc.dynamic()" in main)
check("uses a cylindrical roll collider", re.search(r"ColliderDesc\.(?:roundCylinder|cylinder)\s*\(", main))
check("enables continuous collision detection", ".setCcdEnabled(true)" in main)
check("configures bounce and friction", ".setRestitution(" in main and ".setFriction(" in main)
check("creates a fixed safety floor", "RigidBodyDesc.fixed()" in main and re.search(r"ColliderDesc\.cuboid\s*\(", main))
check("guards against positions below floor", re.search(r"(?:MIN_ROLL_CENTER_Y|FLOOR_TOP_Y|position\.y\s*<)", main))

# Visible semantic result and exact stable tag spelling.
check("builds a recognizable hollow paper roll", "RingGeometry" in main and "CylinderGeometry" in main)
check("tags active roll semantic owners", re.search(r"\.userData\.xrblocksDevtools\s*=\s*\{\s*tag:\s*[\"']falling-toilet-paper-roll[\"']\s*\}", main))
check("uses the requested page title", "Toilet Paper Rain" in index)

failed = [name for name, ok in checks if not ok]
for name, ok in checks:
    print(f"{'PASS' if ok else 'FAIL'}: {name}")
print(f"\n{len(checks) - len(failed)}/{len(checks)} checks passed")
if failed:
    sys.exit(1)
