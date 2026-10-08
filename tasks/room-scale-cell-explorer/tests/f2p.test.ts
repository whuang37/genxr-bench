import { expect, it_session, judge } from "@xrblocks/devtools/test";

const ORGANELLE_TAGS = [
  "nucleus",
  "rough-endoplasmic-reticulum",
  "golgi-apparatus",
  "mitochondria",
  "lysosome",
  "ribosomes",
] as const;

it_session(
  "a new organelle selection replaces the previous information",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "room-scale-cell-explorer",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(10);
    await session.lookAtTarget({ tag: ORGANELLE_TAGS[0] });
    await session.rayClick(primaryHand, { tag: ORGANELLE_TAGS[0] });
    await session.wait(1_000);
    const first = (await session.getScreenshot()) as string;

    await session.lookAtTarget({ tag: ORGANELLE_TAGS[1] });
    await session.rayClick(primaryHand, { tag: ORGANELLE_TAGS[1] });
    await session.wait(1_000);
    const second = (await session.getScreenshot()) as string;

    const verdict = await judge({
      prompt:
        "Objective: Verify organelle information replacement. Required changes: Selecting the second organelle replaces the first information display, leaving one readable current display and no old duplicate.",
      evidence: [
        { type: "image", label: "First organelle", image: first },
        { type: "image", label: "Second organelle", image: second },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);
