import { expect, it_session, judge } from "@xrblocks/devtools/test";

it_session(
  "Each beat pad adds one cumulative concert effect",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "edm-concert-effects",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    const effectSamples: string[] = [];
    for (let pad = 1; pad <= 4; pad += 1) {
      const padTag = `beat-pad-${pad}`;

      // Each direct fingertip tap toggles one shader effect into the mix.
      await session.reachTo(
        primaryHand,
        { tag: padTag },
        {
          anchor: "index-tip",
        },
      );
      await session.wait(300);
      await session.moveHand(primaryHand, { upMeters: 0.12 });
      await session.wait(1_000);
      effectSamples.push((await session.getScreenshot()) as string);
    }

    await session.reachTo(
      primaryHand,
      { tag: "clear-pad" },
      {
        anchor: "index-tip",
      },
    );
    await session.wait(300);
    await session.moveHand(primaryHand, { upMeters: 0.12 });
    await session.wait(1_000);
    await session.stepFrame(8);
    const cleared = (await session.getScreenshot()) as string;

    const verdict = await judge({
      prompt:
        "Objective: Verify cumulative concert layers and Clear. Required changes: Each successive beat-pad view adds at least one distinct visible concert effect while retaining the effects already active. Exact effect appearance can vary. The four views must show a clear cumulative increase in visual effects, and Clear must remove the added effects and return the pads to their inactive states.",
      evidence: [
        ...effectSamples.map((image, index) => ({
          type: "image" as const,
          label: `After beat pad ${index + 1}`,
          image,
        })),
        { type: "image", label: "After Clear", image: cleared },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);

it_session(
  "Tapping an active beat pad removes only its concert effect",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "edm-concert-toggle",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(12);

    // Turn the beam fan on, leave the pad, and tap it again to turn it off.
    await session.reachTo(
      primaryHand,
      { tag: "beat-pad-1" },
      {
        anchor: "index-tip",
      },
    );
    await session.wait(300);
    await session.moveHand(primaryHand, { upMeters: 0.12 });
    await session.wait(1_000);
    const active = (await session.getScreenshot()) as string;
    await session.reachTo(
      primaryHand,
      { tag: "beat-pad-1" },
      {
        anchor: "index-tip",
      },
    );
    await session.wait(300);
    await session.moveHand(primaryHand, { upMeters: 0.12 });
    await session.wait(1_000);
    const inactive = (await session.getScreenshot()) as string;

    const verdict = await judge({
      prompt:
        "Objective: Verify one concert-layer toggle. Required changes: The first view shows pad 1 active with its beam fan. The second shows pad 1 inactive with only that effect removed.",
      evidence: [
        { type: "image", label: "Beam effect active", image: active },
        { type: "image", label: "Beam effect inactive", image: inactive },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);
