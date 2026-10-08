import {
  captureOutputSnapshot,
  expect,
  expectOnSurface,
  it_session,
  judge,
} from "@xrblocks/devtools/test";

it_session(
  "Connecting the labeled dots in order completes the figure",
  {
    required: true,
    switchHands: true,
    scenes: ["Living Room"],
    recording: "connect-the-dots-ordered",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(20);

    const dotSnapshot = await captureOutputSnapshot(session, {
      tags: Array.from({ length: 6 }, (_, index) => `dot-${index + 1}`),
    });
    expect(dotSnapshot.outputs).toHaveLength(6);
    for (const dot of dotSnapshot.outputs) {
      expectOnSurface(
        dotSnapshot,
        { tag: dot.tag, id: dot.id },
        { toleranceMeters: 0.08 },
      );
    }
    const labeledDots = (await session.getScreenshot()) as string;

    for (let start = 1; start <= 5; start += 1) {
      await session.lookAtTarget({ tag: `dot-${start}` });
      await session.pointTo(primaryHand, { tag: `dot-${start}` });
      await session.startSelect(primaryHand);
      await session.lookAtTarget({ tag: `dot-${start + 1}` });
      await session.pointTo(primaryHand, { tag: `dot-${start + 1}` });
      await session.endSelect(primaryHand);
      await session.wait(1_000);
    }

    const solved = (await session.getScreenshot()) as string;
    const verdict = await judge({
      prompt:
        "Objective: Verify the completed dot path. Required changes: Five retained segments form one continuous path and the completed figure fills with color.",
      evidence: [
        { type: "image", label: "Initial labeled dots", image: labeledDots },
        { type: "image", label: "Completed ordered figure", image: solved },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);

it_session(
  "An in-order trace locks while the following out-of-order trace does not",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "connect-the-dots-out-of-order",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(20);

    await session.lookAtTarget({ tag: "dot-1" });
    await session.pointTo(primaryHand, { tag: "dot-1" });
    await session.startSelect(primaryHand);
    await session.lookAtTarget({ tag: "dot-2" });
    await session.pointTo(primaryHand, { tag: "dot-2" });
    await session.endSelect(primaryHand);
    await session.wait(1_000);
    const afterInOrder = (await session.getScreenshot()) as string;

    await session.lookAtTarget({ tag: "dot-2" });
    await session.pointTo(primaryHand, { tag: "dot-2" });
    await session.startSelect(primaryHand);
    await session.lookAtTarget({ tag: "dot-4" });
    await session.pointTo(primaryHand, { tag: "dot-4" });
    await session.endSelect(primaryHand);
    await session.wait(1_000);
    const afterOutOfOrder = (await session.getScreenshot()) as string;

    const verdict = await judge({
      prompt:
        "Objective: Compare an in-order trace with an out-of-order trace. Required changes: The first view shows one retained segment from dot 1 to dot 2. After attempting to skip dot 3 and trace from dot 2 to dot 4, the second view still shows only the original dot 1 to dot 2 segment, with no retained segment to dot 4.",
      evidence: [
        {
          type: "image",
          label: "After in-order trace from dot 1 to dot 2",
          image: afterInOrder,
        },
        {
          type: "image",
          label: "After out-of-order trace from dot 2 to dot 4",
          image: afterOutOfOrder,
        },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);
