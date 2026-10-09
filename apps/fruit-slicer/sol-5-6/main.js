import * as THREE from 'three';
import * as xb from 'xrblocks';
import {
  createInitialState,
  startRound,
  resolveTarget,
  TOTAL_TARGETS,
  STARTING_LIVES,
  SLICE_SPEED,
} from './game-state.js';

const TAGS = Object.freeze({
  PLAY: 'play-game',
  FRUIT: 'fruit',
  BOMB: 'bomb',
  LIVES: 'life-markers',
  RESOLVED: 'resolved-counter',
});

const TARGET_RADIUS = 0.09;
const EFFECT_LIFE = 0.72;
const SPAWN_DELAY = 0.34;
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const tmpC = new THREE.Vector3();
const tmpD = new THREE.Vector3();

function tag(object, value) {
  object.userData.xrblocksDevtools = {tag: value};
  return object;
}

function disposeObject(object) {
  object.traverse((child) => {
    child.geometry?.dispose?.();
    if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose());
    else child.material?.dispose?.();
  });
}

function segmentDistanceSquared(point, start, end) {
  tmpC.subVectors(end, start);
  const lengthSquared = tmpC.lengthSq();
  if (lengthSquared === 0) return point.distanceToSquared(start);
  const t = THREE.MathUtils.clamp(tmpA.subVectors(point, start).dot(tmpC) / lengthSquared, 0, 1);
  tmpD.copy(start).addScaledVector(tmpC, t);
  return point.distanceToSquared(tmpD);
}

function makeLeaf() {
  const leaf = new THREE.Mesh(
    new THREE.SphereGeometry(0.025, 10, 6),
    new THREE.MeshStandardMaterial({color: 0x4caf50, roughness: 0.65})
  );
  leaf.scale.set(1.35, 0.25, 0.68);
  leaf.position.set(0.02, 0.087, 0);
  leaf.rotation.z = -0.65;
  return leaf;
}

function makeFruitVisual(entry) {
  const group = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({
    color: entry.color,
    roughness: 0.55,
    metalness: 0.02,
    emissive: new THREE.Color(entry.color).multiplyScalar(0.08),
  });
  const body = new THREE.Mesh(new THREE.SphereGeometry(TARGET_RADIUS, 24, 18), skin);
  body.scale.set(entry.fruit === 'watermelon' ? 1.12 : 0.96, 1.06, 0.96);
  group.add(body);
  if (entry.fruit === 'watermelon') {
    for (let i = 0; i < 6; i += 1) {
      const stripe = new THREE.Mesh(
        new THREE.TorusGeometry(0.078, 0.006, 6, 22),
        new THREE.MeshStandardMaterial({color: 0x1d7434, roughness: 0.7})
      );
      stripe.rotation.set(Math.PI / 2, (i / 6) * Math.PI, 0);
      group.add(stripe);
    }
  }
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.007, 0.009, 0.04, 8),
    new THREE.MeshStandardMaterial({color: 0x5d4037, roughness: 0.9})
  );
  stem.position.y = 0.1;
  group.add(stem, makeLeaf());
  return group;
}

function makeBombVisual() {
  const group = new THREE.Group();
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(TARGET_RADIUS, 24, 18),
    new THREE.MeshStandardMaterial({color: 0x242735, roughness: 0.28, metalness: 0.75})
  );
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.021, 0.027, 0.035, 10),
    new THREE.MeshStandardMaterial({color: 0x697386, roughness: 0.35, metalness: 0.8})
  );
  cap.position.y = 0.095;
  const fuseCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.108, 0),
    new THREE.Vector3(0.018, 0.139, 0),
    new THREE.Vector3(0.036, 0.14, 0.012),
  ]);
  const fuse = new THREE.Mesh(
    new THREE.TubeGeometry(fuseCurve, 10, 0.006, 7, false),
    new THREE.MeshStandardMaterial({color: 0xb96d35, roughness: 0.9})
  );
  const spark = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.024, 0),
    new THREE.MeshBasicMaterial({color: 0xffd54f})
  );
  spark.name = 'Fuse spark';
  spark.position.set(0.04, 0.142, 0.014);
  group.add(shell, cap, fuse, spark);
  return group;
}

/** Semantic owner for one live target. Only this Script carries its target tag. */
class SliceTarget extends xb.Script {
  constructor(entry, onContact) {
    super();
    this.entry = entry;
    this.name = entry.kind === 'bomb' ? `Bomb ${entry.index + 1}` : `${entry.fruit} ${entry.index + 1}`;
    tag(this, entry.kind === 'bomb' ? TAGS.BOMB : TAGS.FRUIT);
    this.onContact = onContact;
    this.visual = entry.kind === 'bomb' ? makeBombVisual() : makeFruitVisual(entry);
    this.add(this.visual);
    this.xb = {pointerEvents: 'auto'};
  }

  onObjectTouchStart(event) {
    event.preventDefault();
    event.stopPropagation();
    this.onContact(event.handIndex, event.touchPosition);
  }

  onObjectTouching(event) {
    event.stopPropagation();
    this.onContact(event.handIndex, event.touchPosition);
  }

  dispose() {
    disposeObject(this.visual);
  }
}

export class FruitSlicer extends xb.Script {
  constructor() {
    super();
    this.name = 'Fruit Slicer game';
    this.state = createInitialState();
    this.activeTarget = null;
    this.effects = [];
    this.handSamples = [null, null];
    this.targetElapsed = 0;
    this.spawnWait = -1;
    this.lastTime = null;
    this._debug = {start: () => this.beginRound(), resolve: (speed = 2, missed = false) => {
      if (this.state.activeIndex >= 0) this.resolveActive(speed, missed);
    }};
  }

  init() {
    this.add(
      new THREE.HemisphereLight(0xe9fbff, 0x1f2637, 2.7),
      new THREE.DirectionalLight(0xffffff, 2.2)
    );
    this.children[1].position.set(-1.5, 3.5, 1.5);
    this.createArena();
    this.createHud();
    this.refreshHud();
    globalThis.__fruitSlicer = this;
    document.getElementById('loading')?.remove();
  }

  createArena() {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.73, 64),
      new THREE.MeshBasicMaterial({
        color: 0x2b8091,
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    ring.name = 'Safe reach guide';
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.012;
    this.arenaObjects = [ring];
    this.add(ring);

    const dots = new THREE.Group();
    dots.name = 'Arc direction markers';
    const dotGeometry = new THREE.SphereGeometry(0.012, 8, 6);
    const dotMaterial = new THREE.MeshBasicMaterial({color: 0x67d7c4, transparent: true, opacity: 0.38});
    for (let i = 0; i < 12; i += 1) {
      const angle = (i / 12) * Math.PI * 2;
      const dot = new THREE.Mesh(dotGeometry, dotMaterial);
      dot.position.set(Math.sin(angle) * 0.64, 0.025, -Math.cos(angle) * 0.64);
      dots.add(dot);
    }
    this.arenaObjects.push(dots);
    this.add(dots);
  }

  createHud() {
    this.scoreText = new xb.UIText({
      text: 'SCORE  0000',
      style: {fontSize: 22, fontWeight: 'bold', color: '#ffd166'},
    });

    this.lifeMarkers = tag(new xb.UIText({
      text: '[+]  [+]  [+]',
      style: {fontSize: 25, fontWeight: 'bold', color: '#ff5d73'},
    }), TAGS.LIVES);
    this.lifeMarkers.name = 'Three life markers';

    this.resolvedText = tag(new xb.UIText({
      text: `0 of ${TOTAL_TARGETS} resolved`,
      style: {fontSize: 20, fontWeight: 'bold', color: '#f5f7ef'},
    }), TAGS.RESOLVED);
    this.resolvedText.name = 'Resolved target counter';

    this.statusText = new xb.UIText({
      text: 'Turn to find targets. Slice fast. Keep clear of bombs.',
      style: {fontSize: 18, color: '#b9d8dc', textAlign: 'center'},
    });

    this.playButton = tag(new xb.UIButton({
      label: 'PLAY GAME',
      icon: 'play_arrow',
      onClick: () => this.beginRound(),
      style: {
        width: 210,
        height: 56,
        fontSize: 22,
        fontWeight: 'bold',
        backgroundColor: '#ef476f',
        color: '#ffffff',
        borderRadius: 28,
      },
    }), TAGS.PLAY);
    this.playButton.name = 'Play Game';

    const statusRow = new xb.UIPanel({
      style: {
        width: '100%', flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', gap: 18,
      },
      children: [this.scoreText, this.lifeMarkers, this.resolvedText],
    });

    this.hud = new xb.UIOverlay({
      appearance: 'surface',
      style: {
        width: 680,
        height: 250,
        position: 'absolute',
        left: '50%',
        top: 22,
        marginLeft: -340,
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        padding: 16,
        borderRadius: 22,
        backgroundColor: 'rgba(5, 19, 29, 0.88)',
        borderWidth: 1,
        borderColor: 'rgba(103, 215, 196, 0.48)',
      },
      children: [
        new xb.UIText({
          text: 'FRUIT SLICER',
          style: {fontSize: 30, fontWeight: 'bold', color: '#67d7c4'},
        }),
        statusRow,
        this.statusText,
        this.playButton,
      ],
    });
    this.hud.name = 'Fruit Slicer HUD';
    this.add(this.hud);
  }

  beginRound() {
    this.clearTarget();
    this.clearEffects();
    this.state = startRound(this.state);
    this.handSamples = [null, null];
    this.spawnWait = -1;
    this.refreshHud();
    this.spawnCurrentTarget();
  }

  spawnCurrentTarget() {
    if (this.state.status !== 'playing' || this.state.activeIndex < 0) return;
    const entry = this.state.round[this.state.activeIndex];
    const target = new SliceTarget(entry, (handIndex, point) => this.tryContact(handIndex, point));

    // Anchor every launch to the user's current head position. Therefore even
    // entries around the full circle remain within 0.71 m after they turn.
    const camera = xb.core.camera;
    camera.getWorldPosition(tmpA);
    camera.getWorldDirection(tmpB);
    const baseYaw = Math.atan2(tmpB.x, -tmpB.z);
    const yaw = baseYaw + entry.angle;
    target.userData.arc = {
      start: new THREE.Vector3(
        tmpA.x + Math.sin(yaw) * entry.distance,
        tmpA.y + entry.verticalOffset,
        tmpA.z - Math.cos(yaw) * entry.distance
      ),
      side: new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw)),
    };
    target.position.copy(target.userData.arc.start).addScaledVector(target.userData.arc.side, -0.13);
    target.scale.setScalar(0.001);
    this.activeTarget = target;
    this.targetElapsed = 0;
    this.add(target);
    this.statusText.text = entry.kind === 'bomb'
      ? 'BOMB - keep your hands clear!'
      : `Slice the ${entry.fruit}!  Swing fast.`;
  }

  tryContact(handIndex, point) {
    if (!this.activeTarget) return;
    const sample = this.handSamples[handIndex];
    let speed = sample?.speed ?? 0;
    if (sample?.position && sample.dt > 0) speed = Math.max(speed, point.distanceTo(sample.position) / sample.dt);
    this.resolveActive(speed, false);
  }

  resolveActive(speed, missed) {
    if (!this.activeTarget || this.state.status !== 'playing') return;
    const target = this.activeTarget;
    const previous = this.state;
    const next = resolveTarget(previous, {index: previous.activeIndex, speed, missed});
    if (next === previous) {
      if (!missed) this.showSlowFeedback(target.position);
      return;
    }

    const outcome = next.lastOutcome;
    this.state = next;
    this.activeTarget = null;
    target.getWorldPosition(tmpA);
    this.remove(target);

    if (outcome.fruitHit) this.makeSplitEffect(target.entry, tmpA, target.quaternion);
    else if (outcome.bombHit) this.makeBombEffect(tmpA);
    else this.makeMissEffect(target.entry, tmpA);

    this.refreshHud();
    if (next.status === 'playing') {
      if (outcome.fruitHit) {
        this.statusText.text = `Clean slice!  +${outcome.points}`;
        this.statusText.style.color = '#ffd166';
      } else if (outcome.bombHit) {
        this.statusText.text = 'Bomb hit - one life lost!';
        this.statusText.style.color = '#ff8a8a';
      } else {
        this.statusText.text = target.entry.kind === 'bomb' ? 'Bomb avoided.' : 'Fruit missed - no points.';
      }
      this.spawnWait = SPAWN_DELAY;
    } else this.finishRound();
  }

  finishRound() {
    this.spawnWait = -1;
    this.playButton.label = 'PLAY AGAIN';
    if (this.state.status === 'won') {
      this.statusText.text = `ROUND CLEARED  |  FINAL SCORE ${String(this.state.score).padStart(4, '0')}`;
      this.statusText.style.color = '#67d7c4';
    } else {
      this.statusText.text = `OUT OF LIVES  |  FINAL SCORE ${String(this.state.score).padStart(4, '0')}`;
      this.statusText.style.color = '#ff8a8a';
    }
  }

  refreshHud() {
    this.scoreText.text = `SCORE  ${String(this.state.score).padStart(4, '0')}`;
    this.resolvedText.text = `${this.state.resolved} of ${TOTAL_TARGETS} resolved`;
    this.lifeMarkers.text = Array.from({length: STARTING_LIVES}, (_, index) =>
      index < this.state.lives ? '[+]' : '[ ]'
    ).join('  ');
    this.lifeMarkers.style.color = this.state.lives > 1 ? '#ff5d73' : '#ff9d57';
    this.playButton.label = this.state.status === 'idle' ? 'PLAY GAME' : 'RESTART ROUND';
    this.statusText.style.color = '#b9d8dc';
  }

  sampleHands(dt) {
    const hands = xb.user.hands;
    for (const hand of [xb.Handedness.LEFT, xb.Handedness.RIGHT]) {
      const tip = hands?.getIndexTip(hand);
      const prior = this.handSamples[hand];
      if (!tip || !tip.visible) {
        this.handSamples[hand] = null;
        continue;
      }
      tip.getWorldPosition(tmpA);
      const speed = prior && dt > 0 ? tmpA.distanceTo(prior.position) / dt : 0;
      const current = {position: tmpA.clone(), speed, dt};
      this.handSamples[hand] = current;

      // Swept collision catches fast crossings between render frames.
      if (this.activeTarget && prior && speed >= SLICE_SPEED) {
        this.activeTarget.getWorldPosition(tmpB);
        if (segmentDistanceSquared(tmpB, prior.position, current.position) <= (TARGET_RADIUS + 0.025) ** 2) {
          this.resolveActive(speed, false);
        }
      }
    }
  }

  updateTarget(dt) {
    if (!this.activeTarget) return;
    const target = this.activeTarget;
    const entry = target.entry;
    this.targetElapsed += dt;
    const t = THREE.MathUtils.clamp(this.targetElapsed / entry.duration, 0, 1);
    const arc = target.userData.arc;
    target.position.copy(arc.start)
      .addScaledVector(arc.side, THREE.MathUtils.lerp(-0.13, 0.13, t));
    target.position.y = arc.start.y + Math.sin(t * Math.PI) * entry.arcHeight;
    const scale = Math.min(1, t * 8, (1 - t) * 8);
    target.scale.setScalar(Math.max(0.001, scale));
    target.visual.rotation.y += entry.spin * dt;
    target.visual.rotation.x += entry.spin * 0.35 * dt;
    const spark = target.visual.getObjectByName('Fuse spark');
    if (spark) spark.scale.setScalar(0.8 + Math.sin(this.targetElapsed * 28) * 0.28);
    if (t >= 1) this.resolveActive(0, true);
  }

  updateEffects(dt) {
    for (let i = this.effects.length - 1; i >= 0; i -= 1) {
      const effect = this.effects[i];
      effect.life -= dt;
      for (const piece of effect.pieces) {
        piece.position.addScaledVector(piece.userData.velocity, dt);
        piece.userData.velocity.y -= 1.65 * dt;
        piece.rotation.x += piece.userData.spin.x * dt;
        piece.rotation.y += piece.userData.spin.y * dt;
        if (piece.material?.transparent) piece.material.opacity = Math.max(0, effect.life / EFFECT_LIFE);
      }
      if (effect.life <= 0) {
        this.remove(effect.root);
        disposeObject(effect.root);
        this.effects.splice(i, 1);
      }
    }
  }

  makeSplitEffect(entry, position, rotation) {
    const root = new THREE.Group();
    root.position.copy(position);
    root.quaternion.copy(rotation);
    const pieces = [];
    for (const direction of [-1, 1]) {
      const material = new THREE.MeshStandardMaterial({
        color: entry.flesh, roughness: 0.55, transparent: true,
      });
      const half = new THREE.Mesh(
        new THREE.SphereGeometry(TARGET_RADIUS, 20, 12, direction < 0 ? Math.PI : 0, Math.PI),
        material
      );
      half.rotation.y = Math.PI / 2;
      half.position.x = direction * 0.022;
      half.userData.velocity = new THREE.Vector3(direction * 0.32, 0.28, direction * 0.08);
      half.userData.spin = new THREE.Vector3(direction * 3.2, direction * 4.2, 1.2);
      root.add(half);
      pieces.push(half);
    }
    this.addBurst(root, pieces, entry.color, 10, 0.36);
    this.add(root);
    this.effects.push({root, pieces, life: EFFECT_LIFE});
  }

  makeBombEffect(position) {
    const root = new THREE.Group();
    root.position.copy(position);
    const pieces = [];
    const flash = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.13, 1),
      new THREE.MeshBasicMaterial({color: 0xff7849, transparent: true, opacity: 0.9})
    );
    flash.userData.velocity = new THREE.Vector3(0, 0.08, 0);
    flash.userData.spin = new THREE.Vector3(2, 3, 1);
    root.add(flash);
    pieces.push(flash);
    this.addBurst(root, pieces, 0xffd166, 18, 0.58);
    this.add(root);
    this.effects.push({root, pieces, life: EFFECT_LIFE});
  }

  makeMissEffect(entry, position) {
    const root = new THREE.Group();
    root.position.copy(position);
    const pieces = [];
    this.addBurst(root, pieces, entry.kind === 'bomb' ? 0x697386 : entry.color, 6, 0.18);
    this.add(root);
    this.effects.push({root, pieces, life: EFFECT_LIFE * 0.65});
  }

  showSlowFeedback(position) {
    if (this.state.round[this.state.activeIndex]?.kind === 'bomb') return;
    this.statusText.text = 'Too slow - make a quick slicing motion!';
    const root = new THREE.Group();
    root.position.copy(position);
    const pieces = [];
    this.addBurst(root, pieces, 0xffffff, 3, 0.08);
    this.add(root);
    this.effects.push({root, pieces, life: 0.22});
  }

  addBurst(root, pieces, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const particle = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.012 + (i % 3) * 0.004, 0),
        new THREE.MeshBasicMaterial({color, transparent: true})
      );
      const angle = (i / count) * Math.PI * 2;
      particle.userData.velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        0.12 + ((i * 37) % 7) * 0.025,
        Math.sin(angle) * speed
      );
      particle.userData.spin = new THREE.Vector3(i, i * 0.7, i * 0.3);
      root.add(particle);
      pieces.push(particle);
    }
  }

  update(time) {
    const seconds = time * 0.001;
    const dt = this.lastTime === null ? 1 / 60 : THREE.MathUtils.clamp(seconds - this.lastTime, 0.001, 0.05);
    this.lastTime = seconds;
    this.sampleHands(dt);
    this.updateTarget(dt);
    this.updateEffects(dt);
    if (this.spawnWait >= 0) {
      this.spawnWait -= dt;
      if (this.spawnWait <= 0) {
        this.spawnWait = -1;
        this.spawnCurrentTarget();
      }
    }
  }

  clearTarget() {
    if (!this.activeTarget) return;
    const target = this.activeTarget;
    this.activeTarget = null;
    this.remove(target);
    // ScriptsManager invokes target.dispose() when it sees removal.
  }

  clearEffects() {
    for (const effect of this.effects) {
      this.remove(effect.root);
      disposeObject(effect.root);
    }
    this.effects.length = 0;
  }

  dispose() {
    this.clearTarget();
    this.clearEffects();
    for (const object of this.arenaObjects ?? []) disposeObject(object);
    this.arenaObjects = [];
    if (globalThis.__fruitSlicer === this) delete globalThis.__fruitSlicer;
  }
}

export async function startFruitSlicerApp() {
  const options = new xb.Options();
  options.enableHands();
  options.hands.visualization = true;
  options.hands.visualizeJoints = false;
  options.simulator.defaultMode = xb.SimulatorMode.POSE;
  options.simulator.modeToggle.enabled = true;
  options.reticles.enabled = true;
  options.controllers.visualizeRays = true;
  options.setAppTitle('Fruit Slicer');
  options.setAppDescription('Turn toward each target and cut fruit with a quick hand swing. Avoid bombs.');

  xb.ui.theme = 'glimmer';
  xb.add(new FruitSlicer());
  try {
    await xb.init(options);
  } catch (error) {
    console.error('Fruit Slicer failed to initialize.', error);
    const loading = document.getElementById('loading');
    if (loading) loading.textContent = 'Fruit Slicer could not start. Check WebGL support.';
  }
}

if (!globalThis.__FRUIT_SLICER_DISABLE_AUTO_START) {
  document.addEventListener('DOMContentLoaded', startFruitSlicerApp);
}
