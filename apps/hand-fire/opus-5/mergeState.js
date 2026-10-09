/** Seconds both streams must stay together before merging. */
export const MERGE_HOLD_SECONDS = 1.0;
/** Seconds the merged fire orb stays visible. */
export const ORB_LIFETIME_SECONDS = 5.0;
/** Distance in meters between fingertip streams that counts as "together". */
export const MERGE_DISTANCE = 0.14;

/**
 * Pure state machine for the two-hand merge gesture.
 *
 * - Both hands pinched and their streams together for `MERGE_HOLD_SECONDS`
 *   creates a fire orb.
 * - The orb holds for `ORB_LIFETIME_SECONDS`, or clears earlier once both
 *   hands open after it appeared.
 * - Separating either stream cancels a pending merge.
 */
export class MergeState {
  constructor() {
    this.holdTime = 0;
    this.orbVisible = false;
    this.orbTimeRemaining = 0;
    this.waitingForRelease = false;
  }

  /** Progress of the pending merge in [0, 1]. */
  get holdProgress() {
    return Math.min(this.holdTime / MERGE_HOLD_SECONDS, 1);
  }

  /** Progress of the orb lifetime in [0, 1]. */
  get orbProgress() {
    if (!this.orbVisible) return 0;
    return 1 - Math.max(this.orbTimeRemaining, 0) / ORB_LIFETIME_SECONDS;
  }

  /**
   * @param {number} dt Seconds since the previous frame.
   * @param {object} input
   * @param {boolean} input.leftPinching
   * @param {boolean} input.rightPinching
   * @param {number} input.streamDistance Meters between the two streams.
   * @returns {{orbSpawned: boolean, orbCleared: boolean}}
   */
  update(dt, {leftPinching, rightPinching, streamDistance}) {
    let orbSpawned = false;
    let orbCleared = false;
    const streamsTogether =
      leftPinching && rightPinching && streamDistance < MERGE_DISTANCE;

    if (this.orbVisible) {
      this.orbTimeRemaining -= dt;
      const bothOpen = !leftPinching && !rightPinching;
      if ((this.waitingForRelease && bothOpen) || this.orbTimeRemaining <= 0) {
        this.clearOrb();
        orbCleared = true;
      }
    } else if (streamsTogether) {
      this.holdTime += dt;
      if (this.holdTime >= MERGE_HOLD_SECONDS) {
        this.holdTime = 0;
        this.orbVisible = true;
        this.waitingForRelease = true;
        this.orbTimeRemaining = ORB_LIFETIME_SECONDS;
        orbSpawned = true;
      }
    } else {
      // Cancel a pending merge as soon as either stream separates.
      this.holdTime = 0;
    }

    return {orbSpawned, orbCleared};
  }

  clearOrb() {
    this.orbVisible = false;
    this.waitingForRelease = false;
    this.orbTimeRemaining = 0;
    this.holdTime = 0;
  }
}
