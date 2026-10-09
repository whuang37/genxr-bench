export const ROUND_SEED = 0x46525549;
export const TOTAL_TARGETS = 12;
export const STARTING_LIVES = 3;
export const SLICE_SPEED = 1.05;

const FRUIT_TYPES = [
  {fruit: 'watermelon', color: 0x43a047, flesh: 0xff5d73, points: 100},
  {fruit: 'orange', color: 0xff8c1a, flesh: 0xffc04d, points: 100},
  {fruit: 'apple', color: 0xe63946, flesh: 0xffd8c2, points: 100},
  {fruit: 'lime', color: 0x8bc34a, flesh: 0xdfff9d, points: 100},
  {fruit: 'plum', color: 0x8e44ad, flesh: 0xf3b8ff, points: 100},
];

function mulberry32(seed) {
  return () => {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Produces the same twelve-entry round every time, including three bombs. */
export function createSeededRound(seed = ROUND_SEED) {
  const random = mulberry32(seed);
  const bombSlots = new Set([3, 7, 10]);
  // Deliberately covers behind-left through behind-right. The scene rotates
  // these offsets around the player's current head position at each spawn.
  const angles = [-1.55, 0.72, 2.1, -2.38, 0.08, 1.52, -0.82, 2.72, -1.96, 0.98, -2.78, 0.34];

  return angles.map((angle, index) => {
    const isBomb = bombSlots.has(index);
    const fruit = FRUIT_TYPES[Math.floor(random() * FRUIT_TYPES.length)];
    return {
      id: `target-${index + 1}`,
      index,
      kind: isBomb ? 'bomb' : 'fruit',
      fruit: isBomb ? null : fruit.fruit,
      color: isBomb ? 0x252936 : fruit.color,
      flesh: isBomb ? 0xff6b35 : fruit.flesh,
      points: isBomb ? 0 : fruit.points,
      angle,
      distance: 0.48 + random() * 0.12,
      verticalOffset: -0.34 + random() * 0.12,
      arcHeight: 0.34 + random() * 0.12,
      duration: 3.35 + random() * 0.5,
      spin: (random() > 0.5 ? 1 : -1) * (2.0 + random() * 2.0),
    };
  });
}

export function createInitialState(round = createSeededRound()) {
  return Object.freeze({
    status: 'idle',
    score: 0,
    lives: STARTING_LIVES,
    resolved: 0,
    activeIndex: -1,
    round,
    lastOutcome: null,
  });
}

export function startRound(state = createInitialState()) {
  return Object.freeze({
    status: 'playing',
    score: 0,
    lives: STARTING_LIVES,
    resolved: 0,
    activeIndex: 0,
    // Regenerate rather than reuse mutable scene data; same seed, same round.
    round: createSeededRound(),
    lastOutcome: null,
  });
}

/**
 * Resolves only the current target. Fruit requires either a qualifying swing
 * or an explicit miss; bombs resolve on any hit or timeout/miss.
 */
export function resolveTarget(state, {index, speed = 0, missed = false} = {}) {
  if (state.status !== 'playing' || index !== state.activeIndex) return state;

  const target = state.round[index];
  if (!target) return state;
  if (target.kind === 'fruit' && !missed && speed < SLICE_SPEED) return state;

  const hit = !missed;
  const bombHit = target.kind === 'bomb' && hit;
  const fruitHit = target.kind === 'fruit' && hit;
  const lives = Math.max(0, state.lives - (bombHit ? 1 : 0));
  const score = state.score + (fruitHit ? target.points : 0);
  const resolved = state.resolved + 1;
  const finished = resolved >= TOTAL_TARGETS || lives === 0;
  const status = finished ? (lives === 0 ? 'lost' : 'won') : 'playing';

  return Object.freeze({
    ...state,
    status,
    score,
    lives,
    resolved,
    activeIndex: finished ? -1 : index + 1,
    lastOutcome: Object.freeze({
      id: target.id,
      index,
      kind: target.kind,
      hit,
      bombHit,
      fruitHit,
      points: fruitHit ? target.points : 0,
    }),
  });
}
