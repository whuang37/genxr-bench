import {
  expect,
  it_session,
  captureOutputSnapshot,
  expectTransformChanged,
  judge,
} from "@xrblocks/devtools/test";
import type { XRBlocksSession } from "@xrblocks/devtools";
import * as THREE from "three";

type Denomination = "penny" | "nickel" | "dime" | "quarter" | "dollar";

const COIN_SURFACE_CLEARANCE = 0.003;
const SCATTER_POSITIONS: [number, number][] = [
  [-0.038, -0.026],
  [-0.013, -0.03],
  [0.013, -0.028],
  [0.039, -0.022],
  [-0.04, 0.003],
  [-0.014, 0],
  [0.013, 0.001],
  [0.04, 0.006],
  [-0.031, 0.029],
  [-0.005, 0.027],
  [0.023, 0.03],
];

type CoinPileDefinition = {
  id: string;
  contents: Record<Denomination, number>;
};

const PILE_A: CoinPileDefinition = {
  id: "coin-pile-a",
  contents: { penny: 4, nickel: 3, dime: 2, quarter: 1, dollar: 1 },
};

const PILE_B: CoinPileDefinition = {
  id: "coin-pile-b",
  contents: { penny: 2, nickel: 1, dime: 3, quarter: 2, dollar: 2 },
};

const COIN_STYLES: Record<
  Denomination,
  { radius: number; thickness: number; color: number; rimColor: number }
> = {
  penny: {
    radius: 0.009525,
    thickness: 0.00152,
    color: 0xb87333,
    rimColor: 0xe09a57,
  },
  nickel: {
    radius: 0.010605,
    thickness: 0.00195,
    color: 0xaeb3b8,
    rimColor: 0xe1e4e7,
  },
  dime: {
    radius: 0.008955,
    thickness: 0.00135,
    color: 0xc4c8cc,
    rimColor: 0xf1f3f5,
  },
  quarter: {
    radius: 0.01213,
    thickness: 0.00175,
    color: 0xb8bdc2,
    rimColor: 0xe7e9eb,
  },
  dollar: {
    radius: 0.01325,
    thickness: 0.002,
    color: 0xd4af37,
    rimColor: 0xffdd68,
  },
};

const COIN_LABELS: Record<Denomination, string> = {
  penny: "Penny",
  nickel: "Nickel",
  dime: "Dime",
  quarter: "Quarter",
  dollar: "Dollar coin",
};

it_session(
  "Two separate mixed coin piles show their individual values",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "coin-counter-separate-piles",
    realTime: true,
  },
  async (session) => {
    const primary = await session.getPresetLocation("table-primary");
    const secondary = await session.getPresetLocation("table-secondary");
    await frameTable(session, primary, secondary);
    await session.simulator.addObjects([
      ...makeSimulatorCoins(PILE_A, primary),
      ...makeSimulatorCoins(PILE_B, secondary),
    ]);
    await session.stepFrame(120);

    const verdict = await judge({
      prompt:
        "Objective: Verify separate pile totals. Required changes: Two separate coin piles have separate readable labels showing $1.64 and $2.87.",
      evidence: [
        {
          type: "image",
          label: "Separate pile values",
          image: (await session.getScreenshot()) as string,
        },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);

it_session(
  "Nearby coin piles merge into one added-value label",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "coin-counter-merged-piles",
    realTime: true,
  },
  async (session) => {
    const primary = await session.getPresetLocation("table-primary");
    const secondary = await session.getPresetLocation("table-secondary");
    await frameTable(session, primary, secondary);
    await session.simulator.addObjects([
      ...makeSimulatorCoins(PILE_A, primary),
      ...makeSimulatorCoins(PILE_B, secondary),
    ]);
    await session.stepFrame(120);

    const separate = (await session.getScreenshot()) as string;
    await session.simulator.updateObjects(
      makeCoinUpdates(PILE_B, [primary[0] + 0.2, primary[1], primary[2]]),
    );
    await session.wait(1_000);

    const verdict = await judge({
      prompt:
        "Objective: Verify merged pile totals. Required changes: Moving the two piles together replaces their separate values with one readable merged label showing $4.51.",
      evidence: [
        { type: "image", label: "Separate piles", image: separate },
        {
          type: "image",
          label: "Merged pile value",
          image: (await session.getScreenshot()) as string,
        },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);

it_session(
  "A coin amount label follows its pile when the pile moves",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "coin-counter-moving-pile",
    realTime: true,
  },
  async (session) => {
    const primary = await session.getPresetLocation("table-primary");
    const secondary = await session.getPresetLocation("table-secondary");
    await frameTable(session, primary);
    await session.simulator.addObjects(makeSimulatorCoins(PILE_A, primary));
    await session.stepFrame(120);

    const before = await captureOutputSnapshot(session, {
      tags: ["coin-amount-label"],
    });
    await session.simulator.updateObjects(makeCoinUpdates(PILE_A, secondary));
    await session.wait(1_000);
    await session.lookAtTarget(secondary);
    const after = await captureOutputSnapshot(session, {
      tags: ["coin-amount-label"],
    });
    expectTransformChanged(before, after, "coin-amount-label", {
      positionMeters: 0.001,
    });
  },
);

async function frameTable(
  session: XRBlocksSession,
  ...targets: [number, number, number][]
) {
  const tableView = await session.getPresetLocation("table-view");
  const center: [number, number, number] = [
    targets.reduce((sum, target) => sum + target[0], 0) / targets.length,
    targets.reduce((sum, target) => sum + target[1], 0) / targets.length,
    targets.reduce((sum, target) => sum + target[2], 0) / targets.length,
  ];
  await session.navigateTo(tableView);
  await session.lookAtTarget(center);
}

function makeSimulatorCoins(
  definition: CoinPileDefinition,
  position: [number, number, number],
) {
  return makeCoinPlacements(definition, position).map((placement) => ({
    id: placement.id,
    object: makeCoin(placement.denomination),
    position: placement.position,
    quaternion: placement.quaternion,
    detectObject: true,
    label: COIN_LABELS[placement.denomination],
  }));
}

function makeCoinUpdates(
  definition: CoinPileDefinition,
  position: [number, number, number],
) {
  return makeCoinPlacements(definition, position).map((placement) => ({
    id: placement.id,
    position: placement.position,
    quaternion: placement.quaternion,
  }));
}

function makeCoinPlacements(
  definition: CoinPileDefinition,
  origin: [number, number, number],
) {
  const placements: Array<{
    id: string;
    denomination: Denomination;
    position: [number, number, number];
    quaternion: [number, number, number, number];
  }> = [];
  let scatterIndex = 0;
  for (const denomination of Object.keys(
    definition.contents,
  ) as Denomination[]) {
    for (
      let denominationIndex = 0;
      denominationIndex < definition.contents[denomination];
      denominationIndex += 1
    ) {
      const [x, z] = SCATTER_POSITIONS[scatterIndex];
      const rotation = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(0, scatterIndex * 0.61, 0),
      );
      placements.push({
        id: `${definition.id}-${denomination}-${denominationIndex}`,
        denomination,
        position: [
          origin[0] + x,
          origin[1] +
            COIN_SURFACE_CLEARANCE +
            COIN_STYLES[denomination].thickness / 2,
          origin[2] + z,
        ],
        quaternion: [rotation.x, rotation.y, rotation.z, rotation.w],
      });
      scatterIndex += 1;
    }
  }
  return placements;
}

// MODEL_FIXTURE: one realistically sized mesh for one detected physical coin.
function makeCoin(denomination: Denomination): THREE.Group {
  const style = COIN_STYLES[denomination];
  const coin = new THREE.Group();
  coin.name = denomination;
  coin.userData.denomination = denomination;

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(style.radius, style.radius, style.thickness, 32),
    new THREE.MeshStandardMaterial({
      color: style.color,
      metalness: 0.75,
      roughness: 0.28,
    }),
  );
  body.castShadow = true;
  body.receiveShadow = true;
  coin.add(body);

  const faceRim = new THREE.Mesh(
    new THREE.TorusGeometry(style.radius * 0.76, 0.00045, 6, 28),
    new THREE.MeshStandardMaterial({
      color: style.rimColor,
      metalness: 0.8,
      roughness: 0.22,
    }),
  );
  faceRim.rotation.x = Math.PI / 2;
  faceRim.position.y = style.thickness / 2 + 0.0003;
  coin.add(faceRim);

  return coin;
}
