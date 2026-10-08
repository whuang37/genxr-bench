import {
  expectNotVisible,
  expect,
  it_session,
  judge,
  expectVisible,
} from "@xrblocks/devtools/test";

it_session(
  "The helix unzips and adenine stays in its matching slot",
  {
    required: true,
    switchHands: true,
    scenes: ["Living Room"],
    recording: "dna-replication-zip",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(10);
    await session.lookAtTarget({ tag: "helicase-tool" });

    const initial = (await session.getScreenshot()) as string;

    // Pull the helicase along its marked path with a captured controller ray.
    await session.pointTo(primaryHand, { tag: "helicase-tool" });
    await session.startSelect(primaryHand);
    await session.pointTo(primaryHand, { tag: "helicase-path-end" });
    await session.endSelect(primaryHand);
    await session.stepFrame(12);
    const unzipped = (await session.getScreenshot()) as string;

    const adenines = await session.objects.findByTag("adenine");
    expect(adenines.length).toBeGreaterThan(0);
    const adenine = { tag: "adenine", id: adenines[0].id };
    await session.pointTo(primaryHand, adenine);
    await session.startSelect(primaryHand);
    await session.pointTo(primaryHand, { tag: "template-slot-6" });
    await session.endSelect(primaryHand);
    await session.stepFrame(8);

    // Compare immediate and delayed views to confirm that the bond persists.
    const afterPlacement = (await session.getScreenshot()) as string;
    await session.wait(1_000);
    await session.stepFrame(8);
    const afterDelay = (await session.getScreenshot()) as string;

    const verdict = await judge({
      prompt:
        "Objective: Verify DNA unzipping and nucleotide placement. Required changes: Pulling the helicase along its marked path changes the closed helix into an unzipped strand with six visible template positions. Adenine then snaps into the matching end thymine position, its new bond glows, and it remains attached after the delay while the other five positions remain open.",
      evidence: [
        {
          type: "image",
          label: "Initial closed DNA helix",
          image: initial,
        },
        {
          type: "image",
          label: "DNA after helicase unzip",
          image: unzipped,
        },
        {
          type: "image",
          label: "Immediately after placement",
          image: afterPlacement,
        },
        {
          type: "image",
          label: "After retention delay",
          image: afterDelay,
        },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);

it_session(
  "Moving helicase away from the marked path does not expose template slots",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "dna-replication-invalid-path",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(10);
    await session.lookAtTarget({ tag: "helicase-tool" });

    const helicase = { tag: "helicase-tool" };
    const start = (await session.objects.inspect(helicase)).worldTransform
      .position;
    const pathEnd = (
      await session.objects.inspect({ tag: "helicase-path-end" })
    ).worldTransform.position;
    const pathX = pathEnd[0] - start[0];
    const pathZ = pathEnd[2] - start[2];
    const horizontalLength = Math.hypot(pathX, pathZ);
    const offPath: [number, number, number] =
      horizontalLength > 0
        ? [
            start[0] - (pathZ / horizontalLength) * 0.4,
            start[1] + 0.2,
            start[2] + (pathX / horizontalLength) * 0.4,
          ]
        : [start[0] + 0.4, start[1] + 0.2, start[2]];
    await session.pointTo(primaryHand, helicase);
    await session.startSelect(primaryHand);
    await session.pointTo(primaryHand, offPath);
    await session.endSelect(primaryHand);
    await session.stepFrame(8);
    await expectNotVisible(session, "exposed-template-slots");
    await expectVisible(session, "helicase-tool");
  },
);
