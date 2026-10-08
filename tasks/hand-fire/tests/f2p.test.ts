import { expect, it_session, judge } from "@xrblocks/devtools/test";

it_session(
  "the palm flames become streams, merge briefly, and return",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "hand-fire",
    realTime: true,
  },
  async (session, { primaryHand, secondaryHand }) => {
    await session.stepFrame(20);
    await session.gesture(primaryHand, "relaxed");
    await session.gesture(secondaryHand, "relaxed");
    await session.moveHand("left", {
      rightMeters: 0.08,
      upMeters: 0.18,
      forwardMeters: -0.1,
    });
    await session.moveHand("right", {
      rightMeters: -0.08,
      upMeters: 0.18,
      forwardMeters: -0.1,
    });
    await session.stepFrame(24);
    const palmFlames = (await session.getScreenshot()) as string;

    await session.gesture(primaryHand, "pinching");
    await session.gesture(secondaryHand, "pinching");
    await session.wait(1_000);
    const pinchedStreams = (await session.getScreenshot()) as string;

    await session.moveHand("left", { rightMeters: 0.18 });
    await session.moveHand("right", { rightMeters: -0.18 });
    await session.wait(2_000);

    await session.moveHand("left", { rightMeters: -0.04 });
    await session.moveHand("right", { rightMeters: 0.04 });
    await session.wait(1_000);
    const mergedOrb = (await session.getScreenshot()) as string;

    await session.moveHand("left", { rightMeters: -0.14 });
    await session.moveHand("right", { rightMeters: 0.14 });
    await session.wait(8_000);
    const returnedStreams = (await session.getScreenshot()) as string;

    await session.gesture(primaryHand, "relaxed");
    await session.gesture(secondaryHand, "relaxed");
    await session.wait(1_000);
    const restoredFlames = (await session.getScreenshot()) as string;

    const verdict = await judge({
      prompt:
        "Objective: Verify the full hand-fire sequence. Required changes: The initial view has separate blue and orange palm flames. Pinching both hands produces two concentrated streams. Bringing the streams together and then slightly apart produces one fire orb. Returning the still-pinched hands to their original separated positions and waiting eight seconds removes the orb and restores the two streams. Releasing both pinches removes the streams and restores the separate palm flames. Exact hand coordinates are not required.",
      evidence: [
        { type: "image", label: "1. Separate palm flames", image: palmFlames },
        {
          type: "image",
          label: "2. Two pinched streams",
          image: pinchedStreams,
        },
        {
          type: "image",
          label: "3. Orb after slight separation",
          image: mergedOrb,
        },
        {
          type: "image",
          label: "4. Streams after eight seconds apart",
          image: returnedStreams,
        },
        {
          type: "image",
          label: "5. Restored palm flames",
          image: restoredFlames,
        },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);
