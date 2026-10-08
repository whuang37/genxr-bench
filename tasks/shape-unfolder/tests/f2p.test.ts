import { expect, it_session, judge } from "@xrblocks/devtools/test";

it_session(
  "Unfold the solid",
  {
    required: true,
    switchHands: true,
    scenes: ["Living Room"],
    recording: "shape-unfolder",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(10);
    await session.lookAtTarget({ tag: "unfold-handle" });

    await session.pointTo(primaryHand, { tag: "unfold-handle" });
    await session.startSelect(primaryHand);
    await session.pointTo(primaryHand, { tag: "unfold-end-stop" });
    await session.endSelect(primaryHand);
    await session.stepFrame(8);

    const verdict = await judge({
      prompt:
        "Objective: Verify complete unfolding. Required changes: The solid becomes one clear flat net with connected, nonoverlapping faces.",
      evidence: [
        {
          type: "image",
          label: "Unfolded result",
          image: (await session.getScreenshot()) as string,
        },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);

it_session(
  "Releasing the unfold handle before moving it keeps the solid folded",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "shape-unfolder-no-move",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.lookAtTarget({ tag: "unfold-handle" });
    const beforeRelease = (await session.getScreenshot()) as string;
    await session.pointTo(primaryHand, { tag: "unfold-handle" });
    await session.startSelect(primaryHand);
    await session.endSelect(primaryHand);
    await session.stepFrame(8);
    const afterRelease = (await session.getScreenshot()) as string;
    const verdict = await judge({
      prompt:
        "Objective: Verify unchanged-handle release. Required changes: Selecting and releasing the handle without moving leaves the solid folded with no visible unfolding change.",
      evidence: [
        { type: "image", label: "Before release", image: beforeRelease },
        { type: "image", label: "After release", image: afterRelease },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);
