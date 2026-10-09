/** Pure progress model for Dolphin Glide. Scene animation calls finishStep after
 * the dolphin physically crosses the next gate. */
export const GATE_COUNT = 6;

export class DolphinCourseState {
  constructor(totalGates = GATE_COUNT) {
    this.totalGates = totalGates;
    this.replay();
  }

  get strokeLabel() {
    return `${this.strokeCount} ${this.strokeCount === 1 ? 'stroke' : 'strokes'}`;
  }

  get gateLabel() {
    return `${this.passedGates} / ${this.totalGates} gates`;
  }

  get resultLabel() {
    return `${this.passedGates} / ${this.totalGates} gates · ${this.strokeLabel}`;
  }

  startStroke() {
    if (!this.canStroke || this.strokeArmed) return false;
    this.strokeArmed = true;
    return true;
  }

  completeStroke(headPitch = 0) {
    if (!this.canStroke || !this.strokeArmed) return false;
    this.strokeArmed = false;
    this.strokeCount += 1;
    this.status = 'playing';
    this.motionEnabled = true;
    this.pitchDirection = headPitch >= 0 ? 'up' : 'down';
    return true;
  }

  finishStep() {
    if (!this.motionEnabled || this.status !== 'playing') return false;
    this.motionEnabled = false;
    this.passedGates = Math.min(this.passedGates + 1, this.totalGates);
    if (this.passedGates === this.totalGates) this.status = 'complete';
    return true;
  }

  cancelStroke() {
    this.strokeArmed = false;
  }

  end() {
    if (this.status === 'complete' || this.status === 'ended') return false;
    this.status = 'ended';
    this.strokeArmed = false;
    this.motionEnabled = false;
    return true;
  }

  replay() {
    this.strokeCount = 0;
    this.passedGates = 0;
    this.status = 'ready';
    this.motionEnabled = false;
    this.strokeArmed = false;
    this.pitchDirection = 'up';
  }

  get canStroke() {
    return (
      (this.status === 'ready' || this.status === 'playing') &&
      !this.motionEnabled &&
      this.passedGates < this.totalGates
    );
  }
}
