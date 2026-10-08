import { expect, it_session, judge } from "@xrblocks/devtools/test";

it_session(
  "The stroke counter increases by one, the dolphin is at its next bounded position, and its direction marker matches the final head pitch",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "dolphin-glide-stroke",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(20);
    const before = (await session.getScreenshot()) as string;

    await session.stepControl({
      durationMs: 500,
      control: {
        leftHand: { move: [0, 0, -0.25] },
        rightHand: { move: [0, 0, -0.25] },
      },
    });
    await session.stepControl({
      durationMs: 500,
      control: {
        leftHand: { move: [0, 0, 0.25] },
        rightHand: { move: [0, 0, 0.25] },
      },
    });
    await session.rotate({ pitchDegrees: 15 });
    await session.stepFrame(20);
    const after = (await session.getScreenshot()) as string;
    await session.rayClick(primaryHand, { tag: "end-dolphin-course" });
    await session.stepFrame(8);
    const ended = (await session.getScreenshot()) as string;
    const verdict = await judge({
      prompt:
        "Objective: Verify one paired swimming stroke and the End control. Required changes: The visible stroke counter advances from zero to one, the dolphin advances one course step, and its direction marker points upward with the final head pitch. End then stops the course and shows the result.",
      evidence: [
        { type: "image", label: "Before paired stroke", image: before },
        { type: "image", label: "After stroke and head pitch", image: after },
        { type: "image", label: "After ending the course", image: ended },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);
it_session(
  "A one-hand motion does not count as a paired dolphin stroke",
  {
    required: true,
    switchHands: true,
    scenes: ["Living Room"],
    recording: "dolphin-glide",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(20);
    const before = (await session.getScreenshot()) as string;
    await session.moveHand(primaryHand, { forwardMeters: 0.25 });
    await session.moveHand(primaryHand, { forwardMeters: -0.25 });
    await session.stepFrame(20);
    const after = (await session.getScreenshot()) as string;
    const verdict = await judge({
      prompt:
        "Objective: Verify one-hand rejection. Required changes: A one-hand forward-and-back motion does not increase the visible stroke count or advance the dolphin.",
      evidence: [
        { type: "image", label: "Before one-hand motion", image: before },
        { type: "image", label: "After one-hand motion", image: after },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);
