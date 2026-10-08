import { expect, it_session, judge } from "@xrblocks/devtools/test";
import * as THREE from "three";

it_session(
  "Each spoken object name moves one visible search box",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "find-my",
    realTime: true,
  },
  async (session) => {
    const table = await session.getPresetLocation("table-primary");
    await session.navigateTo(await session.getPresetLocation("table-view"));
    await session.lookAtTarget(table);
    const remotePosition: [number, number, number] = [
      table[0] + 0.28,
      table[1],
      table[2],
    ];
    await session.simulator.addObjects([
      {
        id: "coffee-mug",
        tag: "coffee-mug",
        object: makeCoffeeMug(),
        position: [table[0] - 0.28, table[1], table[2]],
        detectObject: true,
        label: "Coffee mug",
      },
      {
        id: "book",
        tag: "book",
        object: makeBook(),
        position: table,
        detectObject: true,
        label: "Book",
      },
      {
        id: "remote-control",
        tag: "remote-control",
        object: makeRemoteControl(),
        position: remotePosition,
        detectObject: true,
        label: "Remote control",
      },
    ]);
    await session.stepFrame(60);

    const samples: Array<{ label: string; image: string }> = [
      {
        label: "Initial scene before a spoken request",
        image: (await session.getScreenshot()) as string,
      },
    ];
    for (const name of ["coffee mug", "book", "remote control"]) {
      // Naming a new object must reuse the single box and clear its old target.
      await session.waitForAudioConsumer({ timeoutMs: 5_000 });
      await session.injectAudio({ text: name });
      await session.stepFrame(40);
      samples.push({
        label: `After saying ${name}`,
        image: (await session.getScreenshot()) as string,
      });
    }

    // Move the active remote and confirm that its box follows the new pose.
    await session.simulator.updateObjects([
      {
        id: "remote-control",
        position: [
          remotePosition[0] - 0.18,
          remotePosition[1],
          remotePosition[2] - 0.16,
        ],
      },
    ]);
    await session.wait(1_000);
    samples.push({
      label: "After moving the active remote control",
      image: (await session.getScreenshot()) as string,
    });

    const verdict = await judge({
      prompt:
        "Objective: Verify voice-guided object marking. Required changes: Initially no search box is visible. One clear high-contrast box then moves from the requested coffee mug to the book and then the remote control, leaving no box on the previous target. When the remote moves, the box follows it.",
      evidence: samples.map(({ label, image }) => ({
        type: "image" as const,
        label,
        image,
      })),
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);

function makeCoffeeMug(): THREE.Group {
  // MODEL_FIXTURE: an open ceramic mug with a visible side handle.
  const mug = new THREE.Group();
  const ceramic = new THREE.MeshStandardMaterial({
    color: 0xd64a3a,
    roughness: 0.55,
    side: THREE.DoubleSide,
  });
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.045, 0.12, 24, 1, true),
    ceramic,
  );
  body.position.y = 0.06;
  mug.add(body);

  const bottom = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, 0.008, 24),
    ceramic,
  );
  bottom.position.y = 0.004;
  mug.add(bottom);

  const handle = new THREE.Mesh(
    new THREE.TorusGeometry(0.034, 0.009, 10, 20),
    ceramic,
  );
  handle.position.set(0.058, 0.065, 0);
  mug.add(handle);
  return mug;
}

function makeBook(): THREE.Group {
  // MODEL_FIXTURE: a closed blue book with cream pages.
  const book = new THREE.Group();
  const cover = new THREE.MeshStandardMaterial({ color: 0x315fa8 });
  const pages = new THREE.MeshStandardMaterial({ color: 0xf2e6c9 });

  const pageBlock = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.035, 0.14),
    pages,
  );
  pageBlock.position.y = 0.026;
  book.add(pageBlock);

  for (const y of [0.004, 0.048]) {
    const bookCover = new THREE.Mesh(
      new THREE.BoxGeometry(0.215, 0.008, 0.15),
      cover,
    );
    bookCover.position.y = y;
    book.add(bookCover);
  }
  return book;
}

function makeRemoteControl(): THREE.Group {
  // MODEL_FIXTURE: a dark remote control with a visible button grid.
  const remote = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.025, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x22262c, roughness: 0.65 }),
  );
  body.position.y = 0.013;
  remote.add(body);

  const buttonMaterial = new THREE.MeshStandardMaterial({ color: 0xc7ccd2 });
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 2; column += 1) {
      const button = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.008, 0.006, 12),
        buttonMaterial,
      );
      button.position.set((column - 0.5) * 0.032, 0.029, 0.045 - row * 0.035);
      remote.add(button);
    }
  }
  return remote;
}
