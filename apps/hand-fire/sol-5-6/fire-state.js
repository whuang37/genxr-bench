/**
 * Pure Hand Fire timing reducer. Rendering and hand tracking stay in main.js;
 * this module owns only the continuously-held merge and orb lifetime rules.
 */
export function stepFireState(current, input, delta, timings = {}) {
  const mergeHoldSeconds = timings.mergeHoldSeconds ?? 1;
  const orbHoldSeconds = timings.orbHoldSeconds ?? 5;
  const next = { ...current, createdOrb: false, clearedOrb: false };

  if (next.mode === "orb") {
    next.orbRemaining = Math.max(0, next.orbRemaining - delta);
    if (input.bothOpen || next.orbRemaining <= 1e-6) {
      next.mode = "palms";
      next.orbRemaining = 0;
      next.clearedOrb = true;
    }
    return next;
  }

  if (input.leftPinched && input.rightPinched && input.streamsJoined) {
    next.mode = "charging";
    next.mergeProgress += delta;
    if (next.mergeProgress + Number.EPSILON >= mergeHoldSeconds) {
      next.mode = "orb";
      next.mergeProgress = 0;
      next.orbRemaining = orbHoldSeconds;
      next.createdOrb = true;
    }
  } else {
    // Any separated stream or released pinch cancels the full continuous hold.
    next.mode = "palms";
    next.mergeProgress = 0;
  }
  return next;
}
