import { expect, it_session, judge } from "@xrblocks/devtools/test";

it_session(
  "touching the first lit fret adds one chord-ribbon segment",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "guitar-tab-tutor",
    realTime: true,
  },
  async (session) => {
    await session.stepFrame(24);
    await session.lookAtTarget({ tag: "guitar-neck" });
    const before = (await session.getScreenshot()) as string;
    const litFrets = await session.objects.findByTag("lit-fret");
    expect(litFrets.length).toBeGreaterThan(0);
    const litFret = { tag: "lit-fret", id: litFrets[0].id };
    await session.gesture("right", "pointing");
    await session.reachTo("right", litFret, { anchor: "index-tip" });
    await session.wait(1_000);

    const verdict = await judge({
      prompt:
        "Objective: Verify one correct Guitar Tab Tutor fret touch. Required changes: The first lit fret is touched with the requested right index fingertip, that fret turns green, one chord-ribbon segment appears, the note count advances to 1 of 6, and the next note becomes active.",
      evidence: [
        {
          type: "image",
          label: "Before correct touch",
          image: before,
        },
        {
          type: "image",
          label: "After correct touch",
          image: (await session.getScreenshot()) as string,
        },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);

it_session(
  "touching the first fret with the wrong hand does not advance the note",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "guitar-tab-tutor-wrong-hand",
    realTime: true,
  },
  async (session) => {
    await session.stepFrame(24);
    await session.lookAtTarget({ tag: "guitar-neck" });
    const before = (await session.getScreenshot()) as string;
    const litFrets = await session.objects.findByTag("lit-fret");
    expect(litFrets.length).toBeGreaterThan(0);
    const litFret = { tag: "lit-fret", id: litFrets[0].id };
    await session.gesture("left", "pointing");
    await session.reachTo("left", litFret, { anchor: "index-tip" });
    await session.wait(1_000);

    const verdict = await judge({
      prompt:
        "Objective: Verify wrong-hand rejection in Guitar Tab Tutor. Required changes: The first lit fret is touched with the left hand, the fret shows red rejection feedback, the same note remains active, the note count stays at 0 of 6, and no chord-ribbon segment is added.",
      evidence: [
        { type: "image", label: "Before wrong touch", image: before },
        {
          type: "image",
          label: "After wrong touch",
          image: (await session.getScreenshot()) as string,
        },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);
