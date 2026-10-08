import { expect, it_session, judge } from "@xrblocks/devtools/test";

it_session(
  "Activating the source and turning the field dial deflects both isotopes",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "ion-deflection-spectrometer",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(10);
    await session.lookAtTarget({ tag: "spectrometer" });

    // Start one isotope batch with the source activation control.
    await session.rayClick(primaryHand, { tag: "ion-source" });
    await session.wait(2_000);
    const initialField = (await session.getScreenshot()) as string;

    // Capture the dial by ray and turn it to change both trajectories.
    await session.pointTo(primaryHand, { tag: "field-dial" });
    await session.startSelect(primaryHand);
    await session.rotateHand(primaryHand, { rollDegrees: 90 });
    await session.endSelect(primaryHand);
    await session.wait(2_000);
    const adjustedField = (await session.getScreenshot()) as string;

    // Replay clears the batch and restores the dial without an actor.
    await session.rayClick(primaryHand, { tag: "replay-button" });
    await session.stepFrame(8);
    const afterReplay = (await session.getScreenshot()) as string;

    const verdict = await judge({
      prompt:
        "Objective: Verify ion deflection and Replay. Required changes: Source activation creates two isotope streams. Turning the field changes both curvatures, with one bending more, and aligns them with their detector slots. Replay clears the streams and restores the initial controls.",
      evidence: [
        {
          type: "image",
          label: "Source activated at initial field",
          image: initialField,
        },
        {
          type: "image",
          label: "Paths after turning field dial",
          image: adjustedField,
        },
        {
          type: "image",
          label: "After scripted Replay",
          image: afterReplay,
        },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);
