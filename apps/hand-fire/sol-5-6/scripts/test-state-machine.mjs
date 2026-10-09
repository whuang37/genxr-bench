import assert from 'node:assert/strict';
import { stepFireState } from '../fire-state.js';

const palms = () => ({ mode: 'palms', mergeProgress: 0, orbRemaining: 0 });
const input = (leftPinched, rightPinched, streamsJoined, bothOpen = false) => ({
  leftPinched, rightPinched, streamsJoined, bothOpen,
});

// Either hand may pinch without changing the other hand or starting a merge.
let state = stepFireState(palms(), input(true, false, false), 0.7);
assert.equal(state.mode, 'palms');
assert.equal(state.mergeProgress, 0);
state = stepFireState(palms(), input(false, true, false), 0.7);
assert.equal(state.mode, 'palms');
assert.equal(state.mergeProgress, 0);

// A continuous hold shorter than one second charges but does not merge.
state = stepFireState(palms(), input(true, true, true), 0.6);
assert.equal(state.mode, 'charging');
assert.equal(state.mergeProgress, 0.6);
assert.equal(state.createdOrb, false);

// Separation cancels and fully resets the timer.
state = stepFireState(state, input(true, true, false), 0.01);
assert.equal(state.mode, 'palms');
assert.equal(state.mergeProgress, 0);
state = stepFireState(state, input(true, true, true), 0.5);
assert.equal(state.mode, 'charging');
assert.equal(state.mergeProgress, 0.5);

// Releasing either pinch also cancels, regardless of stream proximity.
state = stepFireState(state, input(true, false, true), 0.01);
assert.equal(state.mode, 'palms');
assert.equal(state.mergeProgress, 0);

// One continuous second creates one five-second orb.
for (let i = 0; i < 10; i++) {
  state = stepFireState(state, input(true, true, true), 0.1);
}
assert.equal(state.mode, 'orb');
assert.equal(state.orbRemaining, 5);
assert.equal(state.createdOrb, true);

// Opening only one hand cannot clear the orb.
state = stepFireState(state, input(false, true, false, false), 1);
assert.equal(state.mode, 'orb');
assert.equal(state.orbRemaining, 4);

// Opening both clears immediately.
state = stepFireState(state, input(false, false, false, true), 0.01);
assert.equal(state.mode, 'palms');
assert.equal(state.orbRemaining, 0);

// If hands remain pinched, the orb still expires after five seconds.
state = { mode: 'orb', mergeProgress: 0, orbRemaining: 5 };
for (let i = 0; i < 50; i++) {
  state = stepFireState(state, input(true, true, false), 0.1);
}
assert.equal(state.mode, 'palms');
assert.equal(state.orbRemaining, 0);

console.log('PASS  independent pinch behavior');
console.log('PASS  continuous one-second merge and cancellation');
console.log('PASS  five-second orb hold');
console.log('PASS  two-open-hands release');
